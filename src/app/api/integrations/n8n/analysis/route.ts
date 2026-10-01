import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const payloadSchema = z.object({
  recordId: z.string().min(1).max(300),
  deliveryId: z.string().min(1).max(200),
  model: z.string().min(1).max(100),
  analysis: z.union([
    z.string().min(2).max(20000),
    z.object({
      summary: z.string().max(4000),
      opportunity: z.string().max(4000),
      approach: z.string().max(4000),
      nextStep: z.string().max(4000),
    }),
  ]),
});

function authorized(request: Request) {
  const expected = process.env.N8N_WEBHOOK_SECRET?.trim();
  const received = request.headers.get("x-bizpeek-secret")?.trim();
  if (!expected || !received) return false;
  const left = Buffer.from(expected);
  const right = Buffer.from(received);
  return left.length === right.length && timingSafeEqual(left, right);
}

function normalizeAnalysis(value: z.infer<typeof payloadSchema>["analysis"]) {
  if (typeof value !== "string") return value;
  try {
    const parsed = JSON.parse(value) as Record<string, unknown>;
    return {
      summary: String(parsed.summary || ""),
      opportunity: String(parsed.opportunity || ""),
      approach: String(parsed.approach || ""),
      nextStep: String(parsed.nextStep || ""),
    };
  } catch {
    return {
      summary: value,
      opportunity: "Análise geral disponível no resumo.",
      approach: "Revise o resumo antes de iniciar o contato.",
      nextStep: "Validar os dados públicos e preparar a abordagem.",
    };
  }
}

export async function POST(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ ok: false, error: "Não autorizado." }, { status: 401 });
  }
  try {
    const payload = payloadSchema.parse(await request.json());
    const record = await prisma.workspaceRecord.findFirst({
      where: { id: payload.recordId, kind: "lead" },
    });
    if (!record) {
      return NextResponse.json({ ok: false, error: "Lead não encontrado." }, { status: 404 });
    }
    const current = record.data as Record<string, Prisma.JsonValue>;
    const analysis = normalizeAnalysis(payload.analysis);
    await prisma.workspaceRecord.update({
      where: { id: record.id },
      data: {
        data: {
          ...current,
          aiAnalysis: {
            ...analysis,
            model: payload.model,
            completedAt: new Date().toISOString(),
            deliveryId: payload.deliveryId,
          },
        } as Prisma.InputJsonValue,
      },
    });
    return NextResponse.json({ ok: true, recordId: record.id });
  } catch (error) {
    console.error("Invalid n8n analysis callback", error);
    return NextResponse.json({ ok: false, error: "Dados inválidos." }, { status: 400 });
  }
}
