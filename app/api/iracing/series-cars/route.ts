// /app/api/iracing/series-cars/route.ts
// Ranks cars by average best lap time across top-SOF races this week
// All races in a week are on the same track so lap times are directly comparable

import { NextRequest, NextResponse } from "next/server";
import { getValidToken } from "../../../lib/iracing-token";

const BASE = "https://members-ng.iracing.com/data";

async function iracingFetch(path: string, token: string) {
  const res = await fetch(`${BASE}/${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "User-Agent": "BoxBoxBoard/1.0",
    },
    next: { revalidate: 1800 },
  });
  if (!res.ok) throw new Error(`iRacing ${res.status}: ${path}`);
  const raw = await res.json();
  if (raw?.link)
    return fetch(raw.link, { next: { revalidate: 1800 } }).then((r) =>
      r.json(),
    );
  return raw;
}

function formatLapTime(ms: number): string {
  // iRacing stores lap times in ten-thousandths of a second
  const totalSeconds = ms / 10000;
  const mins = Math.floor(totalSeconds / 60);
  const secs = (totalSeconds % 60).toFixed(3).padStart(6, "0");
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
    // Step 1 — get subsessions for this series/week
    // Note: official_only is NOT a valid iRacing API param (causes 400)
    const params = new URLSearchParams({
      season_year: seasonYear ?? String(new Date().getFullYear()),
      season_quarter: seasonQ ?? "1",
      series_id: seriesId,
      race_week_num: weekNum,
      event_types: "5", // Race only
      finish_range_begin: "1",
      finish_range_end: "100",
    });

    const searchData = await iracingFetch(
      `results/search_series?${params}`,
      token,
    );
    console.log(
      "[series-cars] raw response keys:",
      Object.keys(searchData ?? {}).join(","),
    );
    const allSubs: any[] =
      searchData?.results ?? searchData?.data ?? searchData ?? [];
    console.log(
      "[series-cars] series_id:",
      seriesId,
      "week:",
      weekNum,
      "subsessions:",
      allSubs.length,
    );

    if (!allSubs.length) {
      return NextResponse.json({
        cars: [],
        total_drivers: 0,
        subsessions_sampled: 0,
      });
    }

    // Step 2 — take top 20 splits by SOF
    const topSubs = [...allSubs]
      .sort(
        (a, b) =>
          (b.event_strength_of_field ?? 0) - (a.event_strength_of_field ?? 0),
      )
      .slice(0, 20);

    // Step 3 — collect best lap times per car across all sessions
    // car_id → { car_name, lap_times: number[] }
    const carData: Record<number, { car_name: string; lap_times: number[] }> =
      {};

    const BATCH = 5;
    for (let i = 0; i < topSubs.length; i += BATCH) {
      const batch = topSubs.slice(i, i + BATCH);
      const results = await Promise.allSettled(
        batch.map((sub) =>
          iracingFetch(`results/get?subsession_id=${sub.subsession_id}`, token),
        ),
      );

      for (const result of results) {
        if (result.status !== "fulfilled") continue;
        const data = result.value;

        const raceSessions = (data?.session_results ?? []).filter(
          (s: any) => s.simsession_type === 6 || s.simsession_name === "RACE",
        );

        for (const session of raceSessions) {
          for (const driver of session.results ?? []) {
            const carId = driver.car_id;
            const carName = driver.car_name ?? `Car ${carId}`;
            const lapTime = driver.best_lap_time; // ten-thousandths of a second, -1 if no lap

            if (!carId || !lapTime || lapTime <= 0) continue;

            if (!carData[carId])
              carData[carId] = { car_name: carName, lap_times: [] };
            carData[carId].lap_times.push(lapTime);
          }
        }
      }
    }

    // Step 4 — compute average best lap per car, sort ascending (faster = lower)
    const cars = Object.entries(carData)
      .filter(([, d]) => d.lap_times.length >= 3) // need enough samples
      .map(([carId, d]) => {
        const sorted = [...d.lap_times].sort((a, b) => a - b);
        // Use median of top 20% fastest laps to represent car pace
        const topN = Math.max(1, Math.ceil(sorted.length * 0.2));
        const topLaps = sorted.slice(0, topN);
        const avgBest = topLaps.reduce((s, v) => s + v, 0) / topLaps.length;
        return {
          car_id: Number(carId),
          car_name: d.car_name,
          avg_lap_ms: avgBest,
          lap_time: formatLapTime(avgBest),
          sample_size: d.lap_times.length,
        };
      })
      .sort((a, b) => a.avg_lap_ms - b.avg_lap_ms);

    // Add delta to leader
    const leaderTime = cars[0]?.avg_lap_ms ?? 0;
    const carsWithDelta = cars.map((c, i) => ({
      ...c,
      delta:
        i === 0
          ? null
          : `+${((c.avg_lap_ms - leaderTime) / 10000).toFixed(3)}s`,
    }));

    return NextResponse.json({
      cars: carsWithDelta,
      total_drivers: Object.values(carData).reduce(
        (s, d) => s + d.lap_times.length,
        0,
      ),
      subsessions_sampled: topSubs.length,
      total_subsessions: allSubs.length,
    });
  } catch (e: any) {
    console.error("[series-cars]", e.message);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
