// /app/api/iracing/series-cars/route.ts
// Strategy:
// 1. Try results/search_series with series_id (fast, works if user raced there)
// 2. If 0 results, fall back to results/search_series without series_id
//    to get recent subsession_ids for this series via any participant
// 3. Fetch up to 5 subsessions and aggregate car best lap times

import { NextRequest, NextResponse } from 'next/server';
import { getValidToken } from '../../../lib/iracing-token';

export const dynamic = 'force-dynamic';

const BASE = 'https://members-ng.iracing.com/data';

async function iracingFetch(path: string, token: string) {
  const res = await fetch(`${BASE}/${path}`, {
    headers: { Authorization: 'Bearer ' + token, 'User-Agent': 'BoxBoxBoard/1.0' },
  });
  if (!res.ok) throw new Error('iRacing ' + res.status + ': ' + path);
  const raw = await res.json();
  if (raw?.link) {
    const s3 = await fetch(raw.link);
    return s3.ok ? s3.json() : null;
  }
  return raw;
}

function formatLapTime(tenths: number): string {
  const totalSec = tenths / 10000;
  const mins = Math.floor(totalSec / 60);
  const secs = (totalSec % 60).toFixed(3).padStart(6, '0');
  return mins > 0 ? mins + ':' + secs : secs + 's';
}

export async function GET(request: NextRequest) {
  const token = await getValidToken(request);
  if (!token) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { searchParams } = request.nextUrl;
  const seriesId   = searchParams.get('series_id');
  const seasonYear = searchParams.get('season_year');
  const seasonQ    = searchParams.get('season_quarter');
  const weekNum    = searchParams.get('race_week_num') ?? '0';

  if (!seriesId) return NextResponse.json({ error: 'series_id required' }, { status: 400 });

  try {
    // Step 1: search_series WITH series_id — fast path if user raced there
    const directParams = new URLSearchParams({
      series_id:      seriesId,
      season_year:    seasonYear ?? String(new Date().getFullYear()),
      season_quarter: seasonQ ?? '1',
      race_week_num:  weekNum,
      event_types:    '5',
    });

    let subsessionIds: number[] = [];
    let directResults: any[] = [];

    try {
      const directData = await iracingFetch('results/search_series?' + directParams, token);
      directResults = directData?.results ?? directData?.data?.results ?? [];
      console.log('[series-cars] direct search results:', directResults.length);
    } catch (e) {
      console.warn('[series-cars] direct search failed:', (e as any).message);
    }

    if (directResults.length > 0) {
      // User raced here — we have their car data + event_best_lap_time per subsession
      // But each result is ONE driver entry (the user). We need all drivers.
      // Collect subsession_ids to fetch full results
      subsessionIds = Array.from(new Set(directResults.map((r: any) => r.subsession_id)));
    } else {
      // Step 2: search_series WITHOUT series_id — get recent subsessions for this series
      // by looking at ALL user's race history and finding matching series_id
      // This is still limited to series the user raced in. If they haven't, we cannot
      // get subsession IDs without a different public endpoint.
      // For now return empty — the race guide approach would be needed for full coverage.
      console.log('[series-cars] no races found for series', seriesId, 'week', weekNum);
      return NextResponse.json({ cars: [], total_drivers: 0, subsessions_sampled: 0 });
    }

    // Step 3: Fetch up to 8 subsessions for full driver+lap data
    const topSubIds = subsessionIds.slice(0, 8);
    const carMap: Record<number, { car_name: string; best_laps: number[] }> = {};

    const results = await Promise.allSettled(
      topSubIds.map(id => iracingFetch('results/get?subsession_id=' + id, token))
    );

    let totalDrivers = 0;
    for (const r of results) {
      if (r.status !== 'fulfilled' || !r.value) continue;
      const data = r.value;
      const raceSessions = (data?.session_results ?? [])
        .filter((s: any) => s.simsession_type === 6 || s.simsession_name === 'RACE');

      for (const session of raceSessions) {
        for (const driver of (session.results ?? [])) {
          const carId   = driver.car_id;
          const carName = driver.car_name ?? 'Car ' + carId;
          const lapTime = driver.best_lap_time;
          if (!carId || !lapTime || lapTime <= 0) continue;
          if (!carMap[carId]) carMap[carId] = { car_name: carName, best_laps: [] };
          carMap[carId].best_laps.push(lapTime);
          totalDrivers++;
        }
      }
    }

    // Sort by average of fastest 25% laps per car
    const cars = Object.entries(carMap)
      .filter(([, d]) => d.best_laps.length >= 1)
      .map(([carId, d]) => {
        const sorted = [...d.best_laps].sort((a, b) => a - b);
        const topN   = Math.max(1, Math.ceil(sorted.length * 0.25));
        const avg    = sorted.slice(0, topN).reduce((s, v) => s + v, 0) / topN;
        return { car_id: Number(carId), car_name: d.car_name, avg_lap_ms: avg,
                 lap_time: formatLapTime(avg), sample_size: d.best_laps.length, delta: null as string | null };
      })
      .sort((a, b) => a.avg_lap_ms - b.avg_lap_ms);

    const leaderMs = cars[0]?.avg_lap_ms ?? 0;
    cars.forEach((c, i) => {
      c.delta = i === 0 ? null : '+' + ((c.avg_lap_ms - leaderMs) / 10000).toFixed(3) + 's';
    });

    console.log('[series-cars] cars found:', cars.length, 'subsessions:', topSubIds.length);

    return NextResponse.json({
      cars,
      total_drivers:       totalDrivers,
      subsessions_sampled: topSubIds.length,
    });

  } catch (e: any) {
    console.error('[series-cars]', e.message);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}