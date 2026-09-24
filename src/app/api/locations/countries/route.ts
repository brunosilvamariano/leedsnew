import { NextResponse } from "next/server";
import { getWorldCountries } from "@/lib/world-geography";

export const runtime = "nodejs";

export async function GET() {
  try {
    const countries = await getWorldCountries();
    return NextResponse.json({ ok: true, countries, source: "World Countries Cities DB (ODbL)" });
  } catch (error) {
    console.error("World country lookup failed", error);
    return NextResponse.json({ ok: false, countries: [], message: "Não foi possível carregar a lista mundial de países agora." }, { status: 502 });
  }
}
