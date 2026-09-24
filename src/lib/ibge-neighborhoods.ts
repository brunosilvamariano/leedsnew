import { unzipSync } from "fflate";

const IBGE_BAIRROS_BASE = "https://geoftp.ibge.gov.br/organizacao_do_territorio/malhas_territoriais/malhas_de_setores_censitarios__divisoes_intramunicipais/censo_2022/bairros/shp/UF";

type StateNeighborhoodIndex = Record<string, string[]>;

type DbfField = {
  name: string;
  length: number;
};

const memoryCache = new Map<string, StateNeighborhoodIndex>();

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function readAscii(bytes: Uint8Array) {
  let value = "";
  for (const byte of bytes) {
    if (byte === 0) break;
    value += String.fromCharCode(byte);
  }
  return value.trim();
}

function decodeDbfText(bytes: Uint8Array) {
  const decoders = ["windows-1252", "utf-8", "latin1"];
  for (const encoding of decoders) {
    try {
      const decoded = new TextDecoder(encoding).decode(bytes).replace(/\u0000/g, "").trim();
      if (decoded && !decoded.includes("�")) return decoded;
    } catch {
      // Try the next decoder.
    }
  }
  return readAscii(bytes);
}

function parseDbf(buffer: Uint8Array): Array<Record<string, string>> {
  if (buffer.byteLength < 64) throw new Error("DBF_INVALIDO");

  const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  const recordCount = view.getUint32(4, true);
  const headerLength = view.getUint16(8, true);
  const recordLength = view.getUint16(10, true);
  const fields: DbfField[] = [];

  let offset = 32;
  while (offset + 32 <= headerLength && buffer[offset] !== 0x0d) {
    const descriptor = buffer.subarray(offset, offset + 32);
    const name = readAscii(descriptor.subarray(0, 11));
    const length = descriptor[16] ?? 0;
    if (name && length > 0) fields.push({ name, length });
    offset += 32;
  }

  const rows: Array<Record<string, string>> = [];
  for (let index = 0; index < recordCount; index += 1) {
    const start = headerLength + index * recordLength;
    if (start + recordLength > buffer.byteLength) break;
    if (buffer[start] === 0x2a) continue; // deleted record

    const row: Record<string, string> = {};
    let cursor = start + 1;
    for (const field of fields) {
      row[field.name] = decodeDbfText(buffer.subarray(cursor, cursor + field.length));
      cursor += field.length;
    }
    rows.push(row);
  }

  return rows;
}

async function loadStateIndex(state: string): Promise<StateNeighborhoodIndex> {
  const uf = state.toUpperCase();
  const cached = memoryCache.get(uf);
  if (cached) return cached;

  const url = `${IBGE_BAIRROS_BASE}/${uf}_bairros_CD2022.zip`;
  const response = await fetch(url, {
    next: { revalidate: 60 * 60 * 24 * 30 },
    headers: { "User-Agent": "Prospect/0.4.2" },
  });

  if (!response.ok) throw new Error(`IBGE_BAIRROS_${response.status}`);

  const archive = new Uint8Array(await response.arrayBuffer());
  const files = unzipSync(archive);
  const dbf = Object.entries(files).find(([name]) => name.toLowerCase().endsWith(".dbf"));
  if (!dbf) throw new Error("IBGE_DBF_NAO_ENCONTRADO");

  const rows = parseDbf(dbf[1]);
  const cityField = rows.length ? Object.keys(rows[0]).find((key) => normalize(key) === "nm_mun" || normalize(key) === "nmmun") : undefined;
  const neighborhoodField = rows.length ? Object.keys(rows[0]).find((key) => normalize(key) === "nm_bairro" || normalize(key) === "nmbairro") : undefined;
  if (!cityField || !neighborhoodField) throw new Error("IBGE_COLUNAS_NAO_ENCONTRADAS");

  const sets = new Map<string, Set<string>>();
  const cityNames = new Map<string, string>();

  for (const row of rows) {
    const city = row[cityField]?.trim();
    const neighborhood = row[neighborhoodField]?.trim();
    if (!city || !neighborhood) continue;

    const cityKey = normalize(city);
    if (!sets.has(cityKey)) sets.set(cityKey, new Set());
    sets.get(cityKey)?.add(neighborhood);
    cityNames.set(cityKey, city);
  }

  const index: StateNeighborhoodIndex = {};
  for (const [cityKey, names] of sets.entries()) {
    const cityName = cityNames.get(cityKey) ?? cityKey;
    index[cityName] = [...names].sort((a, b) => a.localeCompare(b, "pt-BR"));
  }

  memoryCache.set(uf, index);
  return index;
}

export async function getIbgeNeighborhoods(state: string, city: string) {
  const index = await loadStateIndex(state);
  const direct = index[city];
  if (direct) return direct;

  const target = normalize(city);
  return Object.entries(index).find(([name]) => normalize(name) === target)?.[1] ?? [];
}
