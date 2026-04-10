// /app/api/iracing/series-assets/route.ts
// Returns series logo paths — follows S3 redirect like series-seasons

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
  if (!token) return NextResponse.json({}, { status: 401 });

  try {
    const data = await iracingFetch("series/assets", token);
    if (!data) return NextResponse.json({});

    // Log first entry to see structure
    const firstKey = Object.keys(data)[0];
    if (firstKey)
      console.log(
        "[series-assets] sample:",
        JSON.stringify(data[firstKey]).slice(0, 200),
      );

    return NextResponse.json(data, {
      headers: { "Cache-Control": "public, max-age=3600" },
    });
  } catch (e: any) {
    return NextResponse.json({}, { status: 500 });
  }
}
