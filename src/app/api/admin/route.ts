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
      trialStartsAt: true,
      trialEndsAt: true,
      createdAt: true,
      subscription: { select: { status: true, periodEnd: true } },
      _count: { select: { records: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({
    currentUserId: user.id,
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
  if (!body || typeof body.id !== "string" || typeof body.action !== "string")
    return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
  if (body.action === "suspension") {
    if (typeof body.suspended !== "boolean" || body.id === user.id)
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
  if (body.action === "role") {
    if (!["USER", "ADMIN"].includes(body.role) || body.id === user.id)
      return NextResponse.json(
        { error: "Não é possível alterar essa conta." },
        { status: 400 },
      );
    await prisma.user.update({
      where: { id: body.id },
      data: {
        role: body.role,
        ...(body.role === "ADMIN" ? { suspended: false } : {}),
      },
    });
    return NextResponse.json({ ok: true });
  }
  if (body.action === "trial") {
    if (body.id === user.id)
      return NextResponse.json(
        { error: "Administradores não precisam de teste." },
        { status: 400 },
      );
    if (body.startsAt === null && body.endsAt === null) {
      const result = await prisma.user.updateMany({
        where: { id: body.id, role: "USER" },
        data: { trialStartsAt: null, trialEndsAt: null },
      });
      return NextResponse.json(
        { ok: Boolean(result.count) },
        { status: result.count ? 200 : 400 },
      );
    }
    if (typeof body.startsAt !== "string" || typeof body.endsAt !== "string")
      return NextResponse.json(
        { error: "Informe o início e o fim do teste." },
        { status: 400 },
      );
    const startsAt = new Date(body.startsAt);
    const endsAt = new Date(body.endsAt);
    if (
      !Number.isFinite(startsAt.getTime()) ||
      !Number.isFinite(endsAt.getTime()) ||
      endsAt <= startsAt
    )
      return NextResponse.json(
        { error: "O fim deve ser posterior ao início." },
        { status: 400 },
      );
    const result = await prisma.user.updateMany({
      where: { id: body.id, role: "USER" },
      data: { trialStartsAt: startsAt, trialEndsAt: endsAt },
    });
    return NextResponse.json(
      { ok: Boolean(result.count) },
      { status: result.count ? 200 : 400 },
    );
  }
  return NextResponse.json({ error: "Ação inválida." }, { status: 400 });
}
