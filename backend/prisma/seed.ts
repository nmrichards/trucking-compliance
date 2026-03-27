import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // Demo user for development
  const hash = await bcrypt.hash('password123', 12);
  const trialEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

  const user = await prisma.user.upsert({
    where: { email: 'demo@truckguard.app' },
    update: {},
    create: {
      email: 'demo@truckguard.app',
      passwordHash: hash,
      firstName: 'Demo',
      lastName: 'Driver',
      companyName: 'Demo Trucking LLC',
      dotNumber: '1234567',
      subscriptionStatus: 'TRIAL',
      trialEndsAt,
    },
  });

  console.log('Seeded demo user:', user.email);

  // Seed some sample deadlines
  const deadlines = [
    {
      title: 'DOT Medical Certificate Renewal',
      category: 'MEDICAL' as const,
      dueDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
      recurrence: 'ANNUAL' as const,
    },
    {
      title: 'IFTA Q1 Filing',
      category: 'IFTA_FILING' as const,
      dueDate: new Date(new Date().getFullYear(), 3, 30), // April 30
      recurrence: 'QUARTERLY' as const,
    },
    {
      title: 'UCR Annual Registration',
      category: 'UCR_RENEWAL' as const,
      dueDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      recurrence: 'ANNUAL' as const,
    },
    {
      title: 'FMCSA Clearinghouse Annual Query',
      category: 'CLEARINGHOUSE' as const,
      dueDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000),
      recurrence: 'ANNUAL' as const,
      externalUrl: 'https://clearinghouse.fmcsa.dot.gov',
    },
  ];

  for (const d of deadlines) {
    await prisma.complianceDeadline.create({
      data: { ...d, userId: user.id },
    });
  }

  console.log('Seeded', deadlines.length, 'sample deadlines');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
