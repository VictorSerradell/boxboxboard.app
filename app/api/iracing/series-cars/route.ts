import { NextRequest, NextResponse } from 'next/server';

const BASE = 'https://members-ng.iracing.com/data';

function formatLapTime(tenths: number): string {
  if (!tenths || tenths <= 0) return '—';
  const totalSec = tenths / 10000;
  const mins = Math.floor(totalSec / 60);
  const secs = (totalSec % 60).toFixed(3).padStart(6, '0');
  return mins > 0 ? `${mins}:${secs}` : `${secs}s`;
}

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const token = request.cookies.get('iracing_access_token')?.value;
  if (!token) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { searchParams } = request.nextUrl;
  const seriesId   = searchParams.get('series_id');
  const seasonYear = searchParams.get('season_year') ?? '2026';
  const seasonQ    = searchParams.get('season_quarter') ?? '2';
  const weekNum    = searchParams.get('race_week_num') ?? '0';
  const myRaces    = searchParams.get('my_races'); // pre-fetched by browser, optional

  if (!seriesId) return NextResponse.json({ cars: [] });

  // If browser already fetched and passed my_races, use it directly (no iRacing call needed)
  if (myRaces) {
    try {
      const allResults: any[] = JSON.parse(myRaces);
      const week = Number(weekNum);
      const weeks = [week, week - 1].filter(w => w >= 0);
      const filtered = allResults.filter((r: any) =>
        String(r.series_id) === seriesId && weeks.includes(r.race_week_num)
      );
      console.log('[series-cars] from my_races param, filtered:', filtered.length);
      return buildResponse(filtered, token);
    } catch {}
  }

  // Otherwise: fetch chunk URLs from iRacing (fast, <3s) and return to client
  // Client will download S3 chunks and re-call this endpoint with my_races param
  const params = new URLSearchParams({
    season_year:    seasonYear,
    season_quarter: seasonQ,
    series_id:      seriesId,
    event_types:    '5',
  });

  try {
    const res = await fetch(`${BASE}/results/search_series?${params}`, {
      headers: { Authorization: `Bearer ${token}`, 'User-Agent': 'BoxBoxBoard/1.0' },
      signal: AbortSignal.timeout(7000),
    });

    if (!res.ok) {
      console.error('[series-cars] iRacing HTTP', res.status);
      return NextResponse.json({ cars: [] });
    }

    const raw = await res.json();
    const numDirect = raw?.results?.length ?? 0;
    const numChunks = raw?.chunk_info?.chunk_file_names?.length ?? 0;
    console.log('[series-cars] direct:', numDirect, '| chunks:', numChunks);

    // Fast path: inline results
    if (numDirect > 0) {
      return buildResponse(raw.results, token);
    }

    // Return chunk URLs to browser for client-side download
    if (numChunks > 0) {
      return NextResponse.json({
        type: 'chunks',
        base_url: raw.chunk_info.base_download_url,
        chunks: raw.chunk_info.chunk_file_names,
      });
    }

    return NextResponse.json({ cars: [] });
  } catch (e: any) {
    console.error('[series-cars] error:', e.message);
    return NextResponse.json({ cars: [] });
  }
}

async function buildResponse(results: any[], token: string) {
  if (!results.length) return NextResponse.json({ cars: [] });

  // Get unique subsessions sorted by SOF, take top 3
  const subMap = new Map<number, number>();
  for (const r of results) {
    if (!subMap.has(r.subsession_id)) subMap.set(r.subsession_id, r.event_strength_of_field ?? 0);
  }
  const topIds = Array.from(subMap.entries()).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([id]) => id);

  const BASE = 'https://members-ng.iracing.com/data';
  const fetched = await Promise.allSettled(
    topIds.map(id =>
      fetch(`${BASE}/results/get?subsession_id=${id}`, {
        headers: { Authorization: `Bearer ${token}`, 'User-Agent': 'BoxBoxBoard/1.0' },
        signal: AbortSignal.timeout(7000),
      }).then(r => r.ok ? r.json() : null)
        .then(async (d: any) => {
          if (d?.link) {
            const s3 = await fetch(d.link, { signal: AbortSignal.timeout(7000) });
            return s3.ok ? s3.json() : null;
          }
          return d;
        })
    )
  );

  const driverBests: { name: string; car_name: string; car_id: number; lap: number }[] = [];
  for (const r of fetched) {
    if (r.status !== 'fulfilled' || !r.value) continue;
    const session = (r.value.session_results ?? []).find((s: any) => s.simsession_type === 3)
                 ?? (r.value.session_results ?? []).find((s: any) => s.simsession_type === 6);
    if (!session?.results) continue;
    for (const d of session.results) {
      const lap = d.best_qual_lap_time > 0 ? d.best_qual_lap_time : d.best_lap_time;
      if (!lap || lap <= 0) continue;
      driverBests.push({ name: d.display_name ?? '—', car_name: d.car_name ?? '—', car_id: d.car_id, lap });
    }
  }

  if (!driverBests.length) return NextResponse.json({ cars: [], total_drivers: 0 });

  driverBests.sort((a, b) => a.lap - b.lap);
  const top10 = driverBests.slice(0, 10);
  const carCount: Record<string, number> = {};
  for (const d of top10) carCount[d.car_name] = (carCount[d.car_name] ?? 0) + 1;
  const fastestCar = Object.entries(carCount).sort((a, b) => b[1] - a[1])[0]?.[0];
  const leaderLap = top10[0].lap;

  console.log('[series-cars] top car:', fastestCar, '| drivers:', driverBests.length);

  return NextResponse.json({
    type: 'cars',
    cars: top10.map((d, i) => ({
      position: i + 1, driver_name: d.name, car_name: d.car_name, car_id: d.car_id,
      best_lap: formatLapTime(d.lap),
      delta: i === 0 ? null : `+${((d.lap - leaderLap) / 10000).toFixed(3)}s`,
      is_fastest_car: d.car_name === fastestCar,
    })),
    fastest_car: fastestCar,
    total_drivers: driverBests.length,
  });
}