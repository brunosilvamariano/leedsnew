-- Add administrator-controlled free-trial windows without altering Stripe subscriptions.
ALTER TABLE "user"
ADD COLUMN IF NOT EXISTS "trialStartsAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "trialEndsAt" TIMESTAMP(3);
