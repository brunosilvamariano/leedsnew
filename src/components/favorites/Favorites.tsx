"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { Company } from "@/data/companies";
import { Icon } from "@/components/ui/Icon";
import { readStoredCompanies, subscribeProspectData } from "@/lib/prospect-live-store";
import styles from "./Favorites.module.css";

export function Favorites(){
  const [items,setItems]=useState<Company[]>([]);
  useEffect(()=>{const load=()=>setItems(readStoredCompanies("favorites"));load();return subscribeProspectData(load)},[]);
  return <section className={styles.page}><header><div><span>Seleção real</span><h1>Favoritos</h1><p>Empresas que você marcou durante suas pesquisas.</p></div><Link href="/explorar">Explorar empresas <Icon name="arrowUpRight"/></Link></header>{items.length?<div className={styles.list}>{items.slice().reverse().map(item=><article key={item.id}><span className={styles.avatar}>{item.initials}</span><div><strong>{item.name}</strong><small>{item.niche} · {item.city}, {item.state}</small></div><div className={styles.tags}>{item.instagram&&<span><Icon name="instagram"/>Instagram</span>}{item.whatsapp&&<span><Icon name="whatsapp"/>WhatsApp</span>}<span data-missing={!item.website}><Icon name="website"/>{item.website?"Website":"Sem site"}</span></div><b>{item.score}</b></article>)}</div>:<div className={styles.empty}><span><Icon name="star"/></span><h2>Nenhum favorito ainda</h2><p>Use a estrela em Explorar para salvar empresas reais e revisar depois.</p><Link href="/explorar">Encontrar empresas →</Link></div>}</section>
}
