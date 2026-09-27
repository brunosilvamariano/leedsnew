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
  createdAt: string;
  subscription: { status: string; periodEnd: string | null } | null;
  _count: { records: number };
};
type Data = {
  users: AdminUser[];
  integrations: Record<string, boolean>;
  billing: boolean;
};
export function Admin() {
  const [data, setData] = useState<Data | null>(null),
    [query, setQuery] = useState(""),
    [message, setMessage] = useState("");
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
                        ? "Proprietário"
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
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({
                                  id: u.id,
                                  suspended: !u.suspended,
                                }),
                              });
                              if (!r.ok) throw Error();
                              await load();
                            } catch {
                              setMessage("Não foi possível alterar o acesso.");
                            }
                          }}
                        >
                          {u.suspended ? "Reativar" : "Suspender"}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </section>
      {message && (
        <p className="form-message" role="status">
          {message}
        </p>
      )}
    </>
  );
}
