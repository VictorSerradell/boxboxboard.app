// /app/api/iracing/series-assets/route.ts
// Series logo paths — iRacing assets endpoint is PUBLIC (no auth needed)

import { NextRequest, NextResponse } from "next/server";

const BASE = "https://members-ng.iracing.com/data";

async function publicFetch(path: string) {
  // Try without auth first (public endpoint)
  const res = await fetch(`${BASE}/${path}`, {
    headers: { "User-Agent": "BoxBoxBoard/1.0" },
  });
  if (!res.ok) return null;
  const raw = await res.json();
  // Follow S3 redirect if present
  if (raw?.link) {
    const s3 = await fetch(raw.link);
    return s3.ok ? s3.json() : null;
  }
  return raw;
}

async function authedFetch(path: string, token: string) {
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
  try {
    // Try public first
    let data = await publicFetch("series/assets");

    // If public fails, try with token
    if (!data) {
      const token = request.cookies.get("iracing_access_token")?.value;
      if (token) data = await authedFetch("series/assets", token);
    }

    if (!data) return NextResponse.json({});

    // Log first entry to see structure
    const firstKey = Object.keys(data)[0];
    if (firstKey) {
      const sample = data[firstKey];
      console.log("[series-assets] sample key:", firstKey);
      console.log(
        "[series-assets] sample fields:",
        Object.keys(sample ?? {}).join(", "),
      );
      console.log(
        "[series-assets] sample logo:",
        sample?.logo,
        "| logo_path:",
        sample?.logo_path,
        "| small_image:",
        sample?.small_image,
      );
    }
    console.log("[series-assets] total entries:", Object.keys(data).length);

    return NextResponse.json(data, {
      headers: { "Cache-Control": "public, max-age=3600" },
    });
  } catch (e: any) {
    console.error("[series-assets] error:", e.message);
    return NextResponse.json({});
  }
}
