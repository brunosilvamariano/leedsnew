import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

export type WebsiteSignals = {
  instagram?: string;
  whatsapp?: string;
  email?: string;
};

function cleanInstagram(url: string) {
  try {
    const parsed = new URL(url);
    const handle = parsed.pathname.split("/").filter(Boolean)[0];
    return handle ? `@${handle}` : url;
  } catch {
    return url;
  }
}

function cleanWhatsapp(url: string) {
  const digits = url.match(/(?:wa\.me\/|phone=)(\d{10,15})/i)?.[1];
  return digits ? `+${digits}` : url;
}

function isPrivateIpv4(address: string) {
  const parts = address.split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return true;
  const [a, b] = parts;
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 192 && b === 0) ||
    (a === 192 && b === 2) ||
    (a === 198 && (b === 18 || b === 19 || b === 51)) ||
    (a === 203 && b === 0) ||
    a >= 224
  );
}

function isPrivateIp(address: string) {
  const normalized = address.toLowerCase();
  if (isIP(normalized) === 4) return isPrivateIpv4(normalized);
  if (isIP(normalized) !== 6) return true;

  const mapped = normalized.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/)?.[1];
  if (mapped) return isPrivateIpv4(mapped);

  return (
    normalized === "::" ||
    normalized === "::1" ||
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") ||
    normalized.startsWith("fe8") ||
    normalized.startsWith("fe9") ||
    normalized.startsWith("fea") ||
    normalized.startsWith("feb") ||
    normalized.startsWith("ff") ||
    normalized.startsWith("2001:db8")
  );
}

async function validatePublicHttpUrl(value: string) {
  const parsed = new URL(value);
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") throw new Error("UNSAFE_WEBSITE_PROTOCOL");
  if (parsed.username || parsed.password) throw new Error("UNSAFE_WEBSITE_CREDENTIALS");

  const hostname = parsed.hostname.toLowerCase().replace(/\.$/, "");
  if (!hostname || hostname === "localhost" || hostname.endsWith(".localhost") || hostname.endsWith(".local") || hostname.endsWith(".internal")) {
    throw new Error("UNSAFE_WEBSITE_HOST");
  }

  const directIp = isIP(hostname);
  if (directIp) {
    if (isPrivateIp(hostname)) throw new Error("UNSAFE_WEBSITE_IP");
    return parsed;
  }

  const addresses = await lookup(hostname, { all: true, verbatim: true });
  if (!addresses.length || addresses.some(({ address }) => isPrivateIp(address))) throw new Error("UNSAFE_WEBSITE_DNS");
  return parsed;
}

async function fetchPublicWebsite(value: string) {
  let current = await validatePublicHttpUrl(value);

  for (let redirect = 0; redirect <= 3; redirect += 1) {
    const response = await fetch(current, {
      redirect: "manual",
      signal: AbortSignal.timeout(2800),
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; Prospect/0.5; +https://localhost)",
        Accept: "text/html,application/xhtml+xml",
      },
      cache: "no-store",
    });

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location || redirect === 3) return null;
      current = await validatePublicHttpUrl(new URL(location, current).toString());
      continue;
    }

    return response;
  }

  return null;
}

export async function inspectWebsite(url?: string): Promise<WebsiteSignals> {
  if (!url) return {};

  try {
    const response = await fetchPublicWebsite(url);
    if (!response?.ok) return {};

    const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
    if (contentType && !contentType.includes("text/html") && !contentType.includes("application/xhtml+xml")) return {};

    const html = (await response.text()).slice(0, 650_000);
    const instagramUrl = html.match(/https?:\/\/(?:www\.)?instagram\.com\/[A-Za-z0-9._-]+/i)?.[0];
    const whatsappUrl = html.match(/https?:\/\/(?:wa\.me\/\d{10,15}|(?:api\.)?whatsapp\.com\/[^"'\s<>]+)/i)?.[0];
    const mailto = html.match(/mailto:([^?"'\s<>]+)/i)?.[1];

    return {
      instagram: instagramUrl ? cleanInstagram(instagramUrl) : undefined,
      whatsapp: whatsappUrl ? cleanWhatsapp(whatsappUrl) : undefined,
      email: mailto,
    };
  } catch {
    return {};
  }
}

export async function mapWithConcurrency<T, R>(items: T[], concurrency: number, mapper: (item: T, index: number) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;

  async function worker() {
    while (true) {
      const index = cursor++;
      if (index >= items.length) return;
      results[index] = await mapper(items[index], index);
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, Math.max(1, items.length)) }, () => worker()));
  return results;
}
