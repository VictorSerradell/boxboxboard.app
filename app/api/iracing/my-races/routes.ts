import { NextRequest, NextResponse } from "next/server";
import { getValidToken } from "../../../lib/iracing-token";
import { searchSeries } from "../../../lib/iracing-search";

export const dynamic = "force-dynamic";
export const maxDuration = 180; // ya lo teníamos

export async function GET(request: NextRequest) {
  try {
    // ←←← AQUÍ ESTÁ EL FIX
    const { token, setCookieHeader } = await getValidToken(request);

    if (!token) {
      console.warn("[my-races] token inválido o refresh fallido");
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

    const response = NextResponse.json(results, {
      headers: {
        "Cache-Control": "private, max-age=180, stale-while-revalidate=60",
      },
    });

    // ←←← APLICAMOS LA COOKIE SI SE REFRESCÓ
    if (setCookieHeader) {
      response.headers.set("Set-Cookie", setCookieHeader);
      console.log("[my-races] cookie actualizada (refresh exitoso)");
    }

    return response;
  } catch (e: any) {
    console.error("[my-races] ❌ error:", e.message);
    if (e.stack) console.error(e.stack);
    return NextResponse.json([], { status: 500 });
  }
}
