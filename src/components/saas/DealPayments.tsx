"use client";
import { useState } from "react";
import type { LeadData, RecordItem } from "@/lib/crm-types";
import { dateKey } from "@/lib/calendar-dates";
import {
  makeInstallments,
  paymentPlanSchema,
  paymentTotals,
  reais,
  type PaymentPlan,
} from "@/lib/payment-plan";
import { saveRecord } from "@/lib/records-client";
import { Modal } from "./Shared";

export function PaymentSummary({ plan }: { plan: PaymentPlan }) {
  const totals = paymentTotals(plan, dateKey(new Date()));
  return (
    <div className="payment-mini">
      <span
        className={`payment-status ${totals.remaining === 0 ? "paid" : totals.overdue ? "overdue" : "pending"}`}
      >
        {totals.remaining === 0
          ? "✓ Pago"
          : totals.overdue
            ? "⏰ Em atraso"
            : totals.received
              ? "◐ Parcialmente pago"
              : "◷ A receber"}
      </span>
      <small>
        {totals.paidCount}/{plan.installments.length} parcelas pagas ·{" "}
        {reais(totals.remaining)} a receber
      </small>
    </div>
  );
}

export function DealPayments({
  row,
  close,
}: {
  row: RecordItem<LeadData>;
  close: () => void;
}) {
  const [plan, setPlan] = useState<PaymentPlan | null>(
    row.data.paymentPlan || null,
  );
  const [total, setTotal] = useState(
    String(
      (row.data.paymentPlan?.totalCents ??
        Math.round((row.data.value || 0) * 100)) / 100,
    ),
  );
  const [count, setCount] = useState(
    row.data.paymentPlan?.installments.length || 1,
  );
  const [firstDate, setFirstDate] = useState(
    row.data.paymentPlan?.installments[0].dueDate || dateKey(new Date()),
  );
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const today = dateKey(new Date());
  const totals = plan ? paymentTotals(plan, today) : null;
  const hasPayments = Boolean(plan?.installments.some((item) => item.paidDate));
  const changed =
    !plan ||
    plan.totalCents !== Math.round(Number(total) * 100) ||
    plan.installments.length !== count ||
    plan.installments[0].dueDate !== firstDate;
  function generate() {
    try {
      if (hasPayments)
        throw new Error(
          "Estorne os pagamentos antes de refazer o parcelamento.",
        );
      setPlan(
        makeInstallments(Math.round(Number(total) * 100), count, firstDate),
      );
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Confira os dados.");
    }
  }
  function update(
    index: number,
    data: Partial<PaymentPlan["installments"][number]>,
  ) {
    if (index === 0 && data.dueDate) setFirstDate(data.dueDate);
    if (plan)
      setPlan({
        ...plan,
        installments: plan.installments.map((item, i) =>
          i === index ? { ...item, ...data } : item,
        ),
      });
  }
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (changed) {
      setError(
        "Clique em Gerar parcelas para aplicar o valor e a quantidade informados.",
      );
      return;
    }
    const parsed = paymentPlanSchema.safeParse(plan);
    if (!parsed.success) {
      setError("Confira os valores e as datas de todas as parcelas.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await saveRecord(
        "lead",
        {
          ...row.data,
          value: parsed.data.totalCents / 100,
          paymentPlan: parsed.data,
        },
        row.id,
      );
      close();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível salvar.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal title={`Pagamentos · ${row.data.name}`} close={close}>
      <form className="form-stack" onSubmit={submit}>
        <p className="muted">
          Registre o valor fechado e confirme cada recebimento. Este controle
          não realiza cobranças.
        </p>
        <fieldset disabled={busy} className="payment-fieldset">
          <div className="form-grid">
            <label>
              Valor fechado (R$)
              <input
                type="number"
                min="0.01"
                max="1000000000"
                step="0.01"
                required
                value={total}
                disabled={hasPayments}
                onChange={(e) => setTotal(e.target.value)}
              />
            </label>
            <label>
              Quantidade de parcelas
              <input
                type="number"
                min="1"
                max="60"
                required
                value={count}
                disabled={hasPayments}
                onChange={(e) => setCount(Number(e.target.value))}
              />
            </label>
            <label>
              Primeiro vencimento
              <input
                type="date"
                required
                value={firstDate}
                disabled={hasPayments}
                onChange={(e) => setFirstDate(e.target.value)}
              />
            </label>
          </div>
          <button
            type="button"
            className="secondary"
            disabled={hasPayments}
            onClick={generate}
          >
            {plan ? "Refazer parcelas mensais" : "Gerar parcelas"}
          </button>
          {hasPayments && (
            <p className="muted">
              O valor e o parcelamento ficam protegidos enquanto houver
              pagamentos registrados.
            </p>
          )}
          {totals && (
            <div className="payment-totals">
              <div>
                <small>Recebido</small>
                <strong>{reais(totals.received)}</strong>
              </div>
              <div>
                <small>A receber</small>
                <strong>{reais(totals.remaining)}</strong>
              </div>
              <div>
                <small>Em atraso</small>
                <strong>{reais(totals.overdue)}</strong>
              </div>
            </div>
          )}
          <div className="installment-list">
            {plan?.installments.map((item, index) => (
              <article
                className={`installment ${item.paidDate ? "is-paid" : item.dueDate < today ? "is-overdue" : ""}`}
                key={item.id}
              >
                <div className="installment-title">
                  <strong>
                    Parcela {index + 1} · {reais(item.amountCents)}
                  </strong>
                  <span>
                    {item.paidDate
                      ? "✓ Paga"
                      : item.dueDate < today
                        ? "Em atraso"
                        : "Pendente"}
                  </span>
                </div>
                <div className="form-grid">
                  <label>
                    Vencimento
                    <input
                      aria-label={`Vencimento da parcela ${index + 1}`}
                      type="date"
                      required
                      value={item.dueDate}
                      onChange={(e) =>
                        update(index, { dueDate: e.target.value })
                      }
                    />
                  </label>
                  {item.paidDate && (
                    <label>
                      Data do pagamento
                      <input
                        aria-label={`Pagamento da parcela ${index + 1}`}
                        type="date"
                        required
                        max={today}
                        value={item.paidDate}
                        onChange={(e) =>
                          update(index, { paidDate: e.target.value })
                        }
                      />
                    </label>
                  )}
                </div>
                <button
                  type="button"
                  className="secondary"
                  onClick={() => {
                    if (
                      !item.paidDate ||
                      confirm("Estornar o registro deste pagamento?")
                    )
                      update(index, { paidDate: item.paidDate ? null : today });
                  }}
                >
                  {item.paidDate
                    ? "Estornar pagamento"
                    : "✓ Registrar pagamento"}
                </button>
              </article>
            ))}
          </div>
        </fieldset>
        {error && (
          <p role="alert" className="form-message">
            {error}
          </p>
        )}
        <div className="form-actions">
          <button
            type="button"
            className="secondary"
            onClick={close}
            disabled={busy}
          >
            Cancelar
          </button>
          <button className="primary" disabled={busy || !plan}>
            {busy ? "Salvando…" : "Salvar pagamentos"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
