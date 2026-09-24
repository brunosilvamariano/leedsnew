import { NextRequest, NextResponse } from "next/server";
import { getWorldCities } from "@/lib/world-geography";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const country = request.nextUrl.searchParams.get("country")?.toUpperCase().trim();
  const region = request.nextUrl.searchParams.get("region")?.trim() || request.nextUrl.searchParams.get("state")?.trim() || undefined;

  if (!country) {
    return NextResponse.json({ ok: true, cities: [] });
  }

  try {
    const cities = await getWorldCities(country, region);
    return NextResponse.json({ ok: true, cities, source: "World Countries Cities DB (ODbL)" });
  } catch (error) {
    console.error("World city lookup failed", error);
    return NextResponse.json({ ok: false, cities: [], message: "Não foi possível carregar as cidades desta região agora." }, { status: 502 });
  }
}
