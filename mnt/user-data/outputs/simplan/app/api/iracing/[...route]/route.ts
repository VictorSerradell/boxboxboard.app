// /app/api/iracing/[...route]/route.ts
// Generic proxy for all iRacing /data/* endpoints
// Adds auth cookies and handles CORS transparently

import { NextRequest, NextResponse } from 'next/server';

const IRACING_BASE = 'https://members-ng.iracing.com';
const RATE_LIMIT_MS = 200; // Minimum ms between requests (iRacing has rate limits)

let lastRequestTime = 0;

async function rateLimit() {
  const now = Date.now();
  const diff = now - lastRequestTime;
  if (diff < RATE_LIMIT_MS) {
    await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_MS - diff));
  }
  lastRequestTime = Date.now();
}

async function iracingFetch(
  path: string,
  searchParams: URLSearchParams,
  cookieHeader: string,
  method: string = 'GET',
  body?: string
): Promise<Response> {
  await rateLimit();

  const url = new URL(`${IRACING_BASE}/data/${path}`);
  searchParams.forEach((value, key) => url.searchParams.set(key, value));

  const headers: Record<string, string> = {
    'Cookie': cookieHeader,
    'User-Agent': 'SimPlan/1.0',
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  };

  return fetch(url.toString(), {
    method,
    headers,
    body: method !== 'GET' ? body : undefined,
  });
}

// iRacing often returns a link to S3 instead of direct data
async function resolveIracingResponse(response: Response): Promise<unknown> {
  const data = await response.json();

  // iRacing sometimes returns { link: "https://..." } pointing to S3
  if (data && typeof data === 'object' && 'link' in data && typeof data.link === 'string') {
    const s3Response = await fetch(data.link);
    if (!s3Response.ok) {
      throw new Error(`Failed to fetch iRacing S3 data: ${s3Response.status}`);
    }
    return s3Response.json();
  }

  return data;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { route: string[] } }
) {
  const cookieHeader = request.headers.get('cookie') || '';
  const path = params.route.join('/');
  const searchParams = request.nextUrl.searchParams;

  // Don't expose auth endpoint through this proxy
  if (path === 'auth') {
    return NextResponse.json({ error: 'Use /api/iracing/auth directly' }, { status: 400 });
  }

  try {
    const iracingResponse = await iracingFetch(path, searchParams, cookieHeader);

    if (iracingResponse.status === 401) {
      return NextResponse.json(
        { error: 'Not authenticated. Please log in to your iRacing account.' },
        { status: 401 }
      );
    }

    if (iracingResponse.status === 429) {
      return NextResponse.json(
        { error: 'iRacing API rate limit exceeded. Please wait and try again.' },
        { status: 429 }
      );
    }

    if (!iracingResponse.ok) {
      return NextResponse.json(
        { error: `iRacing API error: ${iracingResponse.status} ${iracingResponse.statusText}` },
        { status: iracingResponse.status }
      );
    }

    const data = await resolveIracingResponse(iracingResponse);

    // Cache public data (seasons/series don't change often)
    const isPublicData = ['season', 'series', 'carclass', 'track', 'cars'].some(p =>
      path.startsWith(p)
    );

    const response = NextResponse.json(data);
    if (isPublicData) {
      response.headers.set('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=7200');
    }

    return response;
  } catch (error) {
    console.error(`iRacing proxy error for ${path}:`, error);
    return NextResponse.json(
      { error: 'Failed to fetch from iRacing API' },
      { status: 502 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { route: string[] } }
) {
  const cookieHeader = request.headers.get('cookie') || '';
  const path = params.route.join('/');
  const body = await request.text();
  const searchParams = request.nextUrl.searchParams;

  try {
    const iracingResponse = await iracingFetch(path, searchParams, cookieHeader, 'POST', body);

    if (!iracingResponse.ok) {
      return NextResponse.json(
        { error: `iRacing API error: ${iracingResponse.status}` },
        { status: iracingResponse.status }
      );
    }

    const data = await resolveIracingResponse(iracingResponse);
    return NextResponse.json(data);
  } catch (error) {
    console.error(`iRacing proxy POST error for ${path}:`, error);
    return NextResponse.json({ error: 'Proxy error' }, { status: 502 });
  }
}
