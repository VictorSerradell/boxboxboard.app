import { NextRequest, NextResponse } from "next/server";
import { getDb } from "../../../lib/mongodb";

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
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
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
  if (!token) return NextResponse.json({ cars: [] }, { status: 401 });

  const { searchParams } = request.nextUrl;
  const seasonId = searchParams.get("season_id");
  const weekNum = Number(searchParams.get("race_week_num") ?? "0");

  if (!seasonId) return NextResponse.json({ cars: [] });

  try {
    // Look up stored subsessions from MongoDB for this season
    const db = await getDb();
    const col = db.collection("subsessions");

    const weeks = [weekNum, weekNum - 1].filter((w) => w >= 0);
    const stored = await col
      .find({
        season_id: Number(seasonId),
        race_week_num: { $in: weeks },
      })
      .sort({ event_strength_of_field: -1 })
      .limit(5)
      .toArray();

    console.log(
      "[series-cars] MongoDB subsessions for season",
      seasonId,
      "weeks",
      weeks,
      ":",
      stored.length,
    );

    if (!stored.length) {
      return NextResponse.json({ cars: [], total_drivers: 0, no_data: true });
    }

    const topIds = stored.map((s) => s.subsession_id);

    // Fetch full results for top subsessions → ALL drivers
    const fetched = await Promise.allSettled(
      topIds.map((id) => iGet(`results/get?subsession_id=${id}`, token)),
    );

    const driverBests: {
      name: string;
      car_name: string;
      car_id: number;
      lap: number;
      irating: number;
    }[] = [];

    for (const r of fetched) {
      if (r.status !== "fulfilled" || !r.value) continue;
      const data = r.value;

      // Prefer qualifying (simsession_type=3), fallback to race (6)
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
          irating: d.oldi_rating ?? 0,
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
      "| drivers sampled:",
      driverBests.length,
    );

    return NextResponse.json({
      cars: top10.map((d, i) => ({
        position: i + 1,
        driver_name: d.name,
        car_name: d.car_name,
        car_id: d.car_id,
        irating: d.irating,
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
