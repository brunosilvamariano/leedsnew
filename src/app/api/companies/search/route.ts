import { NextRequest, NextResponse } from "next/server";
import { searchGooglePlaces } from "@/lib/google-places";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const query = params.get("q")?.trim() ?? "";
  const state = params.get("state")?.trim() || undefined;
  const city = params.get("city")?.trim() || undefined;
  const neighborhood = params.get("neighborhood")?.trim() || undefined;
  const requestedLimit = Number(params.get("limit") || 60);
  const limit = Number.isFinite(requestedLimit) ? Math.min(60, Math.max(1, requestedLimit)) : 60;

  if (!query) {
    return NextResponse.json({
      ok: false,
      code: "QUERY_REQUIRED",
      message: "Digite um nicho, atividade ou empresa para pesquisar.",
    }, { status: 400 });
  }

  if (!process.env.GOOGLE_PLACES_API_KEY) {
    return NextResponse.json({
      ok: false,
      code: "GOOGLE_PLACES_API_KEY_NOT_CONFIGURED",
      message: "A busca real exige GOOGLE_PLACES_API_KEY no arquivo .env.",
    }, { status: 503 });
  }

  try {
    const startedAt = Date.now();
    const { companies, pagesFetched } = await searchGooglePlaces({ query, state, city, neighborhood, limit });
    const durationMs = Date.now() - startedAt;

    return NextResponse.json({
      ok: true,
      mode: "live",
      companies,
      meta: {
        resultCount: companies.length,
        pagesFetched,
        maxPerQuery: 60,
        durationMs,
        source: "Google Places (New)",
      },
      message: `${companies.length} empresas reais retornadas em ${pagesFetched} página${pagesFetched === 1 ? "" : "s"}.`,
    });
  } catch (error) {
    console.error("Places search failed", error);

    const rawMessage = error instanceof Error ? error.message : "";
    let code = "PROVIDER_ERROR";
    let message = "Não foi possível concluir a consulta ao vivo agora.";

    if (rawMessage.includes("GOOGLE_PLACES_403")) {
      code = "GOOGLE_PLACES_FORBIDDEN";
      message = "O Google recusou a consulta. Verifique Places API (New), faturamento e restrições da chave.";
    } else if (rawMessage.includes("GOOGLE_PLACES_400")) {
      code = "GOOGLE_PLACES_BAD_REQUEST";
      message = "O Google rejeitou algum parâmetro da consulta. Tente uma busca mais simples.";
    } else if (rawMessage.includes("GOOGLE_PLACES_429")) {
      code = "GOOGLE_PLACES_RATE_LIMIT";
      message = "O limite temporário da Places API foi atingido. Aguarde alguns instantes e tente novamente.";
    }

    return NextResponse.json({ ok: false, code, message }, { status: 502 });
  }
}
