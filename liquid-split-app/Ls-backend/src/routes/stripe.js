import dotenv from "dotenv";
dotenv.config(); // ✅ must come before using process.env

import express from "express";
import Stripe from "stripe";
import { PrismaClient } from "@prisma/client";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const prisma = new PrismaClient();
const router = express.Router();

// ===== Simple Ping Route =====
router.get("/ping", (req, res) => res.json({ ok: true }));

// ===== Stripe Connect Onboarding (Express) =====
// Enables users to connect their Stripe account for payouts, a core feature for split payments.
router.post("/onboard", async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: "Missing userId" });

    // Find or create Stripe account for user
    let user = await prisma.user.findUnique({ where: { id: Number(userId) } });
    if (!user) return res.status(404).json({ error: "User not found" });

    let account;
    if (user.stripeAccountId) {
      account = await stripe.accounts.retrieve(user.stripeAccountId);
      console.log("🔗 Reusing existing Stripe account for user:", userId);
    } else {
      account = await stripe.accounts.create({
        type: "express",
        country: "US",
        email: user.email,
        capabilities: { transfers: { requested: true } },
      });
      await prisma.user.update({ where: { id: user.id }, data: { stripeAccountId: account.id } });
      console.log("✨ Created new Stripe account for user:", userId);
    }

    // Generate onboarding link
    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: process.env.STRIPE_ONBOARD_REFRESH_URL,
      return_url: process.env.STRIPE_ONBOARD_RETURN_URL,
      type: "account_onboarding",
    });

    res.json({ url: accountLink.url });
  } catch (err) {
    console.error("❌ Stripe onboard error:", err);
    res.status(500).json({ error: "Failed to create onboarding link" });
  }
});

// ===== Get Stripe Account Info for User =====
// Lets frontend check if a user is connected to Stripe, useful for onboarding status and payout eligibility.
router.get("/account/:userId", async (req, res) => {
  try {
    const userId = Number(req.params.userId);
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json({ id: user.id, name: user.name, email: user.email, stripeAccountId: user.stripeAccountId });
    console.log("🔍 Fetched Stripe account info for user:", userId);
  } catch (err) {
    console.error("❌ Error fetching user account:", err);
    res.status(500).json({ error: "Failed to fetch user" });
  }
});

// ===== Create Split PaymentIntents for Pot Members =====
// Core logic for splitting payments among group members, enabling multi-user checkout.
router.post("/charge", async (req, res) => {
  try {
    const { potId, amount, description, payerUserIds } = req.body;
    if (!potId || !amount || !Array.isArray(payerUserIds) || payerUserIds.length === 0)
      return res.status(400).json({ error: "potId, amount, payerUserIds required" });

    // Get pot members and shares
    const pot = await prisma.pot.findUnique({
      where: { id: Number(potId) },
      include: { members: true },
    });
    if (!pot) return res.status(404).json({ error: "Pot not found" });

    // For each payer, create a PaymentIntent for their share
    const paymentIntents = [];
    for (const member of pot.members) {
      if (!payerUserIds.includes(member.userId)) continue;
      const shareAmount = Math.round(amount * member.share * 100); // cents
      if (shareAmount <= 0) continue;
      const user = await prisma.user.findUnique({ where: { id: member.userId } });
      if (!user) continue;
      const pi = await stripe.paymentIntents.create({
        amount: shareAmount,
        currency: "usd",
        description: description || `Split payment for pot ${potId}`,
        metadata: { potId: potId, userId: member.userId },
        receipt_email: user.email,
      });
      paymentIntents.push({ userId: member.userId, paymentIntentId: pi.id, clientSecret: pi.client_secret });
      console.log(`💸 Created PaymentIntent for user ${member.userId}: $${(shareAmount/100).toFixed(2)}`);
    }

    res.json({ paymentIntents });
  } catch (err) {
    console.error("❌ Stripe charge error:", err);
    res.status(500).json({ error: "Failed to create split payments" });
  }
});

// ===== Webhook Handler =====
export async function stripeWebhook(req, res) {
  console.log("🔔 Stripe webhook received:", req.headers["stripe-signature"] ? "signature present" : "no signature");

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
    console.error("❌ Webhook signature verification failed:", err.message);
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
          await prisma.transaction
            .update({
              where: { id: txId },
              data: { status: "EXECUTED" },
            })
            .catch(() => undefined);
        }

        if (Number.isFinite(potId) && Number.isFinite(totalCents)) {
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
        console.log("ℹ️ Unhandled event type:", event.type);
        break;
    }

    return res.json({ received: true });
  } catch (err) {
    console.error("🔥 Webhook handler error:", err);
    return res.status(500).json({ error: "Webhook processing failed" });
  }
}

// ===== Create Payment Intent =====
router.post("/create-payment-intent", async (req, res) => {
  try {
    const { amount, potId, transactionId } = req.body;

    if (!amount || !potId || !transactionId) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // convert dollars to cents
      currency: "usd",
      metadata: { potId, transactionId },
    });

    res.json({ clientSecret: paymentIntent.client_secret });
  } catch (err) {
    console.error("🔥 Stripe PaymentIntent error:", err);
    res.status(500).json({ error: "Failed to create payment intent" });
  }
});

export default router;