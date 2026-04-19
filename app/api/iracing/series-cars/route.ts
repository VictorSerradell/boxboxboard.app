// /app/api/iracing/series-cars/route.ts
// Uses stats/season_bests — returns best lap times for ALL drivers that week
// No cust_id filtering — works regardless of whether user has raced

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
  // Handle chunked response (search_series format)
  const chunkFiles: string[] = raw?.chunk_info?.chunk_file_names ?? [];
  const baseUrl = raw?.chunk_info?.base_download_url ?? "";
  if (chunkFiles.length > 0 && baseUrl) {
    const all: any[] = [];
    const fetches = await Promise.allSettled(
      chunkFiles.map((f) =>
        fetch(baseUrl + f).then((r) => (r.ok ? r.json() : [])),
      ),
    );
    for (const f of fetches) {
      if (f.status === "fulfilled") {
        const chunk = Array.isArray(f.value)
          ? f.value
          : (f.value?.results ?? []);
        all.push(...chunk);
      }
    }
    return all;
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
  const token = await getValidToken(request);
  if (!token)
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { searchParams } = request.nextUrl;
  const seasonId = searchParams.get("season_id");
  const weekNum = searchParams.get("race_week_num") ?? "0";

  if (!seasonId)
    return NextResponse.json({ error: "season_id required" }, { status: 400 });

  try {
    // stats/season_bests returns best lap per driver per car_class for a season week
    // No cust_id filter — all drivers who have set a time
    const params = new URLSearchParams({
      season_id: seasonId,
      race_week_num: weekNum,
    });

    const data = await iracingFetch(`stats/season_bests?${params}`, token);

    // Response is array of { cust_id, car_id, car_name, best_lap_time, ... }
    const bests: any[] = Array.isArray(data)
      ? data
      : (data?.season_bests ?? data?.results ?? data?.drivers ?? []);

    console.log(
      "[series-cars] season_id:",
      seasonId,
      "week:",
      weekNum,
      "entries:",
      bests.length,
    );

    if (!bests.length) {
      return NextResponse.json({
        cars: [],
        total_drivers: 0,
        subsessions_sampled: 0,
      });
    }

    // Group by car_id — collect best lap times
    const carMap: Record<number, { car_name: string; best_laps: number[] }> =
      {};

    for (const entry of bests) {
      const carId = entry.car_id;
      const carName =
        entry.car_name ?? entry.car_name_abbreviated ?? `Car ${carId}`;
      const lapTime = entry.best_lap_time ?? entry.lap_time;

      if (!carId || !lapTime || lapTime <= 0) continue;
      if (!carMap[carId]) carMap[carId] = { car_name: carName, best_laps: [] };
      carMap[carId].best_laps.push(lapTime);
    }

    // Sort by median of top 25% fastest laps per car
    const cars = Object.entries(carMap)
      .filter(([, d]) => d.best_laps.length >= 1)
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

    return NextResponse.json({
      cars,
      total_drivers: bests.length,
      subsessions_sampled: Array.from(
        new Set(bests.map((b: any) => b.subsession_id).filter(Boolean)),
      ).length,
    });
  } catch (e: any) {
    console.error("[series-cars]", e.message);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
