"use client";
import Link from "next/link";
import { useState } from "react";
import { useUser } from "@/components/layout/AppShell";
import { Icon, type IconName } from "@/components/ui/Icon";
import { useRecords, saveRecord } from "@/lib/records-client";
import {
  stages,
  type LeadData,
  type EventData,
  type NoteData,
} from "@/lib/crm-types";
import { Heading, money } from "./Shared";
const colors = [
  "#b9a1da",
  "#a8c7e5",
  "#eed0ae",
  "#ddb7cd",
  "#abcdb6",
  "#c9c4cd",
];
export function Overview() {
  const user = useUser(),
    leads = useRecords<LeadData>("lead"),
    events = useRecords<EventData>("event"),
    notes = useRecords<NoteData>("note");
  const [range, setRange] = useState(6);
  const won = leads.filter((l) => l.data.stage === "Ganho"),
    contacted = leads.filter((l) => l.data.contactAt),
    pending = events
      .filter((e) => !e.data.done)
      .sort((a, b) => a.data.date.localeCompare(b.data.date));
  const stats: {
    label: string;
    value: string;
    detail: string;
    icon: IconName;
  }[] = [
    {
      label: "Leads na sua base",
      value: String(leads.length),
      detail: "Oportunidades para cultivar",
      icon: "lead",
    },
    {
      label: "Conversas iniciadas",
      value: String(contacted.length),
      detail: "Relacionamentos em movimento",
      icon: "message",
    },
    {
      label: "Negócios conquistados",
      value: money(won.reduce((s, l) => s + (l.data.value || 0), 0)),
      detail: `${won.length} leads na etapa Ganho`,
      icon: "chart",
    },
    {
      label: "Próximos passos",
      value: String(pending.length),
      detail: "Compromissos para acompanhar",
      icon: "calendar",
    },
  ];
  const months = Array.from({ length: range }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - range + 1 + i, 1);
    return d;
  });
  const values = months.map(
    (d) =>
      leads.filter((l) => {
        const c = new Date(l.createdAt);
        return (
          c.getMonth() === d.getMonth() && c.getFullYear() === d.getFullYear()
        );
      }).length,
  );
  const max = Math.max(4, ...values),
    points = values.map((v, i) => ({
      x: 30 + i * (540 / (range - 1)),
      y: 170 - (v / max) * 140,
    }));
  const line = points.map((p, i) => `${i ? "L" : "M"}${p.x},${p.y}`).join(" ");
  let cursor = 0;
  const gradient = stages
    .map((s, i) => {
      const from = cursor;
      cursor +=
        (leads.filter((l) => (l.data.stage || "Novo") === s).length /
          Math.max(1, leads.length)) *
        100;
      return `${colors[i]} ${from}% ${cursor}%`;
    })
    .join(",");
  return (
    <>
      <Heading
        title={`Olá, ${user.name.split(" ")[0]}. Que bom ter você aqui!`}
        text="Uma visão clara do que importa para o seu negócio."
      >
        <span className="date-label">
          ◷{" "}
          {new Date().toLocaleDateString("pt-BR", {
            day: "numeric",
            month: "long",
          })}
        </span>
        <Link className="primary" href="/leads">
          ＋ Adicionar lead
        </Link>
      </Heading>
      <section className="welcome-banner">
        <div>
          <span className="eyebrow">UM NOVO DIA, NOVAS POSSIBILIDADES</span>
          <h2>Boas conexões merecem atenção.</h2>
          <p>
            Organize suas oportunidades e dê o próximo passo.
            <br />A próxima grande conquista pode começar com uma conversa.
          </p>
          <Link className="primary" href="/explorar">
            Encontrar oportunidades <span>↗</span>
          </Link>
        </div>
        <div className="banner-art" aria-hidden="true">
          <div className="ring" />
          <div className="cube" />
          <span className="spark">✦</span>
        </div>
      </section>
      <section className="stat-grid">
        {stats.map((s) => (
          <article className="stat-card" key={s.label}>
            <div className="stat-top">
              <span>{s.label}</span>
              <span className="stat-icon">
                <Icon name={s.icon} />
              </span>
            </div>
            <strong className="stat-value">{s.value}</strong>
            <small>{s.detail}</small>
          </article>
        ))}
      </section>
      <div className="dashboard-grid">
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>Seu ritmo de crescimento</h2>
              <p>Novos leads adicionados ao longo do tempo</p>
            </div>
            <select
              aria-label="Período do gráfico"
              className="chip"
              style={{ border: 0 }}
              value={range}
              onChange={(e) => setRange(Number(e.target.value))}
            >
              <option value={6}>Últimos 6 meses</option>
              <option value={12}>Últimos 12 meses</option>
            </select>
          </div>
          <svg
            className="chart-svg"
            viewBox="0 0 600 205"
            role="img"
            aria-label={`Leads por mês: ${months.map((d, i) => `${d.toLocaleDateString("pt-BR", { month: "short" })}: ${values[i]}`).join(", ")}`}
          >
            <defs>
              <linearGradient id="leadFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#c8b6e7" stopOpacity=".48" />
                <stop offset="1" stopColor="#c8b6e7" stopOpacity=".02" />
              </linearGradient>
            </defs>
            {[0, 1, 2, 3, 4].map((v) => (
              <g key={v}>
                <line
                  x1="30"
                  x2="580"
                  y1={170 - v * 35}
                  y2={170 - v * 35}
                  stroke="#f0ecf6"
                  strokeDasharray="4 5"
                />
                <text x="0" y={174 - v * 35} fill="#b6a8c2" fontSize="9">
                  {Math.round((max * v) / 4)}
                </text>
              </g>
            ))}
            <path d={`${line} L570,170 L30,170 Z`} fill="url(#leadFill)" />
            <path
              d={line}
              fill="none"
              stroke="#b499d9"
              strokeWidth="3"
              strokeLinejoin="round"
            />
            {points.map((p, i) => (
              <g key={i}>
                <circle
                  cx={p.x}
                  cy={p.y}
                  r="4"
                  fill="white"
                  stroke="#b499d9"
                  strokeWidth="2"
                >
                  <title>{values[i]} leads</title>
                </circle>
                <text
                  x={p.x}
                  y="198"
                  textAnchor="middle"
                  fontSize="9"
                  fill="#b4a6bf"
                >
                  {months[i].toLocaleDateString("pt-BR", { month: "short" })}
                </text>
              </g>
            ))}
          </svg>
          <div className="chart-legend">
            <span>
              <i /> Leads adicionados
            </span>
            <span>Dados reais do seu workspace</span>
          </div>
        </section>
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>Oportunidades em movimento</h2>
              <p>Distribuição por etapa do pipeline</p>
            </div>
            <Link href="/pipeline">Ver pipeline ↗</Link>
          </div>
          <div className="donut-wrap">
            <div
              className="saas-donut"
              style={{
                background: leads.length
                  ? `conic-gradient(${gradient})`
                  : "#f1ecf7",
              }}
            >
              <div>
                <strong>{leads.length}</strong>
                <small>oportunidades</small>
              </div>
            </div>
            <div className="donut-legend">
              {stages.map((s, i) => (
                <div key={s}>
                  <i style={{ background: colors[i] }} />
                  <span>{s}</span>
                  <b>
                    {leads.filter((l) => (l.data.stage || "Novo") === s).length}
                  </b>
                </div>
              ))}
            </div>
          </div>
          <div className="chart-legend">
            {leads.length
              ? `${Math.round((won.length / leads.length) * 100)}% da sua base está na etapa Ganho.`
              : "Adicione seu primeiro lead para começar."}
          </div>
        </section>
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>Suas conexões mais recentes</h2>
              <p>Oportunidades que acabaram de chegar</p>
            </div>
            <Link href="/leads">Ver todos ↗</Link>
          </div>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>EMPRESA</th>
                  <th>ETAPA</th>
                  <th>VALOR</th>
                </tr>
              </thead>
              <tbody>
                {[...leads]
                  .reverse()
                  .slice(0, 5)
                  .map((row) => (
                    <tr key={row.id}>
                      <td>
                        <Link href="/leads" className="lead-identity">
                          <span className="company-avatar">
                            {row.data.initials}
                          </span>
                          <div>
                            <strong>{row.data.name}</strong>
                            <small>
                              {row.data.niche || "Novo relacionamento"}
                            </small>
                          </div>
                        </Link>
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
                    </tr>
                  ))}
              </tbody>
            </table>
            {!leads.length && (
              <div className="empty-inline">
                Seu primeiro lead está a uma boa conversa de distância.
                <br />
                <Link href="/leads">Adicionar uma oportunidade →</Link>
              </div>
            )}
          </div>
        </section>
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>Seus próximos passos</h2>
              <p>Um pouco de atenção faz toda a diferença</p>
            </div>
            <Link href="/agenda">Ver agenda ↗</Link>
          </div>
          {pending.slice(0, 5).map((row) => (
            <div className="task-row" key={row.id}>
              <input
                type="checkbox"
                aria-label={`Concluir ${row.data.title}`}
                onChange={() =>
                  void saveRecord(
                    "event",
                    { ...row.data, done: true },
                    row.id,
                  ).catch(() => {})
                }
              />
              <div>
                <strong>{row.data.title}</strong>
                <small>{row.data.type}</small>
              </div>
              <span className="time">
                {new Date(row.data.date).toLocaleDateString("pt-BR", {
                  day: "2-digit",
                  month: "short",
                })}
              </span>
            </div>
          ))}
          {!pending.length && (
            <div className="empty-inline">
              Tudo em dia por aqui. ✦<br />
              Agende um contato para manter suas conexões por perto.
            </div>
          )}
          <Link
            href="/agenda"
            className="secondary"
            style={{ width: "100%", marginTop: 20 }}
          >
            ＋ Planejar próximo contato
          </Link>
          <div className="chart-legend">
            ✧ {notes.length} ideias guardadas nas suas anotações
          </div>
        </section>
      </div>
    </>
  );
}
