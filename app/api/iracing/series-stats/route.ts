// /app/api/iracing/series-stats/route.ts
// Simdeck approach: search ALL races this season (no series_id), filter client-side,
// then use results/get to get ALL drivers in those sessions

import { NextRequest, NextResponse } from 'next/server';
import { getValidToken } from '../../../lib/iracing-token';
import { searchSeries } from '../../../lib/iracing-search';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const seriesId   = searchParams.get('series_id');
  const seasonYear = searchParams.get('season_year');
  const seasonQ    = searchParams.get('season_quarter');
  const weekNum    = Number(searchParams.get('race_week_num') ?? '0');

  if (!seriesId) return NextResponse.json({ avg_sof: 0, avg_drivers: 0, splits: 0, total_races: 0, has_data: false });

  const { token } = await getValidToken(request);
  if (!token) return NextResponse.json({ avg_sof: 0, avg_drivers: 0, splits: 0, total_races: 0, has_data: false });

  try {
    // Step 1: get ALL races this season (no series_id filter) — same as Simdeck
    const allParams = new URLSearchParams({
      season_year:    seasonYear ?? String(new Date().getFullYear()),
      season_quarter: seasonQ ?? '1',
      event_types:    '5',
    });

    const allResults = await searchSeries(allParams, token);
    console.log('[series-stats] total races this season:', allResults.length);

    // Step 2: filter by series_id and current/previous week
    const weeks = [weekNum, weekNum - 1].filter(w => w >= 0);
    let filtered = allResults.filter((r: any) =>
      String(r.series_id) === seriesId && weeks.includes(r.race_week_num)
    );

    console.log('[series-stats] filtered for series', seriesId, 'weeks', weeks, ':', filtered.length);

    if (!filtered.length) {
      return NextResponse.json({ avg_sof: 0, avg_drivers: 0, splits: 0, total_races: 0, has_data: false });
    }

    // Step 3: deduplicate by subsession_id — each result is Victor's entry in that session
    const subsessions = new Map<number, { sof: number; drivers: number; start_time: string }>();
    for (const r of filtered) {
      if (!subsessions.has(r.subsession_id)) {
        subsessions.set(r.subsession_id, {
          sof:        r.event_strength_of_field ?? 0,
          drivers:    r.num_drivers ?? 0,
          start_time: r.start_time ?? '',
        });
      }
    }

    const sessions = Array.from(subsessions.values());
    const totalRaces   = sessions.length;
    const totalSof     = sessions.reduce((s, r) => s + r.sof, 0);
    const totalDrivers = sessions.reduce((s, r) => s + r.drivers, 0);

    // Count splits by grouping sessions at the same start_time
    const byTime = new Map<string, number>();
    for (const s of sessions) {
      byTime.set(s.start_time, (byTime.get(s.start_time) ?? 0) + 1);
    }
    const avgSplits = byTime.size > 0 ? Math.round(totalRaces / byTime.size) : 1;

    return NextResponse.json({
      avg_sof:     totalRaces > 0 ? Math.round(totalSof / totalRaces) : 0,
      avg_drivers: totalRaces > 0 ? Math.round(totalDrivers / totalRaces) : 0,
      splits:      avgSplits,
      total_races: totalRaces,
      has_data:    true,
    });

  } catch (e: any) {
    console.error('[series-stats] error:', e.message);
    return NextResponse.json({ avg_sof: 0, avg_drivers: 0, splits: 0, total_races: 0, has_data: false });
  }
}