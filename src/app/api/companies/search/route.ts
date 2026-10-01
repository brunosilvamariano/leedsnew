import { currentUser } from "@/lib/access";
import { canWrite } from "@/lib/billing";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { searchGooglePlaces } from "@/lib/google-places";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ok:false,message:"Entre para pesquisar."},{status:401});
  if (!await canWrite(user)) return NextResponse.json({ok:false,message:"Ative sua assinatura em Meu plano para pesquisar."},{status:402});
  const params = request.nextUrl.searchParams;
  const query = params.get("q")?.trim() ?? "";
  const countryCode = params.get("country")?.trim().toUpperCase() || "BR";
  const countryName = params.get("countryName")?.trim() || "Brasil";
  const region = (params.get("region") || params.get("state"))?.trim() || undefined;
  const city = params.get("city")?.trim() || undefined;
  const requestedLimit = Number(params.get("limit") || 60);
  const limit = Number.isFinite(requestedLimit) ? Math.min(60, Math.max(1, requestedLimit)) : 60;

  if (!query) return NextResponse.json({ ok: false, code: "QUERY_REQUIRED", message: "Digite um nicho, atividade ou empresa para pesquisar." }, { status: 400 });
  if (!process.env.GOOGLE_PLACES_API_KEY) return NextResponse.json({ ok: false, code: "GOOGLE_PLACES_API_KEY_NOT_CONFIGURED", message: "A busca real exige GOOGLE_PLACES_API_KEY no arquivo .env." }, { status: 503 });

  try {
    const key = 'places:'+user.id+':'+new Date().toISOString().slice(0,10);
    const cap = Number(process.env.SEARCH_DAILY_LIMIT || 20);
    await prisma.rateLimit.upsert({where:{key},create:{key,count:0,lastRequest:BigInt(Date.now())},update:{}});
    const quota=await prisma.rateLimit.updateMany({where:{key,count:{lt:cap}},data:{count:{increment:1},lastRequest:BigInt(Date.now())}});
    if(!quota.count)return NextResponse.json({ok:false,message:"Você atingiu a cota diária de buscas. Tente amanhã."},{status:429});
    const startedAt = Date.now();
    const { companies, pagesFetched } = await searchGooglePlaces({ query, countryCode, countryName, region, city, limit });
    const durationMs = Date.now() - startedAt;
    return NextResponse.json({
      ok: true,
      mode: "live",
      companies,
      meta: { resultCount: companies.length, pagesFetched, maxPerQuery: 60, durationMs, source: "Google Places (New)" },
      message: companies.length === 60
        ? `Primeiros 60 resultados reais consultados em ${pagesFetched} páginas.`
        : `${companies.length} empresas reais retornadas em ${pagesFetched} página${pagesFetched === 1 ? "" : "s"}.`,
    });
  } catch (error) {
    console.error("Places search failed", error);
    const rawMessage = error instanceof Error ? error.message : "";
    let code = "PROVIDER_ERROR";
    let message = "Não foi possível concluir a consulta ao vivo agora.";
    if (rawMessage.includes("GOOGLE_PLACES_403")) { code = "GOOGLE_PLACES_FORBIDDEN"; message = "O Google recusou a consulta. Verifique Places API (New), faturamento e restrições da chave."; }
    else if (rawMessage.includes("GOOGLE_PLACES_400")) { code = "GOOGLE_PLACES_BAD_REQUEST"; message = "O Google rejeitou algum parâmetro da consulta. Tente uma busca mais simples."; }
    else if (rawMessage.includes("GOOGLE_PLACES_429")) { code = "GOOGLE_PLACES_RATE_LIMIT"; message = "O limite temporário da Places API foi atingido. Aguarde alguns instantes e tente novamente."; }
    return NextResponse.json({ ok: false, code, message }, { status: 502 });
  }
}
