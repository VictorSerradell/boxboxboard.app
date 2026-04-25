import { NextRequest, NextResponse } from "next/server";
import { getValidToken } from "../../../lib/iracing-token";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const seriesId = searchParams.get("series_id");
  const weekNum = Number(searchParams.get("race_week_num") ?? "0");
  const myRaces = searchParams.get("my_races"); // JSON array passed from client

  if (!seriesId)
    return NextResponse.json({
      avg_sof: 0,
      avg_drivers: 0,
      splits: 0,
      total_races: 0,
      has_data: false,
    });

  const { token } = await getValidToken(request);
  if (!token)
    return NextResponse.json({
      avg_sof: 0,
      avg_drivers: 0,
      splits: 0,
      total_races: 0,
      has_data: false,
    });

  try {
    let allResults: any[] = [];

    if (myRaces) {
      // Client pre-fetched my-races and passed them directly
      allResults = JSON.parse(myRaces);
    } else {
      return NextResponse.json({
        avg_sof: 0,
        avg_drivers: 0,
        splits: 0,
        total_races: 0,
        has_data: false,
      });
    }

    const weeks = [weekNum, weekNum - 1].filter((w) => w >= 0);
    const filtered = allResults.filter(
      (r: any) =>
        String(r.series_id) === seriesId && weeks.includes(r.race_week_num),
    );
    console.log(
      "[series-stats] series",
      seriesId,
      "weeks",
      weeks,
      "filtered:",
      filtered.length,
    );

    if (!filtered.length) {
      return NextResponse.json({
        avg_sof: 0,
        avg_drivers: 0,
        splits: 0,
        total_races: 0,
        has_data: false,
      });
    }

    const subsessions = new Map<
      number,
      { sof: number; drivers: number; start_time: string }
    >();
    for (const r of filtered) {
      if (!subsessions.has(r.subsession_id)) {
        subsessions.set(r.subsession_id, {
          sof: r.event_strength_of_field ?? 0,
          drivers: r.num_drivers ?? 0,
          start_time: r.start_time ?? "",
        });
      }
    }

    const sessions = Array.from(subsessions.values());
    const totalRaces = sessions.length;
    const totalSof = sessions.reduce((s, r) => s + r.sof, 0);
    const totalDrivers = sessions.reduce((s, r) => s + r.drivers, 0);
    const byTime = new Map<string, number>();
    for (const s of sessions)
      byTime.set(s.start_time, (byTime.get(s.start_time) ?? 0) + 1);
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
