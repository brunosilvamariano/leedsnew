import { canWrite } from "@/lib/billing";
import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { currentUser, validOrigin } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { stages } from "@/lib/crm-types";
import { daySchema, paymentPlanSchema } from "@/lib/payment-plan";
import { deliverN8nEvent } from "@/lib/n8n";

const text = z.string().max(10000);
const company = z
  .object({
    id: z.string().min(1).max(300),
    name: z.string().min(1).max(200),
    score: z.number().min(0).max(100),
    stage: z.enum(stages).optional(),
    value: z.number().min(0).max(1e12).optional(),
    contactAt: z.iso.datetime().optional(),
    paymentPlan: paymentPlanSchema.optional(),
  })
  .passthrough();
const schemas = {
  lead: company,
  favorite: company,
  note: z.object({
    title: z.string().min(1).max(200),
    content: text,
    category: z.string().max(80),
    color: z.enum(["violet", "mint", "peach", "blue", "rose"]),
    pinned: z.boolean(),
    date: daySchema.optional(),
    repeatYearly: z.boolean().optional(),
  }),
  event: z.object({
    title: z.string().min(1).max(200),
    date: z.iso.datetime(),
    leadId: z.string().max(300),
    detail: text,
    done: z.boolean(),
    type: z.enum(["Ligação", "WhatsApp", "Reunião", "Follow-up", "Proposta"]),
  }),
  search: z
    .object({
      id: z.string(),
      createdAt: z.iso.datetime(),
      query: z.string().max(200),
      companies: z.array(company).max(60),
    })
    .passthrough(),
};
export async function GET() {
  const user = await currentUser();
  if (!user)
    return NextResponse.json(
      { error: "Entre para continuar." },
      { status: 401 },
    );
  return NextResponse.json(
    await prisma.workspaceRecord.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "asc" },
    }),
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
export async function POST(request: Request) {
  const user = await currentUser();
  if (!user)
    return NextResponse.json(
      { error: "Entre para continuar." },
      { status: 401 },
    );
  if (!(await canWrite(user)))
    return NextResponse.json(
      {
        error: "Ative sua assinatura para salvar alterações. Acesse Meu plano.",
      },
      { status: 402 },
    );
  if (!validOrigin(request))
    return NextResponse.json({ error: "Origem inválida." }, { status: 403 });
  try {
    const raw = await request.text();
    if (raw.length > 350000)
      return NextResponse.json(
        { error: "Registro muito grande." },
        { status: 413 },
      );
    const body = z
      .object({
        id: z.string().max(300).optional(),
        kind: z.enum(["lead", "favorite", "note", "event", "search"]),
        data: z.unknown(),
      })
      .parse(JSON.parse(raw));
    const data = schemas[body.kind].parse(body.data) as Prisma.InputJsonValue;
    const previous = body.id
      ? await prisma.workspaceRecord.findFirst({
          where: { id: body.id, userId: user.id, kind: body.kind },
        })
      : null;
    if (body.id && !previous)
      return NextResponse.json(
        { error: "Registro não encontrado." },
        { status: 404 },
      );
    const recordCompletedContact = async () => {
      if (body.kind !== "event") return;
      const event = data as { done: boolean; leadId: string };
      if (
        !event.done ||
        !event.leadId ||
        (previous?.data as { done?: boolean })?.done
      )
        return;
      const lead = await prisma.workspaceRecord.findFirst({
        where: { id: event.leadId, userId: user.id, kind: "lead" },
      });
      if (lead) {
        const d = lead.data as Record<string, Prisma.JsonValue>;
        await prisma.workspaceRecord.updateMany({
          where: { id: lead.id, userId: user.id },
          data: {
            data: {
              ...d,
              contactAt: new Date().toISOString(),
              stage: !d.stage || d.stage === "Novo" ? "Contatado" : d.stage,
            } as Prisma.InputJsonValue,
          },
        });
      }
    };
    if (body.kind === "event") {
      const leadId = (data as { leadId: string }).leadId;
      if (
        leadId &&
        !(await prisma.workspaceRecord.findFirst({
          where: { userId: user.id, id: leadId, kind: "lead" },
        }))
      )
        return NextResponse.json(
          { error: "Lead não encontrado." },
          { status: 404 },
        );
    }
    if (body.id) {
      const result = await prisma.workspaceRecord.updateMany({
        where: { id: body.id, userId: user.id, kind: body.kind },
        data: { data },
      });
      if (!result.count)
        return NextResponse.json(
          { error: "Registro não encontrado." },
          { status: 404 },
        );
      await recordCompletedContact();
      const updated = await prisma.workspaceRecord.findFirst({
          where: { id: body.id, userId: user.id },
        });
      if (body.kind === "lead" && updated) {
        await deliverN8nEvent("lead.updated", user, updated);
      }
      return NextResponse.json(updated);
    }
    const created = await prisma.workspaceRecord.create({
      data: { userId: user.id, kind: body.kind, data },
    });
    await recordCompletedContact();
    if (body.kind === "lead") {
      await deliverN8nEvent("lead.created", user, created);
    }
    return NextResponse.json(created, { status: 201 });
  } catch {
    return NextResponse.json(
      {
        error: "Não foi possível salvar. Confira os campos e tente novamente.",
      },
      { status: 400 },
    );
  }
}
export async function DELETE(request: Request) {
  const user = await currentUser();
  if (!user)
    return NextResponse.json(
      { error: "Entre para continuar." },
      { status: 401 },
    );
  if (!(await canWrite(user)))
    return NextResponse.json(
      {
        error: "Ative sua assinatura para salvar alterações. Acesse Meu plano.",
      },
      { status: 402 },
    );
  if (!validOrigin(request))
    return NextResponse.json({ error: "Origem inválida." }, { status: 403 });
  const id = new URL(request.url).searchParams.get("id") || "";
  const result = await prisma.workspaceRecord.deleteMany({
    where: { id, userId: user.id },
  });
  return NextResponse.json(
    { ok: Boolean(result.count) },
    { status: result.count ? 200 : 404 },
  );
}
