import { NextRequest, NextResponse } from "next/server";

const IRACING_BASE = "https://members-ng.iracing.com";

async function iracingFetch(path: string, token: string) {
  const res = await fetch(`${IRACING_BASE}/data/${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "User-Agent": "BoxBoxBoard/1.0",
    },
  });
  if (!res.ok) throw new Error(`iRacing API error: ${res.status}`);
  const raw = await res.json();
  if (raw?.link) {
    const s3 = await fetch(raw.link);
    return s3.json();
  }
  return raw;
}

function toArray<T = any>(value: any): T[] {
  if (Array.isArray(value)) return value as T[];
  if (!value || typeof value !== "object") return [];
  const nested = ["results", "drivers", "standings", "season_results", "stats"];
  for (const key of nested) {
    if (Array.isArray((value as any)[key])) return (value as any)[key];
  }
  return [];
}

function getNumeric(value: any): number {
  if (typeof value === "number") return value;
  if (typeof value === "string" && value.trim()) {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function normalizeTop100(rows: any[]): any[] {
  const withRank = rows.filter((r) => getNumeric(r?.rank ?? r?.position) > 0);
  if (withRank.length > 0) {
    return withRank
      .sort(
        (a, b) => getNumeric(a.rank ?? a.position) - getNumeric(b.rank ?? b.position),
      )
      .slice(0, 100);
  }

  const withPoints = rows.filter((r) => getNumeric(r?.points) > 0);
  if (withPoints.length > 0) {
    return withPoints.sort((a, b) => getNumeric(b.points) - getNumeric(a.points)).slice(0, 100);
  }

  return rows.slice(0, 100);
}

function extractCarVotes(rows: any[]) {
  const counts = new Map<number, number>();

  for (const row of rows) {
    const candidates = [
      row?.car_id,
      row?.car?.car_id,
      row?.driver?.car_id,
      row?.winner_car_id,
      row?.entry?.car_id,
    ]
      .map(getNumeric)
      .filter((n) => n > 0);
    if (candidates.length === 0) continue;

    const carId = candidates[0];
    const weight = Math.max(
      1,
      getNumeric(row?.starts) || getNumeric(row?.entries) || getNumeric(row?.races),
    );
    counts.set(carId, (counts.get(carId) ?? 0) + weight);
  }

  return counts;
}

async function resolveCarNameMap(token: string): Promise<Map<number, string>> {
  const raw = await iracingFetch("car/get", token).catch(() => null);
  const rows = toArray(raw);
  const map = new Map<number, string>();
  for (const row of rows) {
    const id = getNumeric(row?.car_id);
    const name =
      row?.car_name ??
      row?.name ??
      row?.car_name_abbreviated ??
      (id > 0 ? `Car ${id}` : null);
    if (id > 0 && typeof name === "string" && name.trim()) {
      map.set(id, name);
    }
  }
  return map;
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const seriesId = searchParams.get("series_id");
  const seasonYear = searchParams.get("season_year");
  const seasonQuarter = searchParams.get("season_quarter");

  if (!seriesId) {
    return NextResponse.json({ error: "series_id required" }, { status: 400 });
  }

  const token = request.cookies.get("iracing_access_token")?.value;
  if (!token) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    let source = "stats_series";
    let rows: any[] = [];

    try {
      const params = new URLSearchParams({
        series_id: String(seriesId),
        event_types: "5",
      });
      if (seasonYear) params.set("season_year", seasonYear);
      if (seasonQuarter) params.set("season_quarter", seasonQuarter);

      const raw = await iracingFetch(`stats/series?${params}`, token);
      rows = toArray(raw);
    } catch {
      source = "results_search_series";
    }

    if (rows.length === 0) {
      const params = new URLSearchParams({
        series_id: String(seriesId),
        official_only: "true",
        event_types: "5",
      });
      if (seasonYear) params.set("season_year", seasonYear);
      if (seasonQuarter) params.set("season_quarter", seasonQuarter);
      const raw = await iracingFetch(`results/search_series?${params}`, token);
      rows = toArray(raw);
    }

    const top100 = normalizeTop100(rows);
    const counts = extractCarVotes(top100);

    if (counts.size === 0) {
      return NextResponse.json({
        has_data: false,
        car_id: 0,
        car_name: "",
        uses: 0,
        sample_size: top100.length,
        source,
      });
    }

    const [topCarId, uses] =
      Array.from(counts.entries()).sort((a, b) => b[1] - a[1])[0] ?? [0, 0];

    const carMap = await resolveCarNameMap(token);
    const carName = carMap.get(topCarId) ?? `Car ${topCarId}`;

    return NextResponse.json({
      has_data: true,
      car_id: topCarId,
      car_name: carName,
      uses,
      sample_size: top100.length,
      source,
    });
  } catch (e: any) {
    console.error("[series-top-car]", e.message);
    return NextResponse.json({
      has_data: false,
      car_id: 0,
      car_name: "",
      uses: 0,
      sample_size: 0,
      source: "error_fallback",
      error: e.message,
    });
  }
}
