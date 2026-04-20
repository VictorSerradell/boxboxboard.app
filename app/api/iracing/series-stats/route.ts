// /app/api/iracing/series-stats/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getValidToken } from "../../../lib/iracing-token";

const BASE = "https://members-ng.iracing.com/data";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const seasonId = searchParams.get("season_id");
  const weekNum = searchParams.get("race_week_num") ?? "0";
  const carClassId = searchParams.get("car_class_id");

  if (!seasonId)
    return NextResponse.json({ error: "season_id required" }, { status: 400 });
  const token = await getValidToken(request);
  if (!token)
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const qs = new URLSearchParams({
      season_id: seasonId,
      race_week_num: weekNum,
    });
    if (carClassId) qs.set("car_class_id", carClassId);
    const url = `${BASE}/stats/season_driver_standings?${qs}`;

    // Step 1: get the link
    const res1 = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        "User-Agent": "BoxBoxBoard/1.0",
      },
      signal: AbortSignal.timeout(10000),
    });
    console.log(
      "[series-stats] step1 status:",
      res1.status,
      "url:",
      qs.toString(),
    );
    if (!res1.ok) throw new Error(`step1 ${res1.status}`);

    const json1 = await res1.json();
    console.log(
      "[series-stats] step1 keys:",
      Object.keys(json1 ?? {}).join(","),
      "| link?",
      !!json1?.link,
    );

    if (!json1?.link) {
      // Data is directly in the response
      const direct = Array.isArray(json1)
        ? json1
        : (json1?.drivers ?? json1?.standings ?? json1?.results ?? []);
      console.log("[series-stats] direct rows:", direct.length);
      return buildResponse(direct);
    }

    // Step 2: fetch S3 link
    console.log("[series-stats] fetching S3...");
    const res2 = await fetch(json1.link, {
      signal: AbortSignal.timeout(15000),
    });
    console.log("[series-stats] step2 status:", res2.status);
    if (!res2.ok) throw new Error(`step2 ${res2.status}`);

    const json2 = await res2.json();
    console.log(
      "[series-stats] step2 type:",
      typeof json2,
      "isArray:",
      Array.isArray(json2),
    );
    if (!Array.isArray(json2) && typeof json2 === "object") {
      console.log("[series-stats] step2 keys:", Object.keys(json2).join(","));
      console.log(
        "[series-stats] step2 sample:",
        JSON.stringify(json2).slice(0, 300),
      );
    } else if (Array.isArray(json2)) {
      console.log(
        "[series-stats] step2 length:",
        json2.length,
        "| first keys:",
        json2[0] ? Object.keys(json2[0]).join(",") : "empty",
      );
    }

    const drivers = Array.isArray(json2)
      ? json2
      : (json2?.drivers ??
        json2?.standings ??
        json2?.results ??
        json2?.data ??
        []);
    console.log("[series-stats] final drivers:", drivers.length);
    return buildResponse(drivers);
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

function buildResponse(drivers: any[]) {
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
    (s: number, d: any) => s + (d.starts ?? d.week_starts ?? d.num_starts ?? 1),
    0,
  );
  const avgStartsPerDriver = totalStarts / drivers.length;
  const splits = Math.max(
    1,
    Math.round(drivers.length / Math.max(1, avgStartsPerDriver)),
  );
  const ratings = drivers
    .map((d: any) => d.oldi_rating ?? d.irating ?? 0)
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
}
