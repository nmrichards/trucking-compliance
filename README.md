# TruckGuard

All-in-one trucker compliance SaaS. $79/month per driver. Replaces the $114/month compliance patchwork owner-operators currently piece together.

## Features

- **Compliance Calendar** — every DOT/FMCSA deadline with recurring reminders
- **Driver Qualification File (DQF)** — CDL, medical cert, MVR, employment history
- **IFTA Tracker** — quarterly filing guide, mileage log, fuel tracking by state
- **Drug Testing** — consortium enrollment + random test log
- **Renewal Alerts** — operating authority, insurance, IRP, UCR, BOC-3
- **Auth + Billing** — JWT auth, Stripe $79/month subscriptions, 14-day free trial
- **Mobile PWA** — installable, works offline

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | React 18 + TypeScript + Vite + TailwindCSS + vite-plugin-pwa |
| Backend | Node.js + Express + TypeScript |
| Database | PostgreSQL + Prisma ORM |
| Auth | JWT (15m access + 30d refresh tokens) |
| Billing | Stripe (subscriptions) |
| Deployment | Railway (API + Frontend) |

## Quick Start (< 15 minutes)

### Prerequisites
- Node 20+
- Docker + Docker Compose
- Stripe account (for billing)

### 1. Clone and install

```bash
git clone <repo-url> truckguard
cd truckguard
cp .env.example .env
npm install
```

### 2. Configure environment

Edit `.env` and add your Stripe keys:
```
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PRICE_ID=price_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

To get a `STRIPE_PRICE_ID`:
1. Go to [Stripe Dashboard → Products](https://dashboard.stripe.com/products)
2. Create product: "TruckGuard" → $79/month recurring
3. Copy the Price ID

### 3. Start the stack

```bash
docker compose up -d
```

This starts:
- PostgreSQL on port 5432
- API on port 3001
- Frontend on port 5173

### 4. Run migrations and seed

```bash
cd backend
npm run db:migrate
npx tsx prisma/seed.ts
```

Demo account: `demo@truckguard.app` / `password123`

### 5. Forward Stripe webhooks (for billing)

```bash
stripe listen --forward-to localhost:3001/api/stripe/webhook
```

Copy the webhook secret into your `.env` as `STRIPE_WEBHOOK_SECRET`.

## Development

```bash
# Backend (with hot reload)
cd backend && npm run dev

# Frontend (with hot reload)
cd frontend && npm run dev

# Both together (from root)
npm run dev
```

## Deployment (Railway)

1. Push to GitHub
2. Connect repo in Railway dashboard
3. Add environment variables (DATABASE_URL auto-injected for Railway Postgres)
4. Deploy — migrations run automatically on startup

## API Routes

| Method | Route | Description |
|--------|-------|-------------|
| POST | /api/auth/register | Register + start trial |
| POST | /api/auth/login | Login |
| POST | /api/auth/refresh | Refresh tokens |
| GET | /api/auth/me | Current user |
| GET/POST | /api/compliance | Compliance deadlines |
| POST | /api/compliance/:id/complete | Mark deadline done |
| GET/POST | /api/dqf | DQF documents |
| GET/POST/PATCH | /api/ifta/quarters | IFTA quarters |
| GET/POST/DELETE | /api/ifta/mileage | Mileage logs |
| POST | /api/ifta/fuel-logs | Fuel purchase logs |
| GET/POST | /api/drug-tests | Drug tests |
| GET/PUT | /api/drug-tests/consortium | Consortium enrollment |
| GET/POST | /api/renewals | Renewal items |
| POST | /api/renewals/:id/renew | Record renewal |
| POST | /api/auth/create-checkout-session | Start Stripe checkout |
| POST | /api/stripe/portal | Open billing portal |
| POST | /api/stripe/webhook | Stripe webhook handler |
