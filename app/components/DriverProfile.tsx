"use client";
// /app/components/DriverProfile.tsx — Two-phase UX: search modal → fullscreen profile

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
  Car,
  ChevronLeft,
} from "lucide-react";
import { useTheme } from "../lib/theme";
import { useT } from "../lib/i18n";

interface SearchResult {
  cust_id: number;
  display_name: string;
  club_name: string;
}
interface License {
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
  finish_position: number;
  incidents: number;
  irating_change: number;
  sof: number;
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
const CATEGORY_COLORS: Record<string, string> = {
  oval: "#F97316",
  sports_car: "#3B9EFF",
  formula_car: "#A855F7",
  dirt_oval: "#EAB308",
  dirt_road: "#22C55E",
};

function shortLicense(name: string) {
  return (name ?? "?").replace("Class ", "").replace("Rookie", "R");
}

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function DriverProfile({ open, onClose }: Props) {
  const { theme } = useTheme();
  const { t } = useT();
  const isDark = theme === "dark";

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const searchTimeout = useRef<any>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [races, setRaces] = useState<Race[]>([]);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<"stats" | "races">("stats");

  const T = {
    bg: isDark ? "#060C18" : "#F8FAFC",
    card: isDark ? "#0A1221" : "#FFFFFF",
    border: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)",
    input: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
    text: isDark ? "#E2E8F0" : "#1E293B",
    muted: isDark ? "#64748B" : "#94A3B8",
    row: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)",
    hover: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)",
  };

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100);
    if (!open) {
      setProfile(null);
      setRaces([]);
      setQuery("");
      setResults([]);
    }
  }, [open]);

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
    }, 350);
  }

  async function loadProfile(custId: number) {
    setLoading(true);
    setProfile(null);
    setRaces([]);
    setResults([]);
    setQuery("");
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
      console.log(
        "[DriverProfile] profile:",
        JSON.stringify(pData).slice(0, 500),
      );
      if (pData?.cust_id) {
        setProfile(pData);
        setRaces(rData.races ?? []);
      }
    } catch (e) {
      console.error("[DriverProfile]", e);
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;

  // ── FULLSCREEN PROFILE ────────────────────────────────────────
  if (profile || loading) {
    const licenses = Object.entries(profile?.licenses ?? {});
    const primary =
      profile?.licenses?.sports_car ??
      profile?.licenses?.oval ??
      (Object.values(profile?.licenses ?? {})[0] as License | undefined);
    const primaryColor = LICENSE_COLORS[primary?.group_name ?? ""] ?? "#3B9EFF";

    return (
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 2000,
          background: T.bg,
          display: "flex",
          flexDirection: "column",
          overflowY: "auto",
        }}
      >
        {/* Sticky top bar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "16px 24px",
            borderBottom: `1px solid ${T.border}`,
            background: T.card,
            flexShrink: 0,
            position: "sticky",
            top: 0,
            zIndex: 10,
          }}
        >
          <button
            onClick={() => {
              setProfile(null);
              setRaces([]);
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              background: "none",
              border: "none",
              cursor: "pointer",
              color: T.muted,
              fontFamily: "Syne, sans-serif",
              fontWeight: 600,
              fontSize: 13,
              padding: "6px 10px",
              borderRadius: 8,
            }}
            onMouseEnter={(e) =>
              ((e.currentTarget as HTMLElement).style.background = T.hover)
            }
            onMouseLeave={(e) =>
              ((e.currentTarget as HTMLElement).style.background = "none")
            }
          >
            <ChevronLeft size={16} /> {t.driverSearch}
          </button>
          <span style={{ color: T.border }}>|</span>
          <span
            style={{
              fontFamily: "Syne, sans-serif",
              fontWeight: 800,
              fontSize: 16,
              color: T.text,
            }}
          >
            {loading ? "..." : profile?.display_name}
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
              padding: 6,
            }}
          >
            <X size={20} />
          </button>
        </div>

        {loading && (
          <div
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: T.muted,
              fontFamily: "DM Mono, monospace",
              fontSize: 14,
            }}
          >
            Loading profile...
          </div>
        )}

        {!loading && profile && (
          <div
            style={{
              maxWidth: 900,
              width: "100%",
              margin: "0 auto",
              padding: "32px 24px",
              display: "flex",
              flexDirection: "column",
              gap: 28,
            }}
          >
            {/* Hero */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 20,
                padding: "28px 32px",
                borderRadius: 20,
                border: `1px solid ${T.border}`,
                background: isDark
                  ? `linear-gradient(135deg, ${primaryColor}12 0%, #0A1221 100%)`
                  : `linear-gradient(135deg, ${primaryColor}08 0%, #FFFFFF 100%)`,
              }}
            >
              <div
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: 18,
                  background: primaryColor + "20",
                  border: `2px solid ${primaryColor}40`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <span
                  style={{
                    fontFamily: "Syne, sans-serif",
                    fontWeight: 900,
                    fontSize: 28,
                    color: primaryColor,
                  }}
                >
                  {shortLicense(primary?.group_name ?? "R")}
                </span>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h1
                  style={{
                    fontFamily: "Syne, sans-serif",
                    fontWeight: 900,
                    fontSize: 28,
                    color: T.text,
                    margin: "0 0 6px",
                    lineHeight: 1.1,
                  }}
                >
                  {profile.display_name}
                </h1>
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                  {profile.club_name && (
                    <span
                      style={{
                        fontFamily: "DM Mono, monospace",
                        fontSize: 12,
                        color: T.muted,
                      }}
                    >
                      {profile.club_name}
                    </span>
                  )}
                  {profile.member_since && (
                    <span
                      style={{
                        fontFamily: "DM Mono, monospace",
                        fontSize: 12,
                        color: T.muted,
                      }}
                    >
                      · Since {new Date(profile.member_since).getFullYear()}
                    </span>
                  )}
                  <span
                    style={{
                      fontFamily: "DM Mono, monospace",
                      fontSize: 12,
                      color: T.muted,
                    }}
                  >
                    · #{profile.cust_id}
                  </span>
                </div>
              </div>
              {primary && (
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div
                    style={{
                      fontFamily: "DM Mono, monospace",
                      fontWeight: 800,
                      fontSize: 36,
                      color: "#3B9EFF",
                      lineHeight: 1,
                    }}
                  >
                    {(primary.irating ?? 0).toLocaleString()}
                  </div>
                  <div
                    style={{
                      fontFamily: "DM Mono, monospace",
                      fontSize: 12,
                      color: primaryColor,
                      marginTop: 4,
                    }}
                  >
                    SR {(primary.safety_rating ?? 0).toFixed(2)}
                  </div>
                </div>
              )}
            </div>

            {/* Summary */}
            {profile.summary && profile.summary.total_starts > 0 && (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
                  gap: 12,
                }}
              >
                {[
                  {
                    label: "Total Starts",
                    value: profile.summary.total_starts.toLocaleString(),
                    icon: <Flag size={16} color="#3B9EFF" />,
                  },
                  {
                    label: "Wins",
                    value: profile.summary.total_wins.toLocaleString(),
                    icon: <Trophy size={16} color="#EAB308" />,
                  },
                  {
                    label: "Top 5",
                    value: profile.summary.total_top5.toLocaleString(),
                    icon: <Shield size={16} color="#22C55E" />,
                  },
                  {
                    label: "Win %",
                    value: `${profile.summary.win_pct}%`,
                    icon: <TrendingUp size={16} color="#A855F7" />,
                  },
                ].map((s) => (
                  <div
                    key={s.label}
                    style={{
                      padding: "16px 20px",
                      background: T.card,
                      borderRadius: 14,
                      border: `1px solid ${T.border}`,
                    }}
                  >
                    <div style={{ marginBottom: 8 }}>{s.icon}</div>
                    <div
                      style={{
                        fontFamily: "DM Mono, monospace",
                        fontWeight: 800,
                        fontSize: 22,
                        color: T.text,
                      }}
                    >
                      {s.value}
                    </div>
                    <div
                      style={{
                        fontFamily: "DM Mono, monospace",
                        fontSize: 11,
                        color: T.muted,
                        textTransform: "uppercase",
                        letterSpacing: "0.1em",
                        marginTop: 4,
                      }}
                    >
                      {s.label}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Tabs */}
            <div
              style={{ display: "flex", borderBottom: `1px solid ${T.border}` }}
            >
              {(["stats", "races"] as const).map((tabId) => (
                <button
                  key={tabId}
                  onClick={() => setTab(tabId)}
                  style={{
                    padding: "10px 20px",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    fontFamily: "Syne, sans-serif",
                    fontWeight: 700,
                    fontSize: 14,
                    color: tab === tabId ? "#3B9EFF" : T.muted,
                    borderBottom: `2px solid ${tab === tabId ? "#3B9EFF" : "transparent"}`,
                    marginBottom: -1,
                    transition: "all 0.15s",
                  }}
                >
                  {tabId === "stats" ? t.licenseStats : t.recentRaces}
                </button>
              ))}
            </div>

            {/* Stats tab */}
            {tab === "stats" && (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
                  gap: 12,
                }}
              >
                {licenses.length === 0 && (
                  <p
                    style={{
                      color: T.muted,
                      fontFamily: "DM Mono, monospace",
                      fontSize: 13,
                    }}
                  >
                    No license data
                  </p>
                )}
                {licenses.map(([key, lic]: [string, any]) => {
                  if (!lic) return null;
                  const color =
                    LICENSE_COLORS[lic.group_name ?? ""] ?? "#64748B";
                  return (
                    <div
                      key={key}
                      style={{
                        padding: "20px",
                        background: T.card,
                        borderRadius: 16,
                        border: `1px solid ${T.border}`,
                        display: "flex",
                        gap: 16,
                        alignItems: "center",
                      }}
                    >
                      <div
                        style={{
                          width: 48,
                          height: 48,
                          borderRadius: 12,
                          background: color + "20",
                          border: `2px solid ${color}40`,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        <span
                          style={{
                            fontFamily: "DM Mono, monospace",
                            fontSize: 16,
                            fontWeight: 900,
                            color,
                          }}
                        >
                          {shortLicense(lic.group_name ?? "?")}
                        </span>
                      </div>
                      <div style={{ flex: 1 }}>
                        <div
                          style={{
                            fontFamily: "Syne, sans-serif",
                            fontWeight: 700,
                            fontSize: 14,
                            color: CATEGORY_COLORS[key] ?? "#3B9EFF",
                            marginBottom: 8,
                          }}
                        >
                          {CATEGORY_LABELS[key] ?? key}
                        </div>
                        <div style={{ display: "flex", gap: 20 }}>
                          <div>
                            <div
                              style={{
                                fontFamily: "DM Mono, monospace",
                                fontWeight: 800,
                                fontSize: 20,
                                color: "#3B9EFF",
                              }}
                            >
                              {(lic.irating ?? 0).toLocaleString()}
                            </div>
                            <div
                              style={{
                                fontFamily: "DM Mono, monospace",
                                fontSize: 10,
                                color: T.muted,
                              }}
                            >
                              iRATING
                            </div>
                          </div>
                          <div>
                            <div
                              style={{
                                fontFamily: "DM Mono, monospace",
                                fontWeight: 800,
                                fontSize: 20,
                                color,
                              }}
                            >
                              {(lic.safety_rating ?? 0).toFixed(2)}
                            </div>
                            <div
                              style={{
                                fontFamily: "DM Mono, monospace",
                                fontSize: 10,
                                color: T.muted,
                              }}
                            >
                              SAFETY
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Races tab */}
            {tab === "races" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {races.length === 0 && (
                  <p
                    style={{
                      color: T.muted,
                      fontFamily: "DM Mono, monospace",
                      fontSize: 13,
                      textAlign: "center",
                      padding: "40px 0",
                    }}
                  >
                    No recent races
                  </p>
                )}
                {races.map((race) => {
                  const iRatingColor =
                    race.irating_change > 0
                      ? "#22C55E"
                      : race.irating_change < 0
                        ? "#EF4444"
                        : T.muted;
                  const isPodium = race.finish_position <= 3;
                  return (
                    <div
                      key={race.subsession_id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 16,
                        padding: "16px 20px",
                        background: T.card,
                        borderRadius: 14,
                        border: `1px solid ${race.finish_position === 1 ? "rgba(234,179,8,0.3)" : T.border}`,
                      }}
                    >
                      <div
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: 12,
                          flexShrink: 0,
                          background: isPodium ? "rgba(234,179,8,0.12)" : T.row,
                          border: `1px solid ${isPodium ? "rgba(234,179,8,0.3)" : T.border}`,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <span
                          style={{
                            fontFamily: "DM Mono, monospace",
                            fontWeight: 900,
                            fontSize: 15,
                            color: isPodium ? "#EAB308" : T.muted,
                          }}
                        >
                          {race.finish_position === 1
                            ? "🏆"
                            : `P${race.finish_position}`}
                        </span>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontFamily: "Syne, sans-serif",
                            fontWeight: 700,
                            fontSize: 14,
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
                            gap: 10,
                            marginTop: 4,
                            flexWrap: "wrap",
                          }}
                        >
                          <span
                            style={{
                              fontFamily: "DM Mono, monospace",
                              fontSize: 11,
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
                                gap: 4,
                                fontFamily: "DM Mono, monospace",
                                fontSize: 11,
                                color: T.muted,
                              }}
                            >
                              <Car size={10} />
                              {race.car_name}
                            </span>
                          )}
                        </div>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          gap: 20,
                          flexShrink: 0,
                          alignItems: "center",
                        }}
                      >
                        <div style={{ textAlign: "center" }}>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 4,
                              justifyContent: "center",
                            }}
                          >
                            {race.irating_change > 0 ? (
                              <TrendingUp size={12} color="#22C55E" />
                            ) : race.irating_change < 0 ? (
                              <TrendingDown size={12} color="#EF4444" />
                            ) : (
                              <Minus size={12} color={T.muted} />
                            )}
                            <span
                              style={{
                                fontFamily: "DM Mono, monospace",
                                fontWeight: 800,
                                fontSize: 14,
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
                            }}
                          >
                            iRating
                          </div>
                        </div>
                        <div style={{ textAlign: "center" }}>
                          <div
                            style={{
                              fontFamily: "DM Mono, monospace",
                              fontWeight: 700,
                              fontSize: 14,
                              color: T.text,
                            }}
                          >
                            {race.sof.toLocaleString()}
                          </div>
                          <div
                            style={{
                              fontFamily: "DM Mono, monospace",
                              fontSize: 10,
                              color: T.muted,
                            }}
                          >
                            SOF
                          </div>
                        </div>
                        {race.incidents > 0 && (
                          <div style={{ textAlign: "center" }}>
                            <div
                              style={{
                                fontFamily: "DM Mono, monospace",
                                fontWeight: 700,
                                fontSize: 14,
                                color: "#F97316",
                              }}
                            >
                              {race.incidents}x
                            </div>
                            <div
                              style={{
                                fontFamily: "DM Mono, monospace",
                                fontSize: 10,
                                color: T.muted,
                              }}
                            >
                              Inc
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // ── SEARCH MODAL ──────────────────────────────────────────────
  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 2000,
        background: "rgba(0,0,0,0.7)",
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
          maxWidth: 520,
          background: T.card,
          borderRadius: 20,
          border: `1px solid ${T.border}`,
          boxShadow: "0 24px 64px rgba(0,0,0,0.5)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: "20px 20px 16px",
            borderBottom: `1px solid ${T.border}`,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              marginBottom: 16,
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
          <div style={{ position: "relative" }}>
            <Search
              size={15}
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
                padding: "12px 12px 12px 38px",
                borderRadius: 12,
                background: T.input,
                border: `1px solid ${T.border}`,
                color: T.text,
                fontFamily: "DM Sans, sans-serif",
                fontSize: 15,
                outline: "none",
                boxSizing: "border-box",
              }}
            />
            {searching && (
              <span
                style={{
                  position: "absolute",
                  right: 14,
                  top: "50%",
                  transform: "translateY(-50%)",
                  fontSize: 12,
                  color: T.muted,
                }}
              >
                ···
              </span>
            )}
          </div>
        </div>

        {results.length > 0 && (
          <div style={{ maxHeight: 420, overflowY: "auto" }}>
            {results.map((r, i) => (
              <button
                key={r.cust_id}
                onClick={() => loadProfile(r.cust_id)}
                style={{
                  width: "100%",
                  padding: "14px 20px",
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  background: "none",
                  border: "none",
                  borderBottom:
                    i < results.length - 1 ? `1px solid ${T.border}` : "none",
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "background 0.1s",
                }}
                onMouseEnter={(e) =>
                  ((e.currentTarget as HTMLElement).style.background = T.hover)
                }
                onMouseLeave={(e) =>
                  ((e.currentTarget as HTMLElement).style.background = "none")
                }
              >
                <div
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 10,
                    background: "rgba(59,158,255,0.1)",
                    border: "1px solid rgba(59,158,255,0.2)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <User size={16} color="#3B9EFF" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontFamily: "Syne, sans-serif",
                      fontWeight: 700,
                      fontSize: 14,
                      color: T.text,
                    }}
                  >
                    {r.display_name}
                  </div>
                  <div
                    style={{
                      fontFamily: "DM Mono, monospace",
                      fontSize: 11,
                      color: T.muted,
                    }}
                  >
                    {r.club_name}
                  </div>
                </div>
                <span
                  style={{
                    fontFamily: "DM Mono, monospace",
                    fontSize: 11,
                    color: T.muted,
                  }}
                >
                  #{r.cust_id}
                </span>
              </button>
            ))}
          </div>
        )}

        {results.length === 0 && query.length < 2 && (
          <div style={{ padding: "48px 24px", textAlign: "center" }}>
            <User
              size={40}
              strokeWidth={1}
              color={T.muted}
              style={{ marginBottom: 16 }}
            />
            <p
              style={{
                fontFamily: "Syne, sans-serif",
                fontWeight: 700,
                fontSize: 15,
                color: T.text,
                margin: "0 0 8px",
              }}
            >
              {t.searchDriverHint}
            </p>
            <p
              style={{
                fontFamily: "DM Sans, sans-serif",
                fontSize: 13,
                color: T.muted,
                margin: 0,
              }}
            >
              {t.searchDriverDesc}
            </p>
          </div>
        )}

        {results.length === 0 && query.length >= 2 && !searching && (
          <div
            style={{
              padding: "32px 24px",
              textAlign: "center",
              color: T.muted,
              fontFamily: "DM Mono, monospace",
              fontSize: 13,
            }}
          >
            No drivers found for "{query}"
          </div>
        )}
      </div>
    </div>
  );
}
