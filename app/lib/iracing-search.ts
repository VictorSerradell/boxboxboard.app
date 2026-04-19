// /app/lib/iracing-search.ts
// Handles iRacing results/search_series endpoint which uses S3 chunks

const BASE = "https://members-ng.iracing.com/data";

/**
 * Calls results/search_series and returns all results,
 * fetching S3 chunks if the data is paginated.
 */
export async function searchSeries(
  params: URLSearchParams,
  token: string,
): Promise<any[]> {
  const res = await fetch(`${BASE}/results/search_series?${params}`, {
    headers: {
      Authorization: "Bearer " + token,
      "User-Agent": "BoxBoxBoard/1.0",
    },
  });

  if (!res.ok) {
    console.error("[search_series] HTTP error:", res.status);
    return [];
  }

  const raw = await res.json();

  // Format 1: simple link redirect
  if (raw?.link) {
    const s3 = await fetch(raw.link);
    const data = s3.ok ? await s3.json() : null;
    return data?.results ?? (Array.isArray(data) ? data : []);
  }

  // Format 2: chunked S3 files (search_series specific)
  const chunkFiles: string[] = raw?.chunk_info?.chunk_file_names ?? [];
  const baseUrl = raw?.chunk_info?.base_download_url ?? "";

  if (chunkFiles.length > 0 && baseUrl) {
    const allResults: any[] = [];
    // Fetch all chunks in parallel
    const fetches = await Promise.allSettled(
      chunkFiles.map((file) =>
        fetch(baseUrl + file).then((r) => (r.ok ? r.json() : [])),
      ),
    );
    for (const f of fetches) {
      if (f.status === "fulfilled") {
        const chunk = Array.isArray(f.value)
          ? f.value
          : (f.value?.results ?? []);
        allResults.push(...chunk);
      }
    }
    console.log(
      "[search_series] fetched",
      allResults.length,
      "results from",
      chunkFiles.length,
      "chunks",
    );
    return allResults;
  }

  // Format 3: results directly in response
  const direct = raw?.results ?? (Array.isArray(raw) ? raw : []);
  console.log("[search_series] direct results:", direct.length);
  return direct;
}
