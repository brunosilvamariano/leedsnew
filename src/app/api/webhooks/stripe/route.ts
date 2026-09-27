import { NextResponse } from "next/server";
import Stripe from "stripe";
import { stripeClient } from "@/lib/billing";
import { prisma } from "@/lib/prisma";
export async function POST(request: Request) {
  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET)
    return NextResponse.json(
      { error: "Webhook indisponível." },
      { status: 503 },
    );
  const stripe = stripeClient();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      await request.text(),
      request.headers.get("stripe-signature") || "",
      process.env.STRIPE_WEBHOOK_SECRET,
    );
  } catch {
    return NextResponse.json(
      { error: "Assinatura inválida." },
      { status: 400 },
    );
  }
  const allowed = [
    "checkout.session.completed",
    "customer.subscription.created",
    "customer.subscription.updated",
    "customer.subscription.deleted",
    "invoice.paid",
    "invoice.payment_failed",
  ];
  if (!allowed.includes(event.type))
    return NextResponse.json({ received: true });
  const object = event.data.object as unknown as {
    customer?: string | { id: string };
  };
  const customerId =
    typeof object.customer === "string" ? object.customer : object.customer?.id;
  if (!customerId) return NextResponse.json({ received: true });
  const owner = await prisma.subscription.findUnique({ where: { customerId } });
  if (!owner) return NextResponse.json({ received: true });
  try {
    await prisma.$transaction(
      async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${owner.userId}))`;
        // Retrieve current provider state under the same lock: retries and out-of-order events cannot restore stale access.
        const subscriptions = await stripe.subscriptions.list({
          customer: customerId,
          status: "all",
          limit: 100,
        });
        const relevant = subscriptions.data.filter((s) =>
          s.items.data.some((i) => i.price.id === process.env.STRIPE_PRICE_ID),
        );
        const current =
          relevant.find((s) => ["active", "trialing"].includes(s.status)) ||
          relevant.sort((a, b) => b.created - a.created)[0];
        await tx.subscription.update({
          where: { userId: owner.userId },
          data: {
            stripeId: current?.id || null,
            status: current?.status || "inactive",
            cancelAtPeriodEnd: current?.cancel_at_period_end || false,
            periodEnd: current?.items.data[0]?.current_period_end
              ? new Date(current.items.data[0].current_period_end * 1000)
              : null,
          },
        });
      },
      { timeout: 30000 },
    );
    return NextResponse.json({ received: true });
  } catch {
    return NextResponse.json({ error: "Tente novamente." }, { status: 500 });
  }
}
