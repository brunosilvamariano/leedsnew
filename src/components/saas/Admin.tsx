"use client";
import { useEffect, useId, useRef, useState } from "react";
import { Avatar } from "@/components/layout/AppShell";
import { Heading, money } from "./Shared";
type AdminUser = {
  id: string;
  name: string;
  email: string;
  image: string | null;
  role: string;
  suspended: boolean;
  trialStartsAt: string | null;
  trialEndsAt: string | null;
  createdAt: string;
  subscription: { status: string; periodEnd: string | null } | null;
  _count: { records: number };
};
type Data = {
  currentUserId: string;
  users: AdminUser[];
  integrations: Record<string, boolean>;
  billing: boolean;
};
const monthNames = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];
const weekDays = ["SEG", "TER", "QUA", "QUI", "SEX", "SÁB", "DOM"];
function inputDate(date: Date) {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
}

function validDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date : null;
}

function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60_000);
}

function dateKey(date: Date) {
  return inputDate(date).slice(0, 10);
}

function formatDuration(start: Date, end: Date) {
  const totalMinutes = Math.max(
    1,
    Math.round((end.getTime() - start.getTime()) / 60_000),
  );
  const days = Math.floor(totalMinutes / 1_440);
  const hours = Math.floor((totalMinutes % 1_440) / 60);
  const minutes = totalMinutes % 60;
  const parts = [];
  if (days) parts.push(`${days} ${days === 1 ? "dia" : "dias"}`);
  if (hours) parts.push(`${hours}h`);
  if (minutes) parts.push(`${minutes}min`);
  return parts.join(" e ");
}

