"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import s from "./entry.module.css";

const periods = {
  "7 dias": {
    total: "24",
    points: "0,117 55,104 110,112 165,72 220,80 275,40 330,48 385,14",
    bars: [28, 42, 34, 67, 52, 85, 73],
  },
  "30 dias": {
    total: "86",
    points: "0,127 55,116 110,94 165,108 220,61 275,76 330,30 385,8",
    bars: [35, 28, 57, 45, 72, 65, 94],
  },
};
const views = ["Prospecção", "Pipeline", "Agenda"] as const;

export function EntryShowcase() {
  const [view, setView] = useState<(typeof views)[number]>("Prospecção");
  const [period, setPeriod] = useState<keyof typeof periods>("30 dias");
  const [day, setDay] = useState(16);
  const data = periods[period];
  return (
    <section className={s.story} aria-label="Conheça o BizPeek">
      <header className={s.storyHeader}>
        <Link href="/" className={s.originalLogo} aria-label="BizPeek — início">
          <Image
            src="/logo/bizpeek-logo.png"
            alt="BizPeek"
            width={1254}
            height={1254}
            priority
          />
        </Link>
        <span className={s.edition}>SEU PRÓXIMO MOVIMENTO</span>
      </header>
      <div className={s.editorial}>
        <p className={s.kicker}>
          <span /> INTELIGÊNCIA COMERCIAL, NA PRÁTICA
        </p>
        <h1>
          Oportunidades à vista.
          <br />
          <span>Seu negócio à frente.</span>
        </h1>
        <p className={s.description}>
          Da primeira busca à próxima conquista.
          <br />
          Encontre empresas e dê direção a cada conversa.
        </p>
      </div>
      <div className={s.product}>
        <div className={s.productHeader}>
          <div
            className={s.tabs}
            role="tablist"
            aria-label="Explorar funcionalidades"
          >
            {views.map((v, i) => (
              <button
                key={v}
                id={`tab-${i}`}
                role="tab"
                aria-selected={view === v}
                aria-controls="feature-panel"
                tabIndex={view === v ? 0 : -1}
                onClick={() => setView(v)}
                onKeyDown={(e) => {
                  if (
                    !["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)
                  )
                    return;
                  e.preventDefault();
                  const next =
                    e.key === "Home"
                      ? 0
                      : e.key === "End"
                        ? 2
                        : (i + (e.key === "ArrowRight" ? 1 : 2)) % 3;
                  setView(views[next]);
                  document.getElementById(`tab-${next}`)?.focus();
                }}
              >
                {v}
              </button>
            ))}
          </div>
          <span className={s.demo}>DEMONSTRAÇÃO</span>
        </div>
        <div
          id="feature-panel"
          role="tabpanel"
          aria-labelledby={`tab-${views.indexOf(view)}`}
          className={s.panel}
        >
          {view === "Prospecção" ? (
            <>
              <div className={s.dashboardTopline}>
                <div>
                  <span className={s.overline}>VISÃO COMERCIAL</span>
                  <strong>Seu mercado em movimento</strong>
                </div>
                <div className={s.periods} aria-label="Período demonstrativo">
                  {(Object.keys(periods) as (keyof typeof periods)[]).map(
                    (p) => (
                      <button
                        key={p}
                        aria-pressed={period === p}
                        onClick={() => setPeriod(p)}
                      >
                        {p}
                      </button>
                    ),
                  )}
                </div>
              </div>
              <div className={s.kpiGrid}>
                <article>
                  <span>Empresas encontradas</span>
                  <strong>{data.total}</strong>
                  <small className={s.positive}>↗ 18% no período</small>
                </article>
                <article>
                  <span>Conversas iniciadas</span>
                  <strong>{period === "30 dias" ? "21" : "08"}</strong>
                  <small className={s.positive}>↗ 6 novas</small>
                </article>
                <article>
                  <span>Próximos passos</span>
                  <strong>{period === "30 dias" ? "14" : "05"}</strong>
                  <small>3 para hoje</small>
                </article>
              </div>
              <div className={s.analyticsGrid}>
                <article className={s.chartCard}>
                  <header>
                    <div>
                      <span>Oportunidades qualificadas</span>
                      <strong>Evolução da prospecção</strong>
                    </div>
                    <span className={s.liveBadge}>● Em alta</span>
                  </header>
                  <div className={s.chart}>
                    <div className={s.axis}>
                      <span>90</span>
                      <span>60</span>
                      <span>30</span>
                    </div>
                    <svg
                      viewBox="0 0 385 150"
                      preserveAspectRatio="none"
                      role="img"
                      aria-label={`Evolução ilustrativa: ${data.total} oportunidades em ${period}`}
                    >
                      <defs>
                        <linearGradient
                          id="entry-fill"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="0%"
                            stopColor="#2875dc"
                            stopOpacity=".24"
                          />
                          <stop
                            offset="100%"
                            stopColor="#2875dc"
                            stopOpacity="0"
                          />
                        </linearGradient>
                      </defs>
                      <path
                        d="M0 20H385 M0 65H385 M0 110H385"
                        stroke="#e7ecf1"
                        strokeDasharray="3 5"
                        fill="none"
                      />
                      <polygon
                        points={`0,150 ${data.points} 385,150`}
                        fill="url(#entry-fill)"
                      />
                      <polyline
                        points={data.points}
                        fill="none"
                        stroke="#2875dc"
                        strokeWidth="2.8"
                        strokeLinejoin="round"
                        strokeLinecap="round"
                      />
                      <circle
                        cx="385"
                        cy={period === "30 dias" ? 8 : 14}
                        r="4"
                        fill="#2875dc"
                      />
                    </svg>
                  </div>
                  <div className={s.chartLabels}>
                    <span>INÍCIO</span>
                    <span>HOJE</span>
                  </div>
                </article>
                <article className={s.mixCard}>
                  <header>
                    <span>Distribuição</span>
                    <strong>Segmentos em foco</strong>
                  </header>
                  <div className={s.donutLarge}>
                    <span>
                      86<small>empresas</small>
                    </span>
                  </div>
                  <ul>
                    <li>
                      <i /> Serviços <strong>48%</strong>
                    </li>
                    <li>
                      <i /> Comércio <strong>32%</strong>
                    </li>
                    <li>
                      <i /> Outros <strong>20%</strong>
                    </li>
                  </ul>
                </article>
              </div>
              <div className={s.recentRow}>
                <div>
                  <span className={s.avatar}>AS</span>
                  <p>
                    <strong>Atlas Soluções</strong>
                    <small>Novo lead qualificado</small>
                  </p>
                </div>
                <span className={s.statusPill}>Para contatar</span>
                <div className={s.sparkBars} aria-hidden="true">
                  {data.bars.slice(2).map((b, i) => (
                    <i key={i} style={{ height: `${b}%` }} />
                  ))}
                </div>
              </div>
            </>
          ) : view === "Pipeline" ? (
            <>
              <div className={s.metricRow}>
                <div>
                  <p>Cada conversa tem um próximo passo</p>
                  <strong>
                    Um fluxo<span> mais claro</span>
                  </strong>
                </div>
                <span className={s.roundArrow}>↗</span>
              </div>
              <div className={s.pipeline}>
                {["Identificar", "Conversar", "Propor"].map((label, i) => (
                  <div key={label}>
                    <h3>
                      <i />
                      {label}
                      <span>{[2, 1, 1][i]}</span>
                    </h3>
                    {Array.from({ length: i === 0 ? 2 : 1 }, (_, n) => (
                      <article key={n}>
                        <span>
                          {["SERVIÇOS", "COMÉRCIO", "CONSULTORIA"][i]}
                        </span>
                        <strong>
                          {
                            [
                              "Nova oportunidade",
                              "Conversa iniciada",
                              "Proposta em pauta",
                            ][i]
                          }
                        </strong>
                        <p>
                          {
                            [
                              "Conhecer a empresa",
                              "Entender o momento",
                              "Definir o próximo contato",
                            ][i]
                          }
                        </p>
                        <small>Próximo passo ↗</small>
                      </article>
                    ))}
                  </div>
                ))}
              </div>
              <p className={s.caption}>
                Seus leads organizados, do primeiro contato à negociação.
              </p>
            </>
          ) : (
            <>
              <div className={s.metricRow}>
                <div>
                  <p>Mais intenção na sua rotina</p>
                  <strong>
                    Uma agenda<span> conectada</span>
                  </strong>
                </div>
                <span className={s.roundArrow}>↗</span>
              </div>
              <div className={s.week} aria-label="Escolha um dia de exemplo">
                {[14, 15, 16, 17, 18].map((d, i) => (
                  <button
                    key={d}
                    aria-pressed={day === d}
                    onClick={() => setDay(d)}
                  >
                    <span>{["SEG", "TER", "QUA", "QUI", "SEX"][i]}</span>
                    <strong>{d}</strong>
                    <i />
                  </button>
                ))}
              </div>
              <div className={s.appointment}>
                <time>{day % 2 ? "14:30" : "09:00"}</time>
                <div>
                  <strong>
                    {day % 2
                      ? "Retomar uma conversa"
                      : "Conhecer um novo cliente"}
                  </strong>
                  <p>
                    {day % 2
                      ? "Revisar anotações e combinar o próximo passo."
                      : "Preparar as perguntas para a primeira reunião."}
                  </p>
                </div>
                <span>↗</span>
              </div>
              <div className={s.agendaNote}>
                Anotações e compromissos próximos de quem importa.
              </div>
            </>
          )}
        </div>
        <div className={s.productFooter}>
          <span>
            <i /> Explore a prévia acima
          </span>
          <span>Dados ilustrativos · não representam resultados reais</span>
        </div>
      </div>
      <footer className={s.storyFooter}>
        <span>BUSQUE. CONECTE. AVANCE.</span>
        <span>Uma visão mais clara do seu negócio.</span>
      </footer>
    </section>
  );
}
