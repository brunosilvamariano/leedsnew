"use client";
import Link from "next/link";
import { useState } from "react";
import { useUser } from "@/components/layout/AppShell";
import { useRecords, saveRecord } from "@/lib/records-client";
import { Icon, type IconName } from "@/components/ui/Icon";
import {
  stages,
  type LeadData,
  type EventData,
  type NoteData,
} from "@/lib/crm-types";
import { Heading, money } from "./Shared";

const colors = [
  "#2f7df4",
  "#4db9ff",
  "#ffb84d",
  "#f56fa1",
  "#42c990",
  "#9aa9bc",
];
export function Overview() {
  const user = useUser(),
    leads = useRecords<LeadData>("lead"),
    events = useRecords<EventData>("event"),
    notes = useRecords<NoteData>("note");
  const [range, setRange] = useState(6);
  const won = leads.filter((l) => l.data.stage === "Ganho"),
    contacted = leads.filter((l) => l.data.contactAt),
    potential = leads
      .filter((l) => l.data.stage !== "Perdido")
      .reduce((sum, lead) => sum + (lead.data.value || 0), 0),
    conversion = leads.length
      ? Math.round((won.length / leads.length) * 100)
      : 0,
    pending = events
      .filter((e) => !e.data.done)
      .sort((a, b) => a.data.date.localeCompare(b.data.date));
  const stats: {
    label: string;
    value: string;
    detail: string;
    trend: string;
    icon: IconName;
    accent: string;
  }[] = [
    {
      label: "Leads ativos",
      value: String(leads.length),
      detail: "Oportunidades para cultivar",
      trend: leads.length ? "Base ativa" : "Comece sua base",
      icon: "users",
      accent: "blue",
    },
    {
      label: "Conversas iniciadas",
      value: String(contacted.length),
      detail: "Relacionamentos em movimento",
      trend: contacted.length
        ? `${Math.round((contacted.length / Math.max(1, leads.length)) * 100)}% da base`
        : "Pronto para conectar",
      icon: "messages",
      accent: "cyan",
    },
    {
      label: "Taxa de conversão",
      value: `${conversion}%`,
      detail: `${won.length} ${won.length === 1 ? "negócio conquistado" : "negócios conquistados"}`,
      trend: leads.length ? "Conversão da base" : "Aguardando dados",
      icon: "trophy",
      accent: "green",
    },
    {
      label: "Receita potencial",
      value: money(potential),
      detail: "Negócios ainda em andamento",
      trend: potential ? "Potencial da carteira" : "Cadastre valores",
      icon: "dollar",
      accent: "amber",
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
  const contactedValues = months.map(
    (d) =>
      leads.filter((lead) => {
        if (!lead.data.contactAt) return false;
        const contactDate = new Date(lead.data.contactAt);
        return (
          contactDate.getMonth() === d.getMonth() &&
          contactDate.getFullYear() === d.getFullYear()
        );
      }).length,
  );
  const max = Math.max(4, ...values, ...contactedValues),
    points = values.map((v, i) => ({
      x: 30 + i * (540 / (range - 1)),
      y: 170 - (v / max) * 140,
    })),
    contactedPoints = contactedValues.map((v, i) => ({
      x: 30 + i * (540 / (range - 1)),
      y: 170 - (v / max) * 140,
    }));
  const line = points.map((p, i) => `${i ? "L" : "M"}${p.x},${p.y}`).join(" ");
  const contactedLine = contactedPoints
    .map((p, i) => `${i ? "L" : "M"}${p.x},${p.y}`)
    .join(" ");
  const recentActivity = [
    ...leads.map((row) => ({
      id: `lead-${row.id}`,
      title:
        row.data.stage === "Ganho"
          ? "Negócio conquistado"
          : row.data.contactAt
            ? "Conversa iniciada"
            : "Novo lead adicionado",
      detail: row.data.name,
      date: row.updatedAt,
      tone:
        row.data.stage === "Ganho"
          ? "green"
          : row.data.contactAt
            ? "cyan"
            : "blue",
    })),
    ...notes.map((row) => ({
      id: `note-${row.id}`,
      title: "Anotação atualizada",
      detail: row.data.title,
      date: row.updatedAt,
      tone: "amber",
    })),
  ]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 5);
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
    <div className="overview-page">
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
          <Icon name="plus" /> Adicionar lead
        </Link>
      </Heading>
      <section className="stat-grid">
        {stats.map((s) => (
          <article className="stat-card" data-accent={s.accent} key={s.label}>
            <div className="stat-top">
              <span>{s.label}</span>
              <span className="stat-icon">
                <Icon name={s.icon} />
              </span>
            </div>
            <strong className="stat-value">{s.value}</strong>
            <div className="stat-foot">
              <small>{s.detail}</small>
              <span>{s.trend}</span>
            </div>
            <svg
              className="stat-sparkline"
              viewBox="0 0 180 34"
              aria-hidden="true"
            >
              <path d="M2 29 C22 27, 27 19, 46 22 S72 31, 91 19 S117 22, 135 13 S157 15, 178 3" />
            </svg>
          </article>
        ))}
      </section>
      <div className="dashboard-grid">
        <section className="panel growth-panel">
          <div className="panel-heading">
            <div className="panel-heading-title">
              <span className="panel-heading-icon" data-tone="blue">
                <Icon name="chart" />
              </span>
              <div>
                <h2>Crescimento de leads</h2>
                <p>Novos leads adicionados ao longo do tempo</p>
              </div>
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
            aria-label={`Leads e conversas por mês: ${months.map((d, i) => `${d.toLocaleDateString("pt-BR", { month: "short" })}: ${values[i]} leads e ${contactedValues[i]} conversas`).join(", ")}`}
          >
            <defs>
              <linearGradient id="leadFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#2f7df4" stopOpacity=".38" />
                <stop offset=".62" stopColor="#70b8ff" stopOpacity=".13" />
                <stop offset="1" stopColor="#d9ecff" stopOpacity=".02" />
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
              stroke="#2f7df4"
              strokeWidth="3"
              strokeLinejoin="round"
            />
            <path
              d={contactedLine}
              fill="none"
              stroke="#f3a348"
              strokeWidth="2.5"
              strokeLinejoin="round"
            />
            {points.map((p, i) => (
              <g key={i}>
                <circle
                  cx={p.x}
                  cy={p.y}
                  r="4"
                  fill="white"
                  stroke="#2f7df4"
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
            {contactedPoints.map((p, i) => (
              <circle
                cx={p.x}
                cy={p.y}
                r="3.5"
                fill="white"
                stroke="#f3a348"
                strokeWidth="2"
                key={`contact-${i}`}
              >
                <title>{contactedValues[i]} conversas iniciadas</title>
              </circle>
            ))}
          </svg>
          <div className="chart-legend">
            <span>
              <i /> Leads adicionados
            </span>
            <span className="conversation-legend">
              <i /> Conversas iniciadas
            </span>
            <span className="chart-source">Dados reais do seu workspace</span>
          </div>
        </section>
        <section className="panel pipeline-panel">
          <div className="panel-heading">
            <div className="panel-heading-title">
              <span className="panel-heading-icon" data-tone="cyan">
                <Icon name="pipeline" />
              </span>
              <div>
                <h2>Pipeline comercial</h2>
                <p>Distribuição por etapa do pipeline</p>
              </div>
            </div>
            <Link href="/pipeline">
              Ver pipeline <Icon name="arrowUpRight" />
            </Link>
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
        <section className="panel activity-panel">
          <div className="panel-heading">
            <div className="panel-heading-title">
              <span className="panel-heading-icon" data-tone="green">
                <Icon name="activity" />
              </span>
              <div>
                <h2>Atividades recentes</h2>
                <p>Últimos movimentos no seu workspace</p>
              </div>
            </div>
            <Link href="/leads">
              Ver todas <Icon name="arrowUpRight" />
            </Link>
          </div>
          <div className="activity-list">
            {recentActivity.map((item) => (
              <div
                className="activity-item"
                data-tone={item.tone}
                key={item.id}
              >
                <span className="activity-dot" />
                <div>
                  <strong>{item.title}</strong>
                  <small>{item.detail}</small>
                </div>
                <time>
                  {new Date(item.date).toLocaleDateString("pt-BR", {
                    day: "2-digit",
                    month: "short",
                  })}
                </time>
              </div>
            ))}
            {!recentActivity.length && (
              <div className="empty-inline">
                Suas atividades aparecerão aqui conforme você movimentar seus
                leads.
              </div>
            )}
          </div>
        </section>
        <section className="panel opportunities-panel">
          <div className="panel-heading">
            <div className="panel-heading-title">
              <span className="panel-heading-icon" data-tone="amber">
                <Icon name="trophy" />
              </span>
              <div>
                <h2>Oportunidades em destaque</h2>
                <p>Relacionamentos que merecem atenção</p>
              </div>
            </div>
            <Link href="/leads">
              Ver todos <Icon name="arrowUpRight" />
            </Link>
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
        <section className="panel tasks-panel">
          <div className="panel-heading">
            <div className="panel-heading-title">
              <span className="panel-heading-icon" data-tone="violet">
                <Icon name="checklist" />
              </span>
              <div>
                <h2>Próximas tarefas</h2>
                <p>Organize os contatos da sua agenda</p>
              </div>
            </div>
            <Link href="/agenda">
              Ver agenda <Icon name="arrowUpRight" />
            </Link>
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
            <Icon name="plus" /> Planejar próximo contato
          </Link>
          <div className="chart-legend">
            ✧ {notes.length} ideias guardadas nas suas anotações
          </div>
        </section>
      </div>
    </div>
  );
}
