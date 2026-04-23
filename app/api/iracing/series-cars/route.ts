// /app/api/iracing/series-cars/route.ts
// Gets top 10 finishing positions from the best SOF race this week
// Uses results/season_results (no cust_id filter) → results/get for full lap data

import { NextRequest, NextResponse } from "next/server";
import { getValidToken } from "../../../lib/iracing-token";

export const dynamic = "force-dynamic";

const BASE = "https://members-ng.iracing.com/data";

async function iracingGet(path: string, token: string, timeoutMs = 10000) {
  const res = await fetch(`${BASE}/${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "User-Agent": "BoxBoxBoard/1.0",
    },
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) throw new Error(`${res.status}: ${path.split("?")[0]}`);
  const raw = await res.json();
  if (raw?.link) {
    const s3 = await fetch(raw.link, {
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!s3.ok) throw new Error(`S3 ${s3.status}`);
    return s3.json();
  }
  return raw;
}

function formatLapTime(tenths: number): string {
  if (!tenths || tenths <= 0) return "—";
  const totalSec = tenths / 10000;
  const mins = Math.floor(totalSec / 60);
  const secs = (totalSec % 60).toFixed(3).padStart(6, "0");
  return mins > 0 ? `${mins}:${secs}` : `${secs}s`;
}

export async function GET(request: NextRequest) {
  const { token } = await getValidToken(request);
  if (!token)
    return NextResponse.json({
      cars: [],
      total_drivers: 0,
      subsessions_sampled: 0,
    });

  const { searchParams } = request.nextUrl;
  const seasonId = searchParams.get("season_id");
  const weekNum = searchParams.get("race_week_num") ?? "0";

  if (!seasonId)
    return NextResponse.json({
      cars: [],
      total_drivers: 0,
      subsessions_sampled: 0,
    });

  try {
    // Step 1: get session list for this season/week (all sessions, no cust_id filter)
    const week = Number(weekNum);
    let sessions: any[] = [];

    for (const w of [week, week - 1]) {
      if (w < 0) continue;
      try {
        const data = await iracingGet(
          `results/season_results?season_id=${seasonId}&race_week_num=${w}`,
          token,
          10000,
        );
        const arr = Array.isArray(data)
          ? data
          : (data?.results ?? data?.sessions ?? []);
        console.log(
          "[series-cars] season_results week:",
          w,
          "sessions:",
          arr.length,
        );
        if (arr.length > 0) {
          sessions = arr;
          break;
        }
      } catch (e: any) {
        console.warn(
          "[series-cars] season_results week",
          w,
          "failed:",
          e.message,
        );
      }
    }

    if (!sessions.length) {
      return NextResponse.json({
        cars: [],
        total_drivers: 0,
        subsessions_sampled: 0,
      });
    }

    // Step 2: pick the highest-SOF session
    const best = sessions
      .filter((s: any) => s.subsession_id)
      .sort(
        (a: any, b: any) =>
          (b.event_strength_of_field ?? 0) - (a.event_strength_of_field ?? 0),
      )[0];

    if (!best?.subsession_id) {
      return NextResponse.json({
        cars: [],
        total_drivers: 0,
        subsessions_sampled: 0,
      });
    }

    console.log(
      "[series-cars] best subsession:",
      best.subsession_id,
      "SOF:",
      best.event_strength_of_field,
    );

    // Step 3: fetch full results for that session
    const subsession = await iracingGet(
      `results/get?subsession_id=${best.subsession_id}`,
      token,
      12000,
    );

    // Find the race session (simsession_type 6 = race)
    const raceSession = (subsession?.session_results ?? []).find(
      (s: any) => s.simsession_type === 6 || s.simsession_name === "RACE",
    );

    if (!raceSession?.results?.length) {
      return NextResponse.json({
        cars: [],
        total_drivers: 0,
        subsessions_sampled: 1,
      });
    }

    // Step 4: build top 10 by finish position
    const top10 = [...raceSession.results]
      .sort((a: any, b: any) => a.finish_position - b.finish_position)
      .slice(0, 10)
      .map((d: any) => ({
        position: d.finish_position + 1, // 0-indexed → 1-indexed
        driver_name: d.display_name ?? d.name ?? "—",
        car_name: d.car_name ?? "—",
        car_id: d.car_id,
        best_lap: formatLapTime(d.best_lap_time),
        avg_lap: formatLapTime(d.average_lap),
        laps: d.laps_complete ?? 0,
        incidents: d.incidents ?? 0,
        irating: d.oldi_rating ?? null,
      }));

    console.log(
      "[series-cars] top10 built, cars:",
      [...new Set(top10.map((d) => d.car_name))].join(", "),
    );

    return NextResponse.json({
      cars: top10,
      total_drivers: raceSession.results.length,
      subsessions_sampled: 1,
      sof: best.event_strength_of_field ?? 0,
      track: best.track?.track_name ?? subsession?.track?.track_name ?? "—",
    });
  } catch (e: any) {
    console.error("[series-cars] error:", e.message);
    return NextResponse.json({
      cars: [],
      total_drivers: 0,
      subsessions_sampled: 0,
    });
  }
}
