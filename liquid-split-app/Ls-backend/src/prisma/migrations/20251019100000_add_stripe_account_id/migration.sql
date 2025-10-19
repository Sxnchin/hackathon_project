-- Add stripeAccountId column to User
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "stripeAccountId" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "User_stripeAccountId_key" ON "User"("stripeAccountId");
