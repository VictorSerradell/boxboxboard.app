// /app/api/iracing/series-stats/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getValidToken } from "../../../lib/iracing-token";

const BASE = "https://members-ng.iracing.com/data";

async function resolveLink(link: string): Promise<any[]> {
  try {
    const s3 = await fetch(link);
    if (!s3.ok) {
      console.error("[series-stats] S3 failed:", s3.status);
      return [];
    }
    const data = await s3.json();
    console.log(
      "[series-stats] S3 type:",
      typeof data,
      "isArray:",
      Array.isArray(data),
    );
    if (Array.isArray(data)) {
      console.log(
        "[series-stats] S3 length:",
        data.length,
        "| keys[0]:",
        data[0] ? Object.keys(data[0]).join(",") : "empty",
      );
      return data;
    }
    console.log("[series-stats] S3 keys:", Object.keys(data).join(", "));
    return data?.results ?? data?.sessions ?? data?.data ?? [];
  } catch (e: any) {
    console.error("[series-stats] S3 error:", e.message);
    return [];
  }
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
    // Try multiple param combinations since iRacing docs are inconsistent
    const urls = [
      `results/season_results?season_id=${seasonId}&race_week_num=${weekNum}&event_types=5`,
      `results/season_results?season_id=${seasonId}&race_week_num=${weekNum}`,
      `results/season_results?season_id=${seasonId}&event_types=5`,
    ];

    let sessions: any[] = [];

    for (const url of urls) {
      console.log("[series-stats] trying:", url);
      try {
        const res = await fetch(`${BASE}/${url}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "User-Agent": "BoxBoxBoard/1.0",
          },
          signal: AbortSignal.timeout(8000), // 8s timeout per attempt
        });
        console.log(
          "[series-stats] status:",
          res.status,
          "for:",
          url.split("?")[1],
        );

        if (!res.ok) {
          const txt = await res.text().catch(() => "");
          console.error("[series-stats] error:", res.status, txt.slice(0, 100));
          continue;
        }

        const raw = await res.json();
        console.log(
          "[series-stats] raw keys:",
          Object.keys(raw ?? {}).join(", "),
        );

        if (raw?.link) {
          sessions = await resolveLink(raw.link);
        } else if (raw?.chunk_info?.chunk_file_names?.length > 0) {
          const base = raw.chunk_info.base_download_url ?? "";
          const all: any[] = [];
          for (const f of raw.chunk_info.chunk_file_names) {
            const chunk = await resolveLink(base + f);
            all.push(...chunk);
          }
          sessions = all;
        } else {
          sessions = Array.isArray(raw)
            ? raw
            : (raw?.results ?? raw?.sessions ?? []);
        }

        console.log(
          "[series-stats] sessions found:",
          sessions.length,
          "via:",
          url.split("?")[1],
        );
        if (sessions.length > 0) break; // Got data, stop trying
      } catch (e: any) {
        console.error(
          "[series-stats] fetch error for",
          url.split("?")[1],
          ":",
          e.message,
        );
      }
    }

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
      (s: number, r: any) => s + (r.event_strength_of_field ?? r.sof ?? 0),
      0,
    );
    const totalDrivers = sessions.reduce(
      (s: number, r: any) => s + (r.num_drivers ?? r.driver_count ?? 0),
      0,
    );

    const byTime = new Map<string, number>();
    for (const s of sessions) {
      const t = s.start_time ?? s.session_start_time ?? "";
      byTime.set(t, (byTime.get(t) ?? 0) + 1);
    }
    const avgSplits =
      byTime.size > 0 ? Math.round(totalRaces / byTime.size) : 1;

    return NextResponse.json({
      avg_sof: totalRaces > 0 ? Math.round(totalSof / totalRaces) : 0,
      avg_drivers: totalRaces > 0 ? Math.round(totalDrivers / totalRaces) : 0,
      splits: avgSplits,
      total_races: totalRaces,
      has_data: true,
    });
  } catch (e: any) {
    console.error("[series-stats] outer error:", e.message);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
