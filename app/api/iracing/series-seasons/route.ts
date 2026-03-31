// /app/api/iracing/series-seasons/route.ts
// Returns all series for the current season — works with or without auth

import { NextRequest, NextResponse } from "next/server";

const BASE = "https://members-ng.iracing.com/data";

async function iracingFetch(path: string, token: string) {
  const res = await fetch(`${BASE}/${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "User-Agent": "BoxBoxBoard/1.0",
    },
  });
  if (!res.ok) return null;
  const raw = await res.json();
  if (raw?.link) {
    const s3 = await fetch(raw.link);
    return s3.ok ? s3.json() : null;
  }
  return raw;
}

export async function GET(request: NextRequest) {
  const token = request.cookies.get("iracing_access_token")?.value;

  if (!token) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const data = await iracingFetch(
      "series/seasons?include_series=true",
      token,
    );
    if (!data)
      return NextResponse.json(
        { error: "Failed to fetch series" },
        { status: 500 },
      );

    const series: any[] = Array.isArray(data) ? data : (data?.seasons ?? []);
    console.log(`[series-seasons] fetched ${series.length} series`);

    return NextResponse.json(series, {
      headers: { "Cache-Control": "public, max-age=1800" },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
