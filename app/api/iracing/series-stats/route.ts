// /app/api/iracing/series-stats/route.ts
// Uses stats/season_driver_standings — documented endpoint, all drivers

import { NextRequest, NextResponse } from "next/server";
import { getValidToken } from "../../../lib/iracing-token";

const BASE = "https://members-ng.iracing.com/data";
const TIMEOUT = 10000;

async function fetchWithTimeout(url: string, opts: RequestInit = {}) {
  return fetch(url, { ...opts, signal: AbortSignal.timeout(TIMEOUT) });
}

async function iracingGet(path: string, token: string) {
  const res = await fetchWithTimeout(`${BASE}/${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "User-Agent": "BoxBoxBoard/1.0",
    },
  });
  console.log("[series-stats]", path.split("?")[0], "status:", res.status);
  if (!res.ok) throw new Error(`iRacing ${res.status}`);
  const raw = await res.json();
  if (raw?.link) {
    console.log("[series-stats] following S3 link...");
    const s3 = await fetchWithTimeout(raw.link);
    const data = await s3.json();
    console.log(
      "[series-stats] S3 isArray:",
      Array.isArray(data),
      "keys:",
      Array.isArray(data) ? `len=${data.length}` : Object.keys(data).join(","),
    );
    return data;
  }
  return raw;
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const seasonId = searchParams.get("season_id");
  const weekNum = searchParams.get("race_week_num") ?? "0";

  if (!seasonId)
    return NextResponse.json({ error: "season_id required" }, { status: 400 });
  const token = await getValidToken(request);
  if (!token)
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    // stats/season_driver_standings — documented, returns all drivers for a season week
    const data = await iracingGet(
      `stats/season_driver_standings?season_id=${seasonId}&race_week_num=${weekNum}`,
      token,
    );

    const drivers: any[] = Array.isArray(data)
      ? data
      : (data?.drivers ?? data?.standings ?? data?.results ?? []);
    console.log(
      "[series-stats] drivers:",
      drivers.length,
      "| sample keys:",
      drivers[0] ? Object.keys(drivers[0]).join(",") : "none",
    );

    if (!drivers.length) {
      return NextResponse.json({
        avg_sof: 0,
        avg_drivers: 0,
        splits: 0,
        total_races: 0,
        has_data: false,
      });
    }

    const totalStarts = drivers.reduce(
      (s: number, d: any) =>
        s + (d.starts ?? d.week_starts ?? d.num_starts ?? 1),
      0,
    );
    const avgStartsPerDriver = totalStarts / drivers.length;
    const splits = Math.max(
      1,
      Math.round(drivers.length / Math.max(1, avgStartsPerDriver)),
    );

    const ratings = drivers
      .map((d: any) => d.oldi_rating ?? d.irating ?? d.club_points ?? 0)
      .filter(Boolean);
    const avgSof =
      ratings.length > 0
        ? Math.round(
            ratings.reduce((s: number, r: number) => s + r, 0) / ratings.length,
          )
        : 0;

    return NextResponse.json({
      avg_sof: avgSof,
      avg_drivers: Math.round(drivers.length / splits),
      splits,
      total_races: totalStarts,
      has_data: true,
    });
  } catch (e: any) {
    console.error("[series-stats] error:", e.message);
    return NextResponse.json({
      avg_sof: 0,
      avg_drivers: 0,
      splits: 0,
      total_races: 0,
      has_data: false,
    });
  }
}
