import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

export const dqfRouter = Router();
dqfRouter.use(requireAuth);

const docSchema = z.object({
  docType: z.enum([
    'CDL', 'MEDICAL_CERTIFICATE', 'MVR', 'EMPLOYMENT_HISTORY',
    'ROAD_TEST', 'DRUG_TEST_PRE_EMPLOYMENT', 'BACKGROUND_CHECK',
    'CLEARINGHOUSE_QUERY', 'OTHER',
  ]),
  title: z.string().min(1),
  fileUrl: z.string().url().optional(),
  fileKey: z.string().optional(),
  issuedAt: z.string().datetime().optional(),
  expiresAt: z.string().datetime().optional(),
  alertDays: z.array(z.number()).optional(),
  notes: z.string().optional(),
});

dqfRouter.get('/', async (req: AuthRequest, res) => {
  const { docType, expiringSoon } = req.query;

  let where: any = { userId: req.userId };
  if (docType) where.docType = docType;
  if (expiringSoon === 'true') {
    const cutoff = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000);
    where.expiresAt = { lte: cutoff, gte: new Date() };
  }

  const docs = await prisma.dQFDocument.findMany({
    where,
    orderBy: [{ expiresAt: 'asc' }, { docType: 'asc' }],
  });

  res.json(docs);
});

dqfRouter.post('/', async (req: AuthRequest, res) => {
  const data = docSchema.parse(req.body);

  const doc = await prisma.dQFDocument.create({
    data: {
      userId: req.userId!,
      ...data,
      issuedAt: data.issuedAt ? new Date(data.issuedAt) : undefined,
      expiresAt: data.expiresAt ? new Date(data.expiresAt) : undefined,
    },
  });

  res.status(201).json(doc);
});

dqfRouter.get('/expiring', async (req: AuthRequest, res) => {
  const days = parseInt(req.query.days as string) || 60;
  const cutoff = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

  const docs = await prisma.dQFDocument.findMany({
    where: {
      userId: req.userId,
      expiresAt: { lte: cutoff, gte: new Date() },
    },
    orderBy: { expiresAt: 'asc' },
  });

  res.json(docs);
});

dqfRouter.get('/:id', async (req: AuthRequest, res) => {
  const doc = await prisma.dQFDocument.findFirst({
    where: { id: req.params.id, userId: req.userId },
  });
  if (!doc) throw new AppError(404, 'Document not found');
  res.json(doc);
});

dqfRouter.patch('/:id', async (req: AuthRequest, res) => {
  const existing = await prisma.dQFDocument.findFirst({
    where: { id: req.params.id, userId: req.userId },
  });
  if (!existing) throw new AppError(404, 'Document not found');

  const data = docSchema.partial().parse(req.body);
  const updated = await prisma.dQFDocument.update({
    where: { id: req.params.id },
    data: {
      ...data,
      issuedAt: data.issuedAt ? new Date(data.issuedAt) : undefined,
      expiresAt: data.expiresAt ? new Date(data.expiresAt) : undefined,
    },
  });

  res.json(updated);
});

dqfRouter.delete('/:id', async (req: AuthRequest, res) => {
  const existing = await prisma.dQFDocument.findFirst({
    where: { id: req.params.id, userId: req.userId },
  });
  if (!existing) throw new AppError(404, 'Document not found');
  await prisma.dQFDocument.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});
