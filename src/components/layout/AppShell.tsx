"use client";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { createContext, useContext, useEffect, useState } from "react";
import { Icon, type IconName } from "@/components/ui/Icon";
import { authClient } from "@/lib/auth-client";
import { refreshRecords } from "@/lib/records-client";
import type { PublicUser } from "@/lib/crm-types";
const UserContext = createContext<PublicUser | null>(null);
export function useUser() {
  return useContext(UserContext)!;
}
const navigation: [string, string, IconName][] = [
  ["/dashboard", "Visão geral", "dashboard"],
  ["/explorar", "Explorar empresas", "target"],
  ["/leads", "Meus leads", "lead"],
  ["/pipeline", "Pipeline", "pipeline"],
  ["/agenda", "Calendário", "calendar"],
  ["/favoritos", "Favoritos", "star"],
];
export function Avatar({
  user,
  size = 38,
}: {
  user: Pick<PublicUser, "name" | "image">;
  size?: number;
}) {
  return (
    <span className="profile-avatar" style={{ width: size, height: size }}>
      {user.image ? (
        <Image
          src={user.image}
          alt={`Foto de ${user.name}`}
          width={size}
          height={size}
          unoptimized
        />
      ) : (
        user.name
          .split(" ")
          .map((n) => n[0])
          .slice(0, 2)
          .join("")
          .toUpperCase()
      )}
    </span>
  );
}
export function AppShell({
  children,
  user,
  readOnly = false,
  trial,
}: {
  children: React.ReactNode;
  user: PublicUser;
  readOnly?: boolean;
  trial?: {
    startsAt: string;
    endsAt: string;
    status: "scheduled" | "active" | "expired";
  };
}) {
  const path = usePathname();
  const [menu, setMenu] = useState(false),
    [collapsed, setCollapsed] = useState(false),
    [query, setQuery] = useState(""),
    [message, setMessage] = useState(""),
    [ready, setReady] = useState(false),
    [failed, setFailed] = useState(false);
  const load = () => {
    setFailed(false);
    refreshRecords()
      .then(() => setReady(true))
      .catch(() => setFailed(true));
  };
  useEffect(() => {
    refreshRecords()
      .then(() => setReady(true))
      .catch(() => setFailed(true));
    const notify = (e: Event) => setMessage((e as CustomEvent<string>).detail);
    window.addEventListener("bizpeek:message", notify);
    return () => window.removeEventListener("bizpeek:message", notify);
  }, []);
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(""), 6500);
      return () => clearTimeout(timer);
    }
  }, [message]);
  const accountLinks: [string, string, IconName][] = [
    ["/assinatura", "Meu plano", "crown"] as [string, string, IconName],
    ["/configuracoes", "Configurações", "settings"] as [
      string,
      string,
      IconName,
    ],
  ];
  const adminLinks: [string, string, IconName][] =
    user.role === "ADMIN"
      ? [["/admin", "Painel administrativo", "shield"]]
      : [];
  const links = [...navigation, ...accountLinks, ...adminLinks];
  return (
    <UserContext.Provider value={user}>
      <div className="workspace">
        {menu && (
          <button
            className="menu-backdrop"
            aria-label="Fechar menu"
            onClick={() => setMenu(false)}
          />
        )}
        <aside
          className={`app-sidebar ${menu ? "is-open" : ""} ${collapsed ? "is-collapsed" : ""}`}
        >
          <div className="sidebar-brand-row">
            <Link
              className="wordmark"
              href="/dashboard"
              aria-label="BizPeek - Visão geral"
            >
              <Image
                src="/logo/bizpeek-logo.png"
                alt=""
                width={1254}
                height={1254}
                className="brand-wordmark"
                priority
              />
              <Image
                src="/logo/bizpeek-favicon.png"
                alt=""
                width={1254}
                height={1254}
                className="favicon-mark"
              />
            </Link>
            <button
              className="sidebar-collapse"
              type="button"
              aria-label={collapsed ? "Expandir sidebar" : "Recolher sidebar"}
              aria-expanded={!collapsed}
              aria-controls="workspace-navigation"
              onClick={() => setCollapsed(!collapsed)}
            >
              <Icon name={collapsed ? "chevronRight" : "chevronLeft"} />
            </button>
          </div>
          <div className="workspace-label">
            <span className="workspace-symbol">B</span>
            <div>
              <strong>Meu workspace</strong>
              <small>Seu próximo negócio começa aqui</small>
            </div>
          </div>
          <p className="nav-caption">WORKSPACE</p>
          <nav id="workspace-navigation" aria-label="Navegação principal">
            {navigation.map(([href, label, icon]) => (
              <Link
                onClick={() => setMenu(false)}
                key={href}
                href={href}
                title={collapsed ? label : undefined}
                className={path === href ? "selected" : ""}
              >
                <Icon name={icon} />
                <span>{label}</span>
              </Link>
            ))}
          </nav>
          <div className="sidebar-management">
            <p className="nav-caption">CONTA E GESTÃO</p>
            <nav aria-label="Conta e gestão">
              {accountLinks.map(([href, label, icon]) => (
                <Link
                  onClick={() => setMenu(false)}
                  key={href}
                  href={href}
                  title={collapsed ? label : undefined}
                  className={path === href ? "selected" : ""}
                >
                  <Icon name={icon} />
                  <span>{label}</span>
                </Link>
              ))}
            </nav>
            {adminLinks.length > 0 && (
              <div className="sidebar-admin-group">
                <p className="nav-caption">ADMINISTRAÇÃO</p>
                <nav aria-label="Administração">
                  {adminLinks.map(([href, label, icon]) => (
                    <Link
                      onClick={() => setMenu(false)}
                      key={href}
                      href={href}
                      title={collapsed ? label : undefined}
                      className={`${path === href ? "selected" : ""} admin-navigation-link`}
                    >
                      <Icon name={icon} />
                      <span>{label}</span>
                    </Link>
                  ))}
                </nav>
              </div>
            )}
          </div>
          <button
            className="sidebar-user"
            aria-label="Sair da conta"
            title={collapsed ? "Sair da conta" : undefined}
            onClick={async () => {
              await authClient.signOut();
              window.location.href = new URL(
                "/login",
                window.location.origin,
              ).href;
            }}
          >
            <Avatar user={user} />
            <span>
              <strong>{user.name}</strong>
              <small>Sair da conta</small>
            </span>
            <Icon name="logout" />
          </button>
        </aside>
        <main className="app-main">
          <header className="app-topbar">
            <button
              className="icon-button mobile-menu"
              aria-label="Abrir menu"
              onClick={() => setMenu(true)}
            >
              <Icon name="menu" />
            </button>
            <div className="breadcrumbs">
              Workspace <span>/</span>{" "}
              <strong>
                {links.find(([href]) => path === href)?.[1] || "BizPeek"}
              </strong>
            </div>
            <div className="topbar-right">
              <div className="quick-search">
                <Icon name="search" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Ir para uma página..."
                  aria-label="Buscar página"
                />
                {query && (
                  <div className="quick-results">
                    {links
                      .filter(([, label]) =>
                        label.toLowerCase().includes(query.toLowerCase()),
                      )
                      .map(([href, label]) => (
                        <Link
                          key={href}
                          href={href}
                          onClick={() => setQuery("")}
                        >
                          {label} <Icon name="arrowUpRight" />
                        </Link>
                      ))}
                  </div>
                )}
              </div>
              <Link
                href="/agenda"
                className="icon-button"
                aria-label="Ver próximos compromissos"
              >
                <Icon name="calendar" />
              </Link>
              <Link href="/configuracoes">
                <Avatar user={user} />
              </Link>
            </div>
          </header>
          <div className="app-content">
            {trial?.status === "active" && (
              <div className="trial-notice">
                <strong>Teste gratuito ativo</strong>
                <span>
                  Seu acesso completo está liberado até{" "}
                  {new Date(trial.endsAt).toLocaleString("pt-BR")}.
                </span>
                <Link href="/assinatura">Ver detalhes →</Link>
              </div>
            )}
            {trial?.status === "scheduled" && (
              <div className="trial-notice is-scheduled">
                <strong>Teste gratuito agendado</strong>
                <span>
                  O acesso começa em{" "}
                  {new Date(trial.startsAt).toLocaleString("pt-BR")} e termina
                  em {new Date(trial.endsAt).toLocaleString("pt-BR")}.
                </span>
                <Link href="/assinatura">Ver detalhes →</Link>
              </div>
            )}
            {readOnly && path !== "/assinatura" && (
              <div className="plan-notice">
                Seu workspace está em modo de leitura. Ative o Pro por R$ 50/mês
                para continuar criando.{" "}
                <Link href="/assinatura">Ver meu plano →</Link>
              </div>
            )}
            {failed ? (
              <div className="empty-state">
                <h2>Não conseguimos carregar seus dados</h2>
                <p>Confira a conexão com o banco e tente novamente.</p>
                <button className="primary" onClick={load}>
                  Tentar novamente
                </button>
              </div>
            ) : ready ? (
              children
            ) : (
              <div className="loading-state">
                <span className="spinner" />
                Preparando seu workspace…
              </div>
            )}
          </div>
        </main>
        {message && (
          <div className="toast" role="status">
            {message}
            <button aria-label="Fechar aviso" onClick={() => setMessage("")}>
              ×
            </button>
          </div>
        )}
      </div>
    </UserContext.Provider>
  );
}
