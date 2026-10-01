/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Company } from "@/data/companies";
import { Icon } from "@/components/ui/Icon";
import { LocationCombobox, type LocationOption } from "./LocationCombobox";
import {
  addLeadCompany,
  readLastSearch,
  readStoredCompanies,
  storeLiveSearch,
  toggleFavoriteCompany,
} from "@/lib/prospect-live-store";
import styles from "./Explore.module.css";

type ViewMode = "list" | "table";
type PresenceFilter = "noWebsite" | "instagram" | "whatsapp";
type SearchStatus = "idle" | "live" | "error";
type AppliedSearch = {
  query: string;
  countryCode: string;
  countryName: string;
  regionCode: string;
  regionName: string;
  city: string;
};
type CountryOption = {
  code: string;
  name: string;
  nativeName?: string;
  flag?: string;
  region?: string;
  subregion?: string;
  currency?: string;
};
type RegionOption = {
  code: string;
  iso?: string;
  name: string;
  nativeName?: string;
  type?: string;
  cityCount?: number;
};
type CityOption = {
  id: string | number;
  name: string;
  latitude?: number;
  longitude?: number;
};

type SearchPayload = {
  ok: boolean;
  mode?: "live";
  companies?: Company[];
  message?: string;
  meta?: {
    resultCount: number;
    pagesFetched: number;
    maxPerQuery: number;
    durationMs: number;
    source: string;
  };
};

