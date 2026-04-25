import { NextRequest, NextResponse } from 'next/server';
import { getValidToken } from '../../../lib/iracing-token';
import { searchSeries } from '../../../lib/iracing-search';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { token } = await getValidToken(request);
  if (!token) return NextResponse.json([], { status: 401 });

  const { searchParams } = request.nextUrl;
  const seasonYear = searchParams.get('season_year') ?? String(new Date().getFullYear());
  const seasonQ    = searchParams.get('season_quarter') ?? '2';

  try {
    const params = new URLSearchParams({
      season_year:    seasonYear,
      season_quarter: seasonQ,
      event_types:    '5',
    });

    const results = await searchSeries(params, token);
    console.log('[my-races] fetched', results.length, 'races for S' + seasonQ + ' ' + seasonYear);

    return NextResponse.json(results, {
      headers: { 'Cache-Control': 'private, max-age=300' },
    });
  } catch (e: any) {
    console.error('[my-races] error:', e.message);
    return NextResponse.json([]);
  }
}