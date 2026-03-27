import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../lib/jwt';
import { AppError } from '../middleware/errorHandler';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { createStripeCustomer, createTrialSubscription } from '../services/stripe';

export const authRouter = Router();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  companyName: z.string().optional(),
  dotNumber: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

authRouter.post('/register', async (req, res) => {
  const data = registerSchema.parse(req.body);

  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) throw new AppError(409, 'Email already registered');

  const passwordHash = await bcrypt.hash(data.password, 12);
  const trialEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

  const user = await prisma.user.create({
    data: {
      email: data.email,
      passwordHash,
      firstName: data.firstName,
      lastName: data.lastName,
      companyName: data.companyName,
      dotNumber: data.dotNumber,
      subscriptionStatus: 'TRIAL',
      trialEndsAt,
    },
  });

  // Create Stripe customer in background — don't block registration
  createStripeCustomer(user.id, user.email, `${user.firstName} ${user.lastName}`).catch(
    (err) => console.error('Stripe customer creation failed:', err),
  );

  const accessToken = signAccessToken({ userId: user.id, email: user.email });
  const refreshToken = signRefreshToken({ userId: user.id, email: user.email });

  await prisma.refreshToken.create({
    data: {
      token: refreshToken,
      userId: user.id,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });

  res.status(201).json({
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      companyName: user.companyName,
      subscriptionStatus: user.subscriptionStatus,
      trialEndsAt: user.trialEndsAt,
    },
  });
});

authRouter.post('/login', async (req, res) => {
  const data = loginSchema.parse(req.body);

  const user = await prisma.user.findUnique({ where: { email: data.email } });
  if (!user) throw new AppError(401, 'Invalid credentials');

  const valid = await bcrypt.compare(data.password, user.passwordHash);
  if (!valid) throw new AppError(401, 'Invalid credentials');

  const accessToken = signAccessToken({ userId: user.id, email: user.email });
  const refreshToken = signRefreshToken({ userId: user.id, email: user.email });

  await prisma.refreshToken.create({
    data: {
      token: refreshToken,
      userId: user.id,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });

  res.json({
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      companyName: user.companyName,
      subscriptionStatus: user.subscriptionStatus,
      trialEndsAt: user.trialEndsAt,
      subscriptionEndsAt: user.subscriptionEndsAt,
    },
  });
});

authRouter.post('/refresh', async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) throw new AppError(400, 'Refresh token required');

  const stored = await prisma.refreshToken.findUnique({ where: { token: refreshToken } });
  if (!stored || stored.expiresAt < new Date()) {
    throw new AppError(401, 'Invalid or expired refresh token');
  }

  const payload = verifyRefreshToken(refreshToken);
  const newAccessToken = signAccessToken({ userId: payload.userId, email: payload.email });
  const newRefreshToken = signRefreshToken({ userId: payload.userId, email: payload.email });

  await prisma.refreshToken.update({
    where: { token: refreshToken },
    data: {
      token: newRefreshToken,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });

  res.json({ accessToken: newAccessToken, refreshToken: newRefreshToken });
});

authRouter.post('/logout', async (req, res) => {
  const { refreshToken } = req.body;
  if (refreshToken) {
    await prisma.refreshToken.deleteMany({ where: { token: refreshToken } });
  }
  res.json({ ok: true });
});

authRouter.get('/me', requireAuth, async (req: AuthRequest, res) => {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: req.userId } });
  res.json({
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    companyName: user.companyName,
    dotNumber: user.dotNumber,
    subscriptionStatus: user.subscriptionStatus,
    trialEndsAt: user.trialEndsAt,
    subscriptionEndsAt: user.subscriptionEndsAt,
  });
});

authRouter.post('/create-checkout-session', requireAuth, async (req: AuthRequest, res) => {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: req.userId } });
  const session = await createTrialSubscription(user);
  res.json({ url: session.url });
});
