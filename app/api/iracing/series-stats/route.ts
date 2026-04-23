// /app/api/iracing/series-stats/route.ts
// Uses results/search_series with series_id + season_year/quarter — same as simdeck

import { NextRequest, NextResponse } from "next/server";
import { getValidToken } from "../../../lib/iracing-token";
import { searchSeries } from "../../../lib/iracing-search";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const seriesId = searchParams.get("series_id");
  const seasonYear = searchParams.get("season_year");
  const seasonQ = searchParams.get("season_quarter");
  const weekNum = searchParams.get("race_week_num") ?? "0";

  if (!seriesId)
    return NextResponse.json({
      avg_sof: 0,
      avg_drivers: 0,
      splits: 0,
      total_races: 0,
      has_data: false,
    });

  const { token } = await getValidToken(request);
  if (!token)
    return NextResponse.json({
      avg_sof: 0,
      avg_drivers: 0,
      splits: 0,
      total_races: 0,
      has_data: false,
    });

  try {
    const params = new URLSearchParams({
      series_id: seriesId,
      season_year: seasonYear ?? String(new Date().getFullYear()),
      season_quarter: seasonQ ?? "1",
      race_week_num: weekNum,
      event_types: "5",
    });

    let results = await searchSeries(params, token);
    console.log("[series-stats] week:", weekNum, "results:", results.length);

    // Fallback to previous week if empty
    if (!results.length && Number(weekNum) > 0) {
      const prevParams = new URLSearchParams(params);
      prevParams.set("race_week_num", String(Number(weekNum) - 1));
      results = await searchSeries(prevParams, token);
      console.log(
        "[series-stats] fallback week:",
        Number(weekNum) - 1,
        "results:",
        results.length,
      );
    }

    if (!results.length) {
      return NextResponse.json({
        avg_sof: 0,
        avg_drivers: 0,
        splits: 0,
        total_races: 0,
        has_data: false,
      });
    }

    // Each result = one driver entry per subsession
    const subsessions = new Map<number, { sof: number; drivers: number }>();
    for (const r of results) {
      const sid = r.subsession_id;
      if (!subsessions.has(sid)) {
        subsessions.set(sid, {
          sof: r.event_strength_of_field ?? 0,
          drivers: r.num_drivers ?? 0,
        });
      }
    }

    const sessions = Array.from(subsessions.values());
    const totalRaces = sessions.length;
    const totalSof = sessions.reduce((s, r) => s + r.sof, 0);
    const totalDrivers = sessions.reduce((s, r) => s + r.drivers, 0);

    const byTime = new Map<string, number>();
    for (const r of results) {
      const t = r.start_time ?? "";
      if (!byTime.has(t)) byTime.set(t, 0);
      byTime.set(t, byTime.get(t)! + 1);
    }
    const avgSplits =
      byTime.size > 0 ? Math.round(totalRaces / byTime.size) : 1;

    return NextResponse.json({
      avg_sof: totalRaces > 0 ? Math.round(totalSof / totalRaces) : 0,
      avg_drivers: totalRaces > 0 ? Math.round(totalDrivers / totalRaces) : 0,
      splits: avgSplits,
      total_races: totalRaces,
      has_data: true,
    });
  } catch (e: any) {
    console.error("[series-stats] error:", e.message);
    return NextResponse.json({
      avg_sof: 0,
      avg_drivers: 0,
      splits: 0,
      total_races: 0,
      has_data: false,
    });
  }
}
