// /app/api/iracing/series-cars/route.ts
// Simdeck approach: search ALL races (no series_id), filter by series_id,
// then results/get → ALL drivers in that session → top 10 + fastest car

import { NextRequest, NextResponse } from "next/server";
import { getValidToken } from "../../../lib/iracing-token";

export const dynamic = "force-dynamic";

const BASE = "https://members-ng.iracing.com/data";

async function iracingGet(path: string, token: string, ms = 8000) {
  const res = await fetch(`${BASE}/${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "User-Agent": "BoxBoxBoard/1.0",
    },
    signal: AbortSignal.timeout(ms),
  });
  if (!res.ok) throw new Error(`${res.status}: ${path.split("?")[0]}`);
  const raw = await res.json();
  if (raw?.link) {
    const s3 = await fetch(raw.link, { signal: AbortSignal.timeout(ms) });
    if (!s3.ok) throw new Error(`S3 ${s3.status}`);
    return s3.json();
  }
  return raw;
}

function formatLapTime(tenths: number): string {
  if (!tenths || tenths <= 0) return "—";
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
  const weekNum = Number(searchParams.get("race_week_num") ?? "0");
  const myRaces = searchParams.get("my_races");

  if (!seriesId || !myRaces)
    return NextResponse.json({
      cars: [],
      total_drivers: 0,
      subsessions_sampled: 0,
    });

  try {
    const allResults: any[] = JSON.parse(myRaces);
    const weeks = [weekNum, weekNum - 1].filter((w) => w >= 0);
    const filtered = allResults.filter(
      (r: any) =>
        String(r.series_id) === seriesId && weeks.includes(r.race_week_num),
    );
    console.log(
      "[series-cars] series",
      seriesId,
      "weeks",
      weeks,
      "filtered:",
      filtered.length,
    );

    if (!filtered.length)
      return NextResponse.json({
        cars: [],
        total_drivers: 0,
        subsessions_sampled: 0,
      });

    const subMap = new Map<number, number>();
    for (const r of filtered) {
      if (!subMap.has(r.subsession_id))
        subMap.set(r.subsession_id, r.event_strength_of_field ?? 0);
    }
    const topIds = Array.from(subMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([id]) => id);
    console.log("[series-cars] subsessions:", topIds);

    const fetchedResults = await Promise.allSettled(
      topIds.map((id) => iracingGet(`results/get?subsession_id=${id}`, token)),
    );

    const driverBests: {
      name: string;
      car_name: string;
      car_id: number;
      lap: number;
    }[] = [];

    for (const r of fetchedResults) {
      if (r.status !== "fulfilled" || !r.value) continue;
      let session = (r.value.session_results ?? []).find(
        (s: any) => s.simsession_type === 3,
      );
      if (!session)
        session = (r.value.session_results ?? []).find(
          (s: any) => s.simsession_type === 6,
        );
      if (!session?.results) continue;
      for (const d of session.results) {
        const lap =
          d.best_qual_lap_time > 0 ? d.best_qual_lap_time : d.best_lap_time;
        if (!lap || lap <= 0) continue;
        driverBests.push({
          name: d.display_name ?? "—",
          car_name: d.car_name ?? "—",
          car_id: d.car_id,
          lap,
        });
      }
    }

    if (!driverBests.length)
      return NextResponse.json({
        cars: [],
        total_drivers: 0,
        subsessions_sampled: topIds.length,
      });

    driverBests.sort((a, b) => a.lap - b.lap);
    const top10 = driverBests.slice(0, 10);
    const carCount: Record<string, number> = {};
    for (const d of top10)
      carCount[d.car_name] = (carCount[d.car_name] ?? 0) + 1;
    const fastestCar = Object.entries(carCount).sort(
      (a, b) => b[1] - a[1],
    )[0]?.[0];
    const leaderLap = top10[0].lap;

    console.log(
      "[series-cars] top car:",
      fastestCar,
      "| drivers sampled:",
      driverBests.length,
    );

    return NextResponse.json({
      cars: top10.map((d, i) => ({
        position: i + 1,
        driver_name: d.name,
        car_name: d.car_name,
        car_id: d.car_id,
        best_lap: formatLapTime(d.lap),
        delta: i === 0 ? null : `+${((d.lap - leaderLap) / 10000).toFixed(3)}s`,
        is_fastest_car: d.car_name === fastestCar,
      })),
      fastest_car: fastestCar,
      total_drivers: driverBests.length,
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