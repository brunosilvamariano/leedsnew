import { unzipSync } from "fflate";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const SOURCE = "https://ftp.ibge.gov.br/Censos/Censo_Demografico_2022/Agregados_por_Setores_Censitarios/Agregados_por_Bairro_csv/Agregados_por_bairros_basico_BR_20260520.zip";
const OUTPUT = resolve(process.cwd(), "src/data/generated/neighborhoods.json");

const stateCodeByName = {
  Acre:"AC", Alagoas:"AL", Amapá:"AP", Amazonas:"AM", Bahia:"BA", Ceará:"CE", "Distrito Federal":"DF", "Espírito Santo":"ES", Goiás:"GO", Maranhão:"MA",
  "Mato Grosso":"MT", "Mato Grosso do Sul":"MS", "Minas Gerais":"MG", Pará:"PA", Paraíba:"PB", Paraná:"PR", Pernambuco:"PE", Piauí:"PI", "Rio de Janeiro":"RJ",
  "Rio Grande do Norte":"RN", "Rio Grande do Sul":"RS", Rondônia:"RO", Roraima:"RR", "Santa Catarina":"SC", "São Paulo":"SP", Sergipe:"SE", Tocantins:"TO"
};

function normalizeHeader(value) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^A-Za-z0-9]/g, "").toUpperCase();
}

function parseLine(line, separator) {
  const values = [];
  let current = "";
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      if (quoted && line[i + 1] === '"') { current += '"'; i += 1; }
      else quoted = !quoted;
      continue;
    }
    if (char === separator && !quoted) { values.push(current.trim()); current = ""; continue; }
    current += char;
  }
  values.push(current.trim());
  return values;
}

function findIndex(headers, candidates) {
  const normalized = headers.map(normalizeHeader);
  for (const candidate of candidates) {
    const index = normalized.indexOf(normalizeHeader(candidate));
    if (index >= 0) return index;
  }
  return -1;
}

function decode(bytes) {
  const utf8 = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
  const replacementCount = (utf8.match(/�/g) ?? []).length;
  if (replacementCount < 5) return utf8.replace(/^\uFEFF/, "");
  return new TextDecoder("windows-1252").decode(bytes).replace(/^\uFEFF/, "");
}

async function main() {
  try {
    console.log("[Prospect] Sincronizando bairros oficiais do IBGE...");
    const response = await fetch(SOURCE, { signal: AbortSignal.timeout(60000) });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const archive = new Uint8Array(await response.arrayBuffer());
    const files = unzipSync(archive);
    const csvEntry = Object.entries(files).find(([name]) => name.toLowerCase().endsWith(".csv"));
    if (!csvEntry) throw new Error("CSV não encontrado dentro do ZIP do IBGE");

    const text = decode(csvEntry[1]);
    const lines = text.split(/\r?\n/).filter(Boolean);
    if (lines.length < 2) throw new Error("CSV vazio");
    const separator = (lines[0].match(/;/g)?.length ?? 0) >= (lines[0].match(/,/g)?.length ?? 0) ? ";" : ",";
    const headers = parseLine(lines[0], separator);

    const stateCodeIndex = findIndex(headers, ["SIGLA_UF", "UF", "CD_UF"]);
    const stateNameIndex = findIndex(headers, ["NM_UF", "NOME_UF"]);
    const cityIndex = findIndex(headers, ["NM_MUN", "NM_MUNICIPIO", "NOME_MUNICIPIO"]);
    const neighborhoodIndex = findIndex(headers, ["NM_BAIRRO", "NOME_BAIRRO"]);

    if (cityIndex < 0 || neighborhoodIndex < 0) {
      throw new Error(`Colunas esperadas não encontradas. Cabeçalhos: ${headers.slice(0, 20).join(", ")}`);
    }

    const result = {};
    for (let i = 1; i < lines.length; i += 1) {
      const row = parseLine(lines[i], separator);
      const city = row[cityIndex]?.trim();
      const neighborhood = row[neighborhoodIndex]?.trim();
      if (!city || !neighborhood) continue;

      let state = stateCodeIndex >= 0 ? row[stateCodeIndex]?.trim().toUpperCase() : "";
      if (state && /^\d+$/.test(state)) state = "";
      if (!state && stateNameIndex >= 0) state = stateCodeByName[row[stateNameIndex]?.trim()] ?? "";
      if (!state || state.length !== 2) continue;

      result[state] ??= {};
      result[state][city] ??= [];
      if (!result[state][city].includes(neighborhood)) result[state][city].push(neighborhood);
    }

    for (const cities of Object.values(result)) {
      for (const [city, items] of Object.entries(cities)) cities[city] = items.sort((a, b) => a.localeCompare(b, "pt-BR"));
    }

    await mkdir(dirname(OUTPUT), { recursive: true });
    await writeFile(OUTPUT, JSON.stringify(result), "utf8");
    const stateCount = Object.keys(result).length;
    const cityCount = Object.values(result).reduce((sum, cities) => sum + Object.keys(cities).length, 0);
    const neighborhoodCount = Object.values(result).reduce((sum, cities) => sum + Object.values(cities).reduce((acc, items) => acc + items.length, 0), 0);
    console.log(`[Prospect] IBGE sincronizado: ${stateCount} UFs, ${cityCount} municípios com bairros, ${neighborhoodCount} bairros oficiais.`);
  } catch (error) {
    console.warn("[Prospect] Não foi possível sincronizar bairros do IBGE agora. O app continuará funcionando e você pode rodar npm run locations:sync depois.");
    console.warn(error instanceof Error ? error.message : error);
  }
}

await main();
