import 'express-async-errors';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import { authRouter } from './routes/auth';
import { complianceRouter } from './routes/compliance';
import { dqfRouter } from './routes/dqf';
import { iftaRouter } from './routes/ifta';
import { drugTestRouter } from './routes/drugTest';
import { renewalRouter } from './routes/renewal';
import { stripeRouter } from './routes/stripe';
import { errorHandler } from './middleware/errorHandler';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Stripe webhook needs raw body — mount before JSON middleware
app.use('/api/stripe/webhook', express.raw({ type: 'application/json' }));

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/auth', authRouter);
app.use('/api/compliance', complianceRouter);
app.use('/api/dqf', dqfRouter);
app.use('/api/ifta', iftaRouter);
app.use('/api/drug-tests', drugTestRouter);
app.use('/api/renewals', renewalRouter);
app.use('/api/stripe', stripeRouter);

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`TruckGuard API running on port ${PORT}`);
});

export default app;
