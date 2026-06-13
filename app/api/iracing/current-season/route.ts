// /app/api/iracing/current-season/route.ts
// Returns current iRacing season info — public, no auth required

import { NextRequest, NextResponse } from "next/server";

const IRACING_BASE = "https://members-ng.iracing.com";

export async function GET(request: NextRequest) {
  const accessToken = request.cookies.get("iracing_access_token")?.value;

  if (accessToken) {
    try {
      const res = await fetch(
        `${IRACING_BASE}/data/series/seasons?include_series=false`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "User-Agent": "BoxBoxBoard/1.0",
          },
        },
      );
      if (res.ok) {
        const raw = await res.json();
        const data = raw?.link
          ? await fetch(raw.link).then((r) => r.json())
          : raw;
        const seasons: any[] = Array.isArray(data)
          ? data
          : (data?.seasons ?? []);
        const active = seasons.find((s: any) => s.active) ?? seasons[0];
        if (active) {
          return NextResponse.json({
            season_year: active.season_year,
            season_quarter: active.season_quarter,
          });
        }
      }
    } catch {}
  }

  // Fallback: date-based calculation with correct iRacing season boundaries
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth() + 1;
  const d = now.getDate();

  let q: number;
  if (m < 3 || (m === 3 && d < 11)) q = 1;
  else if (m < 6 || (m === 6 && d < 10)) q = 2;
  else if (m < 9 || (m === 9 && d < 9)) q = 3;
  else q = 4;

  return NextResponse.json({ season_year: y, season_quarter: q });
}
