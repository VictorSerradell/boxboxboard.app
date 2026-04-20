// /app/api/iracing/series-cars/route.ts
// Uses results/season_results to get sessions, then fetches subsession details

import { NextRequest, NextResponse } from "next/server";
import { getValidToken } from "../../../lib/iracing-token";

export const dynamic = "force-dynamic";

const BASE = "https://members-ng.iracing.com/data";
const TIMEOUT = 10000;

async function iracingGet(path: string, token: string) {
  const res = await fetch(`${BASE}/${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "User-Agent": "BoxBoxBoard/1.0",
    },
    signal: AbortSignal.timeout(TIMEOUT),
  });
  if (!res.ok) throw new Error(`iRacing ${res.status}: ${path}`);
  const raw = await res.json();
  if (raw?.link) {
    const s3 = await fetch(raw.link, { signal: AbortSignal.timeout(TIMEOUT) });
    if (!s3.ok) throw new Error(`S3 ${s3.status}`);
    return s3.json();
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
    // Get session list
    const sessionData = await iracingGet(
      `results/season_results?season_id=${seasonId}&race_week_num=${weekNum}`,
      token,
    );

    const sessions: any[] = Array.isArray(sessionData)
      ? sessionData
      : (sessionData?.results ?? sessionData?.sessions ?? []);

    console.log(
      "[series-cars] season_id:",
      seasonId,
      "week:",
      weekNum,
      "sessions:",
      sessions.length,
    );
    if (sessions.length > 0)
      console.log(
        "[series-cars] session[0] keys:",
        Object.keys(sessions[0]).join(","),
      );

    if (!sessions.length) {
      return NextResponse.json({
        cars: [],
        total_drivers: 0,
        subsessions_sampled: 0,
      });
    }

    // Take top 8 by SOF
    const topSessions = [...sessions]
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
        iracingGet(`results/get?subsession_id=${s.subsession_id}`, token),
      ),
    );

    for (const r of results) {
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

    return NextResponse.json({
      cars,
      total_drivers: totalDrivers,
      subsessions_sampled: topSessions.length,
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
