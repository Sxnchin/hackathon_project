import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import morgan from "morgan";
import { PrismaClient } from "@prisma/client";


import potRoutes from "./routes/pots.js";
import receiptsRoutes from "./routes/receipts.js";
import authRoutes from "./routes/auth.js";
import transactionsRoutes from "./routes/transactions.js";
import stripeRoutes, { stripeWebhook } from "./routes/stripe.js";
import friendsRoutes from "./routes/friends.js";
import groupsRoutes from "./routes/groups.js";
import { auth } from "./middleware/auth.js";

dotenv.config();

// ===== Validate environment variables =====
const requiredEnv = ["DATABASE_URL", "JWT_SECRET"];
for (const key of requiredEnv) {
  if (!process.env[key]) throw new Error(`❌ Missing environment variable: ${key}`);
}

// ===== Initialize App & Database =====
const app = express();
const prisma = new PrismaClient();

// ===== Proxy & HTTPS enforcement (Production only) =====
if (process.env.NODE_ENV === "production") {
  app.enable("trust proxy");
  app.use((req, res, next) => {
    if (req.secure) return next();
    return res.redirect(`https://${req.headers.host}${req.url}`);
  });
}

// ===== Security Middlewares =====
app.disable("x-powered-by");
app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN || "*" }));

// ✅ Mount webhook FIRST (Stripe requires raw body)
app.post("/stripe/webhook", express.raw({ type: "application/json" }), stripeWebhook);

// ✅ Exclude Stripe webhooks from JSON parsing
app.use((req, res, next) => {
  if (req.originalUrl === "/stripe/webhook") {
    next(); // Skip JSON parsing for Stripe webhook
  } else {
    express.json({ limit: "1mb" })(req, res, next);
  }
});

// ===== Stronger CSP for production =====
if (process.env.NODE_ENV === "production") {
  app.use(
    helmet.contentSecurityPolicy({
      directives: {
        defaultSrc: ["'self'"],
        connectSrc: ["'self'", "*"],
        imgSrc: ["'self'", "data:"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
      },
    })
  );
}

// ===== Rate Limiting =====
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per window
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// ===== Logging =====
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

// ===== Health Check =====
app.get("/health", (req, res) => res.send("💧 Ls-backend up and running!"));

// ===== Routes =====
app.use("/auth", authRoutes);                   // public (register/login)
app.use("/pots/:potId/receipts", auth, receiptsRoutes); // protected
app.use("/pots", auth, potRoutes);              // protected
app.use("/transactions", auth, transactionsRoutes); // protected
app.use("/stripe", stripeRoutes);               // protected
app.use("/friends", auth, friendsRoutes);       // protected
app.use("/groups", auth, groupsRoutes);         // protected

// ===== 404 Handler =====
app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// ===== Central Error Handler =====
app.use((err, req, res, next) => {
  console.error("🔥 Error:", err);
  const status = err.status || 500;
  const message =
    process.env.NODE_ENV === "production"
      ? "Internal Server Error"
      : err.message;
  res.status(status).json({ error: message });
});

// ===== Start Server =====
const PORT = process.env.PORT || 4000;
app.listen(PORT, () =>
  console.log(`🚀 Ls-backend running securely on port ${PORT}`)
);
