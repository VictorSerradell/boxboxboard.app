// /app/api/user/favorites/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getUserDoc, upsertUserDoc } from "../../../lib/mongodb";

function getAuth(request: NextRequest): number | null {
  // Require BOTH iracing_cust_id AND iracing_access_token to be present
  // This prevents cookie forgery attacks
  const custId = Number(request.cookies.get("iracing_cust_id")?.value);
  const hasToken = !!request.cookies.get("iracing_access_token")?.value;
  if (!hasToken || isNaN(custId) || custId === 0) return null;
  return custId;
}

export async function GET(request: NextRequest) {
  const custId = getAuth(request);
  if (!custId) return NextResponse.json({ favorites: [] });
  try {
    const doc = await getUserDoc(custId);
    return NextResponse.json({ favorites: doc?.favorites ?? [] });
  } catch {
    return NextResponse.json({ favorites: [] });
  }
}

export async function POST(request: NextRequest) {
  const custId = getAuth(request);
  if (!custId)
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  try {
    const body = await request.json();
    // Validate: must be array of numbers, max 500 items
    const favorites = body?.favorites;
    if (!Array.isArray(favorites))
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    const cleaned = favorites
      .filter((x: any) => typeof x === "number" && Number.isInteger(x) && x > 0)
      .slice(0, 500);
    await upsertUserDoc(custId, { favorites: cleaned });
    return NextResponse.json({ ok: true, favorites: cleaned });
  } catch {
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }
}
