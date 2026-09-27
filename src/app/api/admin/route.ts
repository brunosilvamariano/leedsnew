import { NextResponse } from "next/server";
import { currentUser, validOrigin } from "@/lib/access";
import { prisma } from "@/lib/prisma";
export async function GET() {
  const user = await currentUser();
  if (!user)
    return NextResponse.json(
      { error: "Entre para continuar." },
      { status: 401 },
    );
  if (user.role !== "ADMIN")
    return NextResponse.json({ error: "Acesso restrito." }, { status: 403 });
  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      role: true,
      suspended: true,
      createdAt: true,
      subscription: { select: { status: true, periodEnd: true } },
      _count: { select: { records: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({
    users,
    integrations: {
      google: Boolean(
        process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET,
      ),
      email: Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM),
      stripe: Boolean(
        process.env.STRIPE_SECRET_KEY &&
        process.env.STRIPE_PRICE_ID &&
        process.env.STRIPE_WEBHOOK_SECRET,
      ),
      places: Boolean(process.env.GOOGLE_PLACES_API_KEY),
    },
    billing: process.env.BILLING_ENABLED !== "false",
  });
}
export async function PATCH(request: Request) {
  const user = await currentUser();
  if (!user)
    return NextResponse.json(
      { error: "Entre para continuar." },
      { status: 401 },
    );
  if (user.role !== "ADMIN" || !validOrigin(request))
    return NextResponse.json({ error: "Acesso restrito." }, { status: 403 });
  const body = await request.json().catch(() => null);
  if (
    !body ||
    typeof body.id !== "string" ||
    typeof body.suspended !== "boolean"
  )
    return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
  const result = await prisma.user.updateMany({
    where: { id: body.id, role: "USER" },
    data: { suspended: body.suspended },
  });
  if (result.count && body.suspended)
    await prisma.session.deleteMany({ where: { userId: body.id } });
  return NextResponse.json(
    { ok: Boolean(result.count) },
    { status: result.count ? 200 : 400 },
  );
}
