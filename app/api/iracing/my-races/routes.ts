// /app/api/iracing/my-races/route.ts
// Only fetches chunk URLs from iRacing (fast, <3s)
// Client downloads S3 chunks directly from browser

import { NextRequest, NextResponse } from "next/server";
import { getValidToken } from "../../../lib/iracing-token";

const BASE = "https://members-ng.iracing.com/data";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { token, setCookieHeader } = await getValidToken(request);
  if (!token)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { searchParams } = request.nextUrl;
  const seasonYear =
    searchParams.get("season_year") ?? String(new Date().getFullYear());
  const seasonQ = searchParams.get("season_quarter") ?? "2";

  const params = new URLSearchParams({
    season_year: seasonYear,
    season_quarter: seasonQ,
    event_types: "5",
  });

  try {
    const res = await fetch(`${BASE}/results/search_series?${params}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "User-Agent": "BoxBoxBoard/1.0",
      },
      signal: AbortSignal.timeout(7000),
    });

    if (!res.ok) {
      console.error("[my-races] iRacing HTTP", res.status);
      return NextResponse.json(
        { error: "iracing_error", status: res.status },
        { status: 502 },
      );
    }

    const raw = await res.json();
    const numDirect = raw?.results?.length ?? 0;
    const numChunks = raw?.chunk_info?.chunk_file_names?.length ?? 0;
    console.log(
      "[my-races] direct:",
      numDirect,
      "| chunks:",
      numChunks,
      "| has_link:",
      !!raw?.link,
    );

    // Case 1: S3 single link redirect (rare)
    if (raw?.link) {
      return NextResponse.json(
        { type: "link", url: raw.link },
        {
          headers: { "Cache-Control": "private, max-age=180" },
        },
      );
    }

    // Case 2: results inline (fast path, no chunks)
    if (numDirect > 0) {
      const response = NextResponse.json(
        { type: "inline", results: raw.results },
        {
          headers: { "Cache-Control": "private, max-age=180" },
        },
      );
      if (setCookieHeader) response.headers.set("Set-Cookie", setCookieHeader);
      return response;
    }

    // Case 3: S3 chunks — return URLs to client, let browser download them
    const chunkFiles: string[] = raw?.chunk_info?.chunk_file_names ?? [];
    const baseUrl = raw?.chunk_info?.base_download_url ?? "";

    if (chunkFiles.length > 0 && baseUrl) {
      console.log(
        "[my-races] returning",
        chunkFiles.length,
        "chunk URLs to client",
      );
      const response = NextResponse.json(
        {
          type: "chunks",
          base_url: baseUrl,
          chunks: chunkFiles,
          rows: raw?.chunk_info?.rows ?? 0,
        },
        {
          headers: { "Cache-Control": "private, max-age=180" },
        },
      );
      if (setCookieHeader) response.headers.set("Set-Cookie", setCookieHeader);
      return response;
    }

    // No data
    console.log("[my-races] no data returned");
    return NextResponse.json({ type: "empty", results: [] });
  } catch (e: any) {
    console.error("[my-races] error:", e.message);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
