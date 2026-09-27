import type { Company } from "@/data/companies";

export type SearchSnapshot = {
  id: string;
  createdAt: string;
  query: string;
  state: string;
  regionName?: string;
  countryCode?: string;
  countryName?: string;
  city: string;
  neighborhood?: string;
  resultCount: number;
  pagesFetched: number;
  durationMs: number;
  companies: Company[];
};

export type SearchHistoryMetric = Omit<SearchSnapshot, "companies"> & {
  noWebsite: number;
  instagram: number;
  whatsapp: number;
  highPotential: number;
  averageScore: number;
};

import {
  allRecords,
  saveRecord,
  removeRecord,
  subscribeRecords,
} from "./records-client";
export function readLastSearch(): SearchSnapshot | null {
  return (
    (allRecords()
      .filter((r) => r.kind === "search")
      .at(-1)?.data as unknown as SearchSnapshot) || null
  );
}
export function readSearchHistory(): SearchHistoryMetric[] {
  return allRecords()
    .filter((r) => r.kind === "search")
    .map((r) => {
      const s = r.data as unknown as SearchSnapshot;
      return {
        ...s,
        noWebsite: s.companies.filter((c) => !c.website).length,
        instagram: s.companies.filter((c) => c.instagram).length,
        whatsapp: s.companies.filter((c) => c.whatsapp).length,
        highPotential: s.companies.filter((c) => c.score >= 86).length,
        averageScore: s.companies.length
          ? Math.round(
              s.companies.reduce((a, c) => a + c.score, 0) / s.companies.length,
            )
          : 0,
      };
    });
}
export function readStoredCompanies(key: "leads" | "favorites"): Company[] {
  return allRecords()
    .filter((r) => r.kind === (key === "leads" ? "lead" : "favorite"))
    .map((r) => r.data as unknown as Company);
}
export async function storeLiveSearch(snapshot: SearchSnapshot) {
  await saveRecord("search", snapshot);
}
export async function addLeadCompany(company: Company) {
  if (!readStoredCompanies("leads").some((c) => c.id === company.id))
    await saveRecord("lead", { ...company, stage: "Novo", value: 0 });
}
export async function toggleFavoriteCompany(company: Company) {
  const existing = allRecords().find(
    (r) => r.kind === "favorite" && r.data.id === company.id,
  );
  if (existing) await removeRecord(existing.id);
  else await saveRecord("favorite", company);
  return !existing;
}
export const subscribeProspectData = subscribeRecords;
