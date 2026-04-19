// /app/api/iracing/series-stats/route.ts
// Fetches real race statistics for a series/week from iRacing API
// Uses results/search_series which returns aggregated data per subsession

import { NextRequest, NextResponse } from "next/server";
import { getValidToken } from "../../../lib/iracing-token";
import { searchSeries } from "../../../lib/iracing-search";

const IRACING_BASE = "https://members-ng.iracing.com";

async function iracingFetch(path: string, token: string) {
  const res = await fetch(`${IRACING_BASE}/data/${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "User-Agent": "BoxBoxBoard/1.0",
    },
  });
  if (!res.ok) throw new Error(`iRacing API error: ${res.status}`);
  const raw = await res.json();
  if (raw?.link) {
    const s3 = await fetch(raw.link);
    return s3.json();
  }
  return raw;
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const seasonId = searchParams.get("season_id");
  const seriesId = searchParams.get("series_id");
  const weekNum = searchParams.get("race_week_num") ?? "0";
  const seasonYear = searchParams.get("season_year");
  const seasonQ = searchParams.get("season_quarter");

  if (!seasonId && !seriesId) {
    return NextResponse.json(
      { error: "season_id or series_id required" },
      { status: 400 },
    );
  }

  const token = await getValidToken(request);
  if (!token)
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    // Build query params — note: search_series filters by cust_id automatically
    // so results only reflect races the authenticated user participated in
    const params = new URLSearchParams({
      race_week_num: weekNum,
      event_types: "5", // Race only
      season_year: seasonYear ?? String(new Date().getFullYear()),
      season_quarter: seasonQ ?? "1",
    });

    if (seasonId) params.set("season_id", seasonId);
    if (seriesId) params.set("series_id", seriesId);

    const results: any[] = await searchSeries(params, token);

    if (!results.length) {
      return NextResponse.json({
        avg_sof: 0,
        avg_drivers: 0,
        splits: 0,
        total_races: 0,
        has_data: false,
      });
    }

    // Aggregate stats
    const totalRaces = results.length;
    const totalSof = results.reduce(
      (sum: number, r: any) => sum + (r.event_strength_of_field ?? 0),
      0,
    );
    const totalDrivers = results.reduce(
      (sum: number, r: any) => sum + (r.num_drivers ?? 0),
      0,
    );

    // Count unique splits (sessions at same time = 1 race event, multiple splits)
    // Group by start_time to count splits per race event
    const byTime = new Map<string, number>();
    for (const r of results) {
      const t = r.start_time ?? "";
      byTime.set(t, (byTime.get(t) ?? 0) + 1);
    }
    const avgSplits =
      byTime.size > 0 ? Math.round(totalRaces / byTime.size) : 1;

    return NextResponse.json({
      avg_sof: Math.round(totalSof / totalRaces),
      avg_drivers: Math.round(totalDrivers / totalRaces),
      splits: avgSplits,
      total_races: totalRaces,
      has_data: true,
    });
  } catch (e: any) {
    console.error("[series-stats]", e.message);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
