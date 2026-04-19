// /app/api/iracing/series-stats/route.ts
// Uses season/driver_standings — returns ALL drivers, not filtered by cust_id

import { NextRequest, NextResponse } from "next/server";
import { getValidToken } from "../../../lib/iracing-token";

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
  // Handle chunked response
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
          : (f.value?.drivers ?? f.value?.results ?? []);
        all.push(...chunk);
      }
    }
    return all;
  }
  return raw?.drivers ?? raw?.results ?? raw;
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
    // driver_standings returns ALL drivers for a season week — no cust_id filter
    const params = new URLSearchParams({
      season_id: seasonId,
      race_week_num: weekNum,
    });

    const data = await iracingFetch(`season/driver_standings?${params}`, token);
    const drivers: any[] = Array.isArray(data) ? data : (data?.drivers ?? []);

    console.log(
      "[series-stats] season_id:",
      seasonId,
      "week:",
      weekNum,
      "drivers:",
      drivers.length,
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

    // Aggregate from driver standings
    const totalDrivers = drivers.length;

    // SOF: average of all drivers' irating
    const ratings = drivers
      .map((d: any) => d.oldi_rating ?? d.irating ?? 0)
      .filter((r: number) => r > 0);
    const avgSof =
      ratings.length > 0
        ? Math.round(
            ratings.reduce((s: number, r: number) => s + r, 0) / ratings.length,
          )
        : 0;

    // Splits: max starts / avg starts gives approximate splits
    const starts = drivers.map((d: any) => d.starts ?? d.week_starts ?? 1);
    const maxStarts = Math.max(...starts);
    const avgStarts =
      starts.reduce((s: number, v: number) => s + v, 0) / starts.length;
    const splits =
      maxStarts > 0 ? Math.round(totalDrivers / Math.max(1, avgStarts)) : 1;

    return NextResponse.json({
      avg_sof: avgSof,
      avg_drivers: Math.round(totalDrivers / Math.max(splits, 1)),
      splits,
      total_races: maxStarts,
      has_data: true,
    });
  } catch (e: any) {
    console.error("[series-stats]", e.message);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
