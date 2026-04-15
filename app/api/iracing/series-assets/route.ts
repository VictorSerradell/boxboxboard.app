// /app/api/iracing/series-assets/route.ts
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic"; // uses cookies, can't be static

const BASE = "https://members-ng.iracing.com/data";

async function fetchAssets(token?: string) {
  const headers: Record<string, string> = { "User-Agent": "BoxBoxBoard/1.0" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${BASE}/series/assets`, { headers });
  if (!res.ok) return null;
  const raw = await res.json();
  if (raw?.link) {
    const s3 = await fetch(raw.link);
    return s3.ok ? s3.json() : null;
  }
  return raw;
}

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get("iracing_access_token")?.value;
    // Try authed first (more reliable), then unauthenticated
    let data = token ? await fetchAssets(token) : null;
    if (!data) data = await fetchAssets();
    if (!data)
      return NextResponse.json(
        {},
        { headers: { "Cache-Control": "public, max-age=60" } },
      );
    const count = Object.keys(data).length;
    console.log(
      "[series-assets] entries:",
      count,
      "| sample logo:",
      data[Object.keys(data)[0]]?.logo,
    );
    return NextResponse.json(data, {
      headers: { "Cache-Control": "public, max-age=3600" },
    });
  } catch (e: any) {
    console.error("[series-assets] error:", e.message);
    return NextResponse.json({});
  }
}
