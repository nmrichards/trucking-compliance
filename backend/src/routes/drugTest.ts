import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

export const drugTestRouter = Router();
drugTestRouter.use(requireAuth);

const testSchema = z.object({
  testType: z.enum(['PRE_EMPLOYMENT', 'RANDOM', 'POST_ACCIDENT', 'REASONABLE_SUSPICION', 'RETURN_TO_DUTY', 'FOLLOW_UP']),
  status: z.enum(['SCHEDULED', 'PENDING', 'COMPLETED', 'CANCELLED']),
  testDate: z.string().datetime().optional(),
  resultDate: z.string().datetime().optional(),
  result: z.enum(['NEGATIVE', 'POSITIVE', 'DILUTE', 'CANCELLED']).optional(),
  consortiumName: z.string().optional(),
  mroName: z.string().optional(),
  notes: z.string().optional(),
});

drugTestRouter.get('/', async (req: AuthRequest, res) => {
  const tests = await prisma.drugTest.findMany({
    where: { userId: req.userId },
    orderBy: [{ testDate: 'desc' }, { createdAt: 'desc' }],
  });
  res.json(tests);
});

drugTestRouter.post('/', async (req: AuthRequest, res) => {
  const data = testSchema.parse(req.body);

  const test = await prisma.drugTest.create({
    data: {
      userId: req.userId!,
      ...data,
      testDate: data.testDate ? new Date(data.testDate) : undefined,
      resultDate: data.resultDate ? new Date(data.resultDate) : undefined,
    },
  });

  res.status(201).json(test);
});

drugTestRouter.patch('/:id', async (req: AuthRequest, res) => {
  const existing = await prisma.drugTest.findFirst({
    where: { id: req.params.id, userId: req.userId },
  });
  if (!existing) throw new AppError(404, 'Drug test not found');

  const data = testSchema.partial().parse(req.body);
  const updated = await prisma.drugTest.update({
    where: { id: req.params.id },
    data: {
      ...data,
      testDate: data.testDate ? new Date(data.testDate) : undefined,
      resultDate: data.resultDate ? new Date(data.resultDate) : undefined,
    },
  });

  res.json(updated);
});

drugTestRouter.delete('/:id', async (req: AuthRequest, res) => {
  const existing = await prisma.drugTest.findFirst({
    where: { id: req.params.id, userId: req.userId },
  });
  if (!existing) throw new AppError(404, 'Drug test not found');
  await prisma.drugTest.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});

// ─── Consortium Enrollment ────────────────────────────────────────────────────

const enrollmentSchema = z.object({
  consortiumName: z.string().min(1),
  memberSince: z.string().datetime().optional(),
  memberId: z.string().optional(),
  nextRandomDue: z.string().datetime().optional(),
  notes: z.string().optional(),
});

drugTestRouter.get('/consortium', async (req: AuthRequest, res) => {
  const enrollment = await prisma.consortiumEnrollment.findUnique({
    where: { userId: req.userId },
  });
  res.json(enrollment);
});

drugTestRouter.put('/consortium', async (req: AuthRequest, res) => {
  const data = enrollmentSchema.parse(req.body);

  const enrollment = await prisma.consortiumEnrollment.upsert({
    where: { userId: req.userId! },
    create: {
      userId: req.userId!,
      ...data,
      memberSince: data.memberSince ? new Date(data.memberSince) : undefined,
      nextRandomDue: data.nextRandomDue ? new Date(data.nextRandomDue) : undefined,
    },
    update: {
      ...data,
      memberSince: data.memberSince ? new Date(data.memberSince) : undefined,
      nextRandomDue: data.nextRandomDue ? new Date(data.nextRandomDue) : undefined,
    },
  });

  res.json(enrollment);
});
