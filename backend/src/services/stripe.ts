import Stripe from 'stripe';
import { prisma } from '../lib/prisma';
import { User } from '@prisma/client';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
});

export { stripe };

export async function createStripeCustomer(
  userId: string,
  email: string,
  name: string,
): Promise<string> {
  const customer = await stripe.customers.create({ email, name });
  await prisma.user.update({
    where: { id: userId },
    data: { stripeCustomerId: customer.id },
  });
  return customer.id;
}

export async function createTrialSubscription(user: User) {
  let customerId = user.stripeCustomerId;
  if (!customerId) {
    customerId = await createStripeCustomer(
      user.id,
      user.email,
      `${user.firstName} ${user.lastName}`,
    );
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    payment_method_types: ['card'],
    mode: 'subscription',
    subscription_data: {
      trial_period_days: 14,
      metadata: { userId: user.id },
    },
    line_items: [
      {
        price: process.env.STRIPE_PRICE_ID!,
        quantity: 1,
      },
    ],
    success_url: `${process.env.FRONTEND_URL}/dashboard?subscription=success`,
    cancel_url: `${process.env.FRONTEND_URL}/pricing`,
    metadata: { userId: user.id },
  });

  return session;
}

export async function handleWebhookEvent(body: Buffer, signature: string) {
  const event = stripe.webhooks.constructEvent(
    body,
    signature,
    process.env.STRIPE_WEBHOOK_SECRET!,
  );

  switch (event.type) {
    case 'customer.subscription.created':
    case 'customer.subscription.updated': {
      const sub = event.data.object as Stripe.Subscription;
      const userId = sub.metadata?.userId;
      if (!userId) break;

      const status = sub.status === 'active' ? 'ACTIVE'
        : sub.status === 'past_due' ? 'PAST_DUE'
        : sub.status === 'canceled' ? 'CANCELLED'
        : sub.status === 'trialing' ? 'TRIAL'
        : 'EXPIRED';

      await prisma.user.update({
        where: { id: userId },
        data: {
          stripeSubscriptionId: sub.id,
          subscriptionStatus: status as any,
          subscriptionEndsAt: sub.current_period_end
            ? new Date(sub.current_period_end * 1000)
            : null,
        },
      });
      break;
    }

    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription;
      const userId = sub.metadata?.userId;
      if (!userId) break;
      await prisma.user.update({
        where: { id: userId },
        data: { subscriptionStatus: 'CANCELLED', stripeSubscriptionId: null },
      });
      break;
    }
  }

  return event;
}
