type PostalRecord = Record<string, unknown>;

const memoryCache = new Map<string, string[]>();
const BASE_URL = "https://api-cep.kedllon.solutions/cidades";

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function citySlug(city: string) {
  return city
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join("_");
}

function addNeighborhood(value: unknown, target: Set<string>) {
  if (typeof value !== "string") return;
  const cleaned = value.replace(/\s+/g, " ").trim();
  if (!cleaned || cleaned === "-" || normalize(cleaned) === "centro da cidade") return;
  target.add(cleaned);
}

function walk(value: unknown, neighborhoods: Set<string>, expectedCity: string, expectedState: string) {
  if (Array.isArray(value)) {
    for (const item of value) walk(item, neighborhoods, expectedCity, expectedState);
    return;
  }
  if (!value || typeof value !== "object") return;

  const row = value as PostalRecord;
  const city = [row.localidade, row.cidade, row.city, row.municipio, row.nome_cidade]
    .find((item) => typeof item === "string") as string | undefined;
  const state = [row.uf, row.estado, row.state]
    .find((item) => typeof item === "string") as string | undefined;

  const cityMatches = !city || normalize(city) === normalize(expectedCity);
  const stateMatches = !state || normalize(state) === normalize(expectedState) || state.length > 2;

  if (cityMatches && stateMatches) {
    addNeighborhood(row.bairro, neighborhoods);
    addNeighborhood(row.neighborhood, neighborhoods);
    addNeighborhood(row.nome_bairro, neighborhoods);
    addNeighborhood(row.nomeBairro, neighborhoods);
  }

  for (const nested of Object.values(row)) {
    if (nested && typeof nested === "object") walk(nested, neighborhoods, expectedCity, expectedState);
  }
}

async function fetchCandidate(url: string) {
  const response = await fetch(url, {
    headers: { "User-Agent": "Prospect/0.5.1" },
    signal: AbortSignal.timeout(9000),
    cache: "force-cache",
  });
  if (!response.ok) return null;
  return response.json() as Promise<unknown>;
}

export async function getPostalNeighborhoods(state: string, city: string) {
  const uf = state.toUpperCase().trim();
  const cacheKey = `${uf}:${normalize(city)}`;
  const cached = memoryCache.get(cacheKey);
  if (cached) return cached;

  const slug = citySlug(city);
  const candidates = [
    `${BASE_URL}/${encodeURIComponent(`${uf}_${slug}`)}.json`,
    `${BASE_URL}/${encodeURIComponent(`${uf}_${city.replace(/\s+/g, "_")}`)}.json`,
  ];

  let payload: unknown = null;
  for (const url of candidates) {
    try {
      payload = await fetchCandidate(url);
      if (payload) break;
    } catch {
      // Try the next URL variation.
    }
  }

  const neighborhoods = new Set<string>();
  if (payload) walk(payload, neighborhoods, city, uf);

  const result = [...neighborhoods].sort((a, b) => a.localeCompare(b, "pt-BR"));
  memoryCache.set(cacheKey, result);
  return result;
}
