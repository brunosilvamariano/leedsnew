"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Icon, type IconName } from "@/components/ui/Icon";
import { LiveRadar } from "@/components/charts/LiveRadar";
import { readLastSearch, readSearchHistory, readStoredCompanies, subscribeProspectData, type SearchHistoryMetric, type SearchSnapshot } from "@/lib/prospect-live-store";
import styles from "./Dashboard.module.css";

type MetricTone = "blue" | "orange" | "cyan" | "green";

function greeting(date: Date | null) {
  if (!date) return "Olá";
  const hour = date.getHours();
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
}

function MetricCard({ icon, label, value, detail, tone, bars }: { icon: IconName; label: string; value: string; detail: string; tone: MetricTone; bars: number[] }) {
  return (
    <article className={styles.metricCard} data-tone={tone}>
      <span className={styles.metricIcon}><Icon name={icon}/></span>
      <div className={styles.metricCopy}><span>{label}</span><strong>{value}</strong><small>{detail}</small></div>
      <div className={styles.miniBars} aria-hidden="true">{bars.map((bar,index)=><i key={index} style={{height:`${bar}%`}}/>)}</div>
    </article>
  );
}

function smoothPath(points: { x: number; y: number }[]) {
  if (points.length < 2) return points.length ? `M ${points[0].x} ${points[0].y}` : "";
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i=0;i<points.length-1;i+=1) {
    const p0 = points[i]; const p1 = points[i+1];
    const mid = (p0.x+p1.x)/2;
    d += ` C ${mid} ${p0.y}, ${mid} ${p1.y}, ${p1.x} ${p1.y}`;
  }
  return d;
}

function OpportunityChart({ history, snapshot }: { history: SearchHistoryMetric[]; snapshot: SearchSnapshot | null }) {
  const data = useMemo(() => history.slice(-8), [history]);
  const [active, setActive] = useState<number | null>(null);
  const displayActive = active == null ? Math.max(0, data.length - 1) : Math.min(active, Math.max(0, data.length - 1));
  const width = 760, height = 250, left = 48, top = 25, bottom = 40;
  const max = Math.max(10,...data.map(i=>i.resultCount));
  const points = data.map((item,index)=>({x:data.length<=1?width/2:left+(index/(data.length-1))*(width-left-22),y:top+(height-top-bottom)-(item.resultCount/max)*(height-top-bottom)}));
  const path = smoothPath(points);
  const current = data[displayActive];
  return (
    <article className={`${styles.card} ${styles.opportunityChart}`}>
      <header className={styles.cardHeader}>
        <div className={styles.cardTitle}><span className={styles.titleIcon}><Icon name="chart"/></span><strong>Oportunidades</strong></div>
        <span className={styles.periodPill}>Histórico real</span>
      </header>
      <div className={styles.opportunityHeadline}><strong>{snapshot?.resultCount ?? 0}</strong><span>empresas na última busca</span>{snapshot && <em>• {snapshot.query}{snapshot.city?` em ${snapshot.city}`:""}</em>}</div>
      <div className={styles.areaWrap} onPointerMove={(event)=>{if(!data.length)return;const r=event.currentTarget.getBoundingClientRect();const ratio=Math.max(0,Math.min(1,(event.clientX-r.left)/r.width));setActive(Math.round(ratio*(data.length-1)));}}>
        <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className={styles.areaSvg}>
          <defs><linearGradient id="opportunityFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#1683ff" stopOpacity=".32"/><stop offset="1" stopColor="#1683ff" stopOpacity="0"/></linearGradient></defs>
          {[.25,.5,.75,1].map(v=><line key={v} x1={left} x2={width-20} y1={top+(height-top-bottom)*v} y2={top+(height-top-bottom)*v} className={styles.chartGrid}/>) }
          {path && <path d={`${path} L ${points.at(-1)?.x ?? left} ${height-bottom} L ${points[0]?.x ?? left} ${height-bottom} Z`} className={styles.areaFill}/>} 
          {path && <path d={path} className={styles.areaLine}/>} 
          {points.map((p,index)=><circle key={index} cx={p.x} cy={p.y} r={index===displayActive?5:3.3} className={index===displayActive?styles.areaPointActive:styles.areaPoint}/>) }
          {points[displayActive] && <line x1={points[displayActive].x} x2={points[displayActive].x} y1={top} y2={height-bottom} className={styles.activeGuide}/>} 
        </svg>
        {current && points[displayActive] && <div className={styles.chartTooltip} style={{left:`${(points[displayActive].x/width)*100}%`,top:`${Math.max(4,(points[displayActive].y/height)*100-8)}%`}}><span>{new Intl.DateTimeFormat("pt-BR",{day:"2-digit",month:"short"}).format(new Date(current.createdAt))}</span><strong>{current.resultCount} empresas</strong><small>{current.highPotential} alto potencial</small></div>}
        {!data.length && <div className={styles.chartEmpty}>Faça uma busca real para iniciar o histórico.</div>}
      </div>
    </article>
  );
}

