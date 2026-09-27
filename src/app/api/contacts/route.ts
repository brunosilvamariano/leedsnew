import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { currentUser, validOrigin } from "@/lib/access";
import { canWrite } from "@/lib/billing";
import { prisma } from "@/lib/prisma";
export async function POST(request: Request) {
  const user = await currentUser();
  if (!user)
    return NextResponse.json(
      { error: "Entre para continuar." },
      { status: 401 },
    );
  if (!validOrigin(request))
    return NextResponse.json({ error: "Origem inválida." }, { status: 403 });
  if (!(await canWrite(user)))
    return NextResponse.json(
      { error: "Ative sua assinatura em Meu plano." },
      { status: 402 },
    );
  const body = await request.json().catch(() => null);
  if (!body || typeof body.leadId !== "string")
    return NextResponse.json({ error: "Informe um lead." }, { status: 400 });
  const lead = await prisma.workspaceRecord.findFirst({
    where: { id: body.leadId, userId: user.id, kind: "lead" },
  });
  if (!lead)
    return NextResponse.json(
      { error: "Lead não encontrado." },
      { status: 404 },
    );
  const data = lead.data as Record<string, Prisma.JsonValue>,
    date = new Date().toISOString();
  await prisma.$transaction([
    prisma.workspaceRecord.updateMany({
      where: { id: lead.id, userId: user.id },
      data: {
        data: {
          ...data,
          contactAt: date,
          stage:
            !data.stage || data.stage === "Novo" ? "Contatado" : data.stage,
        } as Prisma.InputJsonValue,
      },
    }),
    prisma.workspaceRecord.create({
      data: {
        userId: user.id,
        kind: "event",
        data: {
          title: `Contato com ${String(data.name)}`,
          date,
          leadId: lead.id,
          detail: "Contato registrado na área de leads.",
          done: true,
          type: "Follow-up",
        },
      },
    }),
  ]);
  return NextResponse.json({ ok: true });
}
