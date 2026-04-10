// /app/api/iracing/series-seasons/route.ts
// Returns all series for the current season — works with or without auth

import { NextRequest, NextResponse } from "next/server";

const BASE = "https://members-ng.iracing.com/data";

async function iracingFetch(path: string, token: string) {
  const res = await fetch(`${BASE}/${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "User-Agent": "BoxBoxBoard/1.0",
    },
  });
  if (!res.ok) return null;
  const raw = await res.json();
  if (raw?.link) {
    const s3 = await fetch(raw.link);
    return s3.ok ? s3.json() : null;
  }
  return raw;
}

export async function GET(request: NextRequest) {
  const token = request.cookies.get("iracing_access_token")?.value;

  if (!token) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const data = await iracingFetch(
      "series/seasons?include_series=true",
      token,
    );
    if (!data)
      return NextResponse.json(
        { error: "Failed to fetch series" },
        { status: 500 },
      );

    const series: any[] = Array.isArray(data) ? data : (data?.seasons ?? []);
    console.log(`[series-seasons] fetched ${series.length} series`);

    // Debug: log RTD structure from a few series
    const withRtd = series
      .filter((x) => x.race_time_descriptors?.length > 0)
      .slice(0, 3);
    withRtd.forEach((s) => {
      console.log(
        `[rtd] "${s.series_name}" rtd[0]:`,
        JSON.stringify(s.race_time_descriptors[0]),
      );
    });
    const noRtd = series.filter((x) => !x.race_time_descriptors?.length).length;
    console.log(
      `[rtd] ${noRtd}/${series.length} series have empty race_time_descriptors`,
    );

    // Debug: driver_changes series
    const dcSeries = series.filter((s: any) => s.driver_changes === true);
    console.log(
      `[driver_changes] ${dcSeries.length} series with driver_changes=true:`,
      dcSeries
        .map((s: any) => s.series_name ?? s.season_name)
        .slice(0, 10)
        .join(", "),
    );

    // Debug: log sample series fields
    if (series.length > 0) {
      console.log("[series-fields] keys:", Object.keys(series[0]).join(", "));
    }

    // Debug: log series that look like endurance by name
    const enduranceLike = series.filter((s: any) => {
      const n = (s.series_name ?? s.season_name ?? "").toLowerCase();
      return (
        n.includes("endurance") ||
        n.includes("imsa") ||
        n.includes("24h") ||
        n.includes("ires")
      );
    });
    console.log(
      `[endurance] ${enduranceLike.length} endurance-like series by name:`,
      enduranceLike.map((s: any) => s.series_name ?? s.season_name).join(", "),
    );

    return NextResponse.json(series, {
      headers: { "Cache-Control": "public, max-age=1800" },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
