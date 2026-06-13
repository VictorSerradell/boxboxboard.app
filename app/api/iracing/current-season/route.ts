// /app/api/iracing/current-season/route.ts
// Returns current iRacing season — date-based calculation
import { NextRequest, NextResponse } from "next/server";

export async function GET(_request: NextRequest) {
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
