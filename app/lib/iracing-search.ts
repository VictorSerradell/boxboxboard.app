// /app/lib/iracing-search.ts
// Handles iRacing results/search_series — returns ALL results including S3 chunks

const BASE = "https://members-ng.iracing.com/data";

export async function searchSeries(
  params: URLSearchParams,
  token: string,
): Promise<any[]> {
  const url = `${BASE}/results/search_series?${params}`;

  const res = await fetch(url, {
    headers: {
      Authorization: "Bearer " + token,
      "User-Agent": "BoxBoxBoard/1.0",
    },
    signal: AbortSignal.timeout(6000), // tight: must leave room for S3
  });

  if (!res.ok) {
    console.error("[search_series] HTTP", res.status);
    return [];
  }

  const raw = await res.json();
  const numChunks = raw?.chunk_info?.chunk_file_names?.length ?? 0;
  const numDirect = raw?.results?.length ?? 0;
  const numRows = raw?.chunk_info?.rows ?? 0;
  console.log(
    "[search_series] direct:",
    numDirect,
    "| chunks:",
    numChunks,
    "| rows:",
    numRows,
    "| has_link:",
    !!raw?.link,
  );

  // Format 1: S3 link redirect
  if (raw?.link) {
    const s3 = await fetch(raw.link, { signal: AbortSignal.timeout(6000) });
    if (!s3.ok) {
      console.error("[search_series] link S3 failed:", s3.status);
      return [];
    }
    const data = await s3.json();
    const items = Array.isArray(data) ? data : (data?.results ?? []);
    console.log("[search_series] link items:", items.length);
    return items;
  }

  // Format 2: results inline
  if (numDirect > 0) return raw.results;

  // Format 3: S3 chunks — fetch all in parallel with tight timeout
  const chunkFiles: string[] = raw?.chunk_info?.chunk_file_names ?? [];
  const baseUrl = raw?.chunk_info?.base_download_url ?? "";

  if (chunkFiles.length > 0 && baseUrl) {
    console.log("[search_series] fetching", chunkFiles.length, "chunks");
    const allResults: any[] = [];
    const fetches = await Promise.allSettled(
      chunkFiles.map((file) =>
        fetch(baseUrl + file, { signal: AbortSignal.timeout(7000) }).then(
          (r) => {
            console.log("[search_series] chunk HTTP:", r.status);
            return r.ok ? r.json() : [];
          },
        ),
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
    console.log("[search_series] chunk total:", allResults.length);
    return allResults;
  }

  console.log("[search_series] no data (rows:", numRows, ")");
  return [];
}