function normalizeLocation(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function externalUrl(value: string, type: "site" | "instagram" | "whatsapp") {
  if (value.startsWith("http")) return value;
  if (type === "site") return `https://${value}`;
  if (type === "instagram")
    return `https://instagram.com/${value.replace("@", "")}`;
  const digits = value.replace(/\D/g, "");
  return `https://wa.me/${digits}`;
}

function companyLocation(company: Company) {
  return [
    company.neighborhood !== "—" ? company.neighborhood : "",
    company.city !== "—" ? company.city : "",
    company.state !== "—" ? company.state : "",
    company.country || "",
  ]
    .filter(Boolean)
    .filter(
      (value, index, array) =>
        array.findIndex(
          (item) => normalizeLocation(item) === normalizeLocation(value),
        ) === index,
    )
    .join(" · ");
}

function potentialLevel(score: number) {
  if (score >= 80) return { level: "high", label: "Alto potencial" };
  if (score >= 60) return { level: "medium", label: "Médio potencial" };
  return { level: "low", label: "Baixo potencial" };
}

function opportunityScoreFor(company: Company) {
  if (company.scoreVersion === 2) return company.score;
  let score = 20;
  if (!company.website) score += 35;
  if (!company.instagram) score += 12;
  if (!company.whatsapp) score += 8;
  if (!company.email) score += 8;
  if (company.phone) score += 8;
  if (company.whatsapp) score += 6;
  if (company.email) score += 4;
  if (company.instagram) score += 2;
  score += 4;
  if ((company.reviewCount ?? 0) >= 10) score += 2;
  if ((company.rating ?? 0) >= 4.2) score += 1;
  if (!company.phone && !company.whatsapp && !company.email && !company.instagram)
    score -= 25;
  return Math.max(0, Math.min(99, score));
}

function contactabilityFor(company: Company) {
  let score = company.contactScore;
  if (typeof score !== "number") {
    score = 0;
    if (company.phone) score += 30;
    if (company.whatsapp) score += 30;
    if (company.email) score += 25;
    if (company.instagram) score += 15;
  }
  if (score >= 60) return { score, label: "Contato fácil" };
  if (score >= 30) return { score, label: "Contato moderado" };
  return { score, label: "Contato limitado" };
}

export function Explore() {
  const [query, setQuery] = useState("");
  const [countryCode, setCountryCode] = useState("BR");
  const [regionCode, setRegionCode] = useState("");
  const [city, setCity] = useState("");
  const [countries, setCountries] = useState<CountryOption[]>([
    { code: "BR", name: "Brasil", flag: "https://flagcdn.com/w40/br.png" },
  ]);
  const [regions, setRegions] = useState<RegionOption[]>([]);
  const [cities, setCities] = useState<CityOption[]>([]);
  const [countriesLoading, setCountriesLoading] = useState(true);
  const [regionsLoading, setRegionsLoading] = useState(false);
  const [citiesLoading, setCitiesLoading] = useState(false);
  const [presence, setPresence] = useState<Record<PresenceFilter, boolean>>({
    noWebsite: false,
    instagram: false,
    whatsapp: false,
  });
  const [view, setView] = useState<ViewMode>("list");
  const [sort, setSort] = useState("score");
  const [selected, setSelected] = useState<Company | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [minScore, setMinScore] = useState(0);
  const [withEmail, setWithEmail] = useState(false);
  const [withPhone, setWithPhone] = useState(false);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [leadIds, setLeadIds] = useState<string[]>([]);
  const [queryError, setQueryError] = useState(false);
  const [liveCompanies, setLiveCompanies] = useState<Company[]>([]);
  const [searchStatus, setSearchStatus] = useState<SearchStatus>("idle");
  const [searching, setSearching] = useState(false);
  const [searchMessage, setSearchMessage] = useState(
    "Faça uma busca para consultar empresas reais em qualquer país.",
  );
  const [searchMeta, setSearchMeta] = useState<SearchPayload["meta"]>();
  const [applied, setApplied] = useState<AppliedSearch | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const resultsScrollRef = useRef<HTMLDivElement | null>(null);

  const selectedCountry = useMemo(
    () => countries.find((item) => item.code === countryCode),
    [countries, countryCode],
  );
  const countryName =
    selectedCountry?.name || (countryCode === "BR" ? "Brasil" : countryCode);
  const selectedRegion = useMemo(
    () =>
      regions.find(
        (item) =>
          item.code === regionCode ||
          item.iso === regionCode ||
          normalizeLocation(item.name) === normalizeLocation(regionCode),
      ),
    [regions, regionCode],
  );
  const regionName = selectedRegion?.name || regionCode;

  useEffect(() => {
    const previous = readLastSearch();
    if (previous) {
      setQuery(previous.query);
      setCountryCode(previous.countryCode || "BR");
      setRegionCode(previous.state || "");
      setCity(previous.city);
      setLiveCompanies(previous.companies);
      // Restoring a search must show the result list first. On small screens
      // the details panel occupies the viewport and hides the other results.
      setSelected(null);
      setApplied({
        query: previous.query,
        countryCode: previous.countryCode || "BR",
        countryName: previous.countryName || "Brasil",
        regionCode: previous.state || "",
        regionName: previous.regionName || previous.state || "",
        city: previous.city,
      });
      setSearchStatus("live");
      setSearchMeta({
        resultCount: previous.resultCount,
        pagesFetched: previous.pagesFetched,
        maxPerQuery: 60,
        durationMs: previous.durationMs,
        source: "Google Places (New)",
      });
      setSearchMessage(
        `${previous.resultCount} empresas reais da última consulta.`,
      );
    }
    setFavoriteIds(
      readStoredCompanies("favorites").map((company) => company.id),
    );
    setLeadIds(readStoredCompanies("leads").map((company) => company.id));
  }, []);

  useEffect(() => {
    let cancelled = false;
    setCountriesLoading(true);
    fetch("/api/locations/countries")
      .then((response) => response.json())
      .then((payload: { ok: boolean; countries?: CountryOption[] }) => {
        if (!cancelled && payload.countries?.length)
          setCountries(payload.countries);
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setCountriesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!countryCode) {
      setRegions([]);
      return;
    }
    let cancelled = false;
    setRegionsLoading(true);
    fetch(`/api/locations/regions?country=${encodeURIComponent(countryCode)}`)
      .then((response) => response.json())
      .then((payload: { ok: boolean; regions?: RegionOption[] }) => {
        if (!cancelled) setRegions(payload.regions ?? []);
      })
      .catch(() => {
        if (!cancelled) setRegions([]);
      })
      .finally(() => {
        if (!cancelled) setRegionsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [countryCode]);

  useEffect(() => {
    if (!countryCode || regionsLoading || (regions.length > 0 && !regionCode)) {
      setCities([]);
      return;
    }
    let cancelled = false;
    setCitiesLoading(true);
    const params = new URLSearchParams({ country: countryCode });
    if (regionCode) params.set("region", regionCode);
    fetch(`/api/locations/cities?${params.toString()}`)
      .then((response) => response.json())
      .then((payload: { ok: boolean; cities?: CityOption[] }) => {
        if (!cancelled) setCities(payload.cities ?? []);
      })
      .catch(() => {
        if (!cancelled) setCities([]);
      })
      .finally(() => {
        if (!cancelled) setCitiesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [countryCode, regionCode, regions.length, regionsLoading]);

  const filtered = useMemo(() => {
    const results = liveCompanies.filter((company) => {
      if (presence.noWebsite && company.website) return false;
      if (presence.instagram && !company.instagram) return false;
      if (presence.whatsapp && !company.whatsapp) return false;
      if (opportunityScoreFor(company) < minScore) return false;
      if (withEmail && !company.email) return false;
      if (withPhone && !company.phone && !company.whatsapp) return false;
      return true;
    });
    return [...results].sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name, "pt-BR");
      if (sort === "city") return a.city.localeCompare(b.city, "pt-BR");
      if (sort === "reviews")
        return (b.reviewCount ?? 0) - (a.reviewCount ?? 0);
      return opportunityScoreFor(b) - opportunityScoreFor(a);
    });
  }, [liveCompanies, presence, minScore, withEmail, withPhone, sort]);

  const pageSize = 10;
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const visibleCompanies = useMemo(
    () => filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [currentPage, filtered],
  );

  useEffect(() => {
    setCurrentPage(1);
    resultsScrollRef.current?.scrollTo({ top: 0, behavior: "auto" });
  }, [liveCompanies, presence, minScore, withEmail, withPhone, sort, view]);

  const activeAdvanced =
    Number(minScore > 0) + Number(withEmail) + Number(withPhone);
  const togglePresence = (key: PresenceFilter) =>
    setPresence((current) => ({ ...current, [key]: !current[key] }));

  const handleCountryChange = (value: string) => {
    setCountryCode(value);
    setRegionCode("");
    setCity("");
    setRegions([]);
    setCities([]);
  };

  const handleRegionChange = (value: string) => {
    setRegionCode(value);
    setCity("");
    setCities([]);
  };

  const handleCityChange = (value: string) => {
    setCity(value);
  };

  const resetFilters = () => {
    setPresence({ noWebsite: false, instagram: false, whatsapp: false });
    setMinScore(0);
    setWithEmail(false);
    setWithPhone(false);
  };

  const runLiveSearch = async () => {
    if (!query.trim()) {
      setQueryError(true);
      return;
    }
    setQueryError(false);
    if (!countryCode) {
      return;
    }

    setSearching(true);
    setSearchStatus("idle");
    setSearchMessage(
      `Consultando empresas reais em ${countryName} e analisando a presença digital...`,
    );
    setCurrentPage(1);

    try {
      const params = new URLSearchParams({
        q: query.trim(),
        limit: "60",
        country: countryCode,
        countryName,
      });
      if (regionName) params.set("region", regionName);
      if (city) params.set("city", city);

      const response = await fetch(
        `/api/companies/search?${params.toString()}`,
        { cache: "no-store" },
      );
      const payload = (await response.json()) as SearchPayload;
      if (!response.ok || !payload.ok)
        throw new Error(payload.message || "Falha na busca");

      const companies = payload.companies ?? [];
      const appliedSearch: AppliedSearch = {
        query: query.trim(),
        countryCode,
        countryName,
        regionCode,
        regionName,
        city,
      };
      setLiveCompanies(companies);
      // Details open only after an explicit click/tap on a company.
      setSelected(null);
      setApplied(appliedSearch);
      setSearchStatus("live");
      setSearchMeta(payload.meta);
      setSearchMessage(payload.message ?? "Busca concluída");

      await storeLiveSearch({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        createdAt: new Date().toISOString(),
        query: appliedSearch.query,
        state: appliedSearch.regionCode,
        regionName: appliedSearch.regionName,
        countryCode: appliedSearch.countryCode,
        countryName: appliedSearch.countryName,
        city: appliedSearch.city,
        resultCount: payload.meta?.resultCount ?? companies.length,
        pagesFetched: payload.meta?.pagesFetched ?? 1,
        durationMs: payload.meta?.durationMs ?? 0,
        companies,
      });
    } catch (error) {
      setLiveCompanies([]);
      setApplied(null);
      setSearchStatus("error");
      setSearchMeta(undefined);
      setSearchMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível concluir a consulta ao vivo.",
      );
    } finally {
      setSearching(false);
    }
  };

  const addLead = async (company: Company) => {
    try {
      await addLeadCompany(company);
      setLeadIds((current) =>
        current.includes(company.id) ? current : [...current, company.id],
      );
    } catch {}
  };

  const toggleFavorite = async (company: Company) => {
    try {
      const active = await toggleFavoriteCompany(company);
      setFavoriteIds((current) =>
        active
          ? [...current.filter((id) => id !== company.id), company.id]
          : current.filter((id) => id !== company.id),
      );
    } catch {}
  };

  const limitReached = searchMeta?.resultCount === searchMeta?.maxPerQuery;
  const cityDisabled =
    !countryCode ||
    regionsLoading ||
    (regions.length > 0 && !regionCode) ||
    citiesLoading;

  const goToPage = (page: number) => {
    const nextPage = Math.min(totalPages, Math.max(1, page));
    setCurrentPage(nextPage);
    // Changing page must not open the first company automatically.
    setSelected(null);
    resultsScrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  };

  const countryLocationOptions = useMemo<LocationOption[]>(
    () =>
      countries.map((item) => ({
        value: item.code,
        label: item.name,
        badge: item.flag || item.code,
      })),
    [countries],
  );

  const regionLocationOptions = useMemo<LocationOption[]>(
    () => [
      {
        value: "",
        label:
          regions.length === 0
            ? "Sem subdivisão obrigatória"
            : "Todas as regiões",
      },
      ...regions.map((item) => ({
        value: item.code,
        label: item.name,
      })),
    ],
    [regions],
  );

  const cityLocationOptions = useMemo<LocationOption[]>(
    () => [
      {
        value: "",
        label:
          regions.length > 0 && !regionCode
            ? "Escolha uma região"
            : "Todas as cidades",
      },
      ...cities.map((item) => ({
        value: item.name,
        label: item.name,
      })),
    ],
    [cities, regionCode, regions.length],
  );

  return (
    <section className={styles.page}>
      <div className={styles.hero}>
        <div>
          <p className={styles.eyebrow}>INTELIGÊNCIA COMERCIAL AO VIVO</p>
          <h1 className={styles.title}>Explorar empresas</h1>
          <p className={styles.subtitle}>
            Encontre oportunidades com sinais reais e transforme empresas em
            próximos negócios.
          </p>
        </div>
        <div className={styles.heroActions}>
          <div
            className={styles.dataStatus}
            data-live={searchStatus === "live"}
            data-error={searchStatus === "error"}
          >
            <i />
            {searchStatus === "live"
              ? "Dados ao vivo"
              : searchStatus === "error"
                ? "Falha na consulta"
                : "Aguardando busca"}
          </div>
        </div>
      </div>

      <div className={styles.searchCard}>
        {queryError && (
          <p className={styles.searchError}>É preciso colocar o nicho.</p>
        )}
        <div
          className={`${styles.searchMain} ${queryError ? styles.searchMainError : ""}`}
          aria-invalid={queryError}
        >
          <Icon name="search" />
          <input
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              if (event.target.value.trim()) setQueryError(false);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") void runLiveSearch();
            }}
            placeholder="Buscar nicho, empresa ou atividade..."
            aria-label="Buscar nicho, empresa ou atividade"
          />
          <span className={styles.searchHint}>
            Ex.: contabilidade, dentista, barbearia...
          </span>
        </div>

        <div className={styles.locationGrid}>
          <LocationCombobox
            label="País"
            value={countryCode}
            options={countryLocationOptions}
            onChange={handleCountryChange}
            placeholder="Escolha um país"
            searchPlaceholder="Digite o nome do país..."
            disabled={countriesLoading}
            loading={countriesLoading}
          />
          <LocationCombobox
            label="Região / Estado"
            value={regionCode}
            options={regionLocationOptions}
            onChange={handleRegionChange}
            placeholder="Todas as regiões"
            searchPlaceholder="Digite o estado ou região..."
            disabled={!countryCode || regionsLoading || regions.length === 0}
            loading={regionsLoading}
          />
          <LocationCombobox
            label="Cidade"
            value={city}
            options={cityLocationOptions}
            onChange={handleCityChange}
            placeholder="Todas as cidades"
            searchPlaceholder="Digite o nome da cidade..."
            disabled={cityDisabled}
            loading={citiesLoading}
          />
        </div>

        <div className={styles.quickRow}>
          <div className={styles.quickFilters} aria-label="Filtros rápidos">
            <button
              type="button"
              data-kind="website"
              className={presence.noWebsite ? styles.quickActive : styles.quick}
              onClick={() => togglePresence("noWebsite")}
            >
              <Icon name="website" /> Sem site
            </button>
            <button
              type="button"
              data-kind="instagram"
              className={presence.instagram ? styles.quickActive : styles.quick}
              onClick={() => togglePresence("instagram")}
            >
              <Icon name="instagram" /> Instagram
            </button>
            <button
              type="button"
              data-kind="whatsapp"
              className={presence.whatsapp ? styles.quickActive : styles.quick}
              onClick={() => togglePresence("whatsapp")}
            >
              <Icon name="whatsapp" /> WhatsApp
            </button>
            <button
              type="button"
              className={styles.moreFilters}
              onClick={() => setFilterOpen(true)}
            >
              <Icon name="filter" /> Mais filtros{" "}
              {activeAdvanced > 0 && <b>{activeAdvanced}</b>}
            </button>
          </div>
          <button
            type="button"
            className={styles.liveSearchButton}
            disabled={searching}
            onClick={() => void runLiveSearch()}
          >
            {searching ? "Pesquisando..." : "Buscar empresas"}{" "}
            <Icon name="arrowUpRight" />
          </button>
        </div>

        <div className={styles.searchMessage}>
          <span data-live={searchStatus === "live"}>
            {searchStatus === "live"
              ? "LIVE"
              : searchStatus === "error"
                ? "ERRO"
                : "GLOBAL"}
          </span>
          <p>
            {searchMessage}
            {limitReached
              ? " Estes são os primeiros 60 resultados disponibilizados pelo Google Places para esta consulta."
              : ""}
          </p>
        </div>
      </div>

      <section className={styles.insightGrid} aria-label="Resumo da pesquisa">
        <article data-tone="blue">
          <span>
            <Icon name="website" />
          </span>
          <div>
            <strong>{filtered.length}</strong>
            <small>empresas encontradas</small>
          </div>
        </article>
        <article data-tone="rose">
          <span>
            <Icon name="globe" />
          </span>
          <div>
            <strong>
              {filtered.filter((company) => !company.website).length}
            </strong>
            <small>sem site</small>
          </div>
        </article>
        <article data-tone="green">
          <span>
            <Icon name="whatsapp" />
          </span>
          <div>
            <strong>
              {filtered.filter((company) => company.whatsapp).length}
            </strong>
            <small>com WhatsApp</small>
          </div>
        </article>
        <article data-tone="amber">
          <span>
            <Icon name="star" />
          </span>
          <div>
            <strong>
              {filtered.filter((company) => opportunityScoreFor(company) >= 80).length}
            </strong>
            <small>alto potencial</small>
          </div>
        </article>
      </section>

      <div className={styles.resultsToolbar}>
        <div>
          <div className={styles.resultCount}>
            <strong>{filtered.length}</strong>{" "}
            {filtered.length === 1 ? "empresa" : "empresas"}
            <small>
              {" "}
              · mostrando{" "}
              {filtered.length ? (currentPage - 1) * pageSize + 1 : 0}–
              {Math.min(currentPage * pageSize, filtered.length)} de{" "}
              {filtered.length}
            </small>
            {applied && (
              <span>
                {" "}
                · {applied.query} em{" "}
                {[applied.city, applied.regionName, applied.countryName]
                  .filter(Boolean)
                  .join(", ")}
              </span>
            )}
          </div>
          <div className={styles.activeFilters}>
            {presence.noWebsite && (
              <button onClick={() => togglePresence("noWebsite")}>
                Sem site <span>×</span>
              </button>
            )}
            {presence.instagram && (
              <button onClick={() => togglePresence("instagram")}>
                Instagram <span>×</span>
              </button>
            )}
            {presence.whatsapp && (
              <button onClick={() => togglePresence("whatsapp")}>
                WhatsApp <span>×</span>
              </button>
            )}
            {minScore > 0 && (
              <button onClick={() => setMinScore(0)}>
                Score {minScore}+ <span>×</span>
              </button>
            )}
          </div>
        </div>
        <div className={styles.toolbarActions}>
          <label className={styles.sortField}>
            <span>Ordenar</span>
            <select
              value={sort}
              onChange={(event) => setSort(event.target.value)}
            >
              <option value="score">Maior oportunidade</option>
              <option value="reviews">Mais avaliações</option>
              <option value="name">Nome A–Z</option>
              <option value="city">Cidade</option>
            </select>
          </label>
          <div className={styles.viewSwitch}>
            <button
              type="button"
              aria-label="Visualização em lista"
              data-active={view === "list"}
              onClick={() => setView("list")}
            >
              <Icon name="rows" />
            </button>
            <button
              type="button"
              aria-label="Visualização em tabela"
              data-active={view === "table"}
              onClick={() => setView("table")}
            >
              <Icon name="table" />
            </button>
          </div>
        </div>
      </div>

      {!applied && !searching ? (
        <div className={styles.empty}>
          <div className={styles.emptyIcon}>
            <Icon name="search" />
          </div>
          <h2>O planeta inteiro virou sua área de prospecção</h2>
          <p>
            Escolha um país e refine por região e cidade. As empresas são
            consultadas ao vivo.
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <div className={styles.empty}>
          <div className={styles.emptyIcon}>
            <Icon name="search" />
          </div>
          <h2>Nenhuma empresa encontrada</h2>
          <p>
            {searchStatus === "error"
              ? "A consulta ao provedor falhou. Confira a mensagem acima."
              : "A busca real não retornou empresas com os filtros atuais. Tente ampliar a região ou remover filtros."}
          </p>
          {applied && (
            <button type="button" onClick={resetFilters}>
              Limpar filtros
            </button>
          )}
        </div>
      ) : (
        <>
          <div className={styles.resultsViewport} ref={resultsScrollRef}>
            {view === "list" ? (
              <div className={styles.companyList}>
                <div className={styles.listHeader} aria-hidden="true">
                  <span>Empresa</span>
                  <span>Presença digital</span>
                  <span>Avaliações</span>
                  <span>Oportunidade</span>
                  <span />
                </div>
                {visibleCompanies.map((company) => (
                  <article className={styles.companyCard} key={company.id}>
                    <button
                      className={styles.companyOpen}
                      type="button"
                      onClick={() => setSelected(company)}
                      aria-label={`Abrir ${company.name}`}
                    >
                      <div className={styles.companyIdentity}>
                        <div className={styles.companyAvatar}>
                          {company.initials}
                        </div>
                        <div className={styles.companyText}>
                          <h2>{company.name}</h2>
                          <p>{company.niche}</p>
                          <span>
                            <Icon name="location" /> {companyLocation(company)}
                          </span>
                        </div>
                      </div>
                      <div className={styles.presenceList}>
                        <span
                          data-on={Boolean(company.instagram)}
                          data-kind="instagram"
                          title={
                            company.instagram
                              ? "Possui Instagram"
                              : "Instagram não encontrado"
                          }
                          aria-label={
                            company.instagram
                              ? "Possui Instagram"
                              : "Instagram não encontrado"
                          }
                        >
                          <Icon name="instagram" />
                        </span>
                        <span
                          data-on={Boolean(company.whatsapp)}
                          data-kind="whatsapp"
                          title={
                            company.whatsapp
                              ? "Possui WhatsApp"
                              : "WhatsApp não encontrado"
                          }
                          aria-label={
                            company.whatsapp
                              ? "Possui WhatsApp"
                              : "WhatsApp não encontrado"
                          }
                        >
                          <Icon name="whatsapp" />
                        </span>
                        <span
                          data-on={Boolean(company.website)}
                          data-kind="website"
                          title={
                            company.website
                              ? "Possui website"
                              : "Website não encontrado"
                          }
                          aria-label={
                            company.website
                              ? "Possui website"
                              : "Website não encontrado"
                          }
                        >
                          <Icon name="website" />
                        </span>
                      </div>
                      <div className={styles.companyUpdated}>
                        {company.rating ? (
                          <>
                            <strong>{company.rating.toFixed(1)} ★</strong>
                            <br />
                            {company.reviewCount ?? 0} avaliações
                          </>
                        ) : (
                          <>
                            Google
                            <br />
                            <strong>sem nota pública</strong>
                          </>
                        )}
                      </div>
                      <div
                        className={styles.scoreBox}
                        data-level={potentialLevel(opportunityScoreFor(company)).level}
                      >
                        <div
                          className={styles.scoreRing}
                          style={{
                            background: `conic-gradient(currentColor ${opportunityScoreFor(company) * 3.6}deg, #e7eef5 0deg)`,
                          }}
                        >
                          <strong>{opportunityScoreFor(company)}</strong>
                        </div>
                        <div className={styles.scoreCopy}>
                          <b>{potentialLevel(opportunityScoreFor(company)).label}</b>
                          <span>
                            {contactabilityFor(company).label}
                          </span>
                        </div>
                      </div>
                      <div className={styles.openArrow}>
                        <Icon name="chevronRight" />
                      </div>
                    </button>
                    <button
                      className={styles.favoriteButton}
                      type="button"
                      data-active={favoriteIds.includes(company.id)}
                      aria-label="Favoritar empresa"
                      onClick={() => toggleFavorite(company)}
                    >
                      <Icon name="heart" />
                    </button>
                    <button
                      className={
                        leadIds.includes(company.id)
                          ? styles.resultLeadAdded
                          : styles.resultLeadButton
                      }
                      type="button"
                      onClick={() => addLead(company)}
                    >
                      <Icon
                        name={leadIds.includes(company.id) ? "check" : "plus"}
                      />
                      {leadIds.includes(company.id)
                        ? "Adicionado"
                        : "Adicionar lead"}
                    </button>
                  </article>
                ))}
              </div>
            ) : (
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Empresa</th>
                      <th>Local</th>
                      <th>Presença digital</th>
                      <th>Avaliações</th>
                      <th>Score</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleCompanies.map((company) => (
                      <tr key={company.id} onClick={() => setSelected(company)}>
                        <td>
                          <div className={styles.tableCompany}>
                            <span>{company.initials}</span>
                            <div>
                              <strong>{company.name}</strong>
                              <small>{company.niche}</small>
                            </div>
                          </div>
                        </td>
                        <td>{companyLocation(company)}</td>
                        <td>
                          <div className={styles.tablePresence}>
                            <span
                              data-on={Boolean(company.instagram)}
                              data-kind="instagram"
                              title="Instagram"
                            >
                              <Icon name="instagram" />
                            </span>
                            <span
                              data-on={Boolean(company.whatsapp)}
                              data-kind="whatsapp"
                              title="WhatsApp"
                            >
                              <Icon name="whatsapp" />
                            </span>
                            <span
                              data-on={Boolean(company.website)}
                              data-kind="website"
                              title="Website"
                            >
                              <Icon name="website" />
                            </span>
                          </div>
                        </td>
                        <td>
                          {company.rating
                            ? `${company.rating.toFixed(1)} ★ · ${company.reviewCount ?? 0}`
                            : "—"}
                        </td>
                        <td>
                          <div className={styles.tableScore}>
                            {opportunityScoreFor(company)}
                            <small>{potentialLevel(opportunityScoreFor(company)).label}</small>
                          </div>
                        </td>
                        <td>
                          <Icon name="chevronRight" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          <nav className={styles.pagination} aria-label="Paginação de empresas">
            <button
              type="button"
              disabled={currentPage === 1}
              onClick={() => goToPage(currentPage - 1)}
              aria-label="Página anterior"
            >
              <Icon name="chevronLeft" />
            </button>
            <span className={styles.pageSummary}>
              Página <strong>{currentPage}</strong> de {totalPages}
            </span>
            <div className={styles.pageNumbers}>
              {Array.from({ length: totalPages }, (_, index) => index + 1).map(
                (page) => (
                  <button
                    type="button"
                    data-active={page === currentPage}
                    aria-current={page === currentPage ? "page" : undefined}
                    aria-label={`Ir para página ${page}`}
                    onClick={() => goToPage(page)}
                    key={page}
                  >
                    {page}
                  </button>
                ),
              )}
            </div>
            <button
              type="button"
              disabled={currentPage === totalPages}
              onClick={() => goToPage(currentPage + 1)}
              aria-label="Próxima página"
            >
              <Icon name="chevronRight" />
            </button>
          </nav>
        </>
      )}

      {selected && (
        <div
          className={styles.drawerOverlay}
          onMouseDown={() => setSelected(null)}
        >
          <aside
            className={styles.drawer}
            onMouseDown={(event) => event.stopPropagation()}
            aria-label={`Detalhes de ${selected.name}`}
          >
            <div className={styles.drawerHeader}>
              <div className={styles.drawerAvatar}>{selected.initials}</div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                aria-label="Fechar"
              >
                <Icon name="close" />
              </button>
            </div>
            <div className={styles.drawerIntro}>
              <div className={styles.drawerTitleRow}>
                <div>
                  <h2>{selected.name}</h2>
                  <p>{selected.niche}</p>
                </div>
                <div
                  className={styles.drawerScore}
                  data-level={potentialLevel(opportunityScoreFor(selected)).level}
                >
                  <strong>{opportunityScoreFor(selected)}</strong>
                  <span>{potentialLevel(opportunityScoreFor(selected)).label}</span>
                </div>
              </div>
              <span className={styles.location}>
                <Icon name="location" /> {companyLocation(selected)}
              </span>
              <div className={styles.drawerActions}>
                <button
                  className={
                    leadIds.includes(selected.id)
                      ? styles.addedLead
                      : styles.addLead
                  }
                  type="button"
                  onClick={() => addLead(selected)}
                >
                  <Icon
                    name={leadIds.includes(selected.id) ? "check" : "plus"}
                  />
                  {leadIds.includes(selected.id)
                    ? "Adicionado aos leads"
                    : "Adicionar aos leads"}
                </button>
                <button
                  className={styles.drawerFavorite}
                  type="button"
                  data-active={favoriteIds.includes(selected.id)}
                  onClick={() => toggleFavorite(selected)}
                >
                  <Icon name="heart" />
                </button>
              </div>
            </div>
            <DrawerSection title="Presença digital">
              <ContactRow
                icon="website"
                label="Website"
                value={selected.website ?? "Não encontrado"}
                href={
                  selected.website
                    ? externalUrl(selected.website, "site")
                    : undefined
                }
                missing={!selected.website}
              />
              <ContactRow
                icon="instagram"
                label="Instagram"
                value={selected.instagram ?? "Não encontrado"}
                href={
                  selected.instagram
                    ? externalUrl(selected.instagram, "instagram")
                    : undefined
                }
                missing={!selected.instagram}
              />
              <ContactRow
                icon="whatsapp"
                label="WhatsApp"
                value={selected.whatsapp ?? "Não encontrado"}
                href={
                  selected.whatsapp
                    ? externalUrl(selected.whatsapp, "whatsapp")
                    : undefined
                }
                missing={!selected.whatsapp}
              />
              <ContactRow
                icon="phone"
                label="Telefone"
                value={selected.phone ?? "Não encontrado"}
                missing={!selected.phone}
              />
              <ContactRow
                icon="mail"
                label="E-mail"
                value={selected.email ?? "Não encontrado"}
                missing={!selected.email}
              />
            </DrawerSection>
            <DrawerSection title="Dados públicos">
              <InfoRow
                label="Facilidade de contato"
                value={`${contactabilityFor(selected).label} · ${contactabilityFor(selected).score}/100`}
                success={contactabilityFor(selected).score >= 60}
              />
              <InfoRow label="Localização" value={companyLocation(selected)} />
              <InfoRow label="Endereço" value={selected.address} />
              <InfoRow
                label="Avaliação Google"
                value={
                  selected.rating
                    ? `${selected.rating.toFixed(1)} · ${selected.reviewCount ?? 0} avaliações`
                    : "Não disponível"
                }
              />
              <InfoRow label="Situação" value="Operacional na fonte" success />
            </DrawerSection>
            <DrawerSection title="Por que esta oportunidade?">
              <div className={styles.reasons}>
                {selected.reasons.map((reason) => (
                  <div key={reason}>
                    <span>
                      <Icon name="check" />
                    </span>
                    {reason}
                  </div>
                ))}
              </div>
            </DrawerSection>
            <DrawerSection title="Fonte">
              <InfoRow label="Origem" value={selected.source} />
              <InfoRow label="Última verificação" value={selected.updatedAt} />
              {selected.googleMapsUrl && (
                <a
                  className={styles.mapsLink}
                  href={selected.googleMapsUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  <span className={styles.mapsLinkContent}>
                    <svg
                      className={styles.mapsLogo}
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path
                        fill="#34A853"
                        d="M12 2.5a6.7 6.7 0 0 0-6.7 6.7c0 4.6 6.7 12.3 6.7 12.3s6.7-7.7 6.7-12.3A6.7 6.7 0 0 0 12 2.5Z"
                      />
                      <path
                        fill="#4285F4"
                        d="M5.3 9.2c0 1 .25 2.15.67 3.3L12 9.5V2.5a6.7 6.7 0 0 0-6.7 6.7Z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 2.5a6.7 6.7 0 0 1 5.35 2.7L12 9.5V2.5Z"
                      />
                      <path
                        fill="#FBBC04"
                        d="M17.35 5.2A6.7 6.7 0 0 1 18.7 9.2c0 .8-.18 1.67-.48 2.58L12 9.5l5.35-4.3Z"
                      />
                      <circle cx="12" cy="9.3" r="2.1" fill="white" />
                    </svg>
                    <span>Abrir no Google Maps</span>
                  </span>
                  <Icon name="arrowUpRight" />
                </a>
              )}
            </DrawerSection>
          </aside>
        </div>
      )}

      {filterOpen && (
        <div
          className={styles.drawerOverlay}
          onMouseDown={() => setFilterOpen(false)}
        >
          <aside
            className={`${styles.drawer} ${styles.filterDrawer}`}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className={styles.filterHeader}>
              <div>
                <span>Filtros</span>
                <h2>Refinar resultados reais</h2>
              </div>
              <button type="button" onClick={() => setFilterOpen(false)}>
                <Icon name="close" />
              </button>
            </div>
            <div className={styles.filterBody}>
              <div className={styles.filterGroup}>
                <h3>Oportunidade</h3>
                <label>
                  Score mínimo
                  <select
                    value={minScore}
                    onChange={(event) =>
                      setMinScore(Number(event.target.value))
                    }
                  >
                    <option value="0">Qualquer score</option>
                    <option value="70">70+</option>
                    <option value="80">80+</option>
                    <option value="90">90+</option>
                  </select>
                </label>
              </div>
              <div className={styles.filterGroup}>
                <h3>Contato</h3>
                <label className={styles.checkRow}>
                  <input
                    type="checkbox"
                    checked={withEmail}
                    onChange={(event) => setWithEmail(event.target.checked)}
                  />
                  <span>Possui e-mail encontrado</span>
                </label>
                <label className={styles.checkRow}>
                  <input
                    type="checkbox"
                    checked={withPhone}
                    onChange={(event) => setWithPhone(event.target.checked)}
                  />
                  <span>Possui telefone ou WhatsApp</span>
                </label>
              </div>
              <div className={styles.filterGroup}>
                <h3>Fontes geográficas</h3>
                <div className={styles.readOnlyFilter}>
                  <span>Empresas</span>
                  <strong>Google Places ao vivo</strong>
                </div>
                <div className={styles.readOnlyFilter}>
                  <span>Países / regiões / cidades</span>
                  <strong>World Countries Cities DB</strong>
                </div>
              </div>
            </div>
            <div className={styles.filterFooter}>
              <button type="button" onClick={resetFilters}>
                Limpar
              </button>
              <button type="button" onClick={() => setFilterOpen(false)}>
                Ver {filtered.length} resultados
              </button>
            </div>
          </aside>
        </div>
      )}
    </section>
  );
}

function DrawerSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className={styles.drawerSection}>
      <h3>{title}</h3>
      {children}
    </section>
  );
}

function ContactRow({
  icon,
  label,
  value,
  href,
  missing = false,
}: {
  icon: "website" | "instagram" | "whatsapp" | "phone" | "mail";
  label: string;
  value: string;
  href?: string;
  missing?: boolean;
}) {
  const content = (
    <>
      <span className={styles.contactIcon} data-icon={icon}>
        <Icon name={icon} />
      </span>
      <div>
        <small>{label}</small>
        <strong data-missing={missing}>{value}</strong>
      </div>
      {href && <Icon name="arrowUpRight" />}
    </>
  );
  return href ? (
    <a
      className={styles.contactRow}
      href={href}
      target="_blank"
      rel="noreferrer"
    >
      {content}
    </a>
  ) : (
    <div className={styles.contactRow}>{content}</div>
  );
}

function InfoRow({
  label,
  value,
  success = false,
}: {
  label: string;
  value: string;
  success?: boolean;
}) {
  return (
    <div className={styles.infoRow}>
      <span>{label}</span>
      <strong data-success={success}>{value}</strong>
    </div>
  );
}
