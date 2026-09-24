const WORLD_GEO_BASE = "https://cdn.jsdelivr.net/gh/srestre/world-countries-cities-db@main";

export type WorldCountry = {
  name: string;
  name_es?: string;
  native?: string;
  iso2: string;
  iso3?: string;
  region?: string;
  subregion?: string;
  emoji?: string;
  currency?: string;
  states?: WorldState[];
};

export type WorldState = {
  name: string;
  native?: string;
  code?: string;
  iso3166_2?: string;
  type?: string;
  cities?: WorldCity[];
};

export type WorldCity = {
  name: string;
  latitude?: number;
  longitude?: number;
};

function portugueseRegionName(code: string, fallback: string) {
  try {
    const display = new Intl.DisplayNames(["pt-BR"], { type: "region" }).of(code.toUpperCase());
    return display && display.toUpperCase() !== code.toUpperCase() ? display : fallback;
  } catch {
    return fallback;
  }
}

async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(`${WORLD_GEO_BASE}/${path}`, {
    next: { revalidate: 60 * 60 * 24 * 7 },
    headers: { Accept: "application/json" },
  });
  if (!response.ok) throw new Error(`WORLD_GEO_${response.status}`);
  return response.json() as Promise<T>;
}

export async function getWorldCountries() {
  const countries = await getJson<WorldCountry[]>("metadata/countries.json");
  return countries
    .filter((country) => country.iso2?.length === 2)
    .map((country) => ({
      code: country.iso2.toUpperCase(),
      name: portugueseRegionName(country.iso2, country.name),
      nativeName: country.native || country.name,
      flag: country.emoji || "🌍",
      region: country.region || "",
      subregion: country.subregion || "",
      currency: country.currency || "",
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
}

export async function getWorldCountry(code: string): Promise<WorldCountry | null> {
  const normalized = code.toUpperCase();
  const payload = await getJson<WorldCountry[]>(`countries/${encodeURIComponent(normalized)}.json`);
  return payload.find((country) => country.iso2?.toUpperCase() === normalized) ?? payload[0] ?? null;
}

export async function getWorldRegions(code: string) {
  const country = await getWorldCountry(code);
  return (country?.states ?? [])
    .map((state) => ({
      code: state.code || state.iso3166_2 || state.name,
      iso: state.iso3166_2 || "",
      name: state.name,
      nativeName: state.native || state.name,
      type: state.type || "região",
      cityCount: state.cities?.length ?? 0,
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
}

export async function getWorldCities(code: string, region?: string) {
  const country = await getWorldCountry(code);
  if (!country) return [];

  const normalizedRegion = region?.trim().toLowerCase();
  const states = country.states ?? [];
  const selected = normalizedRegion
    ? states.filter((state) => [state.name, state.code, state.iso3166_2].filter(Boolean).some((value) => value!.toLowerCase() === normalizedRegion))
    : states;

  const unique = new Map<string, { id: string; name: string; latitude?: number; longitude?: number }>();
  for (const state of selected) {
    for (const city of state.cities ?? []) {
      const key = city.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
      if (!unique.has(key)) {
        unique.set(key, {
          id: `${code.toUpperCase()}:${state.code || state.name}:${city.name}`,
          name: city.name,
          latitude: city.latitude,
          longitude: city.longitude,
        });
      }
    }
  }
  return [...unique.values()].sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
}
