import { NextRequest, NextResponse } from "next/server";

const BASE = "https://members-ng.iracing.com/data";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  // Use access token directly — no refresh to stay under 10s Vercel limit
  const token = request.cookies.get("iracing_access_token")?.value;
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
      signal: AbortSignal.timeout(8000), // max 8s, leave 2s buffer
    });

    if (res.status === 401) {
      return NextResponse.json({ error: "token_expired" }, { status: 401 });
    }

    if (!res.ok) {
      console.error("[my-races] iRacing HTTP", res.status);
      return NextResponse.json({ error: "iracing_error" }, { status: 502 });
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

    if (raw?.link) {
      return NextResponse.json(
        { type: "link", url: raw.link },
        {
          headers: { "Cache-Control": "private, max-age=180" },
        },
      );
    }

    if (numDirect > 0) {
      return NextResponse.json(
        { type: "inline", results: raw.results },
        {
          headers: { "Cache-Control": "private, max-age=180" },
        },
      );
    }

    const chunkFiles: string[] = raw?.chunk_info?.chunk_file_names ?? [];
    const baseUrl = raw?.chunk_info?.base_download_url ?? "";

    if (chunkFiles.length > 0 && baseUrl) {
      console.log(
        "[my-races] returning",
        chunkFiles.length,
        "chunk URLs to client",
      );
      return NextResponse.json(
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
    }

    console.log("[my-races] no data");
    return NextResponse.json({ type: "empty", results: [] });
  } catch (e: any) {
    console.error("[my-races] error:", e.message);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
