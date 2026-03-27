import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

export const renewalRouter = Router();
renewalRouter.use(requireAuth);

const renewalSchema = z.object({
  itemType: z.enum([
    'OPERATING_AUTHORITY', 'INSURANCE_LIABILITY', 'INSURANCE_CARGO',
    'IRP', 'UCR', 'BOC3', 'OTHER',
  ]),
  title: z.string().min(1),
  expiresAt: z.string().datetime(),
  alertDays: z.array(z.number()).optional(),
  notes: z.string().optional(),
  policyNumber: z.string().optional(),
  vendor: z.string().optional(),
  cost: z.number().positive().optional(),
});

renewalRouter.get('/', async (req: AuthRequest, res) => {
  const { itemType, expiringSoon } = req.query;

  let where: any = { userId: req.userId };
  if (itemType) where.itemType = itemType;
  if (expiringSoon === 'true') {
    const cutoff = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
    where.expiresAt = { lte: cutoff };
    where.renewedAt = null;
  }

  const items = await prisma.renewalItem.findMany({
    where,
    orderBy: { expiresAt: 'asc' },
  });

  res.json(items);
});

renewalRouter.post('/', async (req: AuthRequest, res) => {
  const data = renewalSchema.parse(req.body);

  const item = await prisma.renewalItem.create({
    data: {
      userId: req.userId!,
      ...data,
      expiresAt: new Date(data.expiresAt),
    },
  });

  res.status(201).json(item);
});

renewalRouter.get('/expiring', async (req: AuthRequest, res) => {
  const days = parseInt(req.query.days as string) || 90;
  const cutoff = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

  const items = await prisma.renewalItem.findMany({
    where: {
      userId: req.userId,
      expiresAt: { lte: cutoff },
      renewedAt: null,
    },
    orderBy: { expiresAt: 'asc' },
  });

  res.json(items);
});

renewalRouter.get('/:id', async (req: AuthRequest, res) => {
  const item = await prisma.renewalItem.findFirst({
    where: { id: req.params.id, userId: req.userId },
  });
  if (!item) throw new AppError(404, 'Renewal item not found');
  res.json(item);
});

renewalRouter.patch('/:id', async (req: AuthRequest, res) => {
  const existing = await prisma.renewalItem.findFirst({
    where: { id: req.params.id, userId: req.userId },
  });
  if (!existing) throw new AppError(404, 'Renewal item not found');

  const data = renewalSchema.partial().parse(req.body);
  const updated = await prisma.renewalItem.update({
    where: { id: req.params.id },
    data: {
      ...data,
      expiresAt: data.expiresAt ? new Date(data.expiresAt) : undefined,
    },
  });

  res.json(updated);
});

renewalRouter.post('/:id/renew', async (req: AuthRequest, res) => {
  const { newExpiresAt } = z.object({ newExpiresAt: z.string().datetime() }).parse(req.body);

  const existing = await prisma.renewalItem.findFirst({
    where: { id: req.params.id, userId: req.userId },
  });
  if (!existing) throw new AppError(404, 'Renewal item not found');

  const updated = await prisma.renewalItem.update({
    where: { id: req.params.id },
    data: {
      renewedAt: new Date(),
      expiresAt: new Date(newExpiresAt),
    },
  });

  res.json(updated);
});

renewalRouter.delete('/:id', async (req: AuthRequest, res) => {
  const existing = await prisma.renewalItem.findFirst({
    where: { id: req.params.id, userId: req.userId },
  });
  if (!existing) throw new AppError(404, 'Renewal item not found');
  await prisma.renewalItem.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});
