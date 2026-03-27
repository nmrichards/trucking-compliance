import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

export const complianceRouter = Router();
complianceRouter.use(requireAuth);

const deadlineSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  category: z.enum([
    'MEDICAL', 'CDL_RENEWAL', 'DRUG_TEST', 'CLEARINGHOUSE', 'IFTA_FILING',
    'IRP_RENEWAL', 'UCR_RENEWAL', 'OPERATING_AUTHORITY', 'INSURANCE', 'BOC3',
    'ANNUAL_INSPECTION', 'OTHER',
  ]),
  dueDate: z.string().datetime(),
  recurrence: z.enum(['NONE', 'MONTHLY', 'QUARTERLY', 'SEMI_ANNUAL', 'ANNUAL']).optional(),
  alertDays: z.array(z.number()).optional(),
  notes: z.string().optional(),
  externalUrl: z.string().url().optional().or(z.literal('')),
});

complianceRouter.get('/', async (req: AuthRequest, res) => {
  const { from, to, category, completed } = req.query;

  const deadlines = await prisma.complianceDeadline.findMany({
    where: {
      userId: req.userId,
      ...(from || to ? {
        dueDate: {
          ...(from ? { gte: new Date(from as string) } : {}),
          ...(to ? { lte: new Date(to as string) } : {}),
        },
      } : {}),
      ...(category ? { category: category as any } : {}),
      ...(completed !== undefined ? { completed: completed === 'true' } : {}),
    },
    orderBy: { dueDate: 'asc' },
  });

  res.json(deadlines);
});

complianceRouter.post('/', async (req: AuthRequest, res) => {
  const data = deadlineSchema.parse(req.body);

  const deadline = await prisma.complianceDeadline.create({
    data: {
      userId: req.userId!,
      ...data,
      dueDate: new Date(data.dueDate),
      recurrence: data.recurrence ?? 'NONE',
    },
  });

  res.status(201).json(deadline);
});

complianceRouter.get('/upcoming', async (req: AuthRequest, res) => {
  const days = parseInt(req.query.days as string) || 30;
  const now = new Date();
  const cutoff = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

  const deadlines = await prisma.complianceDeadline.findMany({
    where: {
      userId: req.userId,
      dueDate: { gte: now, lte: cutoff },
      completed: false,
    },
    orderBy: { dueDate: 'asc' },
  });

  res.json(deadlines);
});

complianceRouter.get('/:id', async (req: AuthRequest, res) => {
  const deadline = await prisma.complianceDeadline.findFirst({
    where: { id: req.params.id, userId: req.userId },
  });
  if (!deadline) throw new AppError(404, 'Deadline not found');
  res.json(deadline);
});

complianceRouter.patch('/:id', async (req: AuthRequest, res) => {
  const existing = await prisma.complianceDeadline.findFirst({
    where: { id: req.params.id, userId: req.userId },
  });
  if (!existing) throw new AppError(404, 'Deadline not found');

  const data = deadlineSchema.partial().parse(req.body);
  const updated = await prisma.complianceDeadline.update({
    where: { id: req.params.id },
    data: {
      ...data,
      ...(data.dueDate ? { dueDate: new Date(data.dueDate) } : {}),
    },
  });

  res.json(updated);
});

complianceRouter.post('/:id/complete', async (req: AuthRequest, res) => {
  const existing = await prisma.complianceDeadline.findFirst({
    where: { id: req.params.id, userId: req.userId },
  });
  if (!existing) throw new AppError(404, 'Deadline not found');

  const updated = await prisma.complianceDeadline.update({
    where: { id: req.params.id },
    data: { completed: true, completedAt: new Date() },
  });

  // If recurring, create next occurrence
  if (existing.recurrence !== 'NONE') {
    const nextDue = getNextDue(existing.dueDate, existing.recurrence);
    await prisma.complianceDeadline.create({
      data: {
        userId: req.userId!,
        title: existing.title,
        description: existing.description ?? undefined,
        category: existing.category,
        dueDate: nextDue,
        recurrence: existing.recurrence,
        alertDays: existing.alertDays,
        notes: existing.notes ?? undefined,
        externalUrl: existing.externalUrl ?? undefined,
      },
    });
  }

  res.json(updated);
});

complianceRouter.delete('/:id', async (req: AuthRequest, res) => {
  const existing = await prisma.complianceDeadline.findFirst({
    where: { id: req.params.id, userId: req.userId },
  });
  if (!existing) throw new AppError(404, 'Deadline not found');
  await prisma.complianceDeadline.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});

function getNextDue(current: Date, recurrence: string): Date {
  const next = new Date(current);
  switch (recurrence) {
    case 'MONTHLY': next.setMonth(next.getMonth() + 1); break;
    case 'QUARTERLY': next.setMonth(next.getMonth() + 3); break;
    case 'SEMI_ANNUAL': next.setMonth(next.getMonth() + 6); break;
    case 'ANNUAL': next.setFullYear(next.getFullYear() + 1); break;
  }
  return next;
}
