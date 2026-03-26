"use client";
// /app/components/DriverProfile.tsx
// Modal showing full driver profile, licenses and recent races

import { useState, useEffect, useRef } from "react";
import {
  X,
  Search,
  TrendingUp,
  TrendingDown,
  Minus,
  Trophy,
  Flag,
  Shield,
  User,
  Calendar,
  Car,
} from "lucide-react";
import { useTheme } from "../lib/theme";
import { useT } from "../lib/i18n";

interface SearchResult {
  cust_id: number;
  display_name: string;
  club_name: string;
}
interface License {
  category: string;
  category_name: string;
  license_level: number;
  safety_rating: number;
  irating: number;
  color: string;
  group_name: string;
}
interface Race {
  subsession_id: number;
  series_name: string;
  track_name: string;
  car_name: string;
  start_position: number;
  finish_position: number;
  incidents: number;
  irating_change: number;
  sof: number;
  session_start_time: string;
  season_year: number;
  season_quarter: number;
  race_week_num: number;
}
interface Profile {
  cust_id: number;
  display_name: string;
  club_name: string;
  member_since: string;
  licenses: Record<string, License>;
  summary: {
    total_starts: number;
    total_wins: number;
    total_top5: number;
    win_pct: string;
  } | null;
}

const LICENSE_COLORS: Record<string, string> = {
  Rookie: "#FF4444",
  "Class D": "#F97316",
  "Class C": "#EAB308",
  "Class B": "#22C55E",
  "Class A": "#3B9EFF",
  PRO: "#A855F7",
};

const CATEGORY_LABELS: Record<string, string> = {
  oval: "Oval",
  sports_car: "Sports Car",
  formula_car: "Formula",
  dirt_oval: "Dirt Oval",
  dirt_road: "Dirt Road",
};

function shortLicense(name: string) {
  return name.replace("Class ", "").replace("Rookie", "R");
}

interface Props {
  open: boolean;
  onClose: () => void;
  initialCustId?: number;
  initialName?: string;
}

