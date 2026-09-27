import { z } from "zod";

export const daySchema = z.iso.date().refine((value) => {
  const date = new Date(`${value}T12:00:00Z`);
  return (
    !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
  );
}, "Data inválida");
export const paymentPlanSchema = z
  .object({
    totalCents: z.number().int().min(1).max(100000000000),
    installments: z
      .array(
        z.object({
          id: z.string().min(1).max(80),
          amountCents: z.number().int().min(1).max(100000000000),
          dueDate: daySchema,
          paidDate: daySchema.nullable(),
        }),
      )
      .min(1)
      .max(60),
  })
  .superRefine((plan, ctx) => {
    if (
      plan.installments.reduce((sum, item) => sum + item.amountCents, 0) !==
      plan.totalCents
    )
      ctx.addIssue({
        code: "custom",
        message: "As parcelas devem somar o valor fechado.",
      });
    if (
      new Set(plan.installments.map((item) => item.id)).size !==
      plan.installments.length
    )
      ctx.addIssue({ code: "custom", message: "Parcelas duplicadas." });
  });
export type PaymentPlan = z.infer<typeof paymentPlanSchema>;

export function makeInstallments(
  totalCents: number,
  count: number,
  firstDate: string,
): PaymentPlan {
  if (
    !Number.isSafeInteger(totalCents) ||
    totalCents < 1 ||
    !Number.isInteger(count) ||
    count < 1 ||
    count > 60 ||
    totalCents < count ||
    !daySchema.safeParse(firstDate).success
  )
    throw new Error(
      "Confira o valor, a quantidade de parcelas e o primeiro vencimento.",
    );
  const [year, month, day] = firstDate.split("-").map(Number);
  const installments = Array.from({ length: count }, (_, index) => {
    const lastDay = new Date(Date.UTC(year, month + index, 0)).getUTCDate();
    const due = new Date(
      Date.UTC(year, month - 1 + index, Math.min(day, lastDay)),
    );
    return {
      id: `parcela-${index + 1}`,
      amountCents:
        Math.floor(totalCents / count) + (index < totalCents % count ? 1 : 0),
      dueDate: due.toISOString().slice(0, 10),
      paidDate: null,
    };
  });
  return paymentPlanSchema.parse({ totalCents, installments });
}
export function paymentTotals(plan: PaymentPlan, today: string) {
  const received = plan.installments.reduce(
    (sum, item) => sum + (item.paidDate ? item.amountCents : 0),
    0,
  );
  const overdue = plan.installments.reduce(
    (sum, item) =>
      sum + (!item.paidDate && item.dueDate < today ? item.amountCents : 0),
    0,
  );
  return {
    received,
    remaining: plan.totalCents - received,
    overdue,
    paidCount: plan.installments.filter((item) => item.paidDate).length,
  };
}
export const reais = (cents: number) =>
  (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
