import type { Company } from "@/data/companies";
import { inspectWebsite, mapWithConcurrency, type WebsiteSignals } from "@/lib/website-signals";

const GOOGLE_TEXT_SEARCH_URL = "https://places.googleapis.com/v1/places:searchText";
const MAX_RESULTS = 60;

type AddressComponent = {
  longText?: string;
  shortText?: string;
  types?: string[];
};

type GooglePlace = {
  id?: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  nationalPhoneNumber?: string;
  internationalPhoneNumber?: string;
  websiteUri?: string;
  googleMapsUri?: string;
  businessStatus?: string;
  types?: string[];
  primaryTypeDisplayName?: { text?: string };
  location?: { latitude?: number; longitude?: number };
  addressComponents?: AddressComponent[];
  rating?: number;
  userRatingCount?: number;
};

type GoogleTextSearchResponse = {
  places?: GooglePlace[];
  nextPageToken?: string;
};

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "E") + (parts[1]?.[0] ?? parts[0]?.[1] ?? "M")).toUpperCase();
}

function component(place: GooglePlace, ...types: string[]) {
  return place.addressComponents?.find((item) => item.types?.some((type) => types.includes(type)));
}

function placeLocation(place: GooglePlace) {
  const countryComponent = component(place, "country");
  const stateComponent = component(place, "administrative_area_level_1", "administrative_area_level_2");
  const cityComponent = component(place, "locality", "postal_town", "administrative_area_level_2", "administrative_area_level_3");
  const neighborhoodComponent = component(place, "neighborhood", "sublocality_level_1", "sublocality", "sublocality_level_2", "sublocality_level_3");

  return {
    country: countryComponent?.longText || "—",
    countryCode: countryComponent?.shortText?.toUpperCase() || "",
    state: stateComponent?.longText || stateComponent?.shortText || "—",
    stateCode: stateComponent?.shortText || "",
    city: cityComponent?.longText || "—",
    neighborhood: neighborhoodComponent?.longText || "—",
  };
}

function isOwnedWebsite(url?: string) {
  if (!url) return false;
  return !/(instagram\.com|facebook\.com|wa\.me|whatsapp\.com|linktr\.ee|beacons\.ai)/i.test(url);
}

function opportunityScore(place: GooglePlace, signals: WebsiteSignals) {
  const phone = Boolean(place.nationalPhoneNumber || place.internationalPhoneNumber);
  const website = isOwnedWebsite(place.websiteUri);
  let score = 20;

  // Potencial mede a oportunidade de melhoria digital. Canais de contato
  // aumentam a viabilidade da abordagem, mas não transformam maturidade em necessidade.
  if (!website) score += 35;
  if (!signals.instagram) score += 12;
  if (!signals.whatsapp) score += 8;
  if (!signals.email) score += 8;
  if (phone) score += 8;
  if (signals.whatsapp) score += 6;
  if (signals.email) score += 4;
  if (signals.instagram) score += 2;
  if (place.businessStatus === "OPERATIONAL") score += 4;
  if ((place.userRatingCount ?? 0) >= 10) score += 2;
  if ((place.rating ?? 0) >= 4.2) score += 1;

  const hasDirectContact = phone || Boolean(signals.whatsapp || signals.email || signals.instagram);
  if (!hasDirectContact) score -= 25;
  return Math.max(0, Math.min(99, score));
}

function scoreLabel(score: number): Company["status"] {
  if (score >= 80) return "Alto potencial";
  if (score >= 60) return "Médio potencial";
  return "Baixo potencial";
}

function contactabilityScore(place: GooglePlace, signals: WebsiteSignals) {
  let score = 0;
  if (place.nationalPhoneNumber || place.internationalPhoneNumber) score += 30;
  if (signals.whatsapp) score += 30;
  if (signals.email) score += 25;
  if (signals.instagram) score += 15;
  return Math.min(100, score);
}

function contactabilityLabel(score: number): NonNullable<Company["contactStatus"]> {
  if (score >= 60) return "Contato fácil";
  if (score >= 30) return "Contato moderado";
  return "Contato limitado";
}

function readableType(place: GooglePlace, fallback: string) {
  if (place.primaryTypeDisplayName?.text) return place.primaryTypeDisplayName.text;
  if (!place.types?.length) return fallback || "Empresa local";
  const type = place.types.find((item) => item !== "establishment" && item !== "point_of_interest") ?? place.types[0];
  return type.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

async function requestPage(apiKey: string, body: Record<string, unknown>): Promise<GoogleTextSearchResponse> {
  const response = await fetch(GOOGLE_TEXT_SEARCH_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": [
        "places.id",
        "places.displayName.text",
        "places.formattedAddress",
        "places.addressComponents",
        "places.nationalPhoneNumber",
        "places.internationalPhoneNumber",
        "places.websiteUri",
        "places.googleMapsUri",
        "places.businessStatus",
        "places.types",
        "places.primaryTypeDisplayName.text",
        "places.location",
        "places.rating",
        "places.userRatingCount",
        "nextPageToken",
      ].join(","),
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`GOOGLE_PLACES_${response.status}:${errorText.slice(0, 450)}`);
  }
  return response.json() as Promise<GoogleTextSearchResponse>;
}

