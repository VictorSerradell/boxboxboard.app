import { NextRequest, NextResponse } from "next/server";

const BASE = "https://members-ng.iracing.com/data";

function formatLapTime(tenths: number): string {
  if (!tenths || tenths <= 0) return "—";
  const totalSec = tenths / 10000;
  const mins = Math.floor(totalSec / 60);
  const secs = (totalSec % 60).toFixed(3).padStart(6, "0");
  return mins > 0 ? `${mins}:${secs}` : `${secs}s`;
}

export const dynamic = "force-dynamic";

async function iGet(path: string, token: string) {
  const res = await fetch(`${BASE}/${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "User-Agent": "BoxBoxBoard/1.0",
    },
    signal: AbortSignal.timeout(7000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${path}`);
  const raw = await res.json();
  if (raw?.link) {
    const s3 = await fetch(raw.link, { signal: AbortSignal.timeout(7000) });
    if (!s3.ok) throw new Error(`S3 ${s3.status}`);
    return s3.json();
  }
  return raw;
}

export async function GET(request: NextRequest) {
  const token = request.cookies.get("iracing_access_token")?.value;
  if (!token)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { searchParams } = request.nextUrl;
  const seasonId = searchParams.get("season_id");
  const weekNum = Number(searchParams.get("race_week_num") ?? "0");

  if (!seasonId) return NextResponse.json({ cars: [] });

  try {
    // Step 1: get subsession IDs for this season via spectator endpoint (global, no cust_id filter)
    const spectator = await iGet(
      `spectator_subsession_ids?event_types=5&season_ids=${seasonId}`,
      token,
    );

    console.log(
      "[series-cars] spectator raw keys:",
      Object.keys(spectator ?? {}).join(", "),
    );
    console.log(
      "[series-cars] spectator sample:",
      JSON.stringify(spectator).slice(0, 200),
    );

    let subsessionIds: number[] =
      spectator?.subsession_ids ??
      spectator?.session_ids ??
      spectator?.sessions ??
      [];
    console.log(
      "[series-cars] spectator subsessions for season",
      seasonId,
      ":",
      subsessionIds.length,
    );

    if (!subsessionIds.length) {
      return NextResponse.json({ cars: [], total_drivers: 0 });
    }

    // Take most recent 3 (highest IDs = most recent)
    const topIds = [...subsessionIds].sort((a, b) => b - a).slice(0, 3);

    // Step 2: fetch full results → ALL drivers (not filtered by cust_id)
    const fetched = await Promise.allSettled(
      topIds.map((id) => iGet(`results/get?subsession_id=${id}`, token)),
    );

    const driverBests: {
      name: string;
      car_name: string;
      car_id: number;
      lap: number;
      irating: number;
      country: string;
    }[] = [];

    for (const r of fetched) {
      if (r.status !== "fulfilled" || !r.value) continue;
      const data = r.value;

      // Check race_week_num matches
      if (
        data.race_week_num != null &&
        Math.abs(data.race_week_num - weekNum) > 1
      )
        continue;

      // Prefer qualifying, fallback to race
      let session = (data.session_results ?? []).find(
        (s: any) => s.simsession_type === 3,
      );
      if (!session)
        session = (data.session_results ?? []).find(
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
          irating: d.oldi_rating ?? d.newi_rating ?? 0,
          country: d.country_code ?? "",
        });
      }
    }

    if (!driverBests.length) {
      return NextResponse.json({ cars: [], total_drivers: 0 });
    }

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
      "| total drivers:",
      driverBests.length,
    );

    return NextResponse.json({
      cars: top10.map((d, i) => ({
        position: i + 1,
        driver_name: d.name,
        car_name: d.car_name,
        car_id: d.car_id,
        irating: d.irating,
        country: d.country,
        best_lap: formatLapTime(d.lap),
        delta: i === 0 ? null : `+${((d.lap - leaderLap) / 10000).toFixed(3)}s`,
        is_fastest_car: d.car_name === fastestCar,
      })),
      fastest_car: fastestCar,
      total_drivers: driverBests.length,
    });
  } catch (e: any) {
    console.error("[series-cars] error:", e.message);
    return NextResponse.json({ cars: [], total_drivers: 0 });
  }
}
