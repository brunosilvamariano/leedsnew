"use client";
import Link from "next/link";
import type { Company } from "@/data/companies";
import { useRecords, removeRecord } from "@/lib/records-client";
import { addLeadCompany } from "@/lib/prospect-live-store";
import { Empty, Heading } from "@/components/saas/Shared";
export function Favorites() {
  const items = useRecords<Company>("favorite"),
    leads = useRecords<Company>("lead");
  return (
    <>
      <Heading
        title="Oportunidades para olhar com carinho."
        text="Suas empresas favoritas, sempre por perto."
      >
        <Link className="primary" href="/explorar">
          Explorar empresas ↗
        </Link>
      </Heading>
      {!items.length ? (
        <Empty
          title="Guarde o que chamou sua atenção"
          text="Marque uma empresa nos resultados de busca e ela aparecerá aqui."
        />
      ) : (
        <section className="panel">
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>EMPRESA</th>
                  <th>LOCALIZAÇÃO</th>
                  <th>POTENCIAL</th>
                  <th>AÇÕES</th>
                </tr>
              </thead>
              <tbody>
                {[...items].reverse().map((row) => (
                  <tr key={row.id}>
                    <td>
                      <div className="lead-identity">
                        <span className="company-avatar">
                          {row.data.initials}
                        </span>
                        <div>
                          <strong>{row.data.name}</strong>
                          <small>{row.data.niche}</small>
                        </div>
                      </div>
                    </td>
                    <td>
                      {row.data.city} · {row.data.state}
                    </td>
                    <td>
                      <span className="status-badge">
                        {row.data.score} pontos
                      </span>
                    </td>
                    <td>
                      <div className="row-actions">
                        <button
                          disabled={leads.some(
                            (l) => l.data.id === row.data.id,
                          )}
                          onClick={() =>
                            void addLeadCompany(row.data).catch(() => {})
                          }
                        >
                          {leads.some((l) => l.data.id === row.data.id)
                            ? "Já é um lead"
                            : "＋ Adicionar lead"}
                        </button>
                        <button
                          onClick={() => {
                            if (confirm("Remover dos favoritos?"))
                              void removeRecord(row.id).catch(() => {});
                          }}
                        >
                          Remover
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </>
  );
}
