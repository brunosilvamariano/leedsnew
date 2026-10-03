"use client";

import { useCallback, useState } from "react";
import type { CSSProperties, FormEvent } from "react";
import type {
  EventData,
  LeadData,
  NoteData,
  RecordItem,
} from "@/lib/crm-types";
import { brazilianDates, noteDay } from "@/lib/calendar-dates";
import { useRecords, saveRecord, removeRecord } from "@/lib/records-client";
import { Icon } from "@/components/ui/Icon";
import { Notes } from "./Notes";
import { Modal } from "./Shared";

type CalendarView = "day" | "week" | "month";

const EVENT_TYPES = [
  { name: "Reunião", tone: "teal", icon: "video" },
  { name: "Follow-up", tone: "violet", icon: "target" },
  { name: "Ligação", tone: "blue", icon: "phone" },
  { name: "WhatsApp", tone: "green", icon: "whatsapp" },
  { name: "Proposta", tone: "peach", icon: "send" },
] as const;

const WEEKDAYS = ["SEG", "TER", "QUA", "QUI", "SEX", "SÁB", "DOM"];
const START_HOUR = 8;
const END_HOUR = 20;
const HOURS = Array.from(
  { length: END_HOUR - START_HOUR },
  (_, index) => START_HOUR + index,
);

const key = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

const fromKey = (day: string) => new Date(`${day}T12:00:00`);

