"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Company } from "@/data/companies";
import { Icon } from "@/components/ui/Icon";
import { readStoredCompanies, subscribeProspectData } from "@/lib/prospect-live-store";
import styles from "./Leads.module.css";

export function Leads() {
  const [leads, setLeads] = useState<Company[]>([]);
  useEffect(() => {
    const load = () => setLeads(readStoredCompanies("leads"));
    load();
    return subscribeProspectData(load);
  }, []);

  return <section className={styles.page}>
    <div className={styles.hero}><div><p>CRM real</p><h1>Leads</h1><span>Somente empresas que você adicionou a partir de buscas reais.</span></div><Link href="/explorar">Explorar empresas <Icon name="arrowUpRight"/></Link></div>
    {leads.length ? <div className={styles.list}>{[...leads].reverse().map((lead)=><article key={lead.id}><div className={styles.avatar}>{lead.initials}</div><div className={styles.identity}><strong>{lead.name}</strong><span>{lead.niche} · {lead.city}, {lead.state}{lead.country ? ` · ${lead.country}` : ""}</span></div><div className={styles.presence}>{lead.whatsapp&&<span><Icon name="whatsapp"/> WhatsApp</span>}{lead.instagram&&<span><Icon name="instagram"/> Instagram</span>}<span data-missing={!lead.website}><Icon name="website"/> {lead.website?"Site":"Sem site"}</span></div><div className={styles.score}><strong>{lead.score}</strong><span>{lead.status}</span></div></article>)}</div> : <div className={styles.empty}><div><Icon name="lead"/></div><h2>Nenhum lead salvo ainda</h2><p>Adicione empresas reais pelo Explorar. Elas aparecerão aqui automaticamente.</p><Link href="/explorar">Encontrar empresas →</Link></div>}
  </section>;
}
