"use client";
// /app/components/DriverProfile.tsx

import { useState, useEffect, useRef } from "react";
import type { CSSProperties } from "react";
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
  helmet: {
    pattern: number;
    color1: string;
    color2: string;
    color3: string;
  } | null;
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

  const shimmer = (dark: boolean): CSSProperties => ({
    background: dark
      ? "linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.09) 50%, rgba(255,255,255,0.04) 75%)"
      : "linear-gradient(90deg, rgba(0,0,0,0.04) 25%, rgba(0,0,0,0.08) 50%, rgba(0,0,0,0.04) 75%)",
    backgroundSize: "600px 100%",
    animation: "shimmer 1.4s infinite linear",
  });

  // ── FULLSCREEN PROFILE ────────────────────────────────────────
  if (profile || loading) {
    const licenses = Object.entries(profile?.licenses ?? {});
    const primary =
      profile?.licenses?.sports_car ??
      profile?.licenses?.oval ??
      (Object.values(profile?.licenses ?? {})[0] as License | undefined);
    const primaryColor = LICENSE_COLORS[primary?.group_name ?? ""] ?? "#3B9EFF";
    const primaryCatKey =
      Object.keys(profile?.licenses ?? {}).find(
        (k) => profile?.licenses[k] === primary,
      ) ?? "";

    const HelmetBadge = ({
      helmet,
      size = 112,
      fallbackColor = "#3B9EFF",
      fallbackLabel = "?",
    }: {
      helmet: any;
      size?: number;
      fallbackColor?: string;
      fallbackLabel?: string;
    }) => {
      if (!helmet)
        return (
          <div
            style={{
              width: size,
              height: size,
              borderRadius: 22,
              background: `linear-gradient(145deg, ${fallbackColor}20, transparent)`,
              border: `3px solid ${fallbackColor}35`,
              boxShadow: `0 0 45px ${fallbackColor}50, inset 0 4px 15px rgba(255,255,255,0.2)`,
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
                fontSize: size * 0.42,
                color: fallbackColor,
                textShadow: `0 0 25px ${fallbackColor}90`,
              }}
            >
              {fallbackLabel}
            </span>
          </div>
        );
      const c1 = `#${helmet.color1 ?? "3B9EFF"}`;
      const c2 = `#${helmet.color2 ?? "A855F7"}`;
      const c3 = `#${helmet.color3 ?? "22C55E"}`;
      return (
        <div
          style={{
            width: size,
            height: size,
            borderRadius: 22,
            overflow: "hidden",
            flexShrink: 0,
            boxShadow:
              "0 25px 50px rgba(0,0,0,0.45), inset 0 6px 20px rgba(255,255,255,0.18)",
            border: "3px solid rgba(255,255,255,0.18)",
            position: "relative",
          }}
        >
          <svg
            viewBox="0 0 108 108"
            width={size}
            height={size}
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <clipPath id="helmet-clip">
                <path d="M54 10 C32 10 15 26 15 48 C15 72 32 92 54 96 C76 92 93 72 93 48 C93 26 76 10 54 10Z" />
              </clipPath>
              <linearGradient
                id="visorGrad"
                x1="30%"
                y1="40%"
                x2="70%"
                y2="70%"
              >
                <stop offset="0%" stopColor="rgba(0,0,0,0.65)" />
                <stop offset="100%" stopColor="rgba(100,190,255,0.28)" />
              </linearGradient>
            </defs>
            <rect
              width="108"
              height="108"
              fill={c1}
              clipPath="url(#helmet-clip)"
            />
            <rect
              x="0"
              y="40"
              width="108"
              height="20"
              fill={c2}
              clipPath="url(#helmet-clip)"
            />
            <rect
              x="0"
              y="60"
              width="108"
              height="14"
              fill={c3}
              clipPath="url(#helmet-clip)"
            />
            <ellipse
              cx="54"
              cy="56"
              rx="34"
              ry="16"
              fill="url(#visorGrad)"
              clipPath="url(#helmet-clip)"
            />
            <path
              d="M35 30 Q54 22 73 33"
              fill="none"
              stroke="rgba(255,255,255,0.45)"
              strokeWidth="7"
              strokeLinecap="round"
            />
            <path
              d="M54 10 C32 10 15 26 15 48 C15 72 32 92 54 96 C76 92 93 72 93 48 C93 26 76 10 54 10Z"
              fill="none"
              stroke="rgba(255,255,255,0.3)"
              strokeWidth="4"
            />
          </svg>
        </div>
      );
    };

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
        {/* Top bar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "16px 28px",
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
              gap: 8,
              background: "none",
              border: "none",
              cursor: "pointer",
              color: T.muted,
              fontFamily: "Syne, sans-serif",
              fontWeight: 600,
              fontSize: 14,
              padding: "8px 12px",
              borderRadius: 10,
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) =>
              ((e.currentTarget as HTMLElement).style.background = T.hover)
            }
            onMouseLeave={(e) =>
              ((e.currentTarget as HTMLElement).style.background = "none")
            }
          >
            <ChevronLeft size={18} /> {t.driverSearch}
          </button>
          <span style={{ color: T.border }}>|</span>
          <span
            style={{
              fontFamily: "Syne, sans-serif",
              fontWeight: 800,
              fontSize: 17,
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
              padding: 8,
              borderRadius: 8,
            }}
          >
            <X size={22} />
          </button>
        </div>

        {loading && (
          <div
            style={{
              maxWidth: 920,
              width: "100%",
              margin: "0 auto",
              padding: "36px 28px",
              display: "flex",
              flexDirection: "column",
              gap: 32,
            }}
          >
            <style>{`
              @keyframes shimmer {
                0% { background-position: -600px 0; }
                100% { background-position: 600px 0; }
              }
            `}</style>

            {/* Hero skeleton */}
            <div
              style={{
                padding: "40px",
                borderRadius: 28,
                border: `1px solid ${T.border}`,
                background: T.card,
                display: "flex",
                alignItems: "flex-start",
                gap: 32,
              }}
            >
              {/* Helmet */}
              <div
                style={{
                  width: 112,
                  height: 112,
                  borderRadius: 22,
                  flexShrink: 0,
                  ...shimmer(isDark),
                }}
              />
              <div
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                  paddingTop: 8,
                }}
              >
                <div
                  style={{
                    height: 36,
                    width: "55%",
                    borderRadius: 10,
                    ...shimmer(isDark),
                  }}
                />
                <div
                  style={{
                    height: 16,
                    width: "35%",
                    borderRadius: 8,
                    ...shimmer(isDark),
                  }}
                />
              </div>
              <div
                style={{
                  textAlign: "right",
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                  alignItems: "flex-end",
                  paddingTop: 4,
                }}
              >
                <div
                  style={{
                    height: 46,
                    width: 120,
                    borderRadius: 10,
                    ...shimmer(isDark),
                  }}
                />
                <div
                  style={{
                    height: 16,
                    width: 80,
                    borderRadius: 8,
                    ...shimmer(isDark),
                  }}
                />
                <div
                  style={{
                    height: 14,
                    width: 60,
                    borderRadius: 8,
                    ...shimmer(isDark),
                  }}
                />
              </div>
            </div>

            {/* License cards skeleton */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
                gap: 14,
              }}
            >
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  style={{
                    padding: "22px",
                    background: T.card,
                    borderRadius: 18,
                    border: `1px solid ${T.border}`,
                    display: "flex",
                    gap: 18,
                    alignItems: "center",
                  }}
                >
                  <div
                    style={{
                      width: 52,
                      height: 52,
                      borderRadius: 14,
                      flexShrink: 0,
                      ...shimmer(isDark),
                    }}
                  />
                  <div
                    style={{
                      flex: 1,
                      display: "flex",
                      flexDirection: "column",
                      gap: 10,
                    }}
                  >
                    <div
                      style={{
                        height: 14,
                        width: "50%",
                        borderRadius: 6,
                        ...shimmer(isDark),
                      }}
                    />
                    <div style={{ display: "flex", gap: 22 }}>
                      <div
                        style={{
                          height: 22,
                          width: 60,
                          borderRadius: 6,
                          ...shimmer(isDark),
                        }}
                      />
                      <div
                        style={{
                          height: 22,
                          width: 50,
                          borderRadius: 6,
                          ...shimmer(isDark),
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {!loading && profile && (
          <div
            style={{
              maxWidth: 920,
              width: "100%",
              margin: "0 auto",
              padding: "36px 28px",
              display: "flex",
              flexDirection: "column",
              gap: 32,
            }}
          >
            {/* Hero */}
            <div
              style={{
                padding: "40px",
                borderRadius: 28,
                border: `1px solid ${T.border}`,
                background: isDark
                  ? `linear-gradient(135deg, ${primaryColor}22 0%, ${T.card} 65%)`
                  : `linear-gradient(135deg, ${primaryColor}12 0%, #FFFFFF 65%)`,
                boxShadow:
                  "0 20px 50px rgba(0,0,0,0.3), inset 0 2px 0 rgba(255,255,255,0.1)",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 32,
                  flexWrap: "wrap",
                }}
              >
                <HelmetBadge
                  helmet={(profile as any).helmet}
                  size={112}
                  fallbackColor={primaryColor}
                  fallbackLabel={shortLicense(primary?.group_name ?? "R")}
                />
                <div style={{ flex: 1, minWidth: 200 }}>
                  <h1
                    style={{
                      fontFamily: "Syne, sans-serif",
                      fontWeight: 900,
                      fontSize: 36,
                      color: T.text,
                      margin: "0 0 10px",
                      letterSpacing: "-0.025em",
                    }}
                  >
                    {profile.display_name}
                  </h1>
                  <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
                    {profile.club_name && (
                      <span
                        style={{
                          fontFamily: "DM Mono, monospace",
                          fontSize: 13,
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
                          fontSize: 13,
                          color: T.muted,
                        }}
                      >
                        · Since {new Date(profile.member_since).getFullYear()}
                      </span>
                    )}
                    <span
                      style={{
                        fontFamily: "DM Mono, monospace",
                        fontSize: 13,
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
                        fontWeight: 900,
                        fontSize: 46,
                        lineHeight: 1,
                        color: "#60A5FA",
                        textShadow: `0 0 30px ${primaryColor}60`,
                      }}
                    >
                      {(primary.irating ?? 0).toLocaleString()}
                    </div>
                    <div
                      style={{
                        fontSize: 14,
                        color: primaryColor,
                        fontWeight: 700,
                        marginTop: 6,
                      }}
                    >
                      SR {(primary.safety_rating ?? 0).toFixed(2)}
                    </div>
                    <div style={{ fontSize: 12, color: T.muted, marginTop: 4 }}>
                      {CATEGORY_LABELS[primaryCatKey] ?? "Sports Car"}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Summary cards */}
            {profile.summary && profile.summary.total_starts > 0 && (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))",
                  gap: 16,
                }}
              >
                {[
                  {
                    label: "Total Starts",
                    value: profile.summary.total_starts.toLocaleString(),
                    icon: <Flag size={20} color="#3B9EFF" />,
                  },
                  {
                    label: "Wins",
                    value: profile.summary.total_wins.toLocaleString(),
                    icon: <Trophy size={20} color="#EAB308" />,
                  },
                  {
                    label: "Top 5",
                    value: profile.summary.total_top5.toLocaleString(),
                    icon: <Shield size={20} color="#22C55E" />,
                  },
                  {
                    label: "Win %",
                    value: `${profile.summary.win_pct}%`,
                    icon: <TrendingUp size={20} color="#A855F7" />,
                  },
                ].map((s) => (
                  <div
                    key={s.label}
                    style={{
                      padding: "20px 24px",
                      background: T.card,
                      borderRadius: 18,
                      border: `1px solid ${T.border}`,
                      transition: "all 0.25s cubic-bezier(0.4,0,0.2,1)",
                      cursor: "default",
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.transform =
                        "translateY(-4px)";
                      (e.currentTarget as HTMLElement).style.boxShadow =
                        "0 15px 30px rgba(0,0,0,0.2)";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.transform =
                        "translateY(0)";
                      (e.currentTarget as HTMLElement).style.boxShadow = "none";
                    }}
                  >
                    <div style={{ marginBottom: 12 }}>{s.icon}</div>
                    <div
                      style={{
                        fontFamily: "DM Mono, monospace",
                        fontWeight: 800,
                        fontSize: 24,
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
                        letterSpacing: "0.08em",
                        marginTop: 6,
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
                    padding: "12px 24px",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    fontFamily: "Syne, sans-serif",
                    fontWeight: 700,
                    fontSize: 15,
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
                  gap: 14,
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
                  const catColor = CATEGORY_COLORS[key] ?? "#3B9EFF";
                  return (
                    <div
                      key={key}
                      style={{
                        padding: "22px",
                        background: T.card,
                        borderRadius: 18,
                        border: `1px solid ${T.border}`,
                        display: "flex",
                        gap: 18,
                        alignItems: "center",
                        transition: "all 0.2s",
                        cursor: "default",
                      }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLElement).style.transform =
                          "translateY(-3px)";
                        (e.currentTarget as HTMLElement).style.boxShadow =
                          "0 12px 28px rgba(0,0,0,0.15)";
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLElement).style.transform =
                          "translateY(0)";
                        (e.currentTarget as HTMLElement).style.boxShadow =
                          "none";
                      }}
                    >
                      <div
                        style={{
                          width: 52,
                          height: 52,
                          borderRadius: 14,
                          background: `linear-gradient(145deg, ${color}25, ${color}10)`,
                          border: `2px solid ${color}50`,
                          boxShadow: `0 0 20px ${color}30`,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        <span
                          style={{
                            fontFamily: "DM Mono, monospace",
                            fontSize: 18,
                            fontWeight: 900,
                            color,
                            textShadow: `0 0 12px ${color}80`,
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
                            color: catColor,
                            marginBottom: 10,
                          }}
                        >
                          {CATEGORY_LABELS[key] ?? key}
                        </div>
                        <div style={{ display: "flex", gap: 22 }}>
                          <div>
                            <div
                              style={{
                                fontFamily: "DM Mono, monospace",
                                fontWeight: 800,
                                fontSize: 22,
                                color: "#60A5FA",
                              }}
                            >
                              {(lic.irating ?? 0).toLocaleString()}
                            </div>
                            <div
                              style={{
                                fontFamily: "DM Mono, monospace",
                                fontSize: 10,
                                color: T.muted,
                                textTransform: "uppercase",
                                letterSpacing: "0.08em",
                              }}
                            >
                              iRating
                            </div>
                          </div>
                          <div>
                            <div
                              style={{
                                fontFamily: "DM Mono, monospace",
                                fontWeight: 800,
                                fontSize: 22,
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
                                textTransform: "uppercase",
                                letterSpacing: "0.08em",
                              }}
                            >
                              Safety
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
              <div
                style={{ display: "flex", flexDirection: "column", gap: 10 }}
              >
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
                        gap: 18,
                        padding: "18px 22px",
                        background: T.card,
                        borderRadius: 16,
                        border: `1px solid ${race.finish_position === 1 ? "rgba(234,179,8,0.35)" : T.border}`,
                        transition: "all 0.2s",
                        cursor: "default",
                      }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLElement).style.transform =
                          "translateX(4px)";
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLElement).style.transform =
                          "translateX(0)";
                      }}
                    >
                      <div
                        style={{
                          width: 46,
                          height: 46,
                          borderRadius: 12,
                          flexShrink: 0,
                          background: isPodium ? "rgba(234,179,8,0.12)" : T.row,
                          border: `1px solid ${isPodium ? "rgba(234,179,8,0.35)" : T.border}`,
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
                          gap: 22,
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
                              <TrendingUp size={13} color="#22C55E" />
                            ) : race.irating_change < 0 ? (
                              <TrendingDown size={13} color="#EF4444" />
                            ) : (
                              <Minus size={13} color={T.muted} />
                            )}
                            <span
                              style={{
                                fontFamily: "DM Mono, monospace",
                                fontWeight: 800,
                                fontSize: 15,
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
                              textTransform: "uppercase",
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
                              fontSize: 15,
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
                              textTransform: "uppercase",
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
                                fontSize: 15,
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
                                textTransform: "uppercase",
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
        background: "rgba(0,0,0,0.75)",
        backdropFilter: "blur(16px)",
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
          background: isDark ? "#0A1221" : "#FFFFFF",
          borderRadius: 24,
          border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)"}`,
          boxShadow: "0 32px 80px rgba(0,0,0,0.6)",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "24px 24px 18px",
            borderBottom: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"}`,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              marginBottom: 18,
            }}
          >
            <User size={20} color="#3B9EFF" />
            <span
              style={{
                fontFamily: "Syne, sans-serif",
                fontWeight: 800,
                fontSize: 18,
                color: isDark ? "#E2E8F0" : "#1E293B",
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
                color: isDark ? "#64748B" : "#94A3B8",
                display: "flex",
                padding: 6,
                borderRadius: 8,
              }}
            >
              <X size={20} />
            </button>
          </div>
          <div style={{ position: "relative" }}>
            <Search
              size={16}
              color={isDark ? "#64748B" : "#94A3B8"}
              style={{
                position: "absolute",
                left: 14,
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
                padding: "14px 14px 14px 42px",
                borderRadius: 14,
                background: isDark
                  ? "rgba(255,255,255,0.06)"
                  : "rgba(0,0,0,0.04)",
                border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}`,
                color: isDark ? "#E2E8F0" : "#1E293B",
                fontFamily: "DM Sans, sans-serif",
                fontSize: 15,
                outline: "none",
                boxSizing: "border-box",
                transition: "border-color 0.2s",
              }}
            />
            {searching && (
              <span
                style={{
                  position: "absolute",
                  right: 16,
                  top: "50%",
                  transform: "translateY(-50%)",
                  fontSize: 13,
                  color: isDark ? "#64748B" : "#94A3B8",
                }}
              >
                ···
              </span>
            )}
          </div>
        </div>

        {/* Results */}
        {results.length > 0 && (
          <div style={{ maxHeight: 440, overflowY: "auto" }}>
            {results.map((r, i) => (
              <button
                key={r.cust_id}
                onClick={() => loadProfile(r.cust_id)}
                style={{
                  width: "100%",
                  padding: "14px 24px",
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  background: "none",
                  border: "none",
                  borderBottom:
                    i < results.length - 1
                      ? `1px solid ${isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}`
                      : "none",
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "background 0.15s",
                }}
                onMouseEnter={(e) =>
                  ((e.currentTarget as HTMLElement).style.background = isDark
                    ? "rgba(255,255,255,0.05)"
                    : "rgba(0,0,0,0.03)")
                }
                onMouseLeave={(e) =>
                  ((e.currentTarget as HTMLElement).style.background = "none")
                }
              >
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 12,
                    background: "rgba(59,158,255,0.1)",
                    border: "1px solid rgba(59,158,255,0.2)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <User size={17} color="#3B9EFF" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontFamily: "Syne, sans-serif",
                      fontWeight: 700,
                      fontSize: 14,
                      color: isDark ? "#E2E8F0" : "#1E293B",
                    }}
                  >
                    {r.display_name}
                  </div>
                  <div
                    style={{
                      fontFamily: "DM Mono, monospace",
                      fontSize: 11,
                      color: isDark ? "#64748B" : "#94A3B8",
                      marginTop: 2,
                    }}
                  >
                    {r.club_name}
                  </div>
                </div>
                <span
                  style={{
                    fontFamily: "DM Mono, monospace",
                    fontSize: 11,
                    color: isDark ? "#475569" : "#CBD5E1",
                  }}
                >
                  #{r.cust_id}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Empty hint */}
        {results.length === 0 && query.length < 2 && (
          <div style={{ padding: "52px 28px", textAlign: "center" }}>
            <User
              size={44}
              strokeWidth={1}
              color={isDark ? "#334155" : "#CBD5E1"}
              style={{ marginBottom: 18 }}
            />
            <p
              style={{
                fontFamily: "Syne, sans-serif",
                fontWeight: 700,
                fontSize: 16,
                color: isDark ? "#E2E8F0" : "#1E293B",
                margin: "0 0 10px",
              }}
            >
              {t.searchDriverHint}
            </p>
            <p
              style={{
                fontFamily: "DM Sans, sans-serif",
                fontSize: 14,
                color: isDark ? "#64748B" : "#94A3B8",
                margin: 0,
                lineHeight: 1.6,
              }}
            >
              {t.searchDriverDesc}
            </p>
          </div>
        )}

        {/* No results */}
        {results.length === 0 && query.length >= 2 && !searching && (
          <div
            style={{
              padding: "36px 28px",
              textAlign: "center",
              color: isDark ? "#64748B" : "#94A3B8",
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
