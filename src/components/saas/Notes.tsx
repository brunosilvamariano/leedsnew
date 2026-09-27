"use client";
import { useCallback, useState } from "react";
import type { NoteData, RecordItem } from "@/lib/crm-types";
import { useRecords, saveRecord, removeRecord } from "@/lib/records-client";
import { Empty, Modal } from "./Shared";
import { noteDay } from "@/lib/calendar-dates";
const colors = {
  violet: "#d6c4eb",
  mint: "#c6e1ce",
  peach: "#efd3b7",
  blue: "#cad9f0",
  rose: "#eccbd9",
};
export function Notes({
  selectedDate,
  onSelectDate,
}: {
  selectedDate: string;
  onSelectDate: (date: string) => void;
}) {
  const notes = useRecords<NoteData>("note");
  const [filter, setFilter] = useState("Todas"),
    [query, setQuery] = useState(""),
    [edit, setEdit] = useState<RecordItem<NoteData> | "new" | null>(null),
    [color, setColor] = useState("violet"),
    [busy, setBusy] = useState(false),
    [allDates, setAllDates] = useState(false);
  const close = useCallback(() => setEdit(null), []);
  const filtered = notes
    .filter(
      (r) =>
        (allDates ||
          (r.data.repeatYearly
            ? noteDay(r).slice(5) === selectedDate.slice(5)
            : noteDay(r) === selectedDate)) &&
        (filter === "Todas" || r.data.category === filter) &&
        `${r.data.title} ${r.data.content}`
          .toLowerCase()
          .includes(query.toLowerCase()),
    )
    .sort(
      (a, b) =>
        Number(b.data.pinned) - Number(a.data.pinned) ||
        b.updatedAt.localeCompare(a.updatedAt),
    );
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    const f = new FormData(e.currentTarget);
    try {
      await saveRecord(
        "note",
        {
          title: String(f.get("title")),
          content: String(f.get("content")),
          category: String(f.get("category") || "Geral"),
          color,
          pinned: edit !== "new" && Boolean(edit?.data.pinned),
          date: String(f.get("date")),
          repeatYearly: f.get("repeatYearly") === "on",
        },
        edit !== "new" ? edit?.id : undefined,
      );
      setFilter("Todas");
      setQuery("");
      if (!allDates) onSelectDate(String(f.get("date")));
      close();
    } catch {
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <div className="panel-heading day-notes-heading">
        <div>
          <h2>📝 Anotações {allDates ? "de todas as datas" : "do dia"}</h2>
          <p>Conversas, ideias e lembretes no seu calendário.</p>
        </div>
        <button
          className="primary"
          onClick={() => {
            setColor("violet");
            setEdit("new");
          }}
        >
          ＋ Nova anotação
        </button>
      </div>
      <label className="calendar-check">
        <input
          type="checkbox"
          checked={allDates}
          onChange={(e) => setAllDates(e.target.checked)}
        />{" "}
        Buscar em todas as datas
      </label>
      <div className="toolbar">
        <div className="tabs">
          {["Todas", ...new Set(notes.map((r) => r.data.category))].map((c) => (
            <button
              key={c}
              className={filter === c ? "active" : ""}
              onClick={() => setFilter(c)}
            >
              {c}
            </button>
          ))}
        </div>
        <input
          aria-label="Buscar anotações"
          placeholder="⌕  Buscar nas anotações..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      {!filtered.length ? (
        <Empty
          title="Nenhuma anotação encontrada"
          text="Anote uma conversa, uma ideia ou uma data importante para este dia."
        />
      ) : (
        <div className="notes-grid">
          {filtered.map((row) => (
            <article
              className="note-card"
              data-color={row.data.color}
              key={row.id}
            >
              <div className="note-meta">
                <span>{row.data.category.toUpperCase()}</span>
                <button
                  style={{ background: "none", border: 0, color: "inherit" }}
                  aria-label={
                    row.data.pinned ? "Desafixar anotação" : "Fixar anotação"
                  }
                  onClick={() =>
                    void saveRecord(
                      "note",
                      { ...row.data, pinned: !row.data.pinned },
                      row.id,
                    ).catch(() => {})
                  }
                >
                  {row.data.pinned ? "★" : "☆"}
                </button>
              </div>
              <h2>{row.data.title}</h2>
              <p>{row.data.content}</p>
              <div className="note-actions">
                <span>
                  {new Date(`${noteDay(row)}T12:00:00`).toLocaleDateString(
                    "pt-BR",
                    {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    },
                  )}
                  {row.data.repeatYearly ? " · anual" : ""}
                </span>
                {allDates && (
                  <button
                    onClick={() => {
                      onSelectDate(noteDay(row));
                      setAllDates(false);
                    }}
                  >
                    Ver dia
                  </button>
                )}
                <button
                  onClick={() => {
                    setColor(row.data.color);
                    setEdit(row);
                  }}
                >
                  Editar ↗
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
      {edit && (
        <Modal
          title={edit === "new" ? "Uma ideia para guardar" : "Editar anotação"}
          close={close}
        >
          <form className="form-stack" onSubmit={submit}>
            <label>
              Dia da anotação
              <input
                type="date"
                name="date"
                min="1900-01-01"
                max="2199-12-31"
                required
                defaultValue={edit === "new" ? selectedDate : noteDay(edit)}
              />
            </label>
            <label className="calendar-check">
              <input
                type="checkbox"
                name="repeatYearly"
                defaultChecked={edit !== "new" && edit.data.repeatYearly}
              />{" "}
              Repetir todo ano (aniversário ou data local)
            </label>
            <label>
              Título
              <input
                name="title"
                required
                maxLength={200}
                defaultValue={edit === "new" ? "" : edit.data.title}
              />
            </label>
            <label>
              Categoria
              <input
                name="category"
                list="note-categories"
                maxLength={80}
                defaultValue={edit === "new" ? "Geral" : edit.data.category}
              />
              <datalist id="note-categories">
                {[
                  "Geral",
                  "Ideias",
                  "Reuniões",
                  "Estratégia",
                  "Pessoal",
                  ...new Set(notes.map((r) => r.data.category)),
                ].map((c, i) => (
                  <option key={i} value={c} />
                ))}
              </datalist>
            </label>
            <label>
              Anotação
              <textarea
                name="content"
                rows={8}
                maxLength={10000}
                defaultValue={edit === "new" ? "" : edit.data.content}
              />
            </label>
            <div className="color-picker" aria-label="Cor da anotação">
              {Object.entries(colors).map(([name, value]) => (
                <button
                  key={name}
                  aria-label={`Cor ${name}`}
                  type="button"
                  className={color === name ? "active" : ""}
                  onClick={() => setColor(name)}
                  style={{ background: value }}
                />
              ))}
            </div>
            <div className="form-actions">
              {edit !== "new" && (
                <button
                  type="button"
                  className="danger-button"
                  onClick={async () => {
                    if (confirm("Excluir esta anotação?")) {
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
                {busy ? "Salvando…" : "Salvar anotação"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
