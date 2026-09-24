"use client";

import { useMemo, useState } from "react";
import type { Company } from "@/data/companies";
import type { SearchHistoryMetric } from "@/lib/prospect-live-store";
import styles from "./InteractiveAnalytics.module.css";

type Point = { label: string; value: number; secondary: number };

function chartPath(data: Point[], key: "value" | "secondary", width: number, height: number, padX: number, padTop: number, padBottom: number) {
  if (!data.length) return "";
  const max = Math.max(1, ...data.map((point) => point[key]));
  const usableWidth = width - padX * 2;
  const usableHeight = height - padTop - padBottom;
  return data.map((point, index) => {
    const x = data.length === 1 ? width / 2 : padX + (index / (data.length - 1)) * usableWidth;
    const y = padTop + usableHeight - (point[key] / max) * usableHeight;
    return `${index === 0 ? "M" : "L"}${x.toFixed(2)} ${y.toFixed(2)}`;
  }).join(" ");
}

export function InteractiveAnalytics({ companies, history }: { companies: Company[]; history: SearchHistoryMetric[] }) {
  const data = useMemo<Point[]>(() => history.slice(-12).map((item) => ({
    label: new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(item.createdAt)),
    value: item.resultCount,
    secondary: item.highPotential,
  })), [history]);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const displayIndex = activeIndex == null ? Math.max(0, data.length - 1) : Math.min(activeIndex, Math.max(0, data.length - 1));

  const coverage = useMemo(() => {
    const total = Math.max(1, companies.length);
    return [
      { label: "Website", value: Math.round((companies.filter((item) => item.website).length / total) * 100) },
      { label: "Instagram", value: Math.round((companies.filter((item) => item.instagram).length / total) * 100) },
      { label: "WhatsApp", value: Math.round((companies.filter((item) => item.whatsapp).length / total) * 100) },
    ];
  }, [companies]);

  const distribution = useMemo(() => [
    { label: "90+", count: companies.filter((item) => item.score >= 90).length },
    { label: "80–89", count: companies.filter((item) => item.score >= 80 && item.score < 90).length },
    { label: "70–79", count: companies.filter((item) => item.score >= 70 && item.score < 80).length },
    { label: "< 70", count: companies.filter((item) => item.score < 70).length },
  ], [companies]);

  const WIDTH = 740;
  const HEIGHT = 245;
  const PAD_X = 34;
  const PAD_TOP = 24;
  const PAD_BOTTOM = 42;
  const primaryPath = chartPath(data, "value", WIDTH, HEIGHT, PAD_X, PAD_TOP, PAD_BOTTOM);
  const secondaryPath = chartPath(data, "secondary", WIDTH, HEIGHT, PAD_X, PAD_TOP, PAD_BOTTOM);
  const active = data[displayIndex] ?? { label: "—", value: 0, secondary: 0 };
  const maxValue = Math.max(1, ...data.map((point) => point.value));
  const activeX = data.length <= 1 ? WIDTH / 2 : PAD_X + (displayIndex / Math.max(1, data.length - 1)) * (WIDTH - PAD_X * 2);
  const activeY = PAD_TOP + (HEIGHT - PAD_TOP - PAD_BOTTOM) - (active.value / maxValue) * (HEIGHT - PAD_TOP - PAD_BOTTOM);

  return (
    <>
      <article className={`${styles.card} ${styles.trendCard}`}>
        <header className={styles.header}>
          <div><span className={styles.kicker}>Histórico real</span><h2>Buscas ao vivo</h2></div>
          <span className={styles.livePill}><i /> Google Places</span>
        </header>
        {data.length ? <>
          <div className={styles.trendSummary}><strong>{active.value}</strong><span>resultados <small>{active.secondary} alto potencial</small></span></div>
          <div className={styles.chartWrap} onPointerMove={(event) => {
            const rect = event.currentTarget.getBoundingClientRect();
            const relative = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
            setActiveIndex(Math.round(relative * Math.max(0, data.length - 1)));
          }}>
            <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className={styles.lineChart} preserveAspectRatio="none" role="img" aria-label="Histórico de buscas reais">
              <defs><linearGradient id="analyticsFillReal" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#1677ff" stopOpacity=".24"/><stop offset="1" stopColor="#1677ff" stopOpacity="0"/></linearGradient></defs>
              {[.2,.4,.6,.8].map((ratio) => <line key={ratio} x1={PAD_X} x2={WIDTH-PAD_X} y1={PAD_TOP+(HEIGHT-PAD_TOP-PAD_BOTTOM)*ratio} y2={PAD_TOP+(HEIGHT-PAD_TOP-PAD_BOTTOM)*ratio} className={styles.gridLine}/>) }
              {primaryPath && <path d={`${primaryPath} L ${WIDTH-PAD_X} ${HEIGHT-PAD_BOTTOM} L ${PAD_X} ${HEIGHT-PAD_BOTTOM} Z`} className={styles.areaReal}/>} 
              {secondaryPath && <path d={secondaryPath} className={styles.secondaryLine}/>} 
              {primaryPath && <path d={primaryPath} className={styles.primaryLine}/>} 
              <line x1={activeX} x2={activeX} y1={PAD_TOP} y2={HEIGHT-PAD_BOTTOM} className={styles.hoverLine}/>
              <circle cx={activeX} cy={activeY} r="5" className={styles.activeDot}/>
            </svg>
            <div className={styles.tooltip} style={{ left: `${(activeX/WIDTH)*100}%`, top: `${Math.max(12,(activeY/HEIGHT)*100-12)}%` }}><span>{active.label}</span><strong>{active.value} resultados</strong><small>{active.secondary} com score alto</small></div>
          </div>
          <div className={styles.legend}><span><i className={styles.legendPrimary}/>Resultados</span><span><i className={styles.legendSecondary}/>Alto potencial</span></div>
        </> : <EmptyChart text="Faça sua primeira busca em Explorar para construir este gráfico com dados reais." />}
      </article>

      <article className={`${styles.card} ${styles.presenceCard}`}>
        <header className={styles.header}><div><span className={styles.kicker}>Cobertura digital</span><h2>Presença encontrada</h2></div><span className={styles.headerMeta}>{companies.length} empresas</span></header>
        {companies.length ? <div className={styles.orbitArea}>
          <div className={styles.orbitChart}>
            <svg viewBox="0 0 180 180" role="img" aria-label="Cobertura digital real">
              {coverage.map((item, index) => {
                const radius = 68-index*17;
                const circumference = 2*Math.PI*radius;
                const dash = circumference*(item.value/100);
                return <g key={item.label} transform="rotate(-90 90 90)"><circle cx="90" cy="90" r={radius} className={styles.orbitTrack}/><circle cx="90" cy="90" r={radius} className={`${styles.orbitProgress} ${styles[`orbit${index}`]}`} strokeDasharray={`${dash} ${circumference-dash}`} /></g>;
              })}
            </svg>
            <div className={styles.orbitCenter}><strong>{companies.filter((item)=>!item.website).length}</strong><span>sem site</span></div>
          </div>
          <div className={styles.orbitLegend}>{coverage.map((item,index)=><div key={item.label}><i className={styles[`dot${index}`]}/><span>{item.label}</span><strong>{item.value}%</strong></div>)}</div>
        </div> : <EmptyChart text="A cobertura digital aparecerá depois de uma busca real." />}
      </article>

      <article className={`${styles.card} ${styles.distributionCard}`}>
        <header className={styles.header}><div><span className={styles.kicker}>Opportunity score</span><h2>Distribuição da oportunidade</h2></div><span className={styles.headerMeta}>calculado com sinais reais</span></header>
        {companies.length ? <div className={styles.distributionGrid}>{distribution.map((item,index)=>{
          const max = Math.max(1,...distribution.map((d)=>d.count));
          return <div key={item.label} className={styles.distributionItem}><div className={styles.distributionBar}><i style={{height:`${Math.max(8,(item.count/max)*100)}%`}} data-index={index}/></div><strong>{item.count}</strong><span>{item.label}</span></div>;
        })}</div> : <EmptyChart text="A distribuição será calculada somente com empresas reais retornadas na busca." />}
      </article>
    </>
  );
}

function EmptyChart({ text }: { text: string }) {
  return <div className={styles.emptyChart}><div className={styles.emptyPulse}/><p>{text}</p></div>;
}
