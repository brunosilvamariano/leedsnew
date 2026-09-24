import { NextRequest, NextResponse } from "next/server";
import generatedNeighborhoods from "@/data/generated/neighborhoods.json";
import { getIbgeNeighborhoods } from "@/lib/ibge-neighborhoods";
import { getPostalNeighborhoods } from "@/lib/postal-neighborhoods";

type NeighborhoodIndex = Record<string, Record<string, string[]>>;

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

function fromGenerated(state: string, city: string) {
  const byState = (generatedNeighborhoods as NeighborhoodIndex)[state] ?? {};
  return byState[city] ?? Object.entries(byState).find(([name]) => normalize(name) === normalize(city))?.[1] ?? [];
}

function clean(items: string[]) {
  const unique = new Map<string, string>();
  for (const item of items) {
    const value = item?.replace(/\s+/g, " ").trim();
    if (!value) continue;
    const key = normalize(value);
    if (!unique.has(key)) unique.set(key, value);
  }
  return [...unique.values()].sort((a, b) => a.localeCompare(b, "pt-BR"));
}

export async function GET(request: NextRequest) {
  const state = request.nextUrl.searchParams.get("state")?.toUpperCase().trim() ?? "";
  const city = request.nextUrl.searchParams.get("city")?.trim() ?? "";

  if (!state || !city) {
    return NextResponse.json({ ok: true, neighborhoods: [], sources: [] });
  }

  // Fast path: npm install synchronizes the national IBGE index into the project.
  const bundled = clean(fromGenerated(state, city));
  if (bundled.length) {
    return NextResponse.json({
      ok: true,
      neighborhoods: bundled,
      sources: ["IBGE Censo 2022"],
      note: `${bundled.length} bairros encontrados para ${city}.`,
    });
  }

  // Fallback 1: read the official IBGE neighborhood mesh for this UF on demand.
  try {
    const ibge = clean(await getIbgeNeighborhoods(state, city));
    if (ibge.length) {
      return NextResponse.json({
        ok: true,
        neighborhoods: ibge,
        sources: ["IBGE Censo 2022"],
        note: `${ibge.length} bairros encontrados para ${city}.`,
      });
    }
  } catch (error) {
    console.warn("IBGE neighborhood lookup failed; trying postal fallback", error);
  }

  // Fallback 2: postal neighborhoods. This fills many municipalities that do not
  // have a formal bairro layer in the IBGE census mesh.
  try {
    const postal = clean(await getPostalNeighborhoods(state, city));
    if (postal.length) {
      return NextResponse.json({
        ok: true,
        neighborhoods: postal,
        sources: ["base postal OpenCEP"],
        note: `${postal.length} bairros postais encontrados para ${city}.`,
      });
    }
  } catch (error) {
    console.warn("Postal neighborhood lookup failed", error);
  }

  return NextResponse.json({
    ok: true,
    neighborhoods: [],
    sources: [],
    note: "Não encontramos bairros cadastrados para esta cidade nas bases consultadas. Pesquise a cidade inteira ou digite o bairro na busca.",
  });
}