export default function DriverProfile({
  open,
  onClose,
  initialCustId,
  initialName,
}: Props) {
  const { theme } = useTheme();
  const { t } = useT();
  const isDark = theme === "dark";
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [races, setRaces] = useState<Race[]>([]);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<"stats" | "races">("stats");
  const searchTimeout = useRef<any>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const T = {
    bg: isDark ? "#070D19" : "#FFFFFF",
    overlay: "rgba(0,0,0,0.75)",
    border: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)",
    card: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)",
    text: isDark ? "#E2E8F0" : "#1E293B",
    muted: isDark ? "#64748B" : "#94A3B8",
    input: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
    row: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)",
  };

  useEffect(() => {
    if (open && initialCustId) loadProfile(initialCustId);
    if (open) setTimeout(() => inputRef.current?.focus(), 100);
    if (!open) {
      setProfile(null);
      setRaces([]);
      setQuery("");
      setResults([]);
    }
  }, [open, initialCustId]);

  function handleSearch(val: string) {
    setQuery(val);
    clearTimeout(searchTimeout.current);
    if (val.length < 2) {
      setResults([]);
      return;
    }
    searchTimeout.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(
          `/api/iracing/driver?action=search&q=${encodeURIComponent(val)}`,
          { credentials: "include" },
        );
        const data = await res.json();
        setResults(data.drivers ?? []);
      } catch {
      } finally {
        setSearching(false);
      }
    }, 400);
  }

  async function loadProfile(custId: number) {
    setLoading(true);
    setProfile(null);
    setRaces([]);
    setResults([]);
    try {
      const [pRes, rRes] = await Promise.all([
        fetch(`/api/iracing/driver?action=profile&cust_id=${custId}`, {
          credentials: "include",
        }),
        fetch(`/api/iracing/driver?action=races&cust_id=${custId}`, {
          credentials: "include",
        }),
      ]);
      const [pData, rData] = await Promise.all([pRes.json(), rRes.json()]);
      console.log("[DriverProfile] profile data:", pData);
      console.log("[DriverProfile] races data:", rData);
      if (pData.error) throw new Error(pData.error);
      setProfile(pData);
      setRaces(rData.races ?? []);
      setQuery(pData.display_name ?? "");
    } catch (e: any) {
      console.error("[DriverProfile] loadProfile error:", e);
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 2000,
        background: T.overlay,
        backdropFilter: "blur(12px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 640,
          maxHeight: "90vh",
          background: T.bg,
          borderRadius: 20,
          border: `1px solid ${T.border}`,
          boxShadow: "0 24px 64px rgba(0,0,0,0.5)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "20px 20px 16px",
            borderBottom: `1px solid ${T.border}`,
            flexShrink: 0,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              marginBottom: 14,
            }}
          >
            <User size={18} color="#3B9EFF" />
            <span
              style={{
                fontFamily: "Syne, sans-serif",
                fontWeight: 800,
                fontSize: 17,
                color: T.text,
              }}
            >
              {t.driverSearch}
            </span>
            <button
              onClick={onClose}
              style={{
                marginLeft: "auto",
                background: "none",
                border: "none",
                cursor: "pointer",
                color: T.muted,
                display: "flex",
              }}
            >
              <X size={18} />
            </button>
          </div>

          {/* Search input */}
          <div style={{ position: "relative" }}>
            <Search
              size={14}
              color={T.muted}
              style={{
                position: "absolute",
                left: 12,
                top: "50%",
                transform: "translateY(-50%)",
              }}
            />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder={t.searchDriverPlaceholder}
              style={{
                width: "100%",
                padding: "10px 12px 10px 36px",
                borderRadius: 12,
                background: T.input,
                border: `1px solid ${T.border}`,
                color: T.text,
                fontFamily: "DM Sans, sans-serif",
                fontSize: 14,
                outline: "none",
                boxSizing: "border-box",
              }}
            />
            {searching && (
              <span
                style={{
                  position: "absolute",
                  right: 12,
                  top: "50%",
                  transform: "translateY(-50%)",
                  fontSize: 11,
                  color: T.muted,
                  fontFamily: "DM Mono, monospace",
                }}
              >
                ...
              </span>
            )}
          </div>

          {/* Search results dropdown */}
          {results.length > 0 && (
            <div
              style={{
                marginTop: 6,
                background: T.bg,
                border: `1px solid ${T.border}`,
                borderRadius: 12,
                overflow: "hidden",
              }}
            >
              {results.map((r) => (
                <button
                  key={r.cust_id}
                  onClick={() => loadProfile(r.cust_id)}
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    textAlign: "left",
                    borderBottom: `1px solid ${T.border}`,
                    transition: "background 0.1s",
                  }}
                  onMouseEnter={(e) =>
                    ((e.currentTarget as HTMLElement).style.background = T.card)
                  }
                  onMouseLeave={(e) =>
                    ((e.currentTarget as HTMLElement).style.background = "none")
                  }
                >
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      background: "rgba(59,158,255,0.12)",
                      border: "1px solid rgba(59,158,255,0.2)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <User size={14} color="#3B9EFF" />
                  </div>
                  <div>
                    <div
                      style={{
                        fontFamily: "Syne, sans-serif",
                        fontWeight: 700,
                        fontSize: 13,
                        color: T.text,
                      }}
                    >
                      {r.display_name}
                    </div>
                    <div
                      style={{
                        fontFamily: "DM Mono, monospace",
                        fontSize: 10,
                        color: T.muted,
                      }}
                    >
                      {r.club_name}
                    </div>
                  </div>
                  <span
                    style={{
                      marginLeft: "auto",
                      fontFamily: "DM Mono, monospace",
                      fontSize: 10,
                      color: T.muted,
                    }}
                  >
                    #{r.cust_id}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Loading */}
        {loading && (
          <div
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: T.muted,
              fontFamily: "DM Mono, monospace",
              fontSize: 13,
            }}
          >
            Loading profile...
          </div>
        )}

        {/* Profile content */}
        {!loading && profile && (
          <div style={{ flex: 1, overflowY: "auto" }}>
            {/* Driver header */}
            <div
              style={{
                padding: "20px 20px 16px",
                background: isDark
                  ? "rgba(59,158,255,0.05)"
                  : "rgba(59,158,255,0.03)",
                borderBottom: `1px solid ${T.border}`,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 14,
                    background: "rgba(59,158,255,0.12)",
                    border: "1px solid rgba(59,158,255,0.25)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <User size={22} color="#3B9EFF" />
                </div>
                <div>
                  <div
                    style={{
                      fontFamily: "Syne, sans-serif",
                      fontWeight: 800,
                      fontSize: 20,
                      color: T.text,
                    }}
                  >
                    {profile.display_name}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      gap: 10,
                      marginTop: 3,
                      alignItems: "center",
                    }}
                  >
                    <span
                      style={{
                        fontFamily: "DM Mono, monospace",
                        fontSize: 11,
                        color: T.muted,
                      }}
                    >
                      {profile.club_name}
                    </span>
                    {profile.member_since && (
                      <span
                        style={{
                          fontFamily: "DM Mono, monospace",
                          fontSize: 10,
                          color: T.muted,
                        }}
                      >
                        · Since {new Date(profile.member_since).getFullYear()}
                      </span>
                    )}
                  </div>
                </div>
                {profile.summary && (
                  <div style={{ marginLeft: "auto", textAlign: "right" }}>
                    <div
                      style={{
                        fontFamily: "DM Mono, monospace",
                        fontWeight: 700,
                        fontSize: 18,
                        color: "#3B9EFF",
                      }}
                    >
                      {profile.summary.total_starts.toLocaleString()}
                    </div>
                    <div
                      style={{
                        fontFamily: "DM Mono, monospace",
                        fontSize: 10,
                        color: T.muted,
                      }}
                    >
                      starts
                    </div>
                  </div>
                )}
              </div>

              {/* Summary stats */}
              {profile.summary && (
                <div
                  style={{
                    display: "flex",
                    gap: 8,
                    marginTop: 14,
                    flexWrap: "wrap",
                  }}
                >
                  {[
                    {
                      label: "Wins",
                      value: profile.summary.total_wins,
                      icon: <Trophy size={11} />,
                    },
                    {
                      label: "Top 5",
                      value: profile.summary.total_top5,
                      icon: <Flag size={11} />,
                    },
                    {
                      label: "Win %",
                      value: `${profile.summary.win_pct}%`,
                      icon: <Shield size={11} />,
                    },
                  ].map((s) => (
                    <div
                      key={s.label}
                      style={{
                        flex: 1,
                        minWidth: 80,
                        padding: "8px 12px",
                        borderRadius: 10,
                        background: T.card,
                        border: `1px solid ${T.border}`,
                        textAlign: "center",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "center",
                          color: T.muted,
                          marginBottom: 4,
                        }}
                      >
                        {s.icon}
                      </div>
                      <div
                        style={{
                          fontFamily: "DM Mono, monospace",
                          fontWeight: 700,
                          fontSize: 15,
                          color: T.text,
                        }}
                      >
                        {s.value}
                      </div>
                      <div
                        style={{
                          fontFamily: "DM Mono, monospace",
                          fontSize: 10,
                          color: T.muted,
                        }}
                      >
                        {s.label}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Tabs */}
            <div
              style={{
                display: "flex",
                borderBottom: `1px solid ${T.border}`,
                flexShrink: 0,
              }}
            >
              {(["stats", "races"] as const).map((tabId) => (
                <button
                  key={tabId}
                  onClick={() => setTab(tabId)}
                  style={{
                    flex: 1,
                    padding: "12px 0",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    fontFamily: "Syne, sans-serif",
                    fontWeight: 700,
                    fontSize: 13,
                    color: tab === tabId ? "#3B9EFF" : T.muted,
                    borderBottom: `2px solid ${tab === tabId ? "#3B9EFF" : "transparent"}`,
                    transition: "all 0.15s",
                  }}
                >
                  {tabId === "stats" ? t.licenseStats : t.recentRaces}
                </button>
              ))}
            </div>

            {/* Stats tab — licenses per category */}
            {tab === "stats" && (
              <div
                style={{
                  padding: 16,
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                }}
              >
                {Object.entries(profile.licenses ?? {}).map(
                  ([key, lic]: [string, any]) => {
                    if (!lic) return null;
                    const color =
                      LICENSE_COLORS[lic.group_name ?? ""] ?? "#64748B";
                    return (
                      <div
                        key={key}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 12,
                          padding: "12px 14px",
                          borderRadius: 12,
                          background: T.card,
                          border: `1px solid ${T.border}`,
                        }}
                      >
                        <div
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: 8,
                            background: color + "20",
                            border: `1px solid ${color}40`,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                          }}
                        >
                          <span
                            style={{
                              fontFamily: "DM Mono, monospace",
                              fontSize: 11,
                              fontWeight: 800,
                              color,
                            }}
                          >
                            {shortLicense(lic.group_name ?? "?")}
                          </span>
                        </div>
                        <span
                          style={{
                            fontFamily: "Syne, sans-serif",
                            fontWeight: 600,
                            fontSize: 13,
                            color: T.text,
                            flex: 1,
                          }}
                        >
                          {CATEGORY_LABELS[key] ?? key}
                        </span>
                        <div style={{ textAlign: "right" }}>
                          <div
                            style={{
                              fontFamily: "DM Mono, monospace",
                              fontWeight: 700,
                              fontSize: 15,
                              color: "#3B9EFF",
                            }}
                          >
                            {(lic.irating ?? 0).toLocaleString()}
                          </div>
                          <div
                            style={{
                              fontFamily: "DM Mono, monospace",
                              fontSize: 10,
                              color,
                            }}
                          >
                            SR {(lic.safety_rating ?? 0).toFixed(2)}
                          </div>
                        </div>
                      </div>
                    );
                  },
                )}
                {Object.keys(profile.licenses ?? {}).length === 0 && (
                  <div
                    style={{
                      textAlign: "center",
                      padding: "32px 0",
                      color: T.muted,
                      fontFamily: "DM Mono, monospace",
                      fontSize: 13,
                    }}
                  >
                    No license data available
                  </div>
                )}
              </div>
            )}

            {/* Races tab */}
            {tab === "races" && (
              <div
                style={{
                  padding: 16,
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                }}
              >
                {races.length === 0 && (
                  <div
                    style={{
                      textAlign: "center",
                      padding: "32px 0",
                      color: T.muted,
                      fontFamily: "DM Mono, monospace",
                      fontSize: 13,
                    }}
                  >
                    No recent races
                  </div>
                )}
                {races.map((race) => {
                  const iRatingColor =
                    race.irating_change > 0
                      ? "#22C55E"
                      : race.irating_change < 0
                        ? "#EF4444"
                        : T.muted;
                  const posEmoji =
                    race.finish_position === 1
                      ? "🏆"
                      : race.finish_position <= 3
                        ? "🥈"
                        : "";
                  return (
                    <div
                      key={race.subsession_id}
                      style={{
                        padding: "10px 14px",
                        borderRadius: 12,
                        background: T.card,
                        border: `1px solid ${T.border}`,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "flex-start",
                          gap: 10,
                        }}
                      >
                        {/* Finish position */}
                        <div
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: 10,
                            flexShrink: 0,
                            background:
                              race.finish_position <= 3
                                ? "rgba(234,179,8,0.12)"
                                : T.row,
                            border: `1px solid ${race.finish_position <= 3 ? "rgba(234,179,8,0.3)" : T.border}`,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <span
                            style={{
                              fontFamily: "DM Mono, monospace",
                              fontWeight: 800,
                              fontSize: 13,
                              color:
                                race.finish_position <= 3 ? "#EAB308" : T.muted,
                            }}
                          >
                            {posEmoji || `P${race.finish_position}`}
                          </span>
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div
                            style={{
                              fontFamily: "Syne, sans-serif",
                              fontWeight: 700,
                              fontSize: 13,
                              color: T.text,
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {race.series_name}
                          </div>
                          <div
                            style={{
                              display: "flex",
                              gap: 8,
                              marginTop: 3,
                              flexWrap: "wrap",
                              alignItems: "center",
                            }}
                          >
                            <span
                              style={{
                                fontFamily: "DM Mono, monospace",
                                fontSize: 10,
                                color: T.muted,
                              }}
                            >
                              {race.track_name}
                            </span>
                            {race.car_name && (
                              <span
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: 3,
                                  fontFamily: "DM Mono, monospace",
                                  fontSize: 10,
                                  color: T.muted,
                                }}
                              >
                                <Car size={9} /> {race.car_name}
                              </span>
                            )}
                          </div>
                        </div>
                        <div style={{ textAlign: "right", flexShrink: 0 }}>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 3,
                              justifyContent: "flex-end",
                            }}
                          >
                            {race.irating_change > 0 ? (
                              <TrendingUp size={11} color="#22C55E" />
                            ) : race.irating_change < 0 ? (
                              <TrendingDown size={11} color="#EF4444" />
                            ) : (
                              <Minus size={11} color={T.muted} />
                            )}
                            <span
                              style={{
                                fontFamily: "DM Mono, monospace",
                                fontWeight: 700,
                                fontSize: 12,
                                color: iRatingColor,
                              }}
                            >
                              {race.irating_change > 0 ? "+" : ""}
                              {race.irating_change}
                            </span>
                          </div>
                          <div
                            style={{
                              fontFamily: "DM Mono, monospace",
                              fontSize: 10,
                              color: T.muted,
                              marginTop: 2,
                            }}
                          >
                            SOF {race.sof.toLocaleString()}
                          </div>
                          {race.incidents > 0 && (
                            <div
                              style={{
                                fontFamily: "DM Mono, monospace",
                                fontSize: 10,
                                color: "#F97316",
                                marginTop: 1,
                              }}
                            >
                              {race.incidents}x
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Empty state */}
        {!loading && !profile && results.length === 0 && query.length === 0 && (
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 12,
              color: T.muted,
              padding: 40,
            }}
          >
            <User size={40} strokeWidth={1} />
            <span
              style={{
                fontFamily: "Syne, sans-serif",
                fontWeight: 700,
                fontSize: 15,
              }}
            >
              {t.searchDriverHint}
            </span>
            <span
              style={{
                fontFamily: "DM Sans, sans-serif",
                fontSize: 13,
                textAlign: "center",
                maxWidth: 280,
              }}
            >
              {t.searchDriverDesc}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
