import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

export const iftaRouter = Router();
iftaRouter.use(requireAuth);

// Quarter due dates: Q1=Apr30, Q2=Jul31, Q3=Oct31, Q4=Jan31
function getQuarterDueDate(year: number, quarter: number): Date {
  const dueDates: Record<number, [number, number]> = {
    1: [3, 30],  // April 30
    2: [6, 31],  // July 31
    3: [9, 31],  // October 31
    4: [0, 31],  // January 31 next year
  };
  const [month, day] = dueDates[quarter];
  const dueYear = quarter === 4 ? year + 1 : year;
  return new Date(dueYear, month, day);
}

// ─── Quarters ───────────────────────────────────────────────────────────────

iftaRouter.get('/quarters', async (req: AuthRequest, res) => {
  const quarters = await prisma.iFTAQuarter.findMany({
    where: { userId: req.userId },
    include: { fuelLogs: true },
    orderBy: [{ year: 'desc' }, { quarter: 'desc' }],
  });
  res.json(quarters);
});

iftaRouter.post('/quarters', async (req: AuthRequest, res) => {
  const { year, quarter } = z.object({
    year: z.number().int().min(2020).max(2100),
    quarter: z.number().int().min(1).max(4),
  }).parse(req.body);

  const existing = await prisma.iFTAQuarter.findUnique({
    where: { userId_year_quarter: { userId: req.userId!, year, quarter } },
  });
  if (existing) throw new AppError(409, 'Quarter already exists');

  const q = await prisma.iFTAQuarter.create({
    data: {
      userId: req.userId!,
      year,
      quarter,
      dueDate: getQuarterDueDate(year, quarter),
    },
    include: { fuelLogs: true },
  });

  res.status(201).json(q);
});

iftaRouter.get('/quarters/:id', async (req: AuthRequest, res) => {
  const q = await prisma.iFTAQuarter.findFirst({
    where: { id: req.params.id, userId: req.userId },
    include: { fuelLogs: true },
  });
  if (!q) throw new AppError(404, 'Quarter not found');

  // Aggregate mileage by state for this quarter's date range
  const startMonth = (q.quarter - 1) * 3;
  const startDate = new Date(q.year, startMonth, 1);
  const endDate = new Date(q.year, startMonth + 3, 0, 23, 59, 59);

  const mileageByState = await prisma.iFTAMileageLog.groupBy({
    by: ['state'],
    where: {
      userId: req.userId,
      date: { gte: startDate, lte: endDate },
    },
    _sum: { miles: true },
  });

  res.json({ ...q, mileageByState });
});

iftaRouter.patch('/quarters/:id/status', async (req: AuthRequest, res) => {
  const { status } = z.object({
    status: z.enum(['OPEN', 'READY', 'FILED', 'AMENDED']),
  }).parse(req.body);

  const existing = await prisma.iFTAQuarter.findFirst({
    where: { id: req.params.id, userId: req.userId },
  });
  if (!existing) throw new AppError(404, 'Quarter not found');

  const updated = await prisma.iFTAQuarter.update({
    where: { id: req.params.id },
    data: {
      status,
      ...(status === 'FILED' ? { filedAt: new Date() } : {}),
    },
  });

  res.json(updated);
});

// ─── Fuel Logs ───────────────────────────────────────────────────────────────

const fuelLogSchema = z.object({
  quarterId: z.string(),
  date: z.string().datetime(),
  state: z.string().length(2),
  gallons: z.number().positive(),
  pricePerGallon: z.number().positive().optional(),
  vendor: z.string().optional(),
  notes: z.string().optional(),
});

iftaRouter.post('/fuel-logs', async (req: AuthRequest, res) => {
  const data = fuelLogSchema.parse(req.body);

  // Verify quarter belongs to user
  const quarter = await prisma.iFTAQuarter.findFirst({
    where: { id: data.quarterId, userId: req.userId },
  });
  if (!quarter) throw new AppError(404, 'Quarter not found');

  const log = await prisma.iFTAFuelLog.create({
    data: { ...data, date: new Date(data.date) },
  });

  res.status(201).json(log);
});

iftaRouter.delete('/fuel-logs/:id', async (req: AuthRequest, res) => {
  const log = await prisma.iFTAFuelLog.findFirst({
    where: { id: req.params.id, quarter: { userId: req.userId } },
  });
  if (!log) throw new AppError(404, 'Fuel log not found');
  await prisma.iFTAFuelLog.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});

// ─── Mileage Logs ────────────────────────────────────────────────────────────

const mileageSchema = z.object({
  date: z.string().datetime(),
  state: z.string().length(2).toUpperCase(),
  miles: z.number().positive(),
  truckId: z.string().optional(),
  notes: z.string().optional(),
});

iftaRouter.get('/mileage', async (req: AuthRequest, res) => {
  const { from, to, state } = req.query;

  const logs = await prisma.iFTAMileageLog.findMany({
    where: {
      userId: req.userId,
      ...(from || to ? {
        date: {
          ...(from ? { gte: new Date(from as string) } : {}),
          ...(to ? { lte: new Date(to as string) } : {}),
        },
      } : {}),
      ...(state ? { state: (state as string).toUpperCase() } : {}),
    },
    orderBy: { date: 'desc' },
  });

  res.json(logs);
});

iftaRouter.post('/mileage', async (req: AuthRequest, res) => {
  const data = mileageSchema.parse(req.body);

  const log = await prisma.iFTAMileageLog.create({
    data: {
      userId: req.userId!,
      ...data,
      date: new Date(data.date),
    },
  });

  res.status(201).json(log);
});

iftaRouter.delete('/mileage/:id', async (req: AuthRequest, res) => {
  const existing = await prisma.iFTAMileageLog.findFirst({
    where: { id: req.params.id, userId: req.userId },
  });
  if (!existing) throw new AppError(404, 'Mileage log not found');
  await prisma.iFTAMileageLog.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});
