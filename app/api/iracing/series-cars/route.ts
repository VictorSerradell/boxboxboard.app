// /app/api/iracing/series-cars/route.ts
// Returns most used cars in top 100 finishers across high-SOF races this week

import { NextRequest, NextResponse } from "next/server";

const BASE = "https://members-ng.iracing.com/data";

async function iracingFetch(path: string, token: string) {
  const res = await fetch(`${BASE}/${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "User-Agent": "BoxBoxBoard/1.0",
    },
    next: { revalidate: 1800 }, // cache 30 min
  });
  if (!res.ok) throw new Error(`iRacing ${res.status}: ${path}`);
  const raw = await res.json();
  if (raw?.link)
    return fetch(raw.link, { next: { revalidate: 1800 } }).then((r) =>
      r.json(),
    );
  return raw;
}

export async function GET(request: NextRequest) {
  const token = request.cookies.get("iracing_access_token")?.value;
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
    // Step 1 — get all subsessions for this series/week
    const params = new URLSearchParams({
      series_id: seriesId,
      race_week_num: weekNum,
      official_only: "true",
      event_types: "5", // Race only
    });
    if (seasonYear) params.set("season_year", seasonYear);
    if (seasonQ) params.set("season_quarter", seasonQ);

    const searchData = await iracingFetch(
      `results/search_series?${params}`,
      token,
    );
    const allSubs: any[] = searchData?.results ?? searchData ?? [];

    if (!allSubs.length) {
      return NextResponse.json({
        cars: [],
        total_drivers: 0,
        subsessions_sampled: 0,
      });
    }

    // Step 2 — sort by SOF descending, take top 25 (highest competition)
    const topSubs = [...allSubs]
      .sort(
        (a, b) =>
          (b.event_strength_of_field ?? 0) - (a.event_strength_of_field ?? 0),
      )
      .slice(0, 25);

    // Step 3 — fetch results for each subsession in parallel (batches of 5)
    const carCounts: Record<
      string,
      { car_name: string; car_id: number; count: number }
    > = {};
    let totalDrivers = 0;

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

        // Find the race session (simsession_type 6 = Race)
        const raceSessions = (data?.session_results ?? []).filter(
          (s: any) => s.simsession_type === 6 || s.simsession_name === "RACE",
        );

        for (const session of raceSessions) {
          const results: any[] = session.results ?? [];
          // Take top 100 finishers
          const top100 = results
            .filter((r: any) => r.finish_position !== undefined)
            .sort((a: any, b: any) => a.finish_position - b.finish_position)
            .slice(0, 100);

          for (const driver of top100) {
            const carId = driver.car_id;
            const carName = driver.car_name ?? `Car ${carId}`;
            if (!carId) continue;
            if (!carCounts[carId]) {
              carCounts[carId] = { car_name: carName, car_id: carId, count: 0 };
            }
            carCounts[carId].count++;
            totalDrivers++;
          }
        }
      }
    }

    // Step 4 — sort and calculate percentages
    const cars = Object.values(carCounts)
      .sort((a, b) => b.count - a.count)
      .map((car) => ({
        car_id: car.car_id,
        car_name: car.car_name,
        count: car.count,
        pct:
          totalDrivers > 0
            ? ((car.count / totalDrivers) * 100).toFixed(1)
            : "0",
      }));

    return NextResponse.json({
      cars,
      total_drivers: totalDrivers,
      subsessions_sampled: topSubs.length,
      total_subsessions: allSubs.length,
    });
  } catch (e: any) {
    console.error("[series-cars]", e.message);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
