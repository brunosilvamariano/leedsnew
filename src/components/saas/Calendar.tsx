"use client";
import { useCallback, useState } from "react";
import type { EventData, LeadData, RecordItem } from "@/lib/crm-types";
import { useRecords, saveRecord, removeRecord } from "@/lib/records-client";
import { Heading, Modal } from "./Shared";
const key = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const localInput = (iso: string) => {
  const d = new Date(iso);
  return `${key(d)}T${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};
export function Calendar() {
  const events = useRecords<EventData>("event"),
    leads = useRecords<LeadData>("lead");
  const [month, setMonth] = useState(
      () => new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    ),
    [selected, setSelected] = useState(() => key(new Date())),
    [edit, setEdit] = useState<RecordItem<EventData> | "new" | null>(null),
    [busy, setBusy] = useState(false);
  const close = useCallback(() => setEdit(null), []);
  const start = new Date(month.getFullYear(), month.getMonth(), 1);
  start.setDate(start.getDate() - start.getDay());
  const days = Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    return d;
  });
  const selectedEvents = events
    .filter((r) => key(new Date(r.data.date)) === selected)
    .sort((a, b) => a.data.date.localeCompare(b.data.date));
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    const f = new FormData(e.currentTarget);
    try {
      await saveRecord(
        "event",
        {
          title: String(f.get("title")),
          date: new Date(String(f.get("date"))).toISOString(),
          leadId: String(f.get("leadId")),
          detail: String(f.get("detail")),
          type: String(f.get("type")),
          done: edit !== "new" ? Boolean(edit?.data.done) : false,
        },
        edit !== "new" ? edit?.id : undefined,
      );
      close();
    } catch {
    } finally {
      setBusy(false);
    }
  }
  async function complete(row: RecordItem<EventData>) {
    await saveRecord(
      "event",
      { ...row.data, done: !row.data.done },
      row.id,
    ).catch(() => {});
  }

  return (
    <>
      <Heading
        title="Um dia organizado. Mais possibilidades."
        text="Planeje seus contatos e mantenha cada conversa no radar."
      >
        <button className="primary" onClick={() => setEdit("new")}>
          ＋ Novo compromisso
        </button>
      </Heading>
      <div className="calendar-layout">
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2 style={{ textTransform: "capitalize", fontSize: 18 }}>
                {month.toLocaleDateString("pt-BR", {
                  month: "long",
                  year: "numeric",
                })}
              </h2>
              <p>Seu calendário de conexões</p>
            </div>
            <div className="heading-actions">
              <button
                className="icon-button"
                aria-label="Mês anterior"
                onClick={() =>
                  setMonth(
                    new Date(month.getFullYear(), month.getMonth() - 1, 1),
                  )
                }
              >
                ‹
              </button>
              <button
                className="secondary"
                onClick={() => {
                  const d = new Date();
                  setMonth(new Date(d.getFullYear(), d.getMonth(), 1));
                  setSelected(key(d));
                }}
              >
                Hoje
              </button>
              <button
                className="icon-button"
                aria-label="Próximo mês"
                onClick={() =>
                  setMonth(
                    new Date(month.getFullYear(), month.getMonth() + 1, 1),
                  )
                }
              >
                ›
              </button>
            </div>
          </div>
          <div className="calendar-week">
            {["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"].map((d) => (
              <span key={d}>{d}</span>
            ))}
          </div>
          <div className="calendar-grid">
            {days.map((d) => (
              <button
                key={key(d)}
                aria-label={d.toLocaleDateString("pt-BR")}
                onClick={() => setSelected(key(d))}
                className={`calendar-day ${d.getMonth() !== month.getMonth() ? "outside" : ""} ${key(d) === selected ? "selected" : ""} ${key(d) === key(new Date()) ? "today" : ""}`}
              >
                <span>{d.getDate()}</span>
                {events
                  .filter((r) => key(new Date(r.data.date)) === key(d))
                  .slice(0, 2)
                  .map((r) => (
                    <small key={r.id} className={r.data.done ? "done" : ""}>
                      {r.data.done ? "✓ " : ""}
                      {r.data.title}
                    </small>
                  ))}
              </button>
            ))}
          </div>
        </section>
        <aside className="panel">
          <div className="panel-heading">
            <div>
              <h2>
                {new Date(`${selected}T12:00:00`).toLocaleDateString("pt-BR", {
                  day: "numeric",
                  month: "long",
                })}
              </h2>
              <p>{selectedEvents.length} compromissos no dia</p>
            </div>
            <span className="chip">
              {selectedEvents.filter((r) => r.data.done).length} concluídos
            </span>
          </div>
          {selectedEvents.map((row) => (
            <article className="event-item" key={row.id}>
              <span
                className="status-badge"
                data-stage={row.data.done ? "Ganho" : "Novo"}
              >
                {row.data.done ? "Concluído" : row.data.type}
              </span>
              <h3>{row.data.title}</h3>
              <small>
                {new Date(row.data.date).toLocaleTimeString("pt-BR", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
                {row.data.leadId
                  ? ` · ${leads.find((l) => l.id === row.data.leadId)?.data.name || "Lead removido"}`
                  : ""}
              </small>
              <p>{row.data.detail}</p>
              <div className="event-actions">
                <button onClick={() => void complete(row)}>
                  {row.data.done ? "Reabrir" : "✓ Concluir contato"}
                </button>
                <button onClick={() => setEdit(row)}>Editar</button>
              </div>
            </article>
          ))}
          {!selectedEvents.length && (
            <div className="empty-inline">
              Um espaço livre no seu dia.
              <br />
              Que tal planejar sua próxima conversa?
            </div>
          )}
          <button
            className="secondary"
            style={{ width: "100%", marginTop: 20 }}
            onClick={() => setEdit("new")}
          >
            ＋ Agendar neste dia
          </button>
        </aside>
      </div>
      {edit && (
        <Modal
          title={
            edit === "new" ? "Planeje a próxima conversa" : "Editar compromisso"
          }
          close={close}
        >
          <form className="form-stack" onSubmit={submit}>
            <label>
              Título
              <input
                name="title"
                required
                maxLength={200}
                defaultValue={edit === "new" ? "" : edit.data.title}
              />
            </label>
            <div className="form-grid">
              <label>
                Data e horário
                <input
                  type="datetime-local"
                  name="date"
                  required
                  defaultValue={
                    edit === "new"
                      ? `${selected}T09:00`
                      : localInput(edit.data.date)
                  }
                />
              </label>
              <label>
                Tipo
                <select
                  name="type"
                  defaultValue={edit === "new" ? "Follow-up" : edit.data.type}
                >
                  {[
                    "Follow-up",
                    "Ligação",
                    "WhatsApp",
                    "Reunião",
                    "Proposta",
                  ].map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </label>
            </div>
            <label>
              Lead relacionado
              <select
                name="leadId"
                defaultValue={edit === "new" ? "" : edit.data.leadId}
              >
                <option value="">Sem lead relacionado</option>
                {leads.map((l) => (
                  <option value={l.id} key={l.id}>
                    {l.data.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              O que você precisa lembrar?
              <textarea
                name="detail"
                maxLength={10000}
                defaultValue={edit === "new" ? "" : edit.data.detail}
              />
            </label>
            <div className="form-actions">
              {edit !== "new" && (
                <button
                  type="button"
                  className="danger-button"
                  onClick={async () => {
                    if (confirm("Excluir este compromisso?")) {
                      try {
                        await removeRecord(edit.id);
                        close();
                      } catch {}
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
                {busy ? "Salvando…" : "Salvar compromisso"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
