import Stripe from "stripe";
import { prisma } from "./prisma";
export function stripeClient() {
  if (!process.env.STRIPE_SECRET_KEY)
    throw new Error("Pagamento ainda não configurado.");
  return new Stripe(process.env.STRIPE_SECRET_KEY);
}
export async function canWrite(user: { id: string; role: string }) {
  if (user.role === "ADMIN" || process.env.BILLING_ENABLED === "false")
    return true;
  const account = await prisma.user.findUnique({
    where: { id: user.id },
    select: { trialStartsAt: true, trialEndsAt: true },
  });
  const now = new Date();
  if (
    account?.trialStartsAt &&
    account.trialEndsAt &&
    account.trialStartsAt <= now &&
    account.trialEndsAt > now
  )
    return true;
  const subscription = await prisma.subscription.findUnique({
    where: { userId: user.id },
  });
  return Boolean(
    subscription &&
    ["active", "trialing"].includes(subscription.status) &&
    subscription.periodEnd &&
    subscription.periodEnd > new Date(),
  );
}
