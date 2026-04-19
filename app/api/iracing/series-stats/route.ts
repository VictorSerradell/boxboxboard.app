// /app/api/iracing/series-stats/route.ts
// Uses results/season_results — returns all sessions for a season week (all drivers)

import { NextRequest, NextResponse } from 'next/server';
import { getValidToken } from '../../../lib/iracing-token';

const BASE = 'https://members-ng.iracing.com/data';

async function iracingFetch(path: string, token: string) {
  const res = await fetch(`${BASE}/${path}`, {
    headers: { Authorization: `Bearer ${token}`, 'User-Agent': 'BoxBoxBoard/1.0' },
  });
  console.log('[series-stats] iracingFetch', path.split('?')[0], 'status:', res.status);
  if (!res.ok) throw new Error(`iRacing ${res.status}: ${path}`);
  const raw = await res.json();
  console.log('[series-stats] raw top-level keys:', Object.keys(raw ?? {}).join(', '));
  if (raw?.link) {
    const s3 = await fetch(raw.link);
    return s3.ok ? s3.json() : null;
  }
  // Chunked S3 format
  const chunkFiles: string[] = raw?.chunk_info?.chunk_file_names ?? [];
  const baseUrl = raw?.chunk_info?.base_download_url ?? '';
  if (chunkFiles.length > 0 && baseUrl) {
    console.log('[series-stats] fetching', chunkFiles.length, 'chunks from S3');
    const all: any[] = [];
    const fetches = await Promise.allSettled(
      chunkFiles.map(f => fetch(baseUrl + f).then(r => r.ok ? r.json() : []))
    );
    for (const f of fetches) {
      if (f.status === 'fulfilled') {
        const chunk = Array.isArray(f.value) ? f.value : (f.value?.results ?? f.value?.sessions ?? []);
        all.push(...chunk);
      }
    }
    console.log('[series-stats] total from chunks:', all.length);
    return all.length > 0 ? all : (raw?.results ?? raw?.sessions ?? raw);
  }
  return raw?.results ?? raw?.sessions ?? raw;
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const seasonId  = searchParams.get('season_id');
  const weekNum   = searchParams.get('race_week_num') ?? '0';

  if (!seasonId) return NextResponse.json({ error: 'season_id required' }, { status: 400 });

  const token = await getValidToken(request);
  if (!token) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  try {
    // results/season_results returns all race sessions for a season/week
    const rawData = await iracingFetch(
      `results/season_results?season_id=${seasonId}&race_week_num=${weekNum}&event_type=5`,
      token
    );

    console.log('[series-stats] raw type:', typeof rawData, 'isArray:', Array.isArray(rawData));
    if (rawData && typeof rawData === 'object' && !Array.isArray(rawData)) {
      console.log('[series-stats] raw keys:', Object.keys(rawData).join(', '));
      if (rawData.results) console.log('[series-stats] results count:', rawData.results.length);
    }

    const sessions: any[] = Array.isArray(rawData) ? rawData : (rawData?.results ?? rawData?.sessions ?? []);
    console.log('[series-stats] season_id:', seasonId, 'week:', weekNum, 'sessions:', sessions.length);

    if (!sessions.length) {
      return NextResponse.json({ avg_sof: 0, avg_drivers: 0, splits: 0, total_races: 0, has_data: false });
    }

    // Aggregate stats from sessions
    const totalRaces   = sessions.length;
    const totalSof     = sessions.reduce((s: number, r: any) => s + (r.event_strength_of_field ?? r.sof ?? 0), 0);
    const totalDrivers = sessions.reduce((s: number, r: any) => s + (r.num_drivers ?? r.driver_count ?? 0), 0);

    // Count splits by grouping sessions at the same start_time
    const byTime = new Map<string, number>();
    for (const s of sessions) {
      const t = s.start_time ?? s.session_start_time ?? '';
      byTime.set(t, (byTime.get(t) ?? 0) + 1);
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
    console.error('[series-stats]', e.message);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}