// /app/api/user/schedule/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getUserDoc, upsertUserDoc } from "../../../lib/mongodb";

function getAuth(request: NextRequest): number | null {
  const custId = Number(request.cookies.get("iracing_cust_id")?.value);
  const hasToken = !!request.cookies.get("iracing_access_token")?.value;
  if (!hasToken || isNaN(custId) || custId === 0) return null;
  return custId;
}

export async function GET(request: NextRequest) {
  const custId = getAuth(request);
  if (!custId) return NextResponse.json({ schedule: [] });
  try {
    const doc = await getUserDoc(custId);
    return NextResponse.json({ schedule: doc?.schedule ?? [] });
  } catch {
    return NextResponse.json({ schedule: [] });
  }
}

export async function POST(request: NextRequest) {
  const custId = getAuth(request);
  if (!custId)
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  try {
    const body = await request.json();
    // Validate: must be array of numbers, max 50 series
    const schedule = body?.schedule;
    if (!Array.isArray(schedule))
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    const cleaned = schedule
      .filter((x: any) => typeof x === "number" && Number.isInteger(x) && x > 0)
      .slice(0, 50);
    await upsertUserDoc(custId, { schedule: cleaned });
    return NextResponse.json({ ok: true, schedule: cleaned });
  } catch {
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }
}
