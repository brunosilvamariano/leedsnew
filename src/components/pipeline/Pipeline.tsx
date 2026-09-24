"use client";
import Link from "next/link";
import { useEffect,useState } from "react";
import type { Company } from "@/data/companies";
import { Icon } from "@/components/ui/Icon";
import { readStoredCompanies,subscribeProspectData } from "@/lib/prospect-live-store";
import styles from "./Pipeline.module.css";
export function Pipeline(){const[leads,setLeads]=useState<Company[]>([]);useEffect(()=>{const load=()=>setLeads(readStoredCompanies("leads"));load();return subscribeProspectData(load)},[]);const columns=[{name:"Leads",items:leads},{name:"Contatados",items:[]},{name:"Propostas",items:[]},{name:"Negociação",items:[]},{name:"Clientes",items:[]}];return <section className={styles.page}><header><div><span>CRM</span><h1>Pipeline</h1><p>As etapas permanecem zeradas até você registrar ações reais.</p></div><Link href="/explorar">Adicionar leads <Icon name="plus"/></Link></header><div className={styles.board}>{columns.map((col)=><section key={col.name}><div className={styles.columnHead}><strong>{col.name}</strong><b>{col.items.length}</b></div><div className={styles.columnBody}>{col.items.map(item=><article key={item.id}><span>{item.initials}</span><div><strong>{item.name}</strong><small>{item.city} · score {item.score}</small></div></article>)}{!col.items.length&&<div className={styles.empty}>Nenhum registro</div>}</div></section>)}</div></section>}
