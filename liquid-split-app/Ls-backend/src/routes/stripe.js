import express from "express";
import Stripe from "stripe";
import { PrismaClient } from "@prisma/client";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const prisma = new PrismaClient();
const router = express.Router();

// Optional: simple ping to confirm router is mounted
router.get("/ping", (req, res) => res.json({ ok: true }));

// ===== Webhook handler (must receive raw body) =====
export async function stripeWebhook(req, res) {
  console.log("Webhook called, typeof req.body:", typeof req.body, "length:", req.body.length);
  const sig = req.headers["stripe-signature"];
  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    return res.status(500).json({ error: "Missing STRIPE_WEBHOOK_SECRET" });
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case "payment_intent.succeeded": {
        const pi = event.data.object;
        const txId = Number(pi.metadata?.transactionId);
        const potId = Number(pi.metadata?.potId);
        const totalCents = pi.amount_received ?? pi.amount;

        if (Number.isFinite(txId)) {
          // Mark transaction executed (idempotent)
          await prisma.transaction
            .update({
              where: { id: txId },
              data: { status: "EXECUTED" },
            })
            .catch(() => undefined);
        }

        if (Number.isFinite(potId) && Number.isFinite(totalCents)) {
          // Increment pot total by dollars (assuming totalAmount is in dollars)
          await prisma.pot
            .update({
              where: { id: potId },
              data: { totalAmount: { increment: totalCents / 100 } },
            })
            .catch(() => undefined);
        }

        console.log("✅ payment_intent.succeeded:", pi.id);
        break;
      }

      case "payment_intent.payment_failed": {
        const pi = event.data.object;
        const txId = Number(pi.metadata?.transactionId);
        if (Number.isFinite(txId)) {
          await prisma.transaction
            .update({
              where: { id: txId },
              data: { status: "FAILED" },
            })
            .catch(() => undefined);
        }
        console.log("❌ payment_intent.payment_failed:", pi.id);
        break;
      }

      default:
        console.log("ℹ️ Unhandled event:", event.type);
        break;
    }

    return res.json({ received: true });
  } catch (err) {
    console.error("🔥 Webhook handler error:", err);
    return res.status(500).json({ error: "Webhook processing failed" });
  }
}

export default router;