function PresenceCard({ companies }: { companies: NonNullable<SearchSnapshot>["companies"] }) {
  const [active,setActive]=useState(0);
  const groups = useMemo(()=>{
    const total=companies.length;
    const full=companies.filter(c=>c.website&&(c.instagram||c.whatsapp)).length;
    const socialNoSite=companies.filter(c=>!c.website&&(c.instagram||c.whatsapp)).length;
    const websiteOnly=companies.filter(c=>c.website&&!c.instagram&&!c.whatsapp).length;
    const low=Math.max(0,total-full-socialNoSite-websiteOnly);
    return [
      {label:"Presença completa",count:full,color:"#126fe8"},
      {label:"Social sem site",count:socialNoSite,color:"#ef5a8d"},
      {label:"Só website",count:websiteOnly,color:"#35a8ff"},
      {label:"Baixa presença",count:low,color:"#2bbd73"},
    ];
  },[companies]);
  const total=Math.max(1,companies.length); let cursor=0;
  const gradient=groups.map(g=>{const start=cursor;cursor+=(g.count/total)*100;return `${g.color} ${start}% ${cursor}%`;}).join(",");
  return <article className={`${styles.card} ${styles.presenceCard}`}>
    <header className={styles.cardHeader}><div className={styles.cardTitle}><span className={styles.titleIcon}><Icon name="target"/></span><strong>Presença digital</strong></div><span className={styles.infoDot}>i</span></header>
    <div className={styles.presenceBody}>
      <div className={styles.donut} style={{background:companies.length?`conic-gradient(${gradient})`:"conic-gradient(#dfeaf3 0 100%)"}}><div><strong>{companies.length}</strong><span>empresas</span></div></div>
      <div className={styles.presenceLegend}>{groups.map((g,index)=><button key={g.label} onMouseEnter={()=>setActive(index)} data-active={active===index}><i style={{background:g.color}}/><span>{g.label}</span><strong>{companies.length?Math.round((g.count/companies.length)*100):0}%</strong></button>)}</div>
    </div>
  </article>
}

function PipelineCard({ leadCount }: { leadCount: number }) {
  const stages=[{label:"Leads",count:leadCount,color:"#1683ff"},{label:"Contatados",count:0,color:"#55a9ff"},{label:"Propostas",count:0,color:"#80c6ff"},{label:"Negociação",count:0,color:"#91d8ec"},{label:"Clientes",count:0,color:"#67d9aa"}];
  const max=Math.max(1,leadCount);
  return <article className={`${styles.card} ${styles.pipelineCard}`}><header className={styles.cardHeader}><div className={styles.cardTitle}><span className={styles.titleIcon}><Icon name="pipeline"/></span><strong>Pipeline de vendas</strong></div><Link href="/pipeline" className={styles.linkTiny}>Abrir →</Link></header><div className={styles.pipelineRows}>{stages.map((s,index)=><div key={s.label}><span>{s.label}</span><i><b style={{width:`${Math.max(index===0&&s.count?12:(s.count/max)*100,0)}%`,background:s.color}}/></i><strong>{s.count}</strong></div>)}</div></article>
}

