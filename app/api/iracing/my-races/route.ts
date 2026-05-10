import { NextRequest, NextResponse } from "next/server";
import { getDb } from "../../../lib/mongodb";

const BASE = "https://members-ng.iracing.com/data";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
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
      signal: AbortSignal.timeout(8000),
    });

    if (res.status === 401)
      return NextResponse.json({ error: "token_expired" }, { status: 401 });
    if (!res.ok)
      return NextResponse.json({ error: "iracing_error" }, { status: 502 });

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

    let results: any[] = [];

    if (raw?.link) {
      const s3 = await fetch(raw.link, { signal: AbortSignal.timeout(8000) });
      if (s3.ok) results = await s3.json();
    } else if (numDirect > 0) {
      results = raw.results;
    } else if (numChunks > 0) {
      return NextResponse.json(
        {
          type: "chunks",
          base_url: raw.chunk_info.base_download_url,
          chunks: raw.chunk_info.chunk_file_names,
        },
        { headers: { "Cache-Control": "private, max-age=180" } },
      );
    } else {
      console.log("[my-races] no data");
      return NextResponse.json({ type: "empty", results: [] });
    }

    // Save subsession IDs to MongoDB for use by series-cars
    if (results.length > 0) {
      try {
        const db = await getDb();
        const col = db.collection("subsessions");
        const docs = results.map((r: any) => ({
          subsession_id: r.subsession_id,
          season_id: r.season_id,
          series_id: r.series_id,
          race_week_num: r.race_week_num,
          event_strength_of_field: r.event_strength_of_field ?? 0,
          start_time: r.start_time,
          track: r.track,
        }));

        // Upsert each subsession (idempotent)
        await Promise.all(
          docs.map((d) =>
            col.updateOne(
              { subsession_id: d.subsession_id },
              { $set: { ...d, savedAt: new Date() } },
              { upsert: true },
            ),
          ),
        );
        console.log("[my-races] saved", docs.length, "subsessions to MongoDB");
      } catch (e: any) {
        console.warn("[my-races] MongoDB save failed:", e.message);
      }
    }

    return NextResponse.json(
      { type: "inline", results },
      { headers: { "Cache-Control": "private, max-age=180" } },
    );
  } catch (e: any) {
    console.error("[my-races] error:", e.message);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
