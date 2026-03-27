import { Router } from 'express';
import { handleWebhookEvent, stripe } from '../services/stripe';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';

export const stripeRouter = Router();

// Webhook — raw body required (mounted before json middleware in index.ts)
stripeRouter.post('/webhook', async (req, res) => {
  const sig = req.headers['stripe-signature'];
  if (!sig || typeof sig !== 'string') throw new AppError(400, 'Missing stripe signature');

  await handleWebhookEvent(req.body as Buffer, sig);
  res.json({ received: true });
});

// Customer portal for managing subscription
stripeRouter.post('/portal', requireAuth, async (req: AuthRequest, res) => {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: req.userId } });
  if (!user.stripeCustomerId) throw new AppError(400, 'No billing account found');

  const session = await stripe.billingPortal.sessions.create({
    customer: user.stripeCustomerId,
    return_url: `${process.env.FRONTEND_URL}/settings`,
  });
  res.json({ url: session.url });
});
