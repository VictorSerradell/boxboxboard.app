// /app/lib/iracing-client.ts
// Frontend API client — all calls go through our Next.js proxy at /api/iracing/
// When iRacing credentials are present, real data is fetched.
// Without credentials, demo data is returned transparently.

import type {
  SeriesSeason,
  Car,
  Track,
  CarClass,
  Member,
  MemberAssets,
  SeasonInfo,
  LicenseLevel,
  CarCategory,
  SessionType,
} from "../types/iracing";

const API_BASE = "/api/iracing";

class IracingAPIError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "IracingAPIError";
  }
}

async function apiFetch<T>(
  path: string,
  params?: Record<string, string>,
): Promise<T> {
  const url = new URL(`${API_BASE}/${path}`, window.location.origin);
  if (params)
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url.toString(), {
    credentials: "include",
    redirect: "follow",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new IracingAPIError(res.status, err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

// ─── Season list ──────────────────────────────────────────────────────────────

// ─── Season list ──────────────────────────────────────────────────────────────

export async function getSeasonList(): Promise<SeasonInfo[]> {
  try {
    const res = await fetch("/api/iracing/current-season", {
      credentials: "include",
    });
    if (res.ok) {
      const data = await res.json();
      return [
        {
          season_year: data.season_year,
          season_quarter: data.season_quarter,
          label: `Season ${data.season_quarter} ${data.season_year}`,
          active: true,
        },
      ];
    }
  } catch {}

  // Hard fallback — S2 2026
  return [
    {
      season_year: 2026,
      season_quarter: 2,
      label: "Season 2 2026",
      active: true,
    },
  ];
}

// ─── Series seasons ───────────────────────────────────────────────────────────

export async function getSeriesSeasons(
  seasonYear: number,
  seasonQuarter: number,
): Promise<SeriesSeason[]> {
  try {
    // Use dedicated endpoint that properly follows S3 links
    const res = await fetch("/api/iracing/series-seasons", {
      credentials: "include",
    });
    if (!res.ok) throw new IracingAPIError(res.status, "series-seasons failed");
    const raw = await res.json();

    console.log(
      "[getSeriesSeasons] raw type:",
      typeof raw,
      Array.isArray(raw)
        ? `array[${(raw as any[]).length}]`
        : Object.keys(raw ?? {})
            .slice(0, 5)
            .join(","),
    );

    // Step 2: get race guide for exact week start dates
    let raceGuide: any[] = [];
    try {
      const guideRaw = await apiFetch<any>("race-guide", {
        season_year: String(seasonYear),
        season_quarter: String(seasonQuarter),
      });
      raceGuide = guideRaw?.sessions ?? guideRaw ?? [];
      console.log("[getSeriesSeasons] race guide entries:", raceGuide.length);
    } catch {
      // Race guide is optional — proceed without dates
    }

    // Build a lookup: season_id → week → start_time
    const guideLookup: Record<number, Record<number, string>> = {};
    for (const entry of raceGuide) {
      const sid = entry.season_id;
      const week = entry.race_week_num ?? 0;
      if (!guideLookup[sid]) guideLookup[sid] = {};
      if (!guideLookup[sid][week])
        guideLookup[sid][week] = entry.start_time ?? "";
    }

    // Step 3: transform raw API response to SeriesSeason[]
    const allSeasons: any[] = Array.isArray(raw) ? raw : (raw?.seasons ?? []);
    console.log(
      "[getSeriesSeasons] total seasons from API:",
      allSeasons.length,
    );

    // Filter to requested season — try exact match first, then just active
    let seasons = allSeasons.filter((s: any) => {
      const yr = s.season_year ?? s.race_season?.season_year;
      const qt = s.season_quarter ?? s.race_season?.season_quarter;
      return yr === seasonYear && qt === seasonQuarter;
    });

    // If no match (API may return only current season already), use all
    if (seasons.length === 0) {
      seasons = allSeasons;
      console.log(
        "[getSeriesSeasons] no season match, using all",
        allSeasons.length,
        "series",
      );
    } else {
      console.log(
        "[getSeriesSeasons] filtered to season:",
        seasonYear,
        seasonQuarter,
        "→",
        seasons.length,
        "series",
      );
    }

    return seasons.map((s: any): SeriesSeason => {
      const schedules = (s.schedules ?? s.race_weeks ?? []).map((w: any) => ({
        race_week_num: w.race_week_num ?? 0,
        track: {
          track_id: w.track?.track_id ?? w.track_id ?? 0,
          track_name: w.track?.track_name ?? w.track_name ?? "Unknown",
          config_name: w.track?.config_name ?? w.config_name ?? "",
        },
        start_date:
          guideLookup[s.season_id]?.[w.race_week_num] ?? w.start_date ?? "",
      }));

      // Normalize race_time_descriptors — RTDs are empty in real API
      // Duration comes from op_duration (minutes) or schedule_description
      const rawRtd = s.race_time_descriptors ?? [];
      const race_time_descriptors =
        Array.isArray(rawRtd) && rawRtd.length > 0
          ? rawRtd.map((r: any) => {
              const mins =
                r.session_minutes ??
                r.race_time_limit_minutes ??
                r.race_time_limit ??
                r.time_limit_minutes ??
                r.time_limit ??
                (r.repeating_units === "minutes" ? r.repeating_value : 0) ??
                0;
              return {
                repeating: r.repeating ?? false,
                session_minutes: Number(mins) || 0,
                start_time: r.start_time ?? "",
                day_offset: r.day_offset ?? r.day_offset_list ?? [],
              };
            })
          : [];

      // Real iRacing API: duration lives in op_duration (minutes) or schedules[0]
      let sessionMins = race_time_descriptors[0]?.session_minutes ?? 0;

      // Fallback 1: op_duration field (observed in series-fields log)
      if (sessionMins === 0 && s.op_duration) {
        sessionMins = Number(s.op_duration) || 0;
      }

      // Fallback 2: schedule_description text e.g. "Every 2h repeating"
      if (sessionMins === 0 && s.schedule_description) {
        const desc = (s.schedule_description as string).toLowerCase();
        const hourMatch = desc.match(/(\d+)\s*h/);
        const minMatch = desc.match(/(\d+)\s*m(?:in)?/);
        if (hourMatch)
          sessionMins =
            parseInt(hourMatch[1]) * 60 +
            (minMatch ? parseInt(minMatch[1]) : 0);
        else if (minMatch) sessionMins = parseInt(minMatch[1]);
      }

      // Fallback 3: look inside schedules for race_time fields
      if (
        sessionMins === 0 &&
        Array.isArray(s.schedules) &&
        s.schedules.length > 0
      ) {
        const sch = s.schedules[0];
        sessionMins =
          sch.race_time_limit_minutes ??
          sch.race_time_limit ??
          sch.session_minutes ??
          sch.time_limit_minutes ??
          0;
      }

      return {
        season_id: s.season_id,
        season_name: s.season_name ?? "",
        series_id: s.series_id,
        series_name: s.series_name ?? s.season_name ?? "",
        series_short_name: s.series_short_name ?? "",
        season_year: s.season_year ?? seasonYear,
        season_quarter: s.season_quarter ?? seasonQuarter,
        active: s.active ?? true,
        official: s.official ?? false,
        driver_changes: s.driver_changes ?? false,
        fixed_setup: s.fixed_setup ?? false,
        license_group: s.license_group ?? 0,
        car_class_ids: s.car_class_ids ?? [],
        allowed_licenses: s.allowed_licenses ?? [],
        multiclass: (s.car_class_ids?.length ?? 0) > 1,
        schedules,
        race_time_descriptors,
        next_race_session: s.next_race_session,
        op_duration: s.op_duration,
        schedule_description: s.schedule_description,
        // Computed UI fields
        category: mapCategory(
          s.license_group,
          s.category,
          s.series_name,
          s.season_name,
          s.driver_changes,
          sessionMins,
        ),
        minLicenseLevel: mapLicenseLevel(s.allowed_licenses, s.license_group),
        status: mapStatus(s.fixed_setup, s.official),
      };
    });
  } catch (err) {
    if (
      err instanceof IracingAPIError &&
      (err.status === 401 || err.status === 403)
    ) {
      return getDemoSeries(seasonYear, seasonQuarter);
    }
    // Any other error (network, etc) → also fall back to demo
    console.warn(
      "[BoxBoxBoard] iRacing API unavailable, using demo data:",
      err,
    );
    return getDemoSeries(seasonYear, seasonQuarter);
  }
}

// ─── Member info ──────────────────────────────────────────────────────────────

export async function getMemberInfo(): Promise<Member | null> {
  try {
    const raw = await apiFetch<any>("member/info");

    // licenses is an OBJECT with keys: oval, sports_car, formula_car, dirt_oval, dirt_road
    const licensesObj = raw?.licenses ?? {};
    const licenses = Object.values(licensesObj).map((l: any) => ({
      category_id: l.category_id,
      category: l.category ?? "",
      license_level: l.license_level ?? 0,
      safety_rating: l.safety_rating ?? 0,
      irating: l.irating ?? 0,
      color: l.color ?? "#64748B",
      group_name: l.group_name ?? mapGroupName(l.license_level ?? 0),
      group_id: l.group_id ?? 0,
      pro_promotable: l.pro_promotable ?? false,
      supersession_in_use: l.supersession_in_use ?? false,
    }));

    return {
      cust_id: raw.cust_id,
      username: raw.display_name ?? "",
      display_name: raw.display_name ?? "",
      club_name: raw.flair_name ?? "",
      licenses,
      profile: {
        cust_id: raw.cust_id,
        display_name: raw.display_name ?? "",
        member_since: raw.member_since,
        last_login: raw.last_login,
      },
    };
  } catch (e) {
    console.error("[getMemberInfo] error:", e);
    return null;
  }
}

// ─── Member assets (owned cars & tracks) ─────────────────────────────────────

export async function getMemberAssets(): Promise<MemberAssets> {
  try {
    const raw = await apiFetch<any>("member/assets");
    return {
      cars: raw.cars ?? raw.owned_cars ?? [],
      tracks: raw.tracks ?? raw.owned_tracks ?? [],
    };
  } catch {
    return { cars: [], tracks: [] };
  }
}

// ─── Other endpoints ─────────────────────────────────────────────────────────

export async function getCars(): Promise<Car[]> {
  return apiFetch("cars");
}
export async function getTracks(): Promise<Track[]> {
  return apiFetch("track/list");
}
export async function getCarClasses(): Promise<CarClass[]> {
  return apiFetch("carclass/list");
}
export async function getSeriesAssets() {
  return apiFetch<Record<string, unknown>>("series-assets");
}

// ─── Favorites (localStorage) ────────────────────────────────────────────────

const FAVORITES_KEY = "boxboxboard_favorites";

export function getFavoriteSeriesIds(): number[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(FAVORITES_KEY) ?? "[]");
  } catch {
    return [];
  }
}

export function toggleFavoriteSeries(seriesId: number): number[] {
  const current = getFavoriteSeriesIds();
  const next = current.includes(seriesId)
    ? current.filter((id) => id !== seriesId)
    : [...current, seriesId];
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(next));
  return next;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function mapCategory(
  licenseGroup: number,
  rawCategory?: string,
  seriesName?: string,
  seasonName?: string,
  driverChanges?: boolean,
  sessionMinutes?: number,
): CarCategory {
  const name = ((seriesName ?? "") + " " + (seasonName ?? "")).toLowerCase();
  const mins = sessionMinutes ?? 0;

  // Endurance: name keywords OR driver_changes (any series allowing driver swaps is endurance-style)
  if (
    name.includes("endurance") ||
    name.includes("endur") ||
    name.includes("24h") ||
    name.includes("24 h") ||
    name.includes("12h") ||
    name.includes("6h ") ||
    name.includes("ires") ||
    name.includes("imsa") ||
    name.includes("le mans") ||
    name.includes("daytona 24") ||
    name.includes("sebring") ||
    name.includes("bathurst") ||
    name.includes("spa 24") ||
    name.includes("nurburgring 24") ||
    driverChanges === true ||
    (mins >= 60 && mins !== 0)
  )
    return "Endurance";

  // Formula: iRacing returns category 'road' for formula series, detect by name
  if (
    name.includes("formula") ||
    name.includes(" f1 ") ||
    name.includes(" f1-") ||
    name.includes("dallara") ||
    name.includes("indycar") ||
    name.includes("indy car") ||
    name.includes("super formula") ||
    name.includes("ff1600") ||
    name.includes("lotus 79") ||
    name.includes("ir-04") ||
    name.includes("ir04") ||
    name.includes("skip barber") ||
    name.includes("pro mazda") ||
    name.includes("star mazda")
  )
    return "Formula Car";

  if (rawCategory) {
    const c = rawCategory.toLowerCase();
    if (c.includes("formula")) return "Formula Car";
    if (c.includes("oval") && c.includes("dirt")) return "Dirt Oval";
    if (c.includes("dirt")) return "Dirt Road";
    if (c.includes("oval")) return "Oval";
    if (c.includes("road") || c.includes("sports")) return "Sports Car";
  }

  const map: Record<number, CarCategory> = {
    1: "Oval",
    2: "Sports Car",
    3: "Dirt Oval",
    4: "Dirt Road",
    5: "Sports Car",
  };
  return map[licenseGroup] ?? "Sports Car";
}

function mapLicenseLevel(
  allowedLicenses: { min_level: number }[],
  licenseGroup: number,
): LicenseLevel {
  if (allowedLicenses?.length) {
    const min = allowedLicenses[0].min_level;
    if (min >= 0 && min <= 5) return min as LicenseLevel;
  }
  return Math.min(licenseGroup, 5) as LicenseLevel;
}

function mapStatus(fixedSetup: boolean, official: boolean): SessionType {
  if (fixedSetup) return "FIXED";
  if (official) return "RANKED";
  return "OPEN";
}

function mapGroupName(level: number): string {
  const names: Record<number, string> = {
    0: "Rookie",
    1: "D",
    2: "C",
    3: "B",
    4: "A",
    5: "PRO",
  };
  return names[Math.min(level, 5)] ?? "D";
}

// ─── Demo Data ────────────────────────────────────────────────────────────────

function getDemoSeries(year: number, quarter: number): SeriesSeason[] {
  const tracks = [
    {
      track_id: 1,
      track_name: "Sebring International Raceway",
      config_name: "Full Course",
    },
    { track_id: 2, track_name: "Spa-Francorchamps", config_name: "GP" },
    { track_id: 3, track_name: "Nürburgring", config_name: "Grand Prix" },
    {
      track_id: 4,
      track_name: "Silverstone Circuit",
      config_name: "Grand Prix",
    },
    { track_id: 5, track_name: "Monza", config_name: "Grand Prix" },
    { track_id: 6, track_name: "Watkins Glen", config_name: "Boot" },
    {
      track_id: 7,
      track_name: "Daytona International",
      config_name: "Road Course",
    },
    { track_id: 8, track_name: "Le Mans Circuit", config_name: "24H" },
    { track_id: 9, track_name: "Brands Hatch", config_name: "Grand Prix" },
    {
      track_id: 10,
      track_name: "Suzuka International",
      config_name: "Grand Prix",
    },
    {
      track_id: 11,
      track_name: "Indianapolis Motor Speedway",
      config_name: "Oval",
    },
    {
      track_id: 12,
      track_name: "Talladega Superspeedway",
      config_name: "Superspeedway",
    },
    {
      track_id: 13,
      track_name: "Charlotte Motor Speedway",
      config_name: "Oval",
    },
    { track_id: 14, track_name: "Bristol Motor Speedway", config_name: "Oval" },
  ];

  const ms = (ids: number[]) =>
    ids.map((id, i) => ({
      race_week_num: i,
      track: tracks.find((t) => t.track_id === id) ?? tracks[0],
      start_date: "",
    }));

  return [
    {
      season_id: 4501,
      series_id: 301,
      season_name: `iRacing Endurance Series ${year} S${quarter}`,
      series_name: "iRacing Endurance Series",
      series_short_name: "iRES",
      season_year: year,
      season_quarter: quarter,
      active: true,
      official: true,
      driver_changes: true,
      fixed_setup: false,
      license_group: 4,
      car_class_ids: [67, 68, 69],
      allowed_licenses: [{ group_name: "B", min_level: 2, max_level: 5 }],
      schedules: ms([8, 1, 2, 3, 6, 10]),
      status: "OPEN",
      category: "Endurance",
      minLicenseLevel: 2,
      race_time_descriptors: [{ repeating: true, session_minutes: 480 }],
    },
    {
      season_id: 4502,
      series_id: 302,
      season_name: `Porsche TAG Heuer Esports Supercup ${year} S${quarter}`,
      series_name: "Porsche TAG Heuer Esports Supercup",
      series_short_name: "PESC",
      season_year: year,
      season_quarter: quarter,
      active: true,
      official: true,
      driver_changes: false,
      fixed_setup: true,
      license_group: 4,
      car_class_ids: [83],
      allowed_licenses: [{ group_name: "A", min_level: 4, max_level: 5 }],
      schedules: ms([2, 4, 5, 3, 9, 7, 10, 6]),
      status: "FIXED",
      category: "Sports Car",
      minLicenseLevel: 4,
      race_time_descriptors: [{ repeating: true, session_minutes: 30 }],
    },
    {
      season_id: 4503,
      series_id: 303,
      season_name: `Formula iRacing ${year} S${quarter}`,
      series_name: "Formula iRacing",
      series_short_name: "FiR",
      season_year: year,
      season_quarter: quarter,
      active: true,
      official: true,
      driver_changes: false,
      fixed_setup: false,
      license_group: 3,
      car_class_ids: [99],
      allowed_licenses: [{ group_name: "B", min_level: 2, max_level: 5 }],
      schedules: ms([2, 5, 3, 4, 10, 7, 9]),
      status: "RANKED",
      category: "Formula Car",
      minLicenseLevel: 2,
      race_time_descriptors: [{ repeating: true, session_minutes: 20 }],
    },
    {
      season_id: 4504,
      series_id: 304,
      season_name: `NASCAR Cup Series ${year} S${quarter}`,
      series_name: "NASCAR Cup Series",
      series_short_name: "NCS",
      season_year: year,
      season_quarter: quarter,
      active: true,
      official: true,
      driver_changes: false,
      fixed_setup: true,
      license_group: 3,
      car_class_ids: [30],
      allowed_licenses: [{ group_name: "C", min_level: 2, max_level: 5 }],
      schedules: ms([11, 12, 13, 14, 11, 12, 13, 14]),
      status: "FIXED",
      category: "Oval",
      minLicenseLevel: 2,
      race_time_descriptors: [{ repeating: true, session_minutes: 60 }],
    },
    {
      season_id: 4505,
      series_id: 305,
      season_name: `IMSA Sportscar Championship ${year} S${quarter}`,
      series_name: "IMSA Sportscar Championship",
      series_short_name: "IMSA",
      season_year: year,
      season_quarter: quarter,
      active: true,
      official: true,
      driver_changes: true,
      fixed_setup: false,
      license_group: 3,
      car_class_ids: [67, 70],
      allowed_licenses: [{ group_name: "C", min_level: 2, max_level: 5 }],
      schedules: ms([1, 6, 2, 7, 8, 9, 4]),
      status: "OPEN",
      category: "Endurance",
      minLicenseLevel: 2,
      race_time_descriptors: [{ repeating: true, session_minutes: 100 }],
    },
    {
      season_id: 4506,
      series_id: 306,
      season_name: `Dirt Track Challenge ${year} S${quarter}`,
      series_name: "Dirt Track Challenge",
      series_short_name: "DTC",
      season_year: year,
      season_quarter: quarter,
      active: true,
      official: false,
      driver_changes: false,
      fixed_setup: false,
      license_group: 2,
      car_class_ids: [14],
      allowed_licenses: [{ group_name: "D", min_level: 1, max_level: 5 }],
      schedules: Array.from({ length: 8 }, (_, i) => ({
        race_week_num: i,
        track: {
          track_id: 100 + i,
          track_name: `Dirt Track ${i + 1}`,
          config_name: "Standard",
        },
        start_date: "",
      })),
      status: "UNRANKED",
      category: "Dirt Oval",
      minLicenseLevel: 1,
      race_time_descriptors: [{ repeating: true, session_minutes: 15 }],
    },
    {
      season_id: 4507,
      series_id: 307,
      season_name: `GT3 Challenge Series ${year} S${quarter}`,
      series_name: "GT3 Challenge Series",
      series_short_name: "GT3C",
      season_year: year,
      season_quarter: quarter,
      active: true,
      official: true,
      driver_changes: false,
      fixed_setup: false,
      license_group: 2,
      car_class_ids: [77, 78],
      allowed_licenses: [{ group_name: "D", min_level: 1, max_level: 5 }],
      schedules: ms([9, 4, 5, 2, 7, 6, 1, 3]),
      status: "OPEN",
      category: "Sports Car",
      minLicenseLevel: 1,
      race_time_descriptors: [{ repeating: true, session_minutes: 40 }],
    },
    {
      season_id: 4508,
      series_id: 308,
      season_name: `IndyCar Series ${year} S${quarter}`,
      series_name: "IndyCar Series",
      series_short_name: "ICS",
      season_year: year,
      season_quarter: quarter,
      active: true,
      official: true,
      driver_changes: false,
      fixed_setup: true,
      license_group: 4,
      car_class_ids: [11],
      allowed_licenses: [{ group_name: "A", min_level: 4, max_level: 5 }],
      schedules: ms([11, 7, 5, 11, 12, 4, 2, 10]),
      status: "RANKED",
      category: "Oval",
      minLicenseLevel: 4,
      race_time_descriptors: [{ repeating: true, session_minutes: 45 }],
    },
    {
      season_id: 4509,
      series_id: 309,
      season_name: `Rookie Oval Series ${year} S${quarter}`,
      series_name: "Rookie Oval Series",
      series_short_name: "ROS",
      season_year: year,
      season_quarter: quarter,
      active: true,
      official: true,
      driver_changes: false,
      fixed_setup: true,
      license_group: 0,
      car_class_ids: [4],
      allowed_licenses: [{ group_name: "Rookie", min_level: 0, max_level: 1 }],
      schedules: ms([13, 14, 11, 13, 14]),
      status: "FIXED",
      category: "Oval",
      minLicenseLevel: 0,
      race_time_descriptors: [{ repeating: true, session_minutes: 20 }],
    },
    {
      season_id: 4510,
      series_id: 310,
      season_name: `Super Formula ${year} S${quarter}`,
      series_name: "Super Formula",
      series_short_name: "SF",
      season_year: year,
      season_quarter: quarter,
      active: true,
      official: true,
      driver_changes: false,
      fixed_setup: false,
      license_group: 4,
      car_class_ids: [102],
      allowed_licenses: [{ group_name: "A", min_level: 4, max_level: 5 }],
      schedules: ms([10, 5, 2, 3, 4, 6, 9, 7]),
      status: "RANKED",
      category: "Formula Car",
      minLicenseLevel: 4,
      race_time_descriptors: [{ repeating: true, session_minutes: 25 }],
    },
    {
      season_id: 4511,
      series_id: 311,
      season_name: `Dirt Road Challenge ${year} S${quarter}`,
      series_name: "Dirt Road Challenge",
      series_short_name: "DRC",
      season_year: year,
      season_quarter: quarter,
      active: true,
      official: false,
      driver_changes: false,
      fixed_setup: false,
      license_group: 1,
      car_class_ids: [19],
      allowed_licenses: [{ group_name: "D", min_level: 1, max_level: 5 }],
      schedules: Array.from({ length: 6 }, (_, i) => ({
        race_week_num: i,
        track: {
          track_id: 200 + i,
          track_name: `Dirt Road ${i + 1}`,
          config_name: "Rally",
        },
        start_date: "",
      })),
      status: "UNRANKED",
      category: "Dirt Road",
      minLicenseLevel: 1,
      race_time_descriptors: [{ repeating: true, session_minutes: 20 }],
    },
    {
      season_id: 4512,
      series_id: 312,
      season_name: `LMP2 Endurance Challenge ${year} S${quarter}`,
      series_name: "LMP2 Endurance Challenge",
      series_short_name: "LMP2",
      season_year: year,
      season_quarter: quarter,
      active: true,
      official: true,
      driver_changes: true,
      fixed_setup: false,
      license_group: 3,
      car_class_ids: [72],
      allowed_licenses: [{ group_name: "C", min_level: 2, max_level: 5 }],
      schedules: ms([8, 2, 1, 6, 10, 4, 3]),
      status: "OPEN",
      category: "Endurance",
      minLicenseLevel: 2,
      race_time_descriptors: [{ repeating: true, session_minutes: 120 }],
    },
  ];
}
