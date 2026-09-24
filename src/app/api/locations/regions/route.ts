import { NextRequest, NextResponse } from "next/server";
import { getWorldRegions } from "@/lib/world-geography";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const country = request.nextUrl.searchParams.get("country")?.toUpperCase().trim() ?? "";
  if (!country) return NextResponse.json({ ok: true, regions: [] });

  try {
    const regions = await getWorldRegions(country);
    return NextResponse.json({ ok: true, regions, source: "World Countries Cities DB (ODbL)" });
  } catch (error) {
    console.error("World region lookup failed", error);
    return NextResponse.json({ ok: false, regions: [], message: "Não foi possível carregar as regiões deste país agora." }, { status: 502 });
  }
}
