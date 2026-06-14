// /app/api/iracing/current-season/route.ts
// Returns current iRacing season — date-based using official season start dates
import { NextRequest, NextResponse } from "next/server";

// Official iRacing 2026 season start dates (from published PDF calendars)
// Format: [year, month (1-indexed), day]
const SEASON_STARTS: [number, number, number][] = [
  [2026, 6, 16], // S3 2026 starts June 16
  [2026, 3, 11], // S2 2026 starts March 11
  [2026, 1, 6],  // S1 2026 starts January 6 (approximate)
];

export async function GET(_request: NextRequest) {
  const now = new Date();

  // Find the most recent season start that is <= today
  for (const [y, m, d] of SEASON_STARTS) {
    const start = new Date(y, m - 1, d); // month is 0-indexed in JS
    if (now >= start) {
      // Calculate quarter from month
      let q: number;
      if (m <= 3) q = 1;
      else if (m <= 6) q = 2;
      else if (m <= 9) q = 3;
      else q = 4;
      return NextResponse.json({ season_year: y, season_quarter: q });
    }
  }

  // Fallback
  return NextResponse.json({ season_year: 2026, season_quarter: 2 });
}