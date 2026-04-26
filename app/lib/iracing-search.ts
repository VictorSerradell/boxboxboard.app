// /app/lib/iracing-search.ts
// Handles iRacing results/search_series — returns ALL results including S3 chunks

const BASE = "https://members-ng.iracing.com/data";

export async function searchSeries(
  params: URLSearchParams,
  token: string,
): Promise<any[]> {
  const url = `${BASE}/results/search_series?${params}`;

  console.log(`[search_series] starting fetch → ${url}`);

  try {
    const res = await fetch(url, {
      headers: {
        Authorization: "Bearer " + token,
        "User-Agent": "BoxBoxBoard/1.0",
      },
      // ←←← AUMENTADO A 20 SEGUNDOS (tenemos maxDuration=180)
      signal: AbortSignal.timeout(20000),
    });

    if (!res.ok) {
      console.error("[search_series] HTTP", res.status);
      return [];
    }

    const raw = await res.json();
    const numChunks = raw?.chunk_info?.chunk_file_names?.length ?? 0;
    const numDirect = raw?.results?.length ?? 0;
    const numRows = raw?.chunk_info?.rows ?? 0;
    const hasLink = !!raw?.link;

    console.log(
      "[search_series] status OK | direct:",
      numDirect,
      "| chunks:",
      numChunks,
      "| rows:",
      numRows,
      "| has_link:",
      hasLink,
    );

    // Format 1: S3 link redirect
    if (raw?.link) {
      console.log("[search_series] fetching S3 link");
      const s3 = await fetch(raw.link, {
        signal: AbortSignal.timeout(20000),
      });
      if (!s3.ok) {
        console.error("[search_series] link S3 failed:", s3.status);
        return [];
      }
      const data = await s3.json();
      const items = Array.isArray(data) ? data : (data?.results ?? []);
      console.log("[search_series] S3 link items:", items.length);
      return items;
    }

    // Format 2: results inline
    if (numDirect > 0) {
      console.log("[search_series] returning direct results");
      return raw.results;
    }

    // Format 3: S3 chunks — fetch all in parallel
    const chunkFiles: string[] = raw?.chunk_info?.chunk_file_names ?? [];
    const baseUrl = raw?.chunk_info?.base_download_url ?? "";

    if (chunkFiles.length > 0 && baseUrl) {
      console.log(
        "[search_series] fetching",
        chunkFiles.length,
        "chunks in parallel",
      );
      const allResults: any[] = [];

      const fetches = await Promise.allSettled(
        chunkFiles.map((file) =>
          fetch(baseUrl + file, {
            signal: AbortSignal.timeout(25000), // 25s por chunk
          }).then((r) => {
            console.log(`[search_series] chunk ${file} → HTTP ${r.status}`);
            return r.ok ? r.json() : [];
          }),
        ),
      );

      for (const f of fetches) {
        if (f.status === "fulfilled") {
          const chunk = Array.isArray(f.value)
            ? f.value
            : (f.value?.results ?? []);
          allResults.push(...chunk);
        } else {
          console.error("[search_series] chunk error:", f.reason?.message);
        }
      }

      console.log("[search_series] total from chunks:", allResults.length);
      return allResults;
    }

    console.log("[search_series] no data (rows:", numRows, ")");
    return [];
  } catch (e: any) {
    if (e.name === "TimeoutError") {
      console.error(
        "[search_series] ❌ TIMEOUT en fetch principal o S3/chunks",
      );
    } else {
      console.error("[search_series] ❌ error:", e.message);
    }
    return [];
  }
}
