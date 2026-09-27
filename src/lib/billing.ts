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
