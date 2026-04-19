// /app/api/iracing/series-cars/route.ts
// Uses results/season_results to get subsession IDs, then fetches lap data

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
    return all.length > 0 ? all : (raw?.results ?? raw);
  }
  return raw?.results ?? raw;
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
    // Step 1: get session list for this season/week
    const sessions = await iracingFetch(
      `results/season_results?season_id=${seasonId}&race_week_num=${weekNum}&event_type=5`,
      token,
    );
    const sessionList: any[] = Array.isArray(sessions) ? sessions : [];
    console.log(
      "[series-cars] season_id:",
      seasonId,
      "week:",
      weekNum,
      "sessions:",
      sessionList.length,
    );

    if (!sessionList.length) {
      return NextResponse.json({
        cars: [],
        total_drivers: 0,
        subsessions_sampled: 0,
      });
    }

    // Step 2: take top 8 sessions by SOF and fetch full results
    const topSessions = [...sessionList]
      .sort(
        (a, b) =>
          (b.event_strength_of_field ?? 0) - (a.event_strength_of_field ?? 0),
      )
      .slice(0, 8);

    const carMap: Record<number, { car_name: string; best_laps: number[] }> =
      {};
    let totalDrivers = 0;

    const results = await Promise.allSettled(
      topSessions.map((s) =>
        iracingFetch(`results/get?subsession_id=${s.subsession_id}`, token),
      ),
    );

    for (const r of results) {
      if (r.status !== "fulfilled" || !r.value) continue;
      const data = r.value;
      const raceSessions = (data?.session_results ?? []).filter(
        (s: any) => s.simsession_type === 6 || s.simsession_name === "RACE",
      );

      for (const session of raceSessions) {
        for (const driver of session.results ?? []) {
          const carId = driver.car_id;
          const carName = driver.car_name ?? `Car ${carId}`;
          const lapTime = driver.best_lap_time;
          if (!carId || !lapTime || lapTime <= 0) continue;
          if (!carMap[carId])
            carMap[carId] = { car_name: carName, best_laps: [] };
          carMap[carId].best_laps.push(lapTime);
          totalDrivers++;
        }
      }
    }

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
      total_drivers: totalDrivers,
      subsessions_sampled: topSessions.length,
    });
  } catch (e: any) {
    console.error("[series-cars]", e.message);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
