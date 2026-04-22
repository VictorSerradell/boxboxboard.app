// /app/api/iracing/series-seasons/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getValidToken } from '../../../lib/iracing-token';
import { getSeriesSeasons } from '../../../lib/iracing-client';

export async function GET(request: NextRequest) {
  const token = await getValidToken(request);

  try {
    const BASE = 'https://members-ng.iracing.com/data';

    if (!token) {
      // Unauthenticated — return demo data from client lib
      const { season_year, season_quarter } = Object.fromEntries(request.nextUrl.searchParams);
      const data = await getSeriesSeasons(
        Number(season_year ?? 2026),
        Number(season_quarter ?? 2)
      );
      return NextResponse.json(data);
    }

    // Authenticated — fetch from iRacing API
    const res = await fetch(`${BASE}/series/seasons?include_series=true`, {
      headers: { Authorization: `Bearer ${token}`, 'User-Agent': 'BoxBoxBoard/1.0' },
      signal: AbortSignal.timeout(15000),
    });

    console.log('[series-seasons] iRacing status:', res.status);
    if (!res.ok) throw new Error(`iRacing ${res.status}`);

    const raw = await res.json();
    let data: any = raw;

    if (raw?.link) {
      console.log('[series-seasons] following S3 link...');
      const s3 = await fetch(raw.link, { signal: AbortSignal.timeout(20000) });
      if (!s3.ok) throw new Error(`S3 ${s3.status}`);
      data = await s3.json();
    }

    const series: any[] = Array.isArray(data) ? data : (data?.seasons ?? []);
    console.log(`[series-seasons] fetched ${series.length} series`);

    if (!series.length) throw new Error('Empty series list');

    // Debug logs
    const noRtd = series.filter((x: any) => !x.race_time_descriptors?.length).length;
    console.log(`[rtd] ${noRtd}/${series.length} series have empty race_time_descriptors`);
    const withOpDur = series.filter((s: any) => s.op_duration > 0).slice(0, 5);
    console.log('[op_duration] sample:', withOpDur.map((s: any) => `${s.season_name}=${s.op_duration}`).join(', '));
    const withSchedDesc = series.filter((s: any) => s.schedule_description).slice(0, 3);
    console.log('[schedule_description] sample:', withSchedDesc.map((s: any) => `"${s.schedule_description}"`).join(', '));
    const withSchedules = series.find((s: any) => s.schedules?.length > 0);
    if (withSchedules) {
      console.log('[schedule-keys]:', Object.keys(withSchedules.schedules[0]).join(', '));
      console.log('[schedule-sample]:', JSON.stringify(withSchedules.schedules[0]).slice(0, 300));
    }
    const dcSeries = series.filter((s: any) => s.driver_changes === true);
    console.log(`[driver_changes] ${dcSeries.length} series with driver_changes=true:`, dcSeries.map((s: any) => s.series_name ?? s.season_name).slice(0, 10).join(', '));
    if (series.length > 0) console.log('[series-fields] keys:', Object.keys(series[0]).join(', '));
    const enduranceLike = series.filter((s: any) => {
      const n = (s.series_name ?? s.season_name ?? '').toLowerCase();
      return n.includes('endurance') || n.includes('imsa') || n.includes('24h') || n.includes('ires');
    });
    console.log(`[endurance] ${enduranceLike.length} endurance-like series by name:`, enduranceLike.map((s: any) => s.series_name ?? s.season_name).join(', '));

    return NextResponse.json(series, { headers: { 'Cache-Control': 'public, max-age=1800' } });

  } catch (e: any) {
    console.error('[series-seasons] error:', e.message);
    // Fallback to client-side processing
    try {
      const { season_year, season_quarter } = Object.fromEntries(request.nextUrl.searchParams);
      const data = await getSeriesSeasons(Number(season_year ?? 2026), Number(season_quarter ?? 2));
      return NextResponse.json(data);
    } catch {
      return NextResponse.json({ error: e.message }, { status: 500 });
    }
  }
}