export function Dashboard() {
  const [snapshot,setSnapshot]=useState<SearchSnapshot|null>(null);
  const [history,setHistory]=useState<SearchHistoryMetric[]>([]);
  const [leads,setLeads]=useState<ReturnType<typeof readStoredCompanies>>([]);
  const [now,setNow]=useState<Date|null>(null);
  // Browser-only state is hydrated after mount from localStorage and the Prospect store.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(()=>{setNow(new Date());const load=()=>{setSnapshot(readLastSearch());setHistory(readSearchHistory());setLeads(readStoredCompanies("leads"));};load();return subscribeProspectData(load);},[]);
  const companies=useMemo(()=>snapshot?.companies??[],[snapshot]);
  const high=companies.filter(c=>c.score>=86).length;
  const noSite=companies.filter(c=>!c.website).length;
  const top=useMemo(()=>[...companies].sort((a,b)=>b.score-a.score).slice(0,5),[companies]);
  const dateLabel=now?new Intl.DateTimeFormat("pt-BR",{weekday:"long",day:"2-digit",month:"long",year:"numeric"}).format(now):"Hoje";
  const bars=[25,34,42,38,50,61,58,73,82,92];

  return <div className={styles.page}>
    <section className={styles.welcome}>
      <div><span>{greeting(now)}, Bruno</span><h1>Grandes conversas geram grandes negócios.</h1><p>Aqui está um panorama das oportunidades reais encontradas no Prospect.</p></div>
      <div className={styles.quote}><small>{dateLabel}</small><p>“Dados melhores hoje,<br/>decisões melhores amanhã.”</p></div>
    </section>

    <section className={styles.metrics}>
      <MetricCard icon="target" label="Empresas encontradas" value={String(companies.length)} detail={snapshot?`última busca • ${snapshot.city||snapshot.regionName||snapshot.countryName||snapshot.state||"Brasil"}`:"aguardando primeira busca"} tone="blue" bars={bars}/>
      <MetricCard icon="lead" label="Leads salvos" value={String(leads.length)} detail="adicionados a partir de resultados reais" tone="orange" bars={[18,26,32,28,44,52,49,66,72,81]}/>
      <MetricCard icon="star" label="Alto potencial" value={String(high)} detail={companies.length?`${Math.round((high/companies.length)*100)}% da última busca`:"sem dados ainda"} tone="cyan" bars={[16,22,30,42,38,50,58,70,66,78]}/>
    </section>

    <section className={styles.topGrid}>
      <OpportunityChart history={history} snapshot={snapshot}/>
      <article className={`${styles.card} ${styles.radarCard}`}><header className={styles.cardHeader}><div className={styles.cardTitle}><span className={styles.titleIcon}><Icon name="target"/></span><strong>Mapa de oportunidades</strong></div><span className={styles.periodPill}>{snapshot?.city||snapshot?.regionName||snapshot?.countryName||snapshot?.state||"Brasil"}</span></header><LiveRadar companies={companies}/></article>
    </section>

    <section className={styles.bottomGrid}>
      <PresenceCard companies={companies}/>
      <PipelineCard leadCount={leads.length}/>
      <article className={`${styles.card} ${styles.bestCard}`}><header className={styles.cardHeader}><div className={styles.cardTitle}><span className={`${styles.titleIcon} ${styles.starIcon}`}><Icon name="star"/></span><strong>Melhores oportunidades</strong></div><Link href="/explorar" className={styles.linkTiny}>Ver todas →</Link></header><div className={styles.bestList}>{top.length?top.map((c,index)=><Link href="/explorar" key={c.id}><span className={styles.businessIcon} data-index={index}>{c.initials}</span><span className={styles.businessCopy}><strong>{c.name}</strong><small>{c.niche} · {c.city}</small></span><span className={styles.businessBadge} data-type={c.website?"website":c.instagram?"instagram":c.whatsapp?"whatsapp":"none"}>{c.website?"Website":c.instagram?"Instagram":c.whatsapp?"WhatsApp":"Sem site"}</span><strong className={styles.businessScore}>{c.score}</strong></Link>):<div className={styles.smallEmpty}>Faça uma busca para ver oportunidades reais.</div>}</div></article>
      <article className={`${styles.card} ${styles.actionsCard}`}><header className={styles.cardHeader}><div className={styles.cardTitle}><span className={styles.titleIcon}><Icon name="calendar"/></span><strong>Próximas ações</strong></div><Link href="/agenda" className={styles.linkTiny}>Ver agenda →</Link></header><div className={styles.actionList}>{leads.length?leads.slice(-5).reverse().map((lead,index)=><Link href="/leads" key={lead.id}><span className={styles.actionTime}>{index===0?"Agora":"Sugestão"}</span><span className={styles.actionIcon} data-index={index}><Icon name={index%2?"message":"clock"}/></span><span><strong>Revisar lead</strong><small>{lead.name}</small></span><Icon name="chevronRight"/></Link>):<div className={styles.smallEmpty}>Nenhuma ação sugerida. Adicione leads reais primeiro.</div>}</div></article>
    </section>

    {snapshot && <div className={styles.liveFooter}><span><i/> Dados reais da última consulta</span><strong>{snapshot.query}</strong><span>{noSite} sem site</span><span>{snapshot.durationMs>=1000?`${(snapshot.durationMs/1000).toFixed(1)}s`:`${snapshot.durationMs}ms`}</span></div>}
  </div>;
}
