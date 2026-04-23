// /app/api/iracing/series-seasons/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getValidToken } from "../../../lib/iracing-token";
import { getDemoSeries } from "../../../lib/iracing-client";

export const dynamic = "force-dynamic";

const BASE = "https://members-ng.iracing.com/data";

async function fetchSeasonsFromAPI(token: string): Promise<any[] | null> {
  try {
    const res = await fetch(`${BASE}/series/seasons?include_series=true`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "User-Agent": "BoxBoxBoard/1.0",
      },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) {
      console.error("[series-seasons] iRacing status:", res.status);
      return null;
    }

    const raw = await res.json();
    if (!raw?.link) {
      const arr = Array.isArray(raw) ? raw : (raw?.seasons ?? []);
      return arr.length ? arr : null;
    }

    const s3 = await fetch(raw.link, { signal: AbortSignal.timeout(20000) });
    if (!s3.ok) {
      console.error("[series-seasons] S3 status:", s3.status);
      return null;
    }

    const data = await s3.json();
    const arr = Array.isArray(data) ? data : (data?.seasons ?? []);
    return arr.length ? arr : null;
  } catch (e: any) {
    console.error("[series-seasons] fetch error:", e.message);
    return null;
  }
}

export async function GET(request: NextRequest) {
  const qs = request.nextUrl.searchParams;
  const year = Number(qs.get("season_year") ?? 2026);
  const quarter = Number(qs.get("season_quarter") ?? 2);

  // Try with auth token first
  const { token, setCookieHeader } = await getValidToken(request);
  if (token) {
    const series = await fetchSeasonsFromAPI(token);
    if (series) {
      console.log(`[series-seasons] fetched ${series.length} series`);
      logDebug(series);
      const headers: Record<string, string> = {
        "Cache-Control": "private, max-age=900",
      };
      if (setCookieHeader) headers["Set-Cookie"] = setCookieHeader;
      return NextResponse.json(series, { headers });
    }
  }

  // Fallback: demo series (shown when token expired/unavailable — user needs to re-login)
  console.log("[series-seasons] fallback to demo series (token unavailable)");
  return NextResponse.json(getDemoSeries(year, quarter));
}

function logDebug(series: any[]) {
  const noRtd = series.filter(
    (x: any) => !x.race_time_descriptors?.length,
  ).length;
  console.log(
    `[rtd] ${noRtd}/${series.length} series have empty race_time_descriptors`,
  );
  const withOpDur = series.filter((s: any) => s.op_duration > 0).slice(0, 5);
  console.log(
    "[op_duration] sample:",
    withOpDur.map((s: any) => `${s.season_name}=${s.op_duration}`).join(", "),
  );
  const withSchedDesc = series
    .filter((s: any) => s.schedule_description)
    .slice(0, 3);
  console.log(
    "[schedule_description] sample:",
    withSchedDesc.map((s: any) => `"${s.schedule_description}"`).join(", "),
  );
  const withSchedules = series.find((s: any) => s.schedules?.length > 0);
  if (withSchedules) {
    console.log(
      "[schedule-keys]:",
      Object.keys(withSchedules.schedules[0]).join(", "),
    );
    console.log(
      "[schedule-sample]:",
      JSON.stringify(withSchedules.schedules[0]).slice(0, 300),
    );
  }
  const dcSeries = series.filter((s: any) => s.driver_changes === true);
  console.log(
    `[driver_changes] ${dcSeries.length} series with driver_changes=true:`,
    dcSeries
      .map((s: any) => s.series_name ?? s.season_name)
      .slice(0, 10)
      .join(", "),
  );
  if (series.length > 0)
    console.log("[series-fields] keys:", Object.keys(series[0]).join(", "));
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
}
