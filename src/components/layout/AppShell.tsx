"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Icon, type IconName } from "@/components/ui/Icon";
import styles from "./AppShell.module.css";

const nav: { href: string; label: string; icon: IconName }[] = [
  { href: "/dashboard", label: "Início", icon: "dashboard" },
  { href: "/explorar", label: "Explorar", icon: "target" },
  { href: "/leads", label: "Leads", icon: "lead" },
  { href: "/pipeline", label: "Pipeline", icon: "pipeline" },
  { href: "/favoritos", label: "Favoritos", icon: "star" },
  { href: "/agenda", label: "Agenda", icon: "calendar" },
  { href: "/configuracoes", label: "Configurações", icon: "settings" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandOpen((value) => !value);
      }
      if (event.key === "Escape") setCommandOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const mobileItems = useMemo(() => nav.slice(0, 4), []);

  return (
    <div className={`${styles.shell} ${collapsed ? styles.shellCollapsed : ""}`}>
      <aside className={`${styles.sidebar} ${collapsed ? styles.collapsed : ""}`}>
        <div className={styles.brandRow}>
          <Link href="/dashboard" className={styles.brand} aria-label="Prospect">
            <span className={styles.brandMark}><i/><b/></span>
            <span className={styles.brandName}>Prospect</span>
          </Link>
          <button className={styles.collapse} onClick={() => setCollapsed((v) => !v)} aria-label={collapsed ? "Expandir menu" : "Recolher menu"}>
            <Icon name={collapsed ? "chevronRight" : "chevronLeft"}/>
          </button>
        </div>

        <nav className={styles.nav} aria-label="Navegação principal">
          {nav.map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <Link key={item.href} href={item.href} className={`${styles.navItem} ${active ? styles.active : ""}`} title={collapsed ? item.label : undefined}>
                <span className={styles.navIcon}><Icon name={item.icon}/></span>
                <span className={styles.navLabel}>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className={styles.spacer}/>

        <div className={styles.proCard}>
          <div className={styles.proIcon}><Icon name="crown"/></div>
          <strong>Encontre mais oportunidades.</strong>
          <p>Use a busca nacional, filtros e dados reais para acelerar sua prospecção.</p>
          <Link href="/explorar">Explorar agora <Icon name="arrowUpRight"/></Link>
          <Image src="/brand/ice-mountain.svg" alt="" width={720} height={260} aria-hidden="true"/>
        </div>
      </aside>

      <main className={styles.main}>
        <header className={styles.header}>
          <button className={styles.searchBox} onClick={() => setCommandOpen(true)}>
            <Icon name="search"/>
            <span>Buscar empresas, leads ou oportunidades...</span>
            <kbd>⌘ K</kbd>
          </button>
          <div className={styles.headerActions}>
            <button className={styles.notification} aria-label="Notificações"><Icon name="bell"/><i/></button>
            <button className={styles.userMenu} aria-label="Abrir perfil">
              <span className={styles.avatar}>BM</span>
              <span className={styles.userText}><strong>Bruno</strong><small>Prospect</small></span>
              <Icon name="chevronRight" className={styles.userChevron}/>
            </button>
          </div>
        </header>
        <div className={styles.content}>{children}</div>
      </main>

      <nav className={styles.mobileNav} aria-label="Navegação móvel">
        {mobileItems.map((item) => <Link key={item.href} href={item.href} data-active={pathname.startsWith(item.href)}><Icon name={item.icon}/><span>{item.label}</span></Link>)}
      </nav>

      {commandOpen && (
        <div className={styles.overlay} onMouseDown={() => setCommandOpen(false)}>
          <div className={styles.commandPalette} onMouseDown={(e) => e.stopPropagation()}>
            <div className={styles.commandSearch}><Icon name="search"/><input autoFocus placeholder="Buscar empresa, página ou ação..."/></div>
            <div className={styles.commandSection}>
              <span className={styles.commandLabel}>Navegação rápida</span>
              {nav.slice(0, 6).map((item) => <Link href={item.href} key={item.href} className={styles.commandItem} onClick={() => setCommandOpen(false)}><Icon name={item.icon}/><span>{item.label}</span><Icon name="chevronRight"/></Link>)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
