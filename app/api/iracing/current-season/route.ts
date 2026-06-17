// /app/api/iracing/current-season/route.ts
import { NextRequest, NextResponse } from "next/server";

// Official iRacing season start dates + quarter
// Format: [year, quarter, month (1-indexed), day]
const SEASON_STARTS: [number, number, number, number][] = [
  [2026, 3, 6, 16], // S3 2026 starts June 16
  [2026, 2, 3, 11], // S2 2026 starts March 11
  [2026, 1, 1,  6], // S1 2026 starts January 6
];

export async function GET(_request: NextRequest) {
  const now = new Date();
  for (const [y, q, m, d] of SEASON_STARTS) {
    const start = new Date(y, m - 1, d);
    if (now >= start) {
      return NextResponse.json(
        { season_year: y, season_quarter: q },
        { headers: { 'Cache-Control': 'no-store' } }
      );
    }
  }
  return NextResponse.json(
    { season_year: 2026, season_quarter: 2 },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}