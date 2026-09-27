"use client";
import Link from "next/link";
export default function WorkspaceError({ reset }: { reset: () => void }) {
  return <div className="empty-state"><span className="empty-icon">✧</span><h2>Não conseguimos abrir esta parte do workspace</h2><p>Tente novamente. Se o problema continuar, confira a conexão com o banco.</p><div className="heading-actions" style={{justifyContent:"center"}}><button className="primary" onClick={reset}>Tentar novamente</button><Link className="secondary" href="/dashboard">Voltar ao início</Link></div></div>;
}
