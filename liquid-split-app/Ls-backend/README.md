
# LiquidSplit Backend — Stripe Integration

## Quickstart: Stripe Webhooks & CLI

1. **Install dependencies**
   ```powershell
   npm install
   ```

2. **Configure environment**
   - Copy `.env.example` to `.env` and fill in:
     - `DATABASE_URL` (Postgres)
     - `JWT_SECRET`
     - `STRIPE_SECRET_KEY` (from Stripe Dashboard, test mode)
     - `STRIPE_PUBLISHABLE_KEY` (from Stripe Dashboard, test mode)
     - `STRIPE_WEBHOOK_SECRET` (from Stripe CLI or Dashboard)
     - `STRIPE_ONBOARD_RETURN_URL` / `STRIPE_ONBOARD_REFRESH_URL` (your frontend URLs)

3. **Run database migrations**
   ```powershell
   npm run migrate
   # or
   npx prisma migrate dev --schema src/prisma/schema.prisma
   ```

4. **Start backend**
   ```powershell
   npm run dev
   # Health check: http://localhost:4000/health
   ```

5. **Stripe CLI: Webhook forwarding**
   - Download Stripe CLI: https://stripe.com/docs/stripe-cli
   - Add to PATH or run by full path:
     ```powershell
     stripe login
     stripe listen --forward-to http://localhost:4000/stripe/webhook
     ```
   - Copy the printed `whsec_...` secret into `.env` as `STRIPE_WEBHOOK_SECRET`.

6. **Send test events**
   - In a new terminal:
     ```powershell
     stripe trigger payment_intent.succeeded
     stripe trigger payment_intent.payment_failed
     ```
   - Check backend logs for event handling.

## Troubleshooting
- **Stripe webhook 400 errors:**
  - Ensure `/stripe/webhook` uses `express.raw({ type: "application/json" })` and is mounted before any body parser.
  - Restart backend after `.env` changes.
- **Database errors:**
  - Run migrations and check your `DATABASE_URL`.

## Useful Commands
```powershell
npm run dev           # Start backend (nodemon)
npm run migrate       # Run migrations
stripe listen --forward-to http://localhost:4000/stripe/webhook  # Stripe CLI webhook
stripe trigger payment_intent.succeeded  # Send test event
```

---

For full docs, see [Stripe](https://stripe.com/docs).
