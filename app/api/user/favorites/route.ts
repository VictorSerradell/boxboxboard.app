// /app/api/user/favorites/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getUserDoc, upsertUserDoc } from "../../../lib/mongodb";

function getCustId(request: NextRequest): number | null {
  const val = request.cookies.get("iracing_cust_id")?.value;
  const id = Number(val);
  return isNaN(id) || id === 0 ? null : id;
}

export async function GET(request: NextRequest) {
  const custId = getCustId(request);
  if (!custId) return NextResponse.json({ favorites: [] });
  try {
    const doc = await getUserDoc(custId);
    return NextResponse.json({ favorites: doc?.favorites ?? [] });
  } catch {
    return NextResponse.json({ favorites: [] });
  }
}

export async function POST(request: NextRequest) {
  const custId = getCustId(request);
  if (!custId)
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  try {
    const { favorites } = await request.json();
    await upsertUserDoc(custId, { favorites });
    return NextResponse.json({ ok: true, favorites });
  } catch {
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }
}
