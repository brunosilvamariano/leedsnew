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

const LAST_SEARCH_KEY = "prospect:last-live-search";
const SEARCH_HISTORY_KEY = "prospect:live-search-history";
const LEADS_KEY = "prospect:leads";
const FAVORITES_KEY = "prospect:favorites";
const EVENT = "prospect:data-updated";

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try { return JSON.parse(raw) as T; } catch { return fallback; }
}

function emit() {
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent(EVENT));
}

export function storeLiveSearch(snapshot: SearchSnapshot) {
  if (typeof window === "undefined") return;
  localStorage.setItem(LAST_SEARCH_KEY, JSON.stringify(snapshot));

  const metric: SearchHistoryMetric = {
    id: snapshot.id,
    createdAt: snapshot.createdAt,
    query: snapshot.query,
    state: snapshot.state,
    regionName: snapshot.regionName,
    countryCode: snapshot.countryCode,
    countryName: snapshot.countryName,
    city: snapshot.city,
    neighborhood: snapshot.neighborhood,
    resultCount: snapshot.resultCount,
    pagesFetched: snapshot.pagesFetched,
    durationMs: snapshot.durationMs,
    noWebsite: snapshot.companies.filter((company) => !company.website).length,
    instagram: snapshot.companies.filter((company) => Boolean(company.instagram)).length,
    whatsapp: snapshot.companies.filter((company) => Boolean(company.whatsapp)).length,
    highPotential: snapshot.companies.filter((company) => company.score >= 86).length,
    averageScore: snapshot.companies.length ? Math.round(snapshot.companies.reduce((sum, company) => sum + company.score, 0) / snapshot.companies.length) : 0,
  };

  const history = safeParse<SearchHistoryMetric[]>(localStorage.getItem(SEARCH_HISTORY_KEY), []);
  localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify([...history.filter((item) => item.id !== metric.id), metric].slice(-36)));
  emit();
}

export function readLastSearch(): SearchSnapshot | null {
  if (typeof window === "undefined") return null;
  return safeParse<SearchSnapshot | null>(localStorage.getItem(LAST_SEARCH_KEY), null);
}

export function readSearchHistory(): SearchHistoryMetric[] {
  if (typeof window === "undefined") return [];
  return safeParse<SearchHistoryMetric[]>(localStorage.getItem(SEARCH_HISTORY_KEY), []);
}

export function readStoredCompanies(key: "leads" | "favorites"): Company[] {
  if (typeof window === "undefined") return [];
  return safeParse<Company[]>(localStorage.getItem(key === "leads" ? LEADS_KEY : FAVORITES_KEY), []);
}

export function toggleFavoriteCompany(company: Company) {
  if (typeof window === "undefined") return false;
  const current = readStoredCompanies("favorites");
  const exists = current.some((item) => item.id === company.id);
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(exists ? current.filter((item) => item.id !== company.id) : [...current, company]));
  emit();
  return !exists;
}

export function addLeadCompany(company: Company) {
  if (typeof window === "undefined") return;
  const current = readStoredCompanies("leads");
  if (!current.some((item) => item.id === company.id)) localStorage.setItem(LEADS_KEY, JSON.stringify([...current, company]));
  emit();
}

export function subscribeProspectData(listener: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(EVENT, listener);
  window.addEventListener("storage", listener);
  return () => {
    window.removeEventListener(EVENT, listener);
    window.removeEventListener("storage", listener);
  };
}
