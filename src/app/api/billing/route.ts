import { NextResponse } from "next/server";
import { currentUser, validOrigin } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { stripeClient } from "@/lib/billing";
export async function GET() {
  const user = await currentUser();
  if (!user)
    return NextResponse.json(
      { error: "Entre para continuar." },
      { status: 401 },
    );
  const sub = await prisma.subscription.findUnique({
    where: { userId: user.id },
  });
  const now = new Date();
  const manualTrialStatus =
    user.trialStartsAt && user.trialEndsAt
      ? user.trialStartsAt > now
        ? "scheduled"
        : user.trialEndsAt > now
          ? "active"
          : "expired"
      : "none";
  return NextResponse.json({
    status: sub?.status || "inactive",
    periodEnd: sub?.periodEnd,
    cancelAtPeriodEnd: sub?.cancelAtPeriodEnd,
    hasCustomer: Boolean(sub?.customerId),
    enabled: process.env.BILLING_ENABLED !== "false",
    configured: Boolean(
      process.env.STRIPE_SECRET_KEY &&
      process.env.STRIPE_PRICE_ID &&
      process.env.STRIPE_WEBHOOK_SECRET,
    ),
    admin: user.role === "ADMIN",
    manualTrialStatus,
    manualTrialStartsAt: user.trialStartsAt,
    manualTrialEndsAt: user.trialEndsAt,
  });
}
export async function POST(request: Request) {
  const user = await currentUser();
  if (!user)
    return NextResponse.json(
      { error: "Entre para continuar." },
      { status: 401 },
    );
  if (!validOrigin(request))
    return NextResponse.json({ error: "Origem inválida." }, { status: 403 });
  try {
    const { action } = await request.json();
    const stripe = stripeClient(),
      base = process.env.BETTER_AUTH_URL!;
    const sub = await prisma.subscription.findUnique({
      where: { userId: user.id },
    });
    if (action === "portal") {
      if (!sub?.customerId)
        return NextResponse.json(
          { error: "Você ainda não possui uma assinatura." },
          { status: 400 },
        );
      const portal = await stripe.billingPortal.sessions.create({
        customer: sub.customerId,
        return_url: `${base}/assinatura`,
      });
      return NextResponse.json({ url: portal.url });
    }
    if (action !== "checkout")
      return NextResponse.json({ error: "Ação inválida." }, { status: 400 });
    if (!process.env.STRIPE_PRICE_ID || !process.env.STRIPE_WEBHOOK_SECRET)
      throw new Error("Configure preço e webhook antes de iniciar vendas.");
    const price = await stripe.prices.retrieve(process.env.STRIPE_PRICE_ID);
    if (
      price.currency !== "brl" ||
      price.unit_amount !== 5000 ||
      price.recurring?.interval !== "month" ||
      price.recurring.interval_count !== 1 ||
      !price.active
    )
      throw new Error("O plano deve custar R$ 50,00 por mês.");
    const result = await prisma.$transaction(
      async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${user.id}))`;
        let current = await tx.subscription.upsert({
          where: { userId: user.id },
          create: { userId: user.id },
          update: {},
        });
        if (!current.customerId) {
          const customer = await stripe.customers.create(
            {
              email: user.email,
              name: user.name,
              metadata: { userId: user.id },
            },
            { idempotencyKey: `customer-${user.id}` },
          );
          current = await tx.subscription.update({
            where: { userId: user.id },
            data: { customerId: customer.id },
          });
        }
        const subscriptions = await stripe.subscriptions.list({
          customer: current.customerId!,
          status: "all",
          limit: 100,
        });
        if (
          subscriptions.data.some((s) =>
            [
              "active",
              "trialing",
              "past_due",
              "unpaid",
              "incomplete",
              "paused",
            ].includes(s.status),
          )
        )
          throw new Error(
            "Já existe uma assinatura. Use Gerenciar assinatura.",
          );
        const sessions = await stripe.checkout.sessions.list({
          customer: current.customerId!,
          limit: 20,
        });
        const pending = sessions.data.find(
          (s) => s.mode === "subscription" && s.status === "open",
        );
        if (pending?.url) return pending.url;
        const checkout = await stripe.checkout.sessions.create({
          mode: "subscription",
          customer: current.customerId!,
          client_reference_id: user.id,
          line_items: [{ price: price.id, quantity: 1 }],
          subscription_data: { metadata: { userId: user.id } },
          success_url: `${base}/assinatura?success=1`,
          cancel_url: `${base}/assinatura`,
          locale: "pt-BR",
        });
        return checkout.url;
      },
      { timeout: 30000 },
    );
    return NextResponse.json({ url: result });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error && !error.message.includes("sk_")
            ? error.message
            : "Não foi possível abrir o pagamento.",
      },
      { status: 400 },
    );
  }
}
