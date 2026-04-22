// /app/api/iracing/series-assets/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getValidToken } from '../../../lib/iracing-token';

export const dynamic = 'force-dynamic';

const BASE = 'https://members-ng.iracing.com/data';

async function fetchAssets(token?: string) {
  const headers: Record<string, string> = { 'User-Agent': 'BoxBoxBoard/1.0' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${BASE}/series/assets`, { headers, signal: AbortSignal.timeout(10000) });
  if (!res.ok) return null;
  const raw = await res.json();
  if (raw?.link) {
    const s3 = await fetch(raw.link, { signal: AbortSignal.timeout(10000) });
    return s3.ok ? s3.json() : null;
  }
  return raw;
}

export async function GET(request: NextRequest) {
  try {
    const token = await getValidToken(request); // uses refresh if needed
    let data = token ? await fetchAssets(token) : null;
    if (!data) data = await fetchAssets(); // public fallback
    if (!data) return NextResponse.json({}, { headers: { 'Cache-Control': 'public, max-age=60' } });
    const count = Object.keys(data).length;
    console.log('[series-assets] entries:', count, '| sample logo:', data[Object.keys(data)[0]]?.logo);
    return NextResponse.json(data, { headers: { 'Cache-Control': 'public, max-age=3600' } });
  } catch (e: any) {
    console.error('[series-assets] error:', e.message);
    return NextResponse.json({});
  }
}