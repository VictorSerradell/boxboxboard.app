// /app/api/iracing/series-cars/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getValidToken } from "../../../lib/iracing-token";
import { searchSeries } from "../../../lib/iracing-search";

export const dynamic = "force-dynamic";

const BASE = "https://members-ng.iracing.com/data";

async function iracingGet(path: string, token: string) {
  const res = await fetch(`${BASE}/${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "User-Agent": "BoxBoxBoard/1.0",
    },
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Error(`iRacing ${res.status}: ${path}`);
  const raw = await res.json();
  if (raw?.link) {
    const s3 = await fetch(raw.link, { signal: AbortSignal.timeout(10000) });
    return s3.ok ? s3.json() : null;
  }
  return raw;
}

function formatLapTime(tenths: number): string {
  const totalSec = tenths / 10000;
  const mins = Math.floor(totalSec / 60);
  const secs = (totalSec % 60).toFixed(3).padStart(6, "0");
  return mins > 0 ? `${mins}:${secs}` : `${secs}s`;
}

export async function GET(request: NextRequest) {
  const { token } = await getValidToken(request);
  if (!token)
    return NextResponse.json({
      cars: [],
      total_drivers: 0,
      subsessions_sampled: 0,
    });

  const { searchParams } = request.nextUrl;
  const seriesId = searchParams.get("series_id");
  const seasonYear = searchParams.get("season_year");
  const seasonQ = searchParams.get("season_quarter");
  const weekNum = searchParams.get("race_week_num") ?? "0";

  if (!seriesId)
    return NextResponse.json({
      cars: [],
      total_drivers: 0,
      subsessions_sampled: 0,
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
    console.log("[series-cars] week:", weekNum, "results:", results.length);

    if (!results.length && Number(weekNum) > 0) {
      const prev = new URLSearchParams(params);
      prev.set("race_week_num", String(Number(weekNum) - 1));
      results = await searchSeries(prev, token);
      console.log("[series-cars] fallback results:", results.length);
    }

    if (!results.length) {
      return NextResponse.json({
        cars: [],
        total_drivers: 0,
        subsessions_sampled: 0,
      });
    }

    // Get unique subsession IDs sorted by SOF desc
    const subMap = new Map<number, number>();
    for (const r of results) {
      if (!subMap.has(r.subsession_id)) {
        subMap.set(r.subsession_id, r.event_strength_of_field ?? 0);
      }
    }
    const topIds = Array.from(subMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([id]) => id);

    const carMap: Record<number, { car_name: string; best_laps: number[] }> =
      {};
    let totalDrivers = 0;

    const fetched = await Promise.allSettled(
      topIds.map((id) => iracingGet(`results/get?subsession_id=${id}`, token)),
    );

    for (const r of fetched) {
      if (r.status !== "fulfilled" || !r.value) continue;
      const raceSessions = (r.value?.session_results ?? []).filter(
        (s: any) => s.simsession_type === 6 || s.simsession_name === "RACE",
      );
      for (const session of raceSessions) {
        for (const driver of session.results ?? []) {
          const carId = driver.car_id;
          const lapTime = driver.best_lap_time;
          if (!carId || !lapTime || lapTime <= 0) continue;
          if (!carMap[carId])
            carMap[carId] = {
              car_name: driver.car_name ?? `Car ${carId}`,
              best_laps: [],
            };
          carMap[carId].best_laps.push(lapTime);
          totalDrivers++;
        }
      }
    }

    const cars = Object.entries(carMap)
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

    const leaderMs = cars[0]?.avg_lap_ms ?? 0;
    cars.forEach((c, i) => {
      c.delta =
        i === 0 ? null : `+${((c.avg_lap_ms - leaderMs) / 10000).toFixed(3)}s`;
    });

    console.log("[series-cars] cars found:", cars.length);
    return NextResponse.json({
      cars,
      total_drivers: totalDrivers,
      subsessions_sampled: topIds.length,
    });
  } catch (e: any) {
    console.error("[series-cars] error:", e.message);
    return NextResponse.json({
      cars: [],
      total_drivers: 0,
      subsessions_sampled: 0,
    });
  }
}
