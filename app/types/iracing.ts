// iRacing API Type Definitions
// Inferred from iRacing Data API documentation

export interface Season {
  season_id: number;
  season_name: string;
  season_year: number;
  season_quarter: number;
  series_id: number;
  series_name: string;
  active: boolean;
  official: boolean;
  start_date: string;
  end_date: string;
}

export interface SeriesAsset {
  series_id: number;
  logo?: string;
  background?: string;
  small_image?: string;
  large_image?: string;
  detail_copy?: string;
}

export type LicenseLevel = 0 | 1 | 2 | 3 | 4 | 5; // 0=Rookie, 1=D, 2=C, 3=B, 4=A, 5=Pro

export type SessionType = "FIXED" | "OPEN" | "RANKED" | "UNRANKED";

export type CarCategory =
  | "Sports Car"
  | "Formula Car"
  | "Oval"
  | "Dirt Oval"
  | "Dirt Road"
  | "Road"
  | "Endurance";

export interface Car {
  car_id: number;
  car_name: string;
  car_name_abbreviated: string;
  car_dirpath: string;
  car_types: { car_type: string }[];
  free_with_subscription: boolean;
  price: number;
  retired: boolean;
  ai_enabled: boolean;
  hp: number;
  weight_kg: number;
  categories: string[];
  owned?: boolean;
}

export interface Track {
  track_id: number;
  track_name: string;
  config_name?: string;
  city?: string;
  country?: string;
  track_dirpath: string;
  track_types: { track_type: string }[];
  free_with_subscription: boolean;
  price: number;
  retired: boolean;
  owned?: boolean;
  pit_road_speed_limit?: number;
  corners_per_lap?: number;
  track_config_length?: number;
}

export interface ScheduleWeek {
  race_week_num: number;
  track: {
    track_id: number;
    track_name: string;
    config_name?: string;
  };
  car_restrictions?: {
    car_id: number;
    max_pct_fuel_fill: number;
    weight_penalty_kg: number;
  }[];
  start_date?: string;
}

export interface SeriesSeason {
  season_id: number;
  season_name: string;
  series_id: number;
  series_name: string;
  series_short_name?: string;
  season_year: number;
  season_quarter: number;
  active: boolean;
  official: boolean;
  driver_changes: boolean;
  fixed_setup: boolean;
  license_group: number;
  license_group_types?: { license_group_type: number }[];
  multiclass?: boolean;
  num_opt_laps?: number;
  race_week_to_make_official?: number;
  start_date?: string;
  schedules: ScheduleWeek[];
  car_class_ids: number[];
  allowed_licenses: {
    group_name: string;
    min_level: number;
    max_level: number;
  }[];
  rookie_season?: string;
  iracing_points?: boolean;
  race_points?: number;
  min_team_drivers?: number;
  max_team_drivers?: number;
  race_time_descriptors?: RaceTimeDescriptor[];
  session_types?: { session_type: string }[];
  car_switching?: boolean;
  caution_laps_do_not_count?: boolean;
  complete?: boolean;
  rookie_season_name?: string;

  // Computed/UI fields
  status?: SessionType;
  category?: CarCategory;
  minLicenseLevel?: LicenseLevel;
  isFavorite?: boolean;
  isOwned?: boolean;
}

export interface RaceTimeDescriptor {
  repeating: boolean;
  session_minutes?: number;
  session_times?: string[];
  super_session?: boolean;
  start_time?: string;
  day_offset?: number[];
  race_week_nums?: number[];
}

export interface CarClass {
  car_class_id: number;
  name: string;
  short_name: string;
  cars_in_class: { car_id: number; car_dirpath: string; retired: boolean }[];
  relative_speed: number;
  cust_id?: number;
}

export interface Member {
  cust_id: number;
  username: string;
  display_name: string;
  club_name?: string;
  licenses?: MemberLicense[];
  profile?: MemberProfile;
}

export interface MemberLicense {
  category_id: number;
  category: string;
  license_level: number;
  safety_rating: number;
  irating: number;
  color: string;
  group_name: string;
  group_id: number;
  pro_promotable: boolean;
  supersession_in_use: boolean;
}

export interface MemberProfile {
  cust_id: number;
  display_name: string;
  member_since?: string;
  last_login?: string;
  last_season?: number;
  ai?: boolean;
}

export interface AuthResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
  scope: string;
  refresh_token?: string;
  cust_id?: number;
  success?: boolean;
  message?: string;
}

export interface MemberAssets {
  cars: number[];
  tracks: number[];
}

// UI-only types
export interface FilterState {
  categories: CarCategory[];
  licenses: LicenseLevel[];
  statuses: SessionType[];
  favoritesOnly: boolean;
  ownedOnly: boolean;
  searchQuery: string;
  myLicense: LicenseLevel | null;
}

export interface AppUser {
  cust_id: number;
  display_name: string;
  licenses: MemberLicense[];
  ownedCarIds: number[];
  ownedTrackIds: number[];
  favoriteSeriesIds: number[];
}

export interface SeasonInfo {
  season_year: number;
  season_quarter: number;
  label: string;
  active: boolean;
}
