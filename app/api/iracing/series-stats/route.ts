// /app/api/iracing/series-stats/route.ts
// Uses results/season_results — fast link+S3, returns session list for all drivers

import { NextRequest, NextResponse } from "next/server";
import { getValidToken } from "../../../lib/iracing-token";

const BASE = "https://members-ng.iracing.com/data";

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
    let sessions: any[] = [];
    let weekUsed = Number(weekNum);

    // Try current week, then fall back to previous week if empty
    for (const week of [weekUsed, weekUsed - 1]) {
      if (week < 0) continue;
      const res1 = await fetch(
        `${BASE}/results/season_results?season_id=${seasonId}&race_week_num=${week}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "User-Agent": "BoxBoxBoard/1.0",
          },
          signal: AbortSignal.timeout(8000),
        },
      );
      console.log("[series-stats] step1 week:", week, "status:", res1.status);
      if (!res1.ok) continue;

      const json1 = await res1.json();
      console.log(
        "[series-stats] step1 keys:",
        Object.keys(json1 ?? {}).join(","),
      );

      let data: any[] = [];
      if (json1?.link) {
        const res2 = await fetch(json1.link, {
          signal: AbortSignal.timeout(12000),
        });
        console.log("[series-stats] step2 status:", res2.status);
        if (res2.ok) {
          const json2 = await res2.json();
          data = Array.isArray(json2)
            ? json2
            : (json2?.results ?? json2?.sessions ?? []);
        }
      } else {
        data = Array.isArray(json1) ? json1 : (json1?.results ?? []);
      }

      console.log(
        "[series-stats] week",
        week,
        "sessions:",
        data.length,
        data[0] ? "| keys:" + Object.keys(data[0]).slice(0, 6).join(",") : "",
      );
      if (data.length > 0) {
        sessions = data;
        weekUsed = week;
        break;
      }
    }

    return buildResponse(sessions);
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

function buildResponse(sessions: any[]) {
  if (!sessions.length) {
    return NextResponse.json({
      avg_sof: 0,
      avg_drivers: 0,
      splits: 0,
      total_races: 0,
      has_data: false,
    });
  }
  const totalRaces = sessions.length;
  const totalSof = sessions.reduce(
    (s: number, r: any) => s + (r.event_strength_of_field ?? 0),
    0,
  );
  const totalDrivers = sessions.reduce(
    (s: number, r: any) => s + (r.num_drivers ?? 0),
    0,
  );

  const byTime = new Map<string, number>();
  for (const s of sessions) {
    const t = s.start_time ?? "";
    byTime.set(t, (byTime.get(t) ?? 0) + 1);
  }
  const avgSplits = byTime.size > 0 ? Math.round(totalRaces / byTime.size) : 1;

  return NextResponse.json({
    avg_sof: totalRaces > 0 ? Math.round(totalSof / totalRaces) : 0,
    avg_drivers: totalRaces > 0 ? Math.round(totalDrivers / totalRaces) : 0,
    splits: avgSplits,
    total_races: totalRaces,
    has_data: true,
  });
}