function DateTimePicker({
  label,
  value,
  onChange,
  minimum,
  open,
  onOpenChange,
  align = "start",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  minimum?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  align?: "start" | "end";
}) {
  const selected = validDate(value);
  const minimumDate = validDate(minimum);
  const pickerId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [view, setView] = useState(() => selected || minimumDate || new Date());
  useEffect(() => {
    if (!open) return;
    function closeOnOutsideClick(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) onOpenChange(false);
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onOpenChange(false);
        requestAnimationFrame(() => triggerRef.current?.focus());
      }
    }
    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open, onOpenChange]);
  const first = new Date(view.getFullYear(), view.getMonth(), 1);
  const offset = (first.getDay() + 6) % 7;
  const days = Array.from(
    { length: 42 },
    (_, index) =>
      new Date(view.getFullYear(), view.getMonth(), index - offset + 1),
  );
  function choose(day: Date) {
    let next = new Date(day);
    const reference = selected || minimumDate;
    next.setHours(
      reference?.getHours() ?? 9,
      reference?.getMinutes() ?? 0,
      0,
      0,
    );
    if (minimumDate && next <= minimumDate) next = addMinutes(minimumDate, 15);
    onChange(inputDate(next));
    setView(next);
  }
  function setTime(part: "hour" | "minute", nextValue: number) {
    let next = selected
      ? new Date(selected)
      : minimumDate
        ? addMinutes(minimumDate, 15)
        : new Date();
    if (part === "hour") next.setHours(nextValue);
    else next.setMinutes(nextValue);
    next.setSeconds(0, 0);
    if (minimumDate && next <= minimumDate) next = addMinutes(minimumDate, 15);
    onChange(inputDate(next));
  }
  function chooseToday() {
    let next = new Date();
    next.setSeconds(0, 0);
    if (minimumDate && next <= minimumDate) next = addMinutes(minimumDate, 15);
    onChange(inputDate(next));
    setView(next);
  }
  function moveDayFocus(day: Date, amount: number) {
    const next = new Date(day);
    next.setDate(next.getDate() + amount);
    const endOfNextDay = new Date(
      next.getFullYear(),
      next.getMonth(),
      next.getDate(),
      23,
      59,
      59,
    );
    if (minimumDate && endOfNextDay < minimumDate) return;
    if (
      next.getMonth() !== view.getMonth() ||
      next.getFullYear() !== view.getFullYear()
    ) {
      setView(new Date(next.getFullYear(), next.getMonth(), 1));
    }
    requestAnimationFrame(() =>
      rootRef.current
        ?.querySelector<HTMLButtonElement>(
          `[data-calendar-day="${dateKey(next)}"]`,
        )
        ?.focus(),
    );
  }
  function closeAndFocusTrigger() {
    onOpenChange(false);
    requestAnimationFrame(() => triggerRef.current?.focus());
  }
  return (
    <div className={`date-time-field align-${align}`} ref={rootRef}>
      <span>{label}</span>
      <button
        type="button"
        ref={triggerRef}
        className={`date-time-trigger ${open ? "is-open" : ""}`}
        onClick={() => {
          const nextOpen = !open;
          if (nextOpen) setView(selected || minimumDate || new Date());
          onOpenChange(nextOpen);
        }}
        aria-expanded={open}
        aria-controls={pickerId}
        aria-haspopup="dialog"
      >
        <span>
          <strong>
            {selected
              ? selected.toLocaleDateString("pt-BR", {
                  weekday: "short",
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })
              : "Escolher data"}
          </strong>
          <small>
            {selected
              ? selected.toLocaleTimeString("pt-BR", {
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "Selecione também o horário"}
          </small>
        </span>
        <span className="calendar-symbol" aria-hidden="true">
          <svg viewBox="0 0 24 24" role="img">
            <path d="M7 2v3M17 2v3M3.5 9h17M5.5 4h13a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z" />
            <path d="M8 13h3v3H8z" />
          </svg>
        </span>
      </button>
      {open && (
        <div
          className="date-time-popover"
          id={pickerId}
          role="dialog"
          aria-label={`Calendário para ${label.toLowerCase()}`}
        >
          <div className="calendar-heading">
            <button
              type="button"
              aria-label="Mês anterior"
              onClick={() =>
                setView(new Date(view.getFullYear(), view.getMonth() - 1, 1))
              }
            >
              ‹
            </button>
            <strong>
              {monthNames[view.getMonth()]} <span>{view.getFullYear()}</span>
            </strong>
            <button
              type="button"
              aria-label="Próximo mês"
              onClick={() =>
                setView(new Date(view.getFullYear(), view.getMonth() + 1, 1))
              }
            >
              ›
            </button>
          </div>
          <div className="calendar-weekdays">
            {weekDays.map((day) => (
              <span key={day}>{day}</span>
            ))}
          </div>
          <div className="calendar-days" role="grid" aria-label="Dias do mês">
            {days.map((day) => {
              const sameMonth = day.getMonth() === view.getMonth();
              const isSelected =
                selected && day.toDateString() === selected.toDateString();
              const isToday = day.toDateString() === new Date().toDateString();
              const disabled = Boolean(
                minimumDate &&
                new Date(
                  day.getFullYear(),
                  day.getMonth(),
                  day.getDate(),
                  23,
                  59,
                  59,
                ) < minimumDate,
              );
              return (
                <button
                  type="button"
                  key={day.toISOString()}
                  data-calendar-day={dateKey(day)}
                  disabled={disabled}
                  className={`${sameMonth ? "" : "outside"} ${isSelected ? "selected" : ""} ${isToday ? "today" : ""}`}
                  onClick={() => choose(day)}
                  onKeyDown={(event) => {
                    const movement = {
                      ArrowLeft: -1,
                      ArrowRight: 1,
                      ArrowUp: -7,
                      ArrowDown: 7,
                    }[event.key];
                    if (movement) {
                      event.preventDefault();
                      moveDayFocus(day, movement);
                    }
                  }}
                  aria-label={day.toLocaleDateString("pt-BR", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                  aria-pressed={Boolean(isSelected)}
                  tabIndex={isSelected || (!selected && isToday) ? 0 : -1}
                >
                  {day.getDate()}
                </button>
              );
            })}
          </div>
          <div className="calendar-time">
            <span>Horário local</span>
            <select
              aria-label="Hora"
              value={selected?.getHours() ?? 9}
              onChange={(event) => setTime("hour", Number(event.target.value))}
            >
              {Array.from({ length: 24 }, (_, hour) => (
                <option key={hour} value={hour}>
                  {String(hour).padStart(2, "0")}
                </option>
              ))}
            </select>
            <b>:</b>
            <select
              aria-label="Minuto"
              value={selected?.getMinutes() ?? 0}
              onChange={(event) =>
                setTime("minute", Number(event.target.value))
              }
            >
              {Array.from({ length: 60 }, (_, minute) => minute).map(
                (minute) => (
                  <option key={minute} value={minute}>
                    {String(minute).padStart(2, "0")}
                  </option>
                ),
              )}
            </select>
          </div>
          <div className="calendar-footer">
            <button
              type="button"
              className="calendar-clear"
              onClick={() => onChange("")}
            >
              Limpar
            </button>
            <button
              type="button"
              className="calendar-today"
              onClick={chooseToday}
            >
              Agora
            </button>
            <button
              type="button"
              className="calendar-done"
              onClick={closeAndFocusTrigger}
            >
              Concluir
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
export function Admin() {
  const modalRef = useRef<HTMLElement>(null);
  const trialTriggerRef = useRef<HTMLButtonElement>(null);
  const [data, setData] = useState<Data | null>(null);
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState("");
  const [trialUser, setTrialUser] = useState<AdminUser | null>(null);
  const [trialStartsAt, setTrialStartsAt] = useState("");
  const [trialEndsAt, setTrialEndsAt] = useState("");
  const [trialError, setTrialError] = useState("");
  const [openPicker, setOpenPicker] = useState<"start" | "end" | null>(null);
  const [busyUserId, setBusyUserId] = useState<string | null>(null);
  async function updateUser(payload: Record<string, unknown>) {
    const targetId = typeof payload.id === "string" ? payload.id : "admin";
    setBusyUserId(targetId);
    try {
      const r = await fetch("/api/admin", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await r.json().catch(() => null);
      if (!r.ok)
        throw Error(result?.error || "Não foi possível alterar a conta.");
      await load();
    } finally {
      setBusyUserId(null);
    }
  }
  function openTrial(user: AdminUser, trigger: HTMLButtonElement) {
    trialTriggerRef.current = trigger;
    const start = validDate(user.trialStartsAt) || new Date();
    start.setSeconds(0, 0);
    if (!user.trialStartsAt)
      start.setMinutes(Math.ceil(start.getMinutes() / 15) * 15);
    const end = validDate(user.trialEndsAt) || new Date(start);
    if (!user.trialEndsAt) end.setDate(end.getDate() + 7);
    setTrialUser(user);
    setTrialStartsAt(inputDate(start));
    setTrialEndsAt(inputDate(end));
    setTrialError("");
    setOpenPicker(null);
    setMessage("");
  }
  function closeTrial() {
    setTrialUser(null);
    setTrialError("");
    setOpenPicker(null);
    requestAnimationFrame(() => trialTriggerRef.current?.focus());
  }
  function changeTrialStart(value: string) {
    setTrialStartsAt(value);
    setTrialError("");
    const start = validDate(value);
    const end = validDate(trialEndsAt);
    if (start && (!end || end <= start)) {
      const nextEnd = new Date(start);
      nextEnd.setDate(nextEnd.getDate() + 7);
      setTrialEndsAt(inputDate(nextEnd));
    }
  }
  function applyTrialDuration(days: number) {
    const start = validDate(trialStartsAt) || new Date();
    const end = new Date(start);
    end.setDate(end.getDate() + days);
    setTrialStartsAt(inputDate(start));
    setTrialEndsAt(inputDate(end));
    setTrialError("");
    setOpenPicker(null);
  }
  async function load() {
    try {
      const r = await fetch("/api/admin");
      if (!r.ok) throw Error();
      setData(await r.json());
    } catch {
      setMessage("Não foi possível carregar a administração.");
    }
  }
  useEffect(() => {
    fetch("/api/admin")
      .then((r) => {
        if (!r.ok) throw Error();
        return r.json();
      })
      .then(setData)
      .catch(() => setMessage("Não foi possível carregar a administração."));
  }, []);
  useEffect(() => {
    if (!trialUser) return;
    const modal = modalRef.current!;
    if (!modal) return;
    function keepFocusInsideModal(event: KeyboardEvent) {
      if (event.key === "Escape") {
        if (openPicker) return;
        event.preventDefault();
        setTrialUser(null);
        setTrialError("");
        setOpenPicker(null);
        requestAnimationFrame(() => trialTriggerRef.current?.focus());
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = Array.from(
        modal.querySelectorAll<HTMLElement>(
          'button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((element) => element.offsetParent !== null);
      const first = focusable[0];
      const last = focusable.at(-1);
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (
        !event.shiftKey &&
        (document.activeElement === last ||
          !modal.contains(document.activeElement))
      ) {
        event.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", keepFocusInsideModal);
    return () => document.removeEventListener("keydown", keepFocusInsideModal);
  }, [trialUser, openPicker]);
  useEffect(() => {
    if (!trialUser) return;
    requestAnimationFrame(() =>
      modalRef.current
        ?.querySelector<HTMLButtonElement>(".admin-modal-close")
        ?.focus(),
    );
  }, [trialUser]);
  const active =
    data?.users.filter(
      (u) =>
        u.subscription?.status === "active" &&
        u.subscription.periodEnd &&
        new Date(u.subscription.periodEnd) > new Date(),
    ).length || 0;
  const administrators =
    data?.users.filter((user) => user.role === "ADMIN") || [];
  const platformUsers =
    data?.users.filter((user) => user.role !== "ADMIN") || [];
  const visibleUsers = platformUsers.filter((user) =>
    `${user.name} ${user.email}`
      .toLowerCase()
      .includes(query.trim().toLowerCase()),
  );
  const selectedTrialStart = validDate(trialStartsAt);
  const selectedTrialEnd = validDate(trialEndsAt);
  const trialDurationMs =
    selectedTrialStart &&
    selectedTrialEnd &&
    selectedTrialEnd > selectedTrialStart
      ? selectedTrialEnd.getTime() - selectedTrialStart.getTime()
      : null;
  const activeTrialPreset = [7, 14, 30].find(
    (days) => trialDurationMs === days * 24 * 60 * 60 * 1000,
  );
  const trialDurationLabel =
    selectedTrialStart && selectedTrialEnd && trialDurationMs
      ? formatDuration(selectedTrialStart, selectedTrialEnd)
      : null;
  return (
    <>
      <Heading
        title="Uma visão completa do seu SaaS."
        text="Usuários, assinaturas e operação. Seu centro de administração."
      />
      <div className="stat-grid">
        {[
          ["Contas cadastradas", String(data?.users.length || 0)],
          ["Assinaturas ativas", String(active)],
          ["Receita mensal estimada", money(active * 50)],
          [
            "Contas suspensas",
            String(data?.users.filter((u) => u.suspended).length || 0),
          ],
        ].map(([label, value]) => (
          <article className="stat-card" key={label}>
            <span className="stat-top">{label}</span>
            <strong className="stat-value">{value}</strong>
            <small>
              {label.startsWith("Receita")
                ? "Plano de R$ 50 · antes de taxas"
                : "Dados da plataforma"}
            </small>
          </article>
        ))}
      </div>
      <section className="panel" style={{ marginBottom: 22 }}>
        <div className="panel-heading">
          <h2>Integrações da plataforma</h2>
          <span className="chip">
            {data?.billing ? "Cobrança habilitada" : "Avaliação sem cobrança"}
          </span>
        </div>
        <div className="tabs">
          {Object.entries(data?.integrations || {}).map(([key, ok]) => (
            <span
              className="status-badge"
              data-stage={ok ? "Ganho" : "Proposta"}
              key={key}
            >
              {ok ? "✓" : "○"}{" "}
              {
                (
                  {
                    google: "Login Google",
                    email: "E-mails",
                    stripe: "Stripe",
                    places: "Google Places",
                  } as Record<string, string>
                )[key]
              }{" "}
              · {ok ? "Configurado" : "Pendente"}
            </span>
          ))}
        </div>
      </section>
      <section className="panel admin-team-panel">
        <div className="panel-heading">
          <div>
            <span className="eyebrow">EQUIPE PRINCIPAL</span>
            <h2>Administradores da plataforma</h2>
            <p>
              Contas com acesso total à operação e às configurações do BizPeek.
            </p>
          </div>
          <span className="chip">
            {administrators.length}{" "}
            {administrators.length === 1 ? "administrador" : "administradores"}
          </span>
        </div>
        <div className="admin-team-grid">
          {administrators.map((admin) => (
            <article className="admin-team-card" key={admin.id}>
              <Avatar user={admin} size={46} />
              <div>
                <strong>{admin.name}</strong>
                <small>{admin.email}</small>
                <span>
                  {admin.id === data?.currentUserId
                    ? "Você · acesso total"
                    : "Administrador · acesso total"}
                </span>
              </div>
              {admin.id !== data?.currentUserId && (
                <button
                  className="secondary"
                  type="button"
                  disabled={busyUserId !== null}
                  onClick={async () => {
                    if (!confirm(`Remover ${admin.name} da administração?`))
                      return;
                    try {
                      await updateUser({
                        action: "role",
                        id: admin.id,
                        role: "USER",
                      });
                    } catch (error) {
                      setMessage(
                        error instanceof Error
                          ? error.message
                          : "Não foi possível alterar o administrador.",
                      );
                    }
                  }}
                >
                  {busyUserId === admin.id ? "Atualizando..." : "Remover admin"}
                </button>
              )}
            </article>
          ))}
        </div>
      </section>
      <section className="panel">
        <div className="toolbar">
          <div>
            <span className="eyebrow">CLIENTES E USUÁRIOS</span>
            <h2 style={{ fontSize: 15, margin: 3 }}>Contas da plataforma</h2>
          </div>
          <input
            aria-label="Buscar usuários"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar nome ou e-mail..."
          />
        </div>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>USUÁRIO</th>
                <th>CADASTRO</th>
                <th>ASSINATURA</th>
                <th>REGISTROS</th>
                <th>ACESSO</th>
                <th>AÇÃO</th>
              </tr>
            </thead>
            <tbody>
              {visibleUsers.map((u) => (
                <tr key={u.id}>
                  <td>
                    <div className="lead-identity">
                      <Avatar user={u} />
                      <div>
                        <strong>{u.name}</strong>
                        <small>{u.email}</small>
                      </div>
                    </div>
                  </td>
                  <td>{new Date(u.createdAt).toLocaleDateString("pt-BR")}</td>
                  <td>
                    {u.trialStartsAt && u.trialEndsAt
                      ? `${new Date(u.trialStartsAt) > new Date() ? "Teste agendado" : new Date(u.trialEndsAt) > new Date() ? "Teste ativo" : "Teste encerrado"} · até ${new Date(u.trialEndsAt).toLocaleDateString("pt-BR")}`
                      : u.subscription?.status || "Sem assinatura"}
                  </td>
                  <td>{u._count.records}</td>
                  <td>
                    <span
                      className="status-badge"
                      data-stage={u.suspended ? "Perdido" : "Ganho"}
                    >
                      {u.suspended ? "Suspenso" : "Ativo"}
                    </span>
                  </td>
                  <td>
                    <div className="admin-actions">
                      <button
                        className="secondary"
                        type="button"
                        disabled={busyUserId !== null}
                        onClick={async () => {
                          const role = "ADMIN";
                          if (
                            !confirm(
                              `${role === "ADMIN" ? "Tornar" : "Remover"} ${u.name} ${role === "ADMIN" ? "administrador" : "da administração"}?`,
                            )
                          )
                            return;
                          try {
                            await updateUser({
                              action: "role",
                              id: u.id,
                              role,
                            });
                          } catch (error) {
                            setMessage(
                              error instanceof Error
                                ? error.message
                                : "Não foi possível alterar o administrador.",
                            );
                          }
                        }}
                      >
                        {busyUserId === u.id
                          ? "Atualizando..."
                          : "Tornar admin"}
                      </button>
                      <button
                        className="secondary"
                        type="button"
                        disabled={busyUserId !== null}
                        onClick={(event) => openTrial(u, event.currentTarget)}
                      >
                        {u.trialStartsAt && u.trialEndsAt
                          ? "Editar teste"
                          : "Teste gratuito"}
                      </button>
                      <button
                        className="secondary"
                        type="button"
                        disabled={busyUserId !== null}
                        onClick={async () => {
                          if (
                            !confirm(
                              `${u.suspended ? "Reativar" : "Suspender"} o acesso de ${u.name}?`,
                            )
                          )
                            return;
                          try {
                            await updateUser({
                              action: "suspension",
                              id: u.id,
                              suspended: !u.suspended,
                            });
                          } catch (error) {
                            setMessage(
                              error instanceof Error
                                ? error.message
                                : "Não foi possível alterar o acesso.",
                            );
                          }
                        }}
                      >
                        {busyUserId === u.id
                          ? "Atualizando..."
                          : u.suspended
                            ? "Reativar"
                            : "Suspender"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {data && visibleUsers.length === 0 && (
                <tr>
                  <td colSpan={6}>
                    <div className="admin-empty-state">
                      <strong>Nenhum usuário encontrado</strong>
                      <span>
                        {query
                          ? "Tente buscar por outro nome ou e-mail."
                          : "Novos usuários aparecerão aqui após o cadastro."}
                      </span>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
      {trialUser && (
        <div
          className="admin-modal-backdrop"
          role="presentation"
          onMouseDown={closeTrial}
        >
          <section
            className="panel admin-modal"
            ref={modalRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="trial-title"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="panel-heading admin-modal-heading">
              <div className="admin-modal-title">
                <span className="admin-modal-icon" aria-hidden="true">
                  ✦
                </span>
                <div>
                  <span className="eyebrow">ACESSO PROMOCIONAL</span>
                  <h2 id="trial-title">Configurar teste gratuito</h2>
                  <p>
                    {trialUser.name} · {trialUser.email}
                  </p>
                </div>
              </div>
              <button
                className="secondary admin-modal-close"
                type="button"
                onClick={closeTrial}
                aria-label="Fechar configuração do teste"
              >
                ×
              </button>
            </div>
            <div className="trial-intro">
              <strong>Defina o período de acesso</strong>
              <span>
                O usuário terá os recursos Pro somente entre o início e o final
                escolhidos.
              </span>
            </div>
            <div className="admin-trial-grid">
              <DateTimePicker
                label="Início do acesso"
                value={trialStartsAt}
                onChange={changeTrialStart}
                open={openPicker === "start"}
                onOpenChange={(nextOpen) =>
                  setOpenPicker(nextOpen ? "start" : null)
                }
              />
              <DateTimePicker
                label="Final do acesso"
                value={trialEndsAt}
                onChange={(value) => {
                  setTrialEndsAt(value);
                  setTrialError("");
                }}
                minimum={trialStartsAt}
                open={openPicker === "end"}
                onOpenChange={(nextOpen) =>
                  setOpenPicker(nextOpen ? "end" : null)
                }
                align="end"
              />
            </div>
            <div className="trial-presets" aria-label="Durações sugeridas">
              <span>Duração rápida</span>
              {[7, 14, 30].map((days) => (
                <button
                  type="button"
                  key={days}
                  onClick={() => applyTrialDuration(days)}
                  className={activeTrialPreset === days ? "is-active" : ""}
                >
                  {days} dias
                </button>
              ))}
            </div>
            {selectedTrialStart && selectedTrialEnd && trialDurationLabel && (
              <div className="trial-period-summary">
                <span aria-hidden="true">✓</span>
                <div>
                  <strong>{trialDurationLabel} de acesso gratuito</strong>
                  <small>
                    De{" "}
                    {selectedTrialStart.toLocaleString("pt-BR", {
                      dateStyle: "short",
                      timeStyle: "short",
                    })}{" "}
                    até{" "}
                    {selectedTrialEnd.toLocaleString("pt-BR", {
                      dateStyle: "short",
                      timeStyle: "short",
                    })}
                  </small>
                </div>
              </div>
            )}
            {trialError && (
              <p className="trial-error" role="alert">
                {trialError}
              </p>
            )}
            <p className="hint trial-hint">
              A assinatura paga continua independente deste período e não será
              alterada.
            </p>
            <div className="admin-actions admin-modal-actions">
              <button
                className="primary"
                type="button"
                disabled={busyUserId !== null}
                onClick={async () => {
                  try {
                    const startsAt = validDate(trialStartsAt);
                    const endsAt = validDate(trialEndsAt);
                    if (!startsAt || !endsAt)
                      throw Error("Informe o início e o final do teste.");
                    if (endsAt <= startsAt)
                      throw Error(
                        "O final deve ser posterior ao início do teste.",
                      );
                    await updateUser({
                      action: "trial",
                      id: trialUser.id,
                      startsAt: startsAt.toISOString(),
                      endsAt: endsAt.toISOString(),
                    });
                    closeTrial();
                    setMessage("Período gratuito salvo.");
                  } catch (error) {
                    setTrialError(
                      error instanceof Error
                        ? error.message
                        : "Não foi possível salvar o teste.",
                    );
                  }
                }}
              >
                {busyUserId === trialUser.id ? "Salvando..." : "Salvar período"}
              </button>
              {(trialUser.trialStartsAt || trialUser.trialEndsAt) && (
                <button
                  className="secondary danger-subtle"
                  type="button"
                  disabled={busyUserId !== null}
                  onClick={async () => {
                    if (
                      !confirm(`Remover o teste gratuito de ${trialUser.name}?`)
                    )
                      return;
                    try {
                      await updateUser({
                        action: "trial",
                        id: trialUser.id,
                        startsAt: null,
                        endsAt: null,
                      });
                      closeTrial();
                      setMessage("Período gratuito removido.");
                    } catch (error) {
                      setTrialError(
                        error instanceof Error
                          ? error.message
                          : "Não foi possível remover o teste.",
                      );
                    }
                  }}
                >
                  Remover teste
                </button>
              )}
              <button
                className="secondary"
                type="button"
                disabled={busyUserId !== null}
                onClick={closeTrial}
              >
                Cancelar
              </button>
            </div>
          </section>
        </div>
      )}
      {message && (
        <p className="form-message" role="status">
          {message}
        </p>
      )}
    </>
  );
}
