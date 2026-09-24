import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const state = request.nextUrl.searchParams.get("state")?.toUpperCase().trim();
  if (!state || state.length !== 2) return NextResponse.json({ ok: true, cities: [] });

  try {
    const response = await fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${encodeURIComponent(state)}/municipios?orderBy=nome`, {
      next: { revalidate: 86400 },
    });
    if (!response.ok) throw new Error(`IBGE_${response.status}`);
    const payload = await response.json() as Array<{ id: number; nome: string }>;
    return NextResponse.json({ ok: true, cities: payload.map((item) => ({ id: item.id, name: item.nome })) });
  } catch (error) {
    console.error("IBGE city lookup failed", error);
    return NextResponse.json({ ok: false, cities: [], message: "Não foi possível carregar as cidades do IBGE agora." }, { status: 502 });
  }
}
