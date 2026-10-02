"use client";
import { useEffect, useState } from "react";
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
export function Admin() {
  const [data, setData] = useState<Data | null>(null),
    [query, setQuery] = useState(""),
    [message, setMessage] = useState(""),
    [trialUser, setTrialUser] = useState<AdminUser | null>(null),
    [trialStartsAt, setTrialStartsAt] = useState(""),
    [trialEndsAt, setTrialEndsAt] = useState("");
  async function updateUser(payload: Record<string, unknown>) {
    const r = await fetch("/api/admin", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const result = await r.json().catch(() => null);
    if (!r.ok)
      throw Error(result?.error || "Não foi possível alterar a conta.");
    await load();
  }
  function localInputValue(value: string | null) {
    if (!value) return "";
    const date = new Date(value);
    return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);
  }
  function openTrial(user: AdminUser) {
    setTrialUser(user);
    setTrialStartsAt(
      localInputValue(user.trialStartsAt) ||
        localInputValue(new Date().toISOString()),
    );
    setTrialEndsAt(localInputValue(user.trialEndsAt));
    setMessage("");
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
  const active =
    data?.users.filter(
      (u) =>
        u.subscription?.status === "active" &&
        u.subscription.periodEnd &&
        new Date(u.subscription.periodEnd) > new Date(),
    ).length || 0;
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
      <section className="panel">
        <div className="toolbar">
          <h2 style={{ fontSize: 15, margin: 0 }}>Contas da plataforma</h2>
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
              {data?.users
                .filter((u) =>
                  `${u.name} ${u.email}`
                    .toLowerCase()
                    .includes(query.toLowerCase()),
                )
                .map((u) => (
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
                      {u.role === "ADMIN"
                        ? "Administrador"
                        : u.trialStartsAt && u.trialEndsAt
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
                        {u.id !== data.currentUserId && (
                          <button
                            className="secondary"
                            onClick={async () => {
                              const role =
                                u.role === "ADMIN" ? "USER" : "ADMIN";
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
                            {u.role === "ADMIN"
                              ? "Remover admin"
                              : "Tornar admin"}
                          </button>
                        )}
                        {u.role !== "ADMIN" && (
                          <button
                            className="secondary"
                            onClick={() => openTrial(u)}
                          >
                            Teste gratuito
                          </button>
                        )}
                        {u.role !== "ADMIN" && (
                          <button
                            className="secondary"
                            onClick={async () => {
                              if (
                                !confirm(
                                  `${u.suspended ? "Reativar" : "Suspender"} o acesso de ${u.name}?`,
                                )
                              )
                                return;
                              try {
                                const r = await fetch("/api/admin", {
                                  method: "PATCH",
                                  headers: {
                                    "Content-Type": "application/json",
                                  },
                                  body: JSON.stringify({
                                    action: "suspension",
                                    id: u.id,
                                    suspended: !u.suspended,
                                  }),
                                });
                                if (!r.ok) throw Error();
                                await load();
                              } catch {
                                setMessage(
                                  "Não foi possível alterar o acesso.",
                                );
                              }
                            }}
                          >
                            {u.suspended ? "Reativar" : "Suspender"}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </section>
      {trialUser && (
        <div
          className="admin-modal-backdrop"
          role="presentation"
          onMouseDown={() => setTrialUser(null)}
        >
          <section
            className="panel admin-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="trial-title"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="panel-heading">
              <div>
                <h2 id="trial-title">Teste gratuito</h2>
                <p>
                  {trialUser.name} · {trialUser.email}
                </p>
              </div>
              <button className="secondary" onClick={() => setTrialUser(null)}>
                Fechar
              </button>
            </div>
            <div className="admin-trial-grid">
              <label>
                Início
                <input
                  type="datetime-local"
                  value={trialStartsAt}
                  onChange={(e) => setTrialStartsAt(e.target.value)}
                />
              </label>
              <label>
                Final
                <input
                  type="datetime-local"
                  value={trialEndsAt}
                  min={trialStartsAt}
                  onChange={(e) => setTrialEndsAt(e.target.value)}
                />
              </label>
            </div>
            <p className="hint">
              O acesso é liberado somente entre essas duas datas. A assinatura
              paga continua independente.
            </p>
            <div className="admin-actions">
              <button
                className="primary"
                onClick={async () => {
                  try {
                    if (!trialStartsAt || !trialEndsAt)
                      throw Error("Informe o início e o final do teste.");
                    await updateUser({
                      action: "trial",
                      id: trialUser.id,
                      startsAt: new Date(trialStartsAt).toISOString(),
                      endsAt: new Date(trialEndsAt).toISOString(),
                    });
                    setTrialUser(null);
                    setMessage("Período gratuito salvo.");
                  } catch (error) {
                    setMessage(
                      error instanceof Error
                        ? error.message
                        : "Não foi possível salvar o teste.",
                    );
                  }
                }}
              >
                Salvar período
              </button>
              {(trialUser.trialStartsAt || trialUser.trialEndsAt) && (
                <button
                  className="secondary"
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
                      setTrialUser(null);
                      setMessage("Período gratuito removido.");
                    } catch (error) {
                      setMessage(
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