const localInput = (iso: string) => {
  const date = new Date(iso);
  return `${key(date)}T${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
};

const startOfWeek = (date: Date) => {
  const result = new Date(date);
  result.setHours(12, 0, 0, 0);
  result.setDate(result.getDate() - ((result.getDay() + 6) % 7));
  return result;
};

const addDays = (date: Date, amount: number) => {
  const result = new Date(date);
  result.setDate(result.getDate() + amount);
  return result;
};

const monthDays = (date: Date) => {
  const first = new Date(date.getFullYear(), date.getMonth(), 1, 12);
  const start = startOfWeek(first);
  return Array.from({ length: 42 }, (_, index) => addDays(start, index));
};

const timeLabel = (iso: string) =>
  new Date(iso).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });

const eventTone = (type: string) =>
  EVENT_TYPES.find((item) => item.name === type)?.tone || "violet";

const eventIcon = (type: string) =>
  EVENT_TYPES.find((item) => item.name === type)?.icon || "calendar";

const titleCaseMonth = (date: Date) => {
  const label = date.toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });
  return label.charAt(0).toUpperCase() + label.slice(1);
};

export function Calendar() {
  const events = useRecords<EventData>("event");
  const notes = useRecords<NoteData>("note");
  const leads = useRecords<LeadData>("lead");
  const [today] = useState(() => new Date());
  const todayKey = key(today);

  const [selected, setSelected] = useState(todayKey);
  const [miniMonth, setMiniMonth] = useState(
    () => new Date(today.getFullYear(), today.getMonth(), 1, 12),
  );
  const [view, setView] = useState<CalendarView>("week");
  const [edit, setEdit] = useState<RecordItem<EventData> | "new" | null>(null);
  const [draftDate, setDraftDate] = useState(`${todayKey}T09:00`);
  const [busy, setBusy] = useState(false);
  const [showDates, setShowDates] = useState(true);
  const [showNotes, setShowNotes] = useState(true);
  const [activeTypes, setActiveTypes] = useState<Set<string>>(
    () => new Set(EVENT_TYPES.map((item) => item.name)),
  );

  const selectedDate = fromKey(selected);
  const selectedYear = selectedDate.getFullYear();
  const holidays = [selectedYear - 1, selectedYear, selectedYear + 1].flatMap(
    brazilianDates,
  );
  const miniDays = monthDays(miniMonth);
  const mainMonthDays = monthDays(selectedDate);
  const weekStart = startOfWeek(selectedDate);
  const weekDays = Array.from({ length: 7 }, (_, index) =>
    addDays(weekStart, index),
  );

  const visibleEvents = events
    .filter((event) => activeTypes.has(event.data.type))
    .sort((a, b) => a.data.date.localeCompare(b.data.date));

  const selectedEvents = visibleEvents.filter(
    (event) => key(new Date(event.data.date)) === selected,
  );

  const upcomingEvent = events
    .filter(
      (event) => !event.data.done && new Date(event.data.date) >= new Date(),
    )
    .sort((a, b) => a.data.date.localeCompare(b.data.date))[0];

  const notesFor = (day: string) =>
    notes.filter((note) =>
      note.data.repeatYearly
        ? noteDay(note).slice(5) === day.slice(5)
        : noteDay(note) === day,
    );

  const eventsFor = (date: Date) =>
    visibleEvents.filter(
      (event) => key(new Date(event.data.date)) === key(date),
    );

  const selectDate = useCallback((day: string) => {
    setSelected(day);
    const date = fromKey(day);
    setMiniMonth(new Date(date.getFullYear(), date.getMonth(), 1, 12));
  }, []);

  const openNew = (day = selected, hour = 9, minute = 0) => {
    setSelected(day);
    const date = fromKey(day);
    setMiniMonth(new Date(date.getFullYear(), date.getMonth(), 1, 12));
    setDraftDate(
      `${day}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`,
    );
    setEdit("new");
  };

  const close = useCallback(() => setEdit(null), []);

  const movePeriod = (direction: -1 | 1) => {
    const next = new Date(selectedDate);
    if (view === "day") next.setDate(next.getDate() + direction);
    if (view === "week") next.setDate(next.getDate() + 7 * direction);
    if (view === "month") next.setMonth(next.getMonth() + direction, 1);
    selectDate(key(next));
  };

  const periodLabel = (() => {
    if (view === "day") {
      const label = selectedDate.toLocaleDateString("pt-BR", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      });
      return label.charAt(0).toUpperCase() + label.slice(1);
    }
    if (view === "month") return titleCaseMonth(selectedDate);
    const end = addDays(weekStart, 6);
    if (weekStart.getMonth() === end.getMonth()) {
      return `${weekStart.getDate()}–${end.getDate()} de ${end.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}`;
    }
    return `${weekStart.toLocaleDateString("pt-BR", { day: "numeric", month: "short" })} – ${end.toLocaleDateString("pt-BR", { day: "numeric", month: "short", year: "numeric" })}`;
  })();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    const fields = new FormData(event.currentTarget);
    try {
      await saveRecord(
        "event",
        {
          title: String(fields.get("title")),
          date: new Date(String(fields.get("date"))).toISOString(),
          leadId: String(fields.get("leadId")),
          detail: String(fields.get("detail")),
          type: String(fields.get("type")),
          done: edit !== "new" ? Boolean(edit?.data.done) : false,
        },
        edit !== "new" ? edit?.id : undefined,
      );
      const nextDay = String(fields.get("date")).slice(0, 10);
      if (nextDay) selectDate(nextDay);
      close();
    } catch {
      // records-client envia a mensagem de erro para o toast global.
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

  const toggleType = (type: string) => {
    setActiveTypes((current) => {
      const next = new Set(current);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  };

  const renderTimeline = (days: Date[]) => (
    <div
      className={`agenda-timeline agenda-timeline--${days.length === 1 ? "day" : "week"}`}
    >
      <div className="agenda-timeline-inner">
        <div className="agenda-week-header">
          <div className="agenda-timezone">BRT</div>
          {days.map((date) => {
            const day = key(date);
            const dayHolidays = showDates
              ? holidays.filter((item) => item.date === day)
              : [];
            return (
              <button
                type="button"
                key={day}
                className={`agenda-week-day-heading ${day === selected ? "is-selected" : ""} ${day === todayKey ? "is-today" : ""}`}
                onClick={() => selectDate(day)}
              >
                <span>
                  {date.toLocaleDateString("pt-BR", { weekday: "short" })}
                </span>
                <strong>{date.getDate()}</strong>
                {dayHolidays[0] && (
                  <small title={dayHolidays[0].title}>
                    {dayHolidays[0].icon} {dayHolidays[0].title}
                  </small>
                )}
              </button>
            );
          })}
        </div>
        <div className="agenda-week-body">
          <div className="agenda-time-gutter" aria-hidden="true">
            {HOURS.map((hour) => (
              <span key={hour} style={{ top: `${(hour - START_HOUR) * 64}px` }}>
                {String(hour).padStart(2, "0")}:00
              </span>
            ))}
          </div>
          <div className="agenda-day-tracks">
            {days.map((date) => {
              const day = key(date);
              const dayEvents = eventsFor(date);
              const now = new Date();
              const nowMinutes = now.getHours() * 60 + now.getMinutes();
              const currentTop = ((nowMinutes - START_HOUR * 60) / 60) * 64;
              const showNow =
                day === key(now) &&
                nowMinutes >= START_HOUR * 60 &&
                nowMinutes < END_HOUR * 60;
              return (
                <div
                  className={`agenda-day-track ${day === todayKey ? "is-today" : ""}`}
                  key={day}
                >
                  {HOURS.map((hour) => (
                    <button
                      type="button"
                      className="agenda-time-slot"
                      key={hour}
                      style={{ top: `${(hour - START_HOUR) * 64}px` }}
                      aria-label={`Agendar em ${date.toLocaleDateString("pt-BR")} às ${hour}:00`}
                      onClick={() => openNew(day, hour)}
                    />
                  ))}
                  {showNow && (
                    <span
                      className="agenda-now-line"
                      aria-label="Horário atual"
                      style={{ top: `${currentTop}px` }}
                    />
                  )}
                  {dayEvents.map((row, index) => {
                    const start = new Date(row.data.date);
                    const minutes = start.getHours() * 60 + start.getMinutes();
                    const top = Math.max(
                      2,
                      Math.min(
                        (END_HOUR - START_HOUR) * 64 - 58,
                        ((minutes - START_HOUR * 60) / 60) * 64,
                      ),
                    );
                    const lead = leads.find(
                      (item) => item.id === row.data.leadId,
                    );
                    return (
                      <button
                        type="button"
                        key={row.id}
                        className={`agenda-event-card ${row.data.done ? "is-done" : ""}`}
                        data-tone={eventTone(row.data.type)}
                        style={
                          {
                            top: `${top}px`,
                            "--event-offset": `${Math.min(index, 3) * 3}px`,
                          } as CSSProperties
                        }
                        onClick={(click) => {
                          click.stopPropagation();
                          selectDate(day);
                          setEdit(row);
                        }}
                      >
                        <span>{timeLabel(row.data.date)}</span>
                        <strong>{row.data.title}</strong>
                        <small>
                          {lead?.data.name || row.data.type}
                          {row.data.done ? " · concluído" : ""}
                        </small>
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="agenda-page">
      <header className="agenda-hero">
        <div>
          <span className="agenda-eyebrow">RELACIONAMENTOS EM MOVIMENTO</span>
          <h1>Sua agenda comercial, em um só lugar.</h1>
          <p>
            Organize conversas, compromissos e próximos passos sem perder o
            ritmo da prospecção.
          </p>
        </div>
        <button type="button" className="primary" onClick={() => openNew()}>
          <Icon name="plus" />
          Novo compromisso
        </button>
      </header>

      <section className="agenda-shell">
        <div className="agenda-toolbar">
          <div className="agenda-period-navigation">
            <button
              type="button"
              className="agenda-icon-button"
              aria-label="Período anterior"
              onClick={() => movePeriod(-1)}
            >
              <Icon name="chevronLeft" />
            </button>
            <button
              type="button"
              className="agenda-today-button"
              onClick={() => selectDate(todayKey)}
            >
              Hoje
            </button>
            <button
              type="button"
              className="agenda-icon-button"
              aria-label="Próximo período"
              onClick={() => movePeriod(1)}
            >
              <Icon name="chevronRight" />
            </button>
            <h2>{periodLabel}</h2>
          </div>
          <div
            className="agenda-view-switch"
            aria-label="Visualização da agenda"
          >
            {(
              [
                ["day", "Dia"],
                ["week", "Semana"],
                ["month", "Mês"],
              ] as const
            ).map(([value, label]) => (
              <button
                type="button"
                key={value}
                aria-pressed={view === value}
                className={view === value ? "is-active" : ""}
                onClick={() => setView(value)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="agenda-workspace">
          <aside className="agenda-sidebar">
            <section className="agenda-mini-calendar">
              <header>
                <strong>{titleCaseMonth(miniMonth)}</strong>
                <div>
                  <button
                    type="button"
                    aria-label="Mês anterior"
                    onClick={() =>
                      setMiniMonth(
                        new Date(
                          miniMonth.getFullYear(),
                          miniMonth.getMonth() - 1,
                          1,
                          12,
                        ),
                      )
                    }
                  >
                    <Icon name="chevronLeft" />
                  </button>
                  <button
                    type="button"
                    aria-label="Próximo mês"
                    onClick={() =>
                      setMiniMonth(
                        new Date(
                          miniMonth.getFullYear(),
                          miniMonth.getMonth() + 1,
                          1,
                          12,
                        ),
                      )
                    }
                  >
                    <Icon name="chevronRight" />
                  </button>
                </div>
              </header>
              <div className="agenda-mini-weekdays">
                {WEEKDAYS.map((weekday) => (
                  <span key={weekday}>{weekday.slice(0, 1)}</span>
                ))}
              </div>
              <div className="agenda-mini-grid">
                {miniDays.map((date) => {
                  const day = key(date);
                  return (
                    <button
                      type="button"
                      key={day}
                      aria-label={date.toLocaleDateString("pt-BR")}
                      aria-pressed={day === selected}
                      className={`${date.getMonth() !== miniMonth.getMonth() ? "is-outside" : ""} ${day === selected ? "is-selected" : ""} ${day === todayKey ? "is-today" : ""} ${eventsFor(date).length ? "has-event" : ""}`}
                      onClick={() => selectDate(day)}
                    >
                      {date.getDate()}
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="agenda-next-card">
              <div className="agenda-side-title">
                <span>Próximo compromisso</span>
                <Icon name="clock" />
              </div>
              {upcomingEvent ? (
                <button
                  type="button"
                  className="agenda-next-content"
                  data-tone={eventTone(upcomingEvent.data.type)}
                  onClick={() => {
                    selectDate(key(new Date(upcomingEvent.data.date)));
                    setEdit(upcomingEvent);
                  }}
                >
                  <span className="agenda-next-icon">
                    <Icon name={eventIcon(upcomingEvent.data.type)} />
                  </span>
                  <strong>{upcomingEvent.data.title}</strong>
                  <small>
                    {new Date(upcomingEvent.data.date).toLocaleDateString(
                      "pt-BR",
                      { weekday: "short", day: "2-digit", month: "short" },
                    )}
                    , {timeLabel(upcomingEvent.data.date)}
                  </small>
                  <span>
                    {leads.find((lead) => lead.id === upcomingEvent.data.leadId)
                      ?.data.name || upcomingEvent.data.type}
                  </span>
                </button>
              ) : (
                <div className="agenda-next-empty">
                  <Icon name="calendar" />
                  <strong>Agenda livre</strong>
                  <span>Crie o próximo passo da sua prospecção.</span>
                </div>
              )}
            </section>

            <section className="agenda-filters">
              <div className="agenda-side-title">
                <span>Filtros</span>
                <Icon name="filter" />
              </div>
              {EVENT_TYPES.map((item) => (
                <label key={item.name}>
                  <input
                    type="checkbox"
                    checked={activeTypes.has(item.name)}
                    onChange={() => toggleType(item.name)}
                  />
                  <span className="agenda-filter-dot" data-tone={item.tone} />
                  {item.name}
                  <small>
                    {
                      events.filter((event) => event.data.type === item.name)
                        .length
                    }
                  </small>
                </label>
              ))}
              <label>
                <input
                  type="checkbox"
                  checked={showNotes}
                  onChange={(event) => setShowNotes(event.target.checked)}
                />
                <span className="agenda-filter-dot" data-tone="yellow" />
                Anotações
                <small>{notes.length}</small>
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={showDates}
                  onChange={(event) => setShowDates(event.target.checked)}
                />
                <span className="agenda-filter-dot" data-tone="rose" />
                Datas especiais
              </label>
            </section>
          </aside>

          <main className="agenda-calendar-area">
            {view === "day" && renderTimeline([selectedDate])}
            {view === "week" && renderTimeline(weekDays)}
            {view === "month" && (
              <div className="agenda-month-view">
                <div className="agenda-month-weekdays">
                  {WEEKDAYS.map((weekday) => (
                    <span key={weekday}>{weekday}</span>
                  ))}
                </div>
                <div className="agenda-month-grid">
                  {mainMonthDays.map((date) => {
                    const day = key(date);
                    const dayEvents = eventsFor(date);
                    const dayNotes = showNotes ? notesFor(day) : [];
                    const dayHolidays = showDates
                      ? holidays.filter((item) => item.date === day)
                      : [];
                    return (
                      <div
                        key={day}
                        className={`agenda-month-day ${date.getMonth() !== selectedDate.getMonth() ? "is-outside" : ""} ${day === selected ? "is-selected" : ""}`}
                      >
                        <button
                          type="button"
                          className={day === todayKey ? "is-today" : ""}
                          aria-label={`Selecionar ${date.toLocaleDateString("pt-BR")}`}
                          onClick={() => selectDate(day)}
                        >
                          {date.getDate()}
                        </button>
                        {dayHolidays.slice(0, 1).map((holiday) => (
                          <span
                            className="agenda-month-holiday"
                            key={holiday.title}
                            title={holiday.title}
                          >
                            {holiday.icon} {holiday.title}
                          </span>
                        ))}
                        {dayEvents.slice(0, 3).map((row) => (
                          <button
                            type="button"
                            className="agenda-month-event"
                            data-tone={eventTone(row.data.type)}
                            key={row.id}
                            onClick={() => {
                              selectDate(day);
                              setEdit(row);
                            }}
                          >
                            <span>{timeLabel(row.data.date)}</span>
                            {row.data.title}
                          </button>
                        ))}
                        {dayNotes.length > 0 && (
                          <span className="agenda-month-note">
                            <Icon name="message" /> {dayNotes.length}
                          </span>
                        )}
                        {dayEvents.length > 3 && (
                          <span className="agenda-month-more">
                            +{dayEvents.length - 3} compromissos
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </main>
        </div>
      </section>

      <details className="agenda-day-summary">
        <summary>
          <span className="agenda-summary-icon">
            <Icon name="calendar" />
          </span>
          <span>
            <strong>
              Resumo de{" "}
              {selectedDate.toLocaleDateString("pt-BR", {
                day: "numeric",
                month: "long",
              })}
            </strong>
            <small>
              {selectedEvents.length} compromisso
              {selectedEvents.length === 1 ? "" : "s"}
              {showNotes
                ? ` · ${notesFor(selected).length} anotação${notesFor(selected).length === 1 ? "" : "ões"}`
                : ""}
            </small>
          </span>
          <span className="agenda-summary-action">Ver detalhes</span>
        </summary>
        <div className="agenda-summary-content">
          <section className="agenda-selected-events">
            <header>
              <div>
                <span>PRÓXIMOS PASSOS</span>
                <h2>Compromissos do dia</h2>
              </div>
              <button
                type="button"
                className="secondary"
                onClick={() => openNew(selected)}
              >
                <Icon name="plus" /> Agendar neste dia
              </button>
            </header>
            {showDates &&
              holidays
                .filter((item) => item.date === selected)
                .map((item) => (
                  <div className="agenda-special-date" key={item.title}>
                    <span>{item.icon}</span>
                    <div>
                      <strong>{item.title}</strong>
                      <small>{item.type}</small>
                    </div>
                  </div>
                ))}
            <div className="agenda-selected-list">
              {selectedEvents.map((row) => {
                const lead = leads.find((item) => item.id === row.data.leadId);
                return (
                  <article
                    key={row.id}
                    data-tone={eventTone(row.data.type)}
                    className={row.data.done ? "is-done" : ""}
                  >
                    <span className="agenda-selected-time">
                      {timeLabel(row.data.date)}
                    </span>
                    <span className="agenda-selected-type">
                      <Icon name={eventIcon(row.data.type)} />
                    </span>
                    <div>
                      <strong>{row.data.title}</strong>
                      <small>
                        {row.data.type}
                        {lead ? ` · ${lead.data.name}` : ""}
                      </small>
                      {row.data.detail && <p>{row.data.detail}</p>}
                    </div>
                    <div className="agenda-selected-actions">
                      <button type="button" onClick={() => void complete(row)}>
                        <Icon name="check" />
                        {row.data.done ? "Reabrir" : "Concluir"}
                      </button>
                      <button type="button" onClick={() => setEdit(row)}>
                        Editar
                      </button>
                    </div>
                  </article>
                );
              })}
              {!selectedEvents.length && (
                <div className="agenda-selected-empty">
                  <Icon name="calendar" />
                  <strong>Nenhum compromisso neste dia</strong>
                  <span>Use a agenda para preparar a próxima conversa.</span>
                  <button type="button" onClick={() => openNew(selected)}>
                    Criar compromisso
                  </button>
                </div>
              )}
            </div>
          </section>
          {showNotes && (
            <section className="agenda-notes-area">
              <Notes
                key={selected}
                selectedDate={selected}
                onSelectDate={selectDate}
              />
            </section>
          )}
        </div>
      </details>

      <p className="agenda-scope-note">
        O calendário reúne datas nacionais e comemorativas. Feriados locais e
        pontos facultativos podem variar conforme a legislação da sua região.
      </p>

      {edit && (
        <Modal
          title={
            edit === "new" ? "Criar novo compromisso" : "Editar compromisso"
          }
          close={close}
        >
          <form className="form-stack agenda-event-form" onSubmit={submit}>
            <div className="agenda-form-intro">
              <span>
                <Icon name="calendar" />
              </span>
              <div>
                <strong>Planeje o próximo passo</strong>
                <small>Defina quando e com quem você quer falar.</small>
              </div>
            </div>
            <label>
              Título
              <input
                name="title"
                required
                maxLength={200}
                placeholder="Ex.: Reunião de apresentação"
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
                    edit === "new" ? draftDate : localInput(edit.data.date)
                  }
                />
              </label>
              <label>
                Tipo
                <select
                  name="type"
                  defaultValue={edit === "new" ? "Follow-up" : edit.data.type}
                >
                  {EVENT_TYPES.map((item) => (
                    <option key={item.name}>{item.name}</option>
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
                {leads.map((lead) => (
                  <option value={lead.id} key={lead.id}>
                    {lead.data.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Detalhes
              <textarea
                name="detail"
                rows={4}
                maxLength={10000}
                placeholder="Contexto, pauta ou informação importante para a conversa."
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
    </div>
  );
}
