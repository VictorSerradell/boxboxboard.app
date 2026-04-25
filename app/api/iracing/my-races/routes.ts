import { NextRequest, NextResponse } from "next/server";
import { getValidToken } from "../../../lib/iracing-token";
import { searchSeries } from "../../../lib/iracing-search";

export const dynamic = "force-dynamic";

// ←←← ESTO ES LO MÁS IMPORTANTE PARA HOBBY
export const maxDuration = 180; // 3 minutos (máximo seguro en Hobby)
// Puedes subir a 300 si ves que Fluid Compute lo permite

export async function GET(request: NextRequest) {
  try {
    const { token } = await getValidToken(request);
    if (!token) {
      console.warn("[my-races] token inválido o expirado");
      return NextResponse.json([], { status: 401 });
    }

    const { searchParams } = request.nextUrl;
    const seasonYear =
      searchParams.get("season_year") ?? String(new Date().getFullYear());
    const seasonQ = searchParams.get("season_quarter") ?? "2";

    const params = new URLSearchParams({
      season_year: seasonYear,
      season_quarter: seasonQ,
      event_types: "5",
    });

    const results = await searchSeries(params, token);

    console.log(
      `[my-races] ✅ fetched ${results.length} races for S${seasonQ} ${seasonYear}`,
    );

    return NextResponse.json(results, {
      headers: {
        "Cache-Control": "private, max-age=180, stale-while-revalidate=60", // un poco de caché en cliente
      },
    });
  } catch (e: any) {
    console.error("[my-races] ❌ error:", e.message);
    if (e.stack) console.error(e.stack); // más detalle en logs

    // Devuelve array vacío para no romper el frontend
    return NextResponse.json([], { status: 500 });
  }
}
