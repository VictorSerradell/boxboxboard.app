// /app/api/iracing/race-guide/route.ts
// Race guide with exact session start times — follows S3 redirect

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
  if (!token) return NextResponse.json({ sessions: [] }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const year = searchParams.get("season_year") ?? "";
  const quarter = searchParams.get("season_quarter") ?? "";

  try {
    const qs =
      year && quarter ? `?season_year=${year}&season_quarter=${quarter}` : "";
    const data = await iracingFetch(`season/race_guide${qs}`, token);
    if (!data) return NextResponse.json({ sessions: [] });

    const sessions = data?.sessions ?? data ?? [];
    console.log(
      "[race-guide] fetched",
      Array.isArray(sessions) ? sessions.length : "?",
      "sessions",
    );

    // Log first session to understand structure
    if (Array.isArray(sessions) && sessions.length > 0) {
      console.log(
        "[race-guide] sample session keys:",
        Object.keys(sessions[0]).join(", "),
      );
      console.log(
        "[race-guide] sample:",
        JSON.stringify(sessions[0]).slice(0, 300),
      );
    }

    return NextResponse.json(data, {
      headers: { "Cache-Control": "public, max-age=300" },
    });
  } catch (e: any) {
    console.error("[race-guide] error:", e.message);
    return NextResponse.json({ sessions: [] }, { status: 500 });
  }
}
