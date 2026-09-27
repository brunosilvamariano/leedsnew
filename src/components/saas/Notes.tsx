"use client";
import { useCallback, useState } from "react";
import type { NoteData, RecordItem } from "@/lib/crm-types";
import { useRecords, saveRecord, removeRecord } from "@/lib/records-client";
import { Empty, Heading, Modal } from "./Shared";
const colors = {
  violet: "#d6c4eb",
  mint: "#c6e1ce",
  peach: "#efd3b7",
  blue: "#cad9f0",
  rose: "#eccbd9",
};
export function Notes() {
  const notes = useRecords<NoteData>("note");
  const [filter, setFilter] = useState("Todas"),
    [query, setQuery] = useState(""),
    [edit, setEdit] = useState<RecordItem<NoteData> | "new" | null>(null),
    [color, setColor] = useState("violet"),
    [busy, setBusy] = useState(false);
  const close = useCallback(() => setEdit(null), []);
  const filtered = notes
    .filter(
      (r) =>
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
        },
        edit !== "new" ? edit?.id : undefined,
      );
      close();
    } catch {
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Heading
        title="Espaço para suas melhores ideias."
        text="Insights, conversas e planos. Nada importante fica para trás."
      >
        <button
          className="primary"
          onClick={() => {
            setColor("violet");
            setEdit("new");
          }}
        >
          ＋ Nova anotação
        </button>
      </Heading>
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
          title="Dê espaço às suas ideias"
          text="Crie uma anotação, escolha uma cor e organize por categoria."
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
                  {new Date(row.updatedAt).toLocaleDateString("pt-BR", {
                    day: "2-digit",
                    month: "short",
                  })}
                </span>
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
