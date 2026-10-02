"use client";
import { useEffect, useState } from "react";
import { Heading } from "./Shared";
type Plan = {
  status: string;
  periodEnd?: string;
  cancelAtPeriodEnd?: boolean;
  hasCustomer: boolean;
  enabled: boolean;
  configured: boolean;
  admin: boolean;
  manualTrialStatus: "none" | "scheduled" | "active" | "expired";
  manualTrialStartsAt?: string;
  manualTrialEndsAt?: string;
};
const labels: Record<string, string> = {
  inactive: "Ainda não assinante",
  active: "Assinatura ativa",
  trialing: "Período de teste",
  past_due: "Pagamento pendente",
  canceled: "Assinatura encerrada",
  unpaid: "Pagamento não realizado",
  incomplete: "Pagamento incompleto",
  incomplete_expired: "Pagamento expirado",
  paused: "Assinatura pausada",
};
export function Billing() {
  const [plan, setPlan] = useState<Plan | null>(null),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    let active = true;
    const load = () =>
      fetch("/api/billing")
        .then((r) => {
          if (!r.ok) throw Error();
          return r.json();
        })
        .then((d) => {
          if (active) setPlan(d);
        })
        .catch(() => {
          if (active) setMessage("Não foi possível consultar seu plano.");
        });
    void load();
    const interval = setInterval(load, 10000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);
  async function open(action: string) {
    setBusy(true);
    setMessage("");
    try {
      const r = await fetch("/api/billing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      window.location.assign(d.url);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Tente novamente.");
    } finally {
      setBusy(false);
    }
  }
  const manualTrialMessage =
    plan?.manualTrialStartsAt && plan.manualTrialEndsAt
      ? plan.manualTrialStatus === "active"
        ? `Teste gratuito ativo de ${new Date(plan.manualTrialStartsAt).toLocaleString("pt-BR")} até ${new Date(plan.manualTrialEndsAt).toLocaleString("pt-BR")}.`
        : plan.manualTrialStatus === "scheduled"
          ? `Teste gratuito agendado para começar em ${new Date(plan.manualTrialStartsAt).toLocaleString("pt-BR")} e terminar em ${new Date(plan.manualTrialEndsAt).toLocaleString("pt-BR")}.`
          : `Seu teste gratuito terminou em ${new Date(plan.manualTrialEndsAt).toLocaleString("pt-BR")}.`
      : null;
  return (
    <>
      <Heading
        title="Mais possibilidades para o seu negócio."
        text="Um plano simples. Todas as ferramentas para cultivar suas oportunidades."
      />
      <section className="plan-card">
        <span className="eyebrow">BIZPEEK PRO · PLANO INICIAL</span>
        <h2 style={{ fontSize: 25, letterSpacing: -0.8 }}>
          Seu próximo nível começa aqui.
        </h2>
        <div className="plan-price">
          R$ 50<small> / mês</small>
        </div>
        <p className="muted">
          Assinatura mensal. Cancele pelo portal quando quiser.
        </p>
        <ul>
          <li>Seu workspace individual e protegido</li>
          <li>Gestão de leads e pipeline de vendas</li>
          <li>Calendário e histórico de contatos</li>
          <li>Anotações, categorias e favoritos</li>
          <li>Dashboard com indicadores do seu negócio</li>
          <li>Busca de empresas, sujeita à cota diária do plano</li>
        </ul>
        <div className="form-message" style={{ marginBottom: 20 }}>
          {manualTrialMessage ||
            (plan
              ? plan.admin
                ? "Conta administrativa — acesso de proprietário."
                : !plan.enabled
                  ? "Ambiente de avaliação: cobrança desativada."
                  : labels[plan.status] || plan.status
              : "Consultando seu plano…")}
          {!manualTrialMessage && plan?.periodEnd && (
            <>
              <br />
              {plan.cancelAtPeriodEnd
                ? "Acesso disponível até"
                : "Próxima renovação prevista"}
              : {new Date(plan.periodEnd).toLocaleDateString("pt-BR")}
            </>
          )}
        </div>
        {plan &&
          !plan.admin &&
          ![
            "active",
            "trialing",
            "past_due",
            "unpaid",
            "incomplete",
            "paused",
          ].includes(plan.status) && (
            <button
              className="primary"
              disabled={busy || !plan.configured}
              onClick={() => void open("checkout")}
            >
              {busy ? "Abrindo pagamento…" : "Assinar por R$ 50/mês →"}
            </button>
          )}
        {plan?.hasCustomer && (
          <button
            className="secondary"
            style={{ width: "100%", marginTop: 10 }}
            disabled={busy}
            onClick={() => void open("portal")}
          >
            Gerenciar assinatura e faturas ↗
          </button>
        )}
        {plan && !plan.configured && (
          <p className="muted" style={{ marginTop: 16 }}>
            A contratação ficará disponível assim que a integração de pagamento
            for ativada.
          </p>
        )}
        {message && (
          <p className="form-message" role="status">
            {message}
          </p>
        )}
        <p className="muted" style={{ marginTop: 20, lineHeight: 1.8 }}>
          O acesso é atualizado após a confirmação do pagamento. Caso tenha
          acabado de pagar, aguarde alguns instantes nesta página.
        </p>
      </section>
    </>
  );
}