export async function searchGooglePlaces({
  query,
  countryCode = "BR",
  countryName = "Brasil",
  region,
  city,
  limit = MAX_RESULTS,
}: {
  query: string;
  countryCode?: string;
  countryName?: string;
  region?: string;
  city?: string;
  limit?: number;
}): Promise<{ companies: Company[]; pagesFetched: number }> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) throw new Error("GOOGLE_PLACES_API_KEY_NOT_CONFIGURED");

  const location = [city, region, countryName].filter(Boolean).join(", ");
  const textQuery = [query || "empresas", location].filter(Boolean).join(" em ");
  const target = Math.min(MAX_RESULTS, Math.max(1, limit));

  const commonBody = {
    textQuery,
    languageCode: "pt-BR",
    regionCode: countryCode.toLowerCase(),
    pageSize: Math.min(20, target),
    includePureServiceAreaBusinesses: true,
  };

  const allPlaces: GooglePlace[] = [];
  let nextPageToken: string | undefined;
  let pagesFetched = 0;

  do {
    const payload = await requestPage(apiKey, { ...commonBody, ...(nextPageToken ? { pageToken: nextPageToken } : {}) });
    pagesFetched += 1;
    for (const place of payload.places ?? []) {
      // Google Text Search already receives the requested city, region and
      // country as part of textQuery, plus regionCode as a regional hint.
      // Do not post-filter address labels here: translations and administrative
      // levels differ across countries and can incorrectly remove valid places.
      if (place.id && allPlaces.some((item) => item.id === place.id)) continue;
      allPlaces.push(place);
      if (allPlaces.length >= target) break;
    }
    nextPageToken = payload.nextPageToken;
  } while (nextPageToken && allPlaces.length < target && pagesFetched < 3);

  const enriched = await mapWithConcurrency(allPlaces.slice(0, target), 8, async (place) => ({ place, signals: await inspectWebsite(place.websiteUri) }));

  const companies = enriched.map(({ place, signals }, index) => {
    const name = place.displayName?.text?.trim() || `Empresa ${index + 1}`;
    const actual = placeLocation(place);
    const score = opportunityScore(place, signals);
    const contactScore = contactabilityScore(place, signals);
    const ownedWebsite = isOwnedWebsite(place.websiteUri);
    const reasons = [
      !ownedWebsite ? "Sem website próprio" : undefined,
      !signals.instagram ? "Instagram não identificado" : undefined,
      !signals.whatsapp ? "WhatsApp não identificado" : undefined,
      !signals.email ? "E-mail não identificado" : undefined,
      place.nationalPhoneNumber || place.internationalPhoneNumber ? "Telefone público disponível" : undefined,
      place.businessStatus === "OPERATIONAL" ? "Estabelecimento marcado como operacional" : undefined,
      typeof place.rating === "number" ? `Avaliação ${place.rating.toFixed(1)} no Google` : undefined,
    ].filter(Boolean) as string[];

    return {
      id: `google:${place.id ?? `${name}-${index}`}`,
      placeId: place.id,
      initials: initials(name),
      name,
      legalName: "Não disponível nesta fonte",
      document: "Não disponível nesta fonte",
      niche: readableType(place, query),
      city: actual.city !== "—" ? actual.city : city || "—",
      state: actual.state !== "—" ? actual.state : region || "—",
      neighborhood: actual.neighborhood !== "—" ? actual.neighborhood : "—",
      country: actual.country !== "—" ? actual.country : countryName,
      countryCode: actual.countryCode || countryCode,
      address: place.formattedAddress || [city, region, countryName].filter(Boolean).join(" - ") || countryName,
      website: ownedWebsite ? place.websiteUri : undefined,
      instagram: signals.instagram,
      whatsapp: signals.whatsapp,
      phone: place.internationalPhoneNumber || place.nationalPhoneNumber,
      email: signals.email,
      score,
      status: scoreLabel(score),
      scoreVersion: 2,
      contactScore,
      contactStatus: contactabilityLabel(contactScore),
      updatedAt: "Agora",
      source: "Google Places · consulta ao vivo",
      reasons,
      latitude: place.location?.latitude,
      longitude: place.location?.longitude,
      rating: place.rating,
      reviewCount: place.userRatingCount,
      googleMapsUrl: place.googleMapsUri,
    } satisfies Company;
  });

  return { companies, pagesFetched };
}
