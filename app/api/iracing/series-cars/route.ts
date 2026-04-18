// /app/api/iracing/series-cars/route.ts
// Ranks cars by best lap time using search_series endpoint
// Each result row = one driver entry with car_id, car_name, event_best_lap_time

import { NextRequest, NextResponse } from "next/server";
import { getValidToken } from "../../../lib/iracing-token";

export const dynamic = "force-dynamic";

const BASE = "https://members-ng.iracing.com/data";

async function iracingFetch(path: string, token: string) {
  const res = await fetch(`${BASE}/${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "User-Agent": "BoxBoxBoard/1.0",
    },
  });
  if (!res.ok) throw new Error(`iRacing ${res.status}: ${path}`);
  const raw = await res.json();
  if (raw?.link) {
    const s3 = await fetch(raw.link);
    return s3.ok ? s3.json() : null;
  }
  return raw;
}

function formatLapTime(tenths: number): string {
  // iRacing lap times are in ten-thousandths of a second
  const totalSec = tenths / 10000;
  const mins = Math.floor(totalSec / 60);
  const secs = (totalSec % 60).toFixed(3).padStart(6, "0");
  return mins > 0 ? `${mins}:${secs}` : `${secs}s`;
}

export async function GET(request: NextRequest) {
  const token = await getValidToken(request);
  if (!token)
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { searchParams } = request.nextUrl;
  const seriesId = searchParams.get("series_id");
  const seasonYear = searchParams.get("season_year");
  const seasonQ = searchParams.get("season_quarter");
  const weekNum = searchParams.get("race_week_num") ?? "0";

  if (!seriesId)
    return NextResponse.json({ error: "series_id required" }, { status: 400 });

  try {
    // search_series returns one row per driver entry with car info + best lap
    const params = new URLSearchParams({
      series_id: seriesId,
      season_year: seasonYear ?? String(new Date().getFullYear()),
      season_quarter: seasonQ ?? "1",
      race_week_num: weekNum,
      event_types: "5", // Race only
    });

    const data = await iracingFetch(`results/search_series?${params}`, token);
    const results: any[] = data?.results ?? data?.data?.results ?? [];

    console.log(
      "[series-cars] series_id:",
      seriesId,
      "week:",
      weekNum,
      "rows:",
      results.length,
    );

    if (!results.length) {
      return NextResponse.json({
        cars: [],
        total_drivers: 0,
        subsessions_sampled: 0,
      });
    }

    // Group by car_id — collect best lap times per car across all splits
    const carMap: Record<number, { car_name: string; best_laps: number[] }> =
      {};

    for (const row of results) {
      const carId = row.car_id;
      const carName =
        row.car_name ?? row.car_name_abbreviated ?? `Car ${carId}`;
      const lapTime = row.event_best_lap_time; // ten-thousandths of a second

      if (!carId || !lapTime || lapTime <= 0) continue;

      if (!carMap[carId]) carMap[carId] = { car_name: carName, best_laps: [] };
      carMap[carId].best_laps.push(lapTime);
    }

    // For each car: take the median of the fastest 25% of laps (removes outliers)
    const cars = Object.entries(carMap)
      .filter(([, d]) => d.best_laps.length >= 2)
      .map(([carId, d]) => {
        const sorted = [...d.best_laps].sort((a, b) => a - b);
        const topN = Math.max(1, Math.ceil(sorted.length * 0.25));
        const avg = sorted.slice(0, topN).reduce((s, v) => s + v, 0) / topN;
        return {
          car_id: Number(carId),
          car_name: d.car_name,
          avg_lap_ms: avg,
          lap_time: formatLapTime(avg),
          sample_size: d.best_laps.length,
          delta: null as string | null,
        };
      })
      .sort((a, b) => a.avg_lap_ms - b.avg_lap_ms);

    // Add delta to leader
    const leaderMs = cars[0]?.avg_lap_ms ?? 0;
    cars.forEach((c, i) => {
      c.delta =
        i === 0 ? null : `+${((c.avg_lap_ms - leaderMs) / 10000).toFixed(3)}s`;
    });

    // Count unique subsessions
    const subsessions = new Set(results.map((r) => r.subsession_id)).size;

    return NextResponse.json({
      cars,
      total_drivers: results.length,
      subsessions_sampled: subsessions,
    });
  } catch (e: any) {
    console.error("[series-cars]", e.message);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
