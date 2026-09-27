"use client";
import { useCallback, useState } from "react";
import Link from "next/link";
import { stages, type LeadData, type RecordItem } from "@/lib/crm-types";
import {
  useRecords,
  saveRecord,
  removeRecord,
  refreshRecords,
} from "@/lib/records-client";
import { Empty, Heading, Modal, money } from "./Shared";
import { DealPayments, PaymentSummary } from "./DealPayments";
import { paymentTotals, reais } from "@/lib/payment-plan";
import { dateKey } from "@/lib/calendar-dates";

export function LeadWorkspace({ pipeline = false }: { pipeline?: boolean }) {
  const leads = useRecords<LeadData>("lead");
  const [query, setQuery] = useState(""),
    [paymentRow, setPaymentRow] = useState<RecordItem<LeadData> | null>(null),
    [stage, setStage] = useState("Todos"),
    [edit, setEdit] = useState<RecordItem<LeadData> | "new" | null>(null),
    [busy, setBusy] = useState(false);
  const close = useCallback(() => setEdit(null), []);
  const closePayments = useCallback(() => setPaymentRow(null), []);
  const financial = leads.reduce(
    (sum, row) => {
      if (!row.data.paymentPlan) return sum;
      const totals = paymentTotals(row.data.paymentPlan, dateKey(new Date()));
      return {
        received: sum.received + totals.received,
        remaining: sum.remaining + totals.remaining,
        overdue: sum.overdue + totals.overdue,
      };
    },
    { received: 0, remaining: 0, overdue: 0 },
  );
  const filtered = leads.filter(
    (r) =>
      `${r.data.name} ${r.data.email || ""} ${r.data.niche}`
        .toLowerCase()
        .includes(query.toLowerCase()) &&
      (stage === "Todos" || (r.data.stage || "Novo") === stage),
  );
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    const f = new FormData(e.currentTarget),
      old = edit && edit !== "new" ? edit : null;
    const name = String(f.get("name"));
    const data = {
      id: old?.data.id || crypto.randomUUID(),
      initials: name
        .split(" ")
        .map((n) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase(),
      legalName: "",
      document: "",
      neighborhood: "",
      address: "",
      score: 0,
      status: "Médio",
      updatedAt: new Date().toISOString(),
      source: "Cadastro manual",
      reasons: [],
      ...old?.data,
      name,
      niche: String(f.get("niche")),
      city: String(f.get("city")),
      state: String(f.get("state")),
      email: String(f.get("email")),
      phone: String(f.get("phone")),
      stage: String(f.get("stage")),
      value: Number(f.get("value")),
      description: String(f.get("description")),
    };
    try {
      await saveRecord("lead", data, old?.id);
      close();
    } catch {
    } finally {
      setBusy(false);
    }
  }
  const changeStage = (row: RecordItem<LeadData>, value: string) =>
    void saveRecord("lead", { ...row.data, stage: value }, row.id).catch(
      () => {},
    );
  async function contact(row: RecordItem<LeadData>) {
    try {
      const response = await fetch("/api/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId: row.id }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      await refreshRecords();
    } catch (error) {
      window.dispatchEvent(
        new CustomEvent("bizpeek:message", {
          detail:
            error instanceof Error
              ? error.message
              : "Não foi possível registrar o contato.",
        }),
      );
    }
  }
  return (
    <>
      <Heading
        title={
          pipeline
            ? "Cada oportunidade, um próximo passo."
            : "Relacionamentos que fazem acontecer."
        }
        text={
          pipeline
            ? "Acompanhe o caminho entre a primeira conversa e a próxima conquista."
            : "Todos os seus leads, organizados do seu jeito."
        }
      >
        <Link className="secondary" href="/explorar">
          Explorar empresas ↗
        </Link>
        <button className="primary" onClick={() => setEdit("new")}>
          ＋ Novo lead
        </button>
      </Heading>
      {pipeline && (
        <section
          className="payment-totals pipeline-totals"
          aria-label="Resumo de pagamentos"
        >
          <div>
            <small>💚 Recebido dos clientes</small>
            <strong>{reais(financial.received)}</strong>
          </div>
          <div>
            <small>💜 Total a receber</small>
            <strong>{reais(financial.remaining)}</strong>
          </div>
          <div>
            <small>🧡 Parcelas em atraso</small>
            <strong>{reais(financial.overdue)}</strong>
          </div>
          <p>
            Marque um negócio como Ganho e abra Pagamentos para registrar o
            acordo.
          </p>
        </section>
      )}
      <div className="toolbar">
        <input
          aria-label="Buscar leads"
          placeholder="⌕  Buscar nome, e-mail ou segmento..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="tabs">
          {["Todos", ...stages].map((s) => (
            <button
              key={s}
              className={stage === s ? "active" : ""}
              onClick={() => setStage(s)}
            >
              {s}
            </button>
          ))}
        </div>
      </div>
      {!leads.length ? (
        <Empty
          title="Sua próxima conexão começa aqui"
          text="Cadastre seu primeiro lead ou descubra novas empresas na área Explorar."
        >
          <button className="primary" onClick={() => setEdit("new")}>
            Criar primeiro lead
          </button>
        </Empty>
      ) : pipeline ? (
        <div className="board">
          {stages.map((s) => (
            <section className="board-column" key={s}>
              <div className="board-title">
                {s}
                <b>
                  {
                    filtered.filter((r) => (r.data.stage || "Novo") === s)
                      .length
                  }
                </b>
              </div>
              {filtered
                .filter((r) => (r.data.stage || "Novo") === s)
                .map((row) => (
                  <article className="kanban-card" key={row.id}>
                    <span className="company-avatar">{row.data.initials}</span>
                    <button
                      style={{
                        border: 0,
                        background: "none",
                        padding: 0,
                        textAlign: "left",
                      }}
                      onClick={() => setEdit(row)}
                    >
                      <strong>{row.data.name}</strong>
                    </button>
                    <p>
                      {row.data.niche || "Sem segmento"} ·{" "}
                      {row.data.city || "Sem cidade"}
                    </p>
                    <span className="kanban-value">
                      {row.data.paymentPlan
                        ? reais(row.data.paymentPlan.totalCents)
                        : money(row.data.value || 0)}
                    </span>
                    {row.data.paymentPlan && (
                      <PaymentSummary plan={row.data.paymentPlan} />
                    )}
                    {(row.data.stage === "Ganho" || row.data.paymentPlan) && (
                      <button
                        className="secondary"
                        onClick={() => setPaymentRow(row)}
                      >
                        💰 Pagamentos
                      </button>
                    )}
                    <select
                      aria-label={`Etapa de ${row.data.name}`}
                      value={row.data.stage || "Novo"}
                      onChange={(e) => changeStage(row, e.target.value)}
                    >
                      {stages.map((v) => (
                        <option key={v}>{v}</option>
                      ))}
                    </select>
                  </article>
                ))}
            </section>
          ))}
        </div>
      ) : (
        <section className="panel">
          <div className="panel-heading">
            <h2>
              Minha base de leads{" "}
              <span className="chip">{filtered.length}</span>
            </h2>
            <span className="muted">Salvos no seu workspace</span>
          </div>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>EMPRESA / CONTATO</th>
                  <th>ETAPA</th>
                  <th>VALOR POTENCIAL</th>
                  <th>ÚLTIMO CONTATO</th>
                  <th>AÇÕES</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <div className="lead-identity">
                        <span className="company-avatar">
                          {row.data.initials}
                        </span>
                        <div>
                          <strong>{row.data.name}</strong>
                          <small>
                            {row.data.email ||
                              row.data.phone ||
                              `${row.data.niche} · ${row.data.city}`}
                          </small>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span
                        className="status-badge"
                        data-stage={row.data.stage}
                      >
                        {row.data.stage || "Novo"}
                      </span>
                    </td>
                    <td>{money(row.data.value || 0)}</td>
                    <td>
                      {row.data.contactAt
                        ? new Date(row.data.contactAt).toLocaleDateString(
                            "pt-BR",
                          )
                        : "Ainda não contatado"}
                    </td>
                    <td>
                      <div className="row-actions">
                        <button onClick={() => setEdit(row)}>Editar</button>
                        {(row.data.stage === "Ganho" ||
                          row.data.paymentPlan) && (
                          <button onClick={() => setPaymentRow(row)}>
                            Pagamentos
                          </button>
                        )}
                        <button onClick={() => void contact(row)}>
                          Contatei hoje
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!filtered.length && (
              <div className="empty-inline">
                Nenhum lead corresponde aos filtros.
              </div>
            )}
          </div>
        </section>
      )}
      {paymentRow && (
        <DealPayments
          key={paymentRow.id}
          row={paymentRow}
          close={closePayments}
        />
      )}
      {edit && (
        <Modal
          title={edit === "new" ? "Uma nova oportunidade" : "Detalhes do lead"}
          close={close}
        >
          <form className="form-stack" onSubmit={submit}>
            <label>
              Empresa ou contato
              <input
                name="name"
                required
                maxLength={200}
                defaultValue={edit === "new" ? "" : edit.data.name}
              />
            </label>
            <div className="form-grid">
              <label>
                Segmento
                <input
                  name="niche"
                  defaultValue={edit === "new" ? "" : edit.data.niche}
                />
              </label>
              <label>
                E-mail
                <input
                  name="email"
                  type="email"
                  defaultValue={edit === "new" ? "" : edit.data.email}
                />
              </label>
              <label>
                Telefone
                <input
                  name="phone"
                  defaultValue={edit === "new" ? "" : edit.data.phone}
                />
              </label>
              <label>
                Cidade
                <input
                  name="city"
                  defaultValue={edit === "new" ? "" : edit.data.city}
                />
              </label>
              <label>
                Estado
                <input
                  name="state"
                  defaultValue={edit === "new" ? "" : edit.data.state}
                />
              </label>
              <label>
                Valor potencial (R$)
                <input
                  name="value"
                  readOnly={edit !== "new" && Boolean(edit.data.paymentPlan)}
                  type="number"
                  min="0"
                  step="0.01"
                  defaultValue={edit === "new" ? 0 : edit.data.value || 0}
                />
              </label>
            </div>
            <label>
              Etapa
              <select
                name="stage"
                defaultValue={
                  edit === "new" ? "Novo" : edit.data.stage || "Novo"
                }
              >
                {stages.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </label>
            <label>
              Histórico e observações
              <textarea
                name="description"
                maxLength={10000}
                defaultValue={edit === "new" ? "" : edit.data.description}
              />
            </label>
            <div className="form-actions">
              {edit !== "new" && (
                <button
                  type="button"
                  className="danger-button"
                  onClick={async () => {
                    if (
                      confirm(
                        "Excluir este lead? Esta ação não pode ser desfeita.",
                      )
                    ) {
                      await removeRecord(edit.id).catch(() => {});
                      close();
                    }
                  }}
                >
                  Excluir
                </button>
              )}
              <button type="button" className="secondary" onClick={close}>
                Cancelar
              </button>
              <button className="primary" disabled={busy}>
                {busy ? "Salvando…" : "Salvar lead"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
