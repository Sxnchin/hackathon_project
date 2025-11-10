# LiquidSplit Monorepo

LiquidSplit is a full-stack platform for creating shared “pots”, tracking contributions, minting receipt NFTs, and eventually distributing payouts. This repository contains everything you need to run the product locally:

- **`Ls-backend/`** — Express + Prisma API with Stripe onboarding, auth, NFT minting helpers, and wallet-pass endpoints.
- **`LS-frontend/`** — React (Vite) single-page app for the customer experience and operational demo flows.
- **`shared/`** — Small utilities that are consumed by multiple services (currently password validation helpers).
- **Docs** — `NFT_INTEGRATION_GUIDE.md`, `COMPLETE_SYSTEM_SUMMARY.md`, per-package READMEs.

An iOS companion app (`LiquidSplitAppTime/`) lives in the root of this repo as well; see `App-Time/README.md` for platform-specific instructions.

## Prerequisites

- Node.js 20+ and npm 10+
- PostgreSQL 14+ (local instance or a cloud database)
- Stripe test account + Stripe CLI (for webhook testing)
- Optional: Xcode 15+ if you plan to run the SwiftUI client

## Repository Layout

```
liquid-split-app/
├── LS-frontend/          # React client (Vite)
├── Ls-backend/           # Express API + Stripe/NFT logic
├── shared/               # Cross-package helpers
├── NFT_INTEGRATION_GUIDE.md
├── COMPLETE_SYSTEM_SUMMARY.md
└── README.md             # (this file)
```

## Backend Quick Start (`Ls-backend/`)

```bash
cd Ls-backend
npm install
cp .env.example .env      # edit values described below
npm run migrate           # prisma migrate dev --schema src/prisma/schema.prisma
npm run dev               # http://localhost:4000
```

Minimum `.env` values (see `Ls-backend/.env.example` for the full list):

| Variable | Description |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Secret for signing auth tokens |
| `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY` | Stripe API credentials (test mode) |
| `STRIPE_WEBHOOK_SECRET` | From `stripe listen` |
| `STRIPE_ONBOARD_RETURN_URL`, `STRIPE_ONBOARD_REFRESH_URL` | Frontend URLs that receive Stripe onboarding callbacks |

Helpful commands:

```bash
npm run dev                # Start API with nodemon
npm run migrate            # Prisma migrate dev
npm run seed               # Optional local sample data
stripe listen --forward-to http://localhost:4000/stripe/webhook
stripe trigger payment_intent.succeeded
```

See `Ls-backend/README.md` for troubleshooting tips (webhooks, database resets, NFT deploy scripts, etc.).

## Frontend Quick Start (`LS-frontend/`)

```bash
cd LS-frontend
npm install
npm run dev                # Runs Vite on http://localhost:5173
```

The SPA assumes the API is available at `http://localhost:4000`. If your backend runs elsewhere, update the hard-coded URLs in `components/pots.jsx`, `components/demo.jsx`, and related fetch calls (or introduce a `VITE_API_BASE_URL` helper).

Available scripts:

- `npm run dev` — local dev server (with hot module replacement)
- `npm run build` — production bundle
- `npm run preview` — serves the built bundle on a local port
- `npm run lint` — ESLint against the React codebase

## Native App (`App-Time/LiquidSplitAppTime/`)

The SwiftUI client shares the same API. When running on simulator `http://localhost:4000` works out of the box. For physical devices, set `LIQUIDSPLIT_API_BASE_URL` in the **Run scheme** or Info.plist so the device can reach your Mac over LAN. Detailed instructions live in `App-Time/README.md`.

## Shared Utilities

Place reusable logic under `shared/` and import it from whichever runtime needs it. Right now it only hosts password validation helpers, but it’s a good home for future cross-cutting code (email templates, schema definitions, etc.).

## Recommended Dev Workflow

1. **Start PostgreSQL** (Docker, local service, or cloud).
2. **Run the backend** (`npm run dev` inside `Ls-backend/`). Confirm `GET /health` responds 200.
3. **Start the frontend** (`npm run dev` inside `LS-frontend/`). The SPA proxies directly to `localhost:4000`.
4. Optional: **launch the iOS app** from Xcode to test native flows.
5. Use the Stripe CLI (`stripe listen`) to receive test webhooks if you need the onboarding/payments flows.

## Additional Documentation

- `Ls-backend/README.md` — Stripe CLI walkthrough, migrations, and troubleshooting.
- `NFT_INTEGRATION_GUIDE.md` — Notes on NFT metadata + contract deployment.
- `COMPLETE_SYSTEM_SUMMARY.md` — High-level architecture overview.

---

Questions or bugs? Open an issue or ping the team before pushing changes so we keep the monorepo healthy. Happy hacking! 🚀
