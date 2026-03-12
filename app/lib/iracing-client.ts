// /app/lib/iracing-client.ts
// Frontend API client — all calls go through our Next.js proxy

import type {
  SeriesSeason,
  Car,
  Track,
  CarClass,
  Member,
  MemberAssets,
  SeasonInfo,
} from '../types/iracing';

const API_BASE = '/api/iracing';

class IracingAPIError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
    this.name = 'IracingAPIError';
  }
}

async function apiFetch<T>(path: string, params?: Record<string, string>): Promise<T> {
  const url = new URL(`${API_BASE}/${path}`, window.location.origin);
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  }

  const res = await fetch(url.toString(), {
    credentials: 'include', // Send cookies
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new IracingAPIError(res.status, err.error || `HTTP ${res.status}`);
  }

  return res.json();
}

// ─── Auth ────────────────────────────────────────────────────────────────────

export async function login(username: string, password: string) {
  const res = await fetch(`${API_BASE}/auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
    credentials: 'include',
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' }));
    throw new IracingAPIError(res.status, err.error || 'Login failed');
  }

  return res.json();
}

export async function logout() {
  await fetch(`${API_BASE}/auth`, { method: 'DELETE', credentials: 'include' });
}

// ─── Seasons ─────────────────────────────────────────────────────────────────

export async function getSeasonList(): Promise<SeasonInfo[]> {
  // Build season list based on current date
  // iRacing seasons: Q1=Jan-Mar, Q2=Apr-Jun, Q3=Jul-Sep, Q4=Oct-Dec
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1; // 1-12
  const quarter = Math.ceil(month / 3);

  const seasons: SeasonInfo[] = [];

  // Add last 2 seasons + current + next 1
  for (let i = -2; i <= 1; i++) {
    let y = year;
    let q = quarter + i;
    while (q <= 0) { q += 4; y -= 1; }
    while (q > 4) { q -= 4; y += 1; }
    seasons.push({
      season_year: y,
      season_quarter: q,
      label: `Season ${q} ${y}`,
      active: i === 0,
    });
  }

  return seasons.reverse();
}

// ─── Series ───────────────────────────────────────────────────────────────────

export async function getSeriesSeasons(
  seasonYear: number,
  seasonQuarter: number
): Promise<SeriesSeason[]> {
  // Try to fetch from API; fall back to demo data if not authenticated
  try {
    const data = await apiFetch<SeriesSeason[]>('series/seasons', {
      season_year: String(seasonYear),
      season_quarter: String(seasonQuarter),
    });
    return data;
  } catch (err) {
    // Fall back to demo data on any error (no auth, proxy not ready, etc.)
    return getDemoSeries(seasonYear, seasonQuarter);
  }
}

export async function getSeriesAssets() {
  return apiFetch<Record<string, unknown>>('series/assets');
}

// ─── Cars & Tracks ────────────────────────────────────────────────────────────

export async function getCars(): Promise<Car[]> {
  return apiFetch<Car[]>('cars');
}

export async function getTracks(): Promise<Track[]> {
  return apiFetch<Track[]>('track/list');
}

export async function getCarClasses(): Promise<CarClass[]> {
  return apiFetch<CarClass[]>('carclass/list');
}

// ─── Member ───────────────────────────────────────────────────────────────────

export async function getMemberInfo(): Promise<Member> {
  return apiFetch<Member>('member/info');
}

export async function getMemberAssets(): Promise<MemberAssets> {
  return apiFetch<MemberAssets>('member/assets');
}

// ─── Favorites (localStorage) ────────────────────────────────────────────────

const FAVORITES_KEY = 'simplan_favorites';

export function getFavoriteSeriesIds(): number[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(FAVORITES_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export function toggleFavoriteSeries(seriesId: number): number[] {
  const current = getFavoriteSeriesIds();
  const newFavs = current.includes(seriesId)
    ? current.filter(id => id !== seriesId)
    : [...current, seriesId];
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(newFavs));
  return newFavs;
}

// ─── Demo Data (no auth) ──────────────────────────────────────────────────────

function getDemoSeries(year: number, quarter: number): SeriesSeason[] {
  const tracks = [
    { track_id: 1, track_name: 'Sebring International Raceway', config_name: 'Full Course' },
    { track_id: 2, track_name: 'Spa-Francorchamps', config_name: 'GP' },
    { track_id: 3, track_name: 'Nürburgring', config_name: 'Grand Prix' },
    { track_id: 4, track_name: 'Silverstone Circuit', config_name: 'Grand Prix' },
    { track_id: 5, track_name: 'Monza', config_name: 'Grand Prix' },
    { track_id: 6, track_name: 'Watkins Glen', config_name: 'Boot' },
    { track_id: 7, track_name: 'Daytona International', config_name: 'Road Course' },
    { track_id: 8, track_name: 'Le Mans Circuit', config_name: '24H' },
    { track_id: 9, track_name: 'Brands Hatch', config_name: 'Grand Prix' },
    { track_id: 10, track_name: 'Suzuka International', config_name: 'Grand Prix' },
    { track_id: 11, track_name: 'Indianapolis Motor Speedway', config_name: 'Oval' },
    { track_id: 12, track_name: 'Talladega Superspeedway', config_name: 'Superspeedway' },
    { track_id: 13, track_name: 'Charlotte Motor Speedway', config_name: 'Oval' },
    { track_id: 14, track_name: 'Bristol Motor Speedway', config_name: 'Oval' },
  ];

  const makeSchedule = (trackIds: number[]) =>
    trackIds.map((id, i) => ({
      race_week_num: i,
      track: tracks.find(t => t.track_id === id) || tracks[0],
    }));

  return [
    {
      season_id: 4501,
      series_id: 301,
      season_name: `iRacing Endurance Series ${year} S${quarter}`,
      series_name: 'iRacing Endurance Series',
      series_short_name: 'iRES',
      season_year: year,
      season_quarter: quarter,
      active: true,
      official: true,
      driver_changes: true,
      fixed_setup: false,
      license_group: 4,
      car_class_ids: [67, 68, 69],
      allowed_licenses: [{ group_name: 'B', min_level: 2, max_level: 5 }],
      schedules: makeSchedule([8, 1, 2, 3, 6, 10]),
      status: 'OPEN',
      category: 'Sports Car',
      minLicenseLevel: 2,
      race_time_descriptors: [{ repeating: true, session_minutes: 480 }],
    },
    {
      season_id: 4502,
      series_id: 302,
      season_name: `Porsche TAG Heuer Esports Supercup ${year} S${quarter}`,
      series_name: 'Porsche TAG Heuer Esports Supercup',
      series_short_name: 'PESC',
      season_year: year,
      season_quarter: quarter,
      active: true,
      official: true,
      driver_changes: false,
      fixed_setup: true,
      license_group: 4,
      car_class_ids: [83],
      allowed_licenses: [{ group_name: 'A', min_level: 4, max_level: 5 }],
      schedules: makeSchedule([2, 4, 5, 3, 9, 7, 10, 6]),
      status: 'FIXED',
      category: 'Sports Car',
      minLicenseLevel: 4,
      race_time_descriptors: [{ repeating: true, session_minutes: 30 }],
    },
    {
      season_id: 4503,
      series_id: 303,
      season_name: `Formula iRacing ${year} S${quarter}`,
      series_name: 'Formula iRacing',
      series_short_name: 'FiR',
      season_year: year,
      season_quarter: quarter,
      active: true,
      official: true,
      driver_changes: false,
      fixed_setup: false,
      license_group: 3,
      car_class_ids: [99],
      allowed_licenses: [{ group_name: 'B', min_level: 2, max_level: 5 }],
      schedules: makeSchedule([2, 5, 3, 4, 10, 7, 9]),
      status: 'RANKED',
      category: 'Formula Car',
      minLicenseLevel: 2,
      race_time_descriptors: [{ repeating: true, session_minutes: 20 }],
    },
    {
      season_id: 4504,
      series_id: 304,
      season_name: `NASCAR Cup Series ${year} S${quarter}`,
      series_name: 'NASCAR Cup Series',
      series_short_name: 'NCS',
      season_year: year,
      season_quarter: quarter,
      active: true,
      official: true,
      driver_changes: false,
      fixed_setup: true,
      license_group: 3,
      car_class_ids: [30],
      allowed_licenses: [{ group_name: 'C', min_level: 2, max_level: 5 }],
      schedules: makeSchedule([11, 12, 13, 14, 11, 12, 13, 14]),
      status: 'FIXED',
      category: 'Oval',
      minLicenseLevel: 2,
      race_time_descriptors: [{ repeating: true, session_minutes: 60 }],
    },
    {
      season_id: 4505,
      series_id: 305,
      season_name: `IMSA Sportscar Championship ${year} S${quarter}`,
      series_name: 'IMSA Sportscar Championship',
      series_short_name: 'IMSA',
      season_year: year,
      season_quarter: quarter,
      active: true,
      official: true,
      driver_changes: true,
      fixed_setup: false,
      license_group: 3,
      car_class_ids: [67, 70],
      allowed_licenses: [{ group_name: 'C', min_level: 2, max_level: 5 }],
      schedules: makeSchedule([1, 6, 2, 7, 8, 9, 4]),
      status: 'OPEN',
      category: 'Sports Car',
      minLicenseLevel: 2,
      race_time_descriptors: [{ repeating: true, session_minutes: 90 }],
    },
    {
      season_id: 4506,
      series_id: 306,
      season_name: `Dirt Track Challenge ${year} S${quarter}`,
      series_name: 'Dirt Track Challenge',
      series_short_name: 'DTC',
      season_year: year,
      season_quarter: quarter,
      active: true,
      official: false,
      driver_changes: false,
      fixed_setup: false,
      license_group: 2,
      car_class_ids: [14],
      allowed_licenses: [{ group_name: 'D', min_level: 1, max_level: 5 }],
      schedules: Array.from({ length: 8 }, (_, i) => ({
        race_week_num: i,
        track: { track_id: 100 + i, track_name: `Dirt Track ${i + 1}`, config_name: 'Standard' },
      })),
      status: 'UNRANKED',
      category: 'Dirt Oval',
      minLicenseLevel: 1,
      race_time_descriptors: [{ repeating: true, session_minutes: 15 }],
    },
    {
      season_id: 4507,
      series_id: 307,
      season_name: `GT3 Challenge Series ${year} S${quarter}`,
      series_name: 'GT3 Challenge Series',
      series_short_name: 'GT3C',
      season_year: year,
      season_quarter: quarter,
      active: true,
      official: true,
      driver_changes: false,
      fixed_setup: false,
      license_group: 2,
      car_class_ids: [77, 78],
      allowed_licenses: [{ group_name: 'D', min_level: 1, max_level: 5 }],
      schedules: makeSchedule([9, 4, 5, 2, 7, 6, 1, 3]),
      status: 'OPEN',
      category: 'Sports Car',
      minLicenseLevel: 1,
      race_time_descriptors: [{ repeating: true, session_minutes: 40 }],
    },
    {
      season_id: 4508,
      series_id: 308,
      season_name: `IndyCar Series ${year} S${quarter}`,
      series_name: 'IndyCar Series',
      series_short_name: 'ICS',
      season_year: year,
      season_quarter: quarter,
      active: true,
      official: true,
      driver_changes: false,
      fixed_setup: true,
      license_group: 4,
      car_class_ids: [11],
      allowed_licenses: [{ group_name: 'A', min_level: 4, max_level: 5 }],
      schedules: makeSchedule([11, 7, 5, 11, 12, 4, 2, 10]),
      status: 'RANKED',
      category: 'Oval',
      minLicenseLevel: 4,
      race_time_descriptors: [{ repeating: true, session_minutes: 45 }],
    },
    {
      season_id: 4509,
      series_id: 309,
      season_name: `Rookie Oval Series ${year} S${quarter}`,
      series_name: 'Rookie Oval Series',
      series_short_name: 'ROS',
      season_year: year,
      season_quarter: quarter,
      active: true,
      official: true,
      driver_changes: false,
      fixed_setup: true,
      license_group: 0,
      car_class_ids: [4],
      allowed_licenses: [{ group_name: 'Rookie', min_level: 0, max_level: 1 }],
      schedules: makeSchedule([13, 14, 11, 13, 14]),
      status: 'FIXED',
      category: 'Oval',
      minLicenseLevel: 0,
      race_time_descriptors: [{ repeating: true, session_minutes: 20 }],
    },
    {
      season_id: 4510,
      series_id: 310,
      season_name: `Super Formula ${year} S${quarter}`,
      series_name: 'Super Formula',
      series_short_name: 'SF',
      season_year: year,
      season_quarter: quarter,
      active: true,
      official: true,
      driver_changes: false,
      fixed_setup: false,
      license_group: 4,
      car_class_ids: [102],
      allowed_licenses: [{ group_name: 'A', min_level: 4, max_level: 5 }],
      schedules: makeSchedule([10, 5, 2, 3, 4, 6, 9, 7]),
      status: 'RANKED',
      category: 'Formula Car',
      minLicenseLevel: 4,
      race_time_descriptors: [{ repeating: true, session_minutes: 25 }],
    },
    {
      season_id: 4511,
      series_id: 311,
      season_name: `Dirt Road Challenge ${year} S${quarter}`,
      series_name: 'Dirt Road Challenge',
      series_short_name: 'DRC',
      season_year: year,
      season_quarter: quarter,
      active: true,
      official: false,
      driver_changes: false,
      fixed_setup: false,
      license_group: 1,
      car_class_ids: [19],
      allowed_licenses: [{ group_name: 'D', min_level: 1, max_level: 5 }],
      schedules: Array.from({ length: 6 }, (_, i) => ({
        race_week_num: i,
        track: { track_id: 200 + i, track_name: `Dirt Road ${i + 1}`, config_name: 'Rally' },
      })),
      status: 'UNRANKED',
      category: 'Dirt Road',
      minLicenseLevel: 1,
      race_time_descriptors: [{ repeating: true, session_minutes: 20 }],
    },
    {
      season_id: 4512,
      series_id: 312,
      season_name: `LMP2 Prototype Challenge ${year} S${quarter}`,
      series_name: 'LMP2 Prototype Challenge',
      series_short_name: 'LMP2',
      season_year: year,
      season_quarter: quarter,
      active: true,
      official: true,
      driver_changes: true,
      fixed_setup: false,
      license_group: 3,
      car_class_ids: [72],
      allowed_licenses: [{ group_name: 'C', min_level: 2, max_level: 5 }],
      schedules: makeSchedule([8, 2, 1, 6, 10, 4, 3]),
      status: 'OPEN',
      category: 'Sports Car',
      minLicenseLevel: 2,
      race_time_descriptors: [{ repeating: true, session_minutes: 60 }],
    },
  ];
}

