"use client";
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
import { Canvas, useFrame, useLoader } from "@react-three/fiber";
import { OrbitControls, Environment } from "@react-three/drei";
import * as THREE from "three";

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
  const [inputFocused, setInputFocused] = useState(false);
  const searchTimeout = useRef<any>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [races, setRaces] = useState<Race[]>([]);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<"stats" | "races">("stats");

  const T = {
    bg: isDark ? "#060C18" : "#F1F5F9",
    card: isDark ? "#0A1221" : "#FFFFFF",
    border: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)",
    input: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)",
    text: isDark ? "#F1F5F9" : "#0F172A",
    muted: isDark ? "#64748B" : "#94A3B8",
    faint: isDark ? "#334155" : "#CBD5E1",
    row: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)",
    hover: isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.05)",
  };

  const shimmer = (dark: boolean): CSSProperties => ({
    background: dark
      ? "linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.09) 50%, rgba(255,255,255,0.04) 75%)"
      : "linear-gradient(90deg, rgba(0,0,0,0.04) 25%, rgba(0,0,0,0.08) 50%, rgba(0,0,0,0.04) 75%)",
    backgroundSize: "600px 100%",
    animation: "shimmer 1.4s infinite linear",
  });

  // ── 3D HELMET COMPONENT (real iRacing PNG + Three.js) ─────────────────────
  const HelmetMesh = ({ custId }: { custId: number }) => {
    const meshRef = useRef<THREE.Mesh>(null!);
    const texture = useLoader(
      THREE.TextureLoader,
      `/api/iracing/helmet?cust_id=${custId}`,
    );

    useEffect(() => {
      if (texture) {
        texture.anisotropy = 16;
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;
      }
    }, [texture]);

    useFrame((state) => {
      if (meshRef.current) {
        meshRef.current.rotation.y = state.clock.elapsedTime * 0.6;
      }
    });

    return (
      <mesh ref={meshRef} castShadow receiveShadow>
        <planeGeometry args={[2.15, 2.55]} />
        <meshStandardMaterial
          map={texture}
          transparent
          side={THREE.DoubleSide}
          depthWrite={false}
          roughness={0.35}
          metalness={0.15}
        />
      </mesh>
    );
  };

  const HelmetViewer = ({ custId }: { custId: number }) => {
    return (
      <div
        style={{
          width: 170,
          height: 205,
          flexShrink: 0,
          borderRadius: 28,
          overflow: "hidden",
          boxShadow:
            "0 0 50px rgba(59,158,255,0.25), 0 25px 60px rgba(0,0,0,0.55)",
          background: "rgba(0,0,0,0.3)",
        }}
      >
        <Canvas
          camera={{ position: [0, 0.1, 3.7], fov: 46 }}
          gl={{ antialias: true, alpha: true }}
          style={{ width: "100%", height: "100%" }}
        >
          <ambientLight intensity={0.65} />
          <directionalLight position={[4, 5, 6]} intensity={1.4} castShadow />
          <pointLight position={[-4, -4, -5]} intensity={0.7} color="#a0d8ff" />
          <Environment preset="warehouse" />
          <HelmetMesh custId={custId} />
          <OrbitControls
            enableZoom={true}
            enablePan={false}
            minDistance={2.8}
            maxDistance={5.5}
            minPolarAngle={Math.PI / 3.5}
            maxPolarAngle={Math.PI - 0.7}
          />
        </Canvas>
      </div>
    );
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
    const primaryCatKey =
      Object.keys(profile?.licenses ?? {}).find(
        (k) => profile?.licenses[k] === primary,
      ) ?? "";

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
        <style>{`
          @keyframes shimmer { 0%{background-position:-600px 0} 100%{background-position:600px 0} }
          @keyframes fadeUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        `}</style>

        {/* Top bar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            padding: "16px 32px",
            borderBottom: `1px solid ${T.border}`,
            background: isDark
              ? "rgba(6,12,24,0.95)"
              : "rgba(248,250,252,0.95)",
            backdropFilter: "blur(20px)",
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
              border: `1px solid transparent`,
              cursor: "pointer",
              color: T.muted,
              fontFamily: "Syne, sans-serif",
              fontWeight: 600,
              fontSize: 14,
              padding: "8px 14px",
              borderRadius: 12,
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => {
              const el = e.currentTarget as HTMLElement;
              el.style.background = T.hover;
              el.style.borderColor = T.border;
              el.style.color = T.text;
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget as HTMLElement;
              el.style.background = "none";
              el.style.borderColor = "transparent";
              el.style.color = T.muted;
            }}
          >
            <ChevronLeft size={17} /> {t.driverSearch}
          </button>
          <span style={{ color: T.faint }}>|</span>
          <span
            style={{
              fontFamily: "Syne, sans-serif",
              fontWeight: 800,
              fontSize: 17,
              color: T.text,
            }}
          >
            {loading ? "···" : profile?.display_name}
          </span>
          <button
            onClick={onClose}
            style={{
              marginLeft: "auto",
              background: "none",
              border: `1px solid transparent`,
              cursor: "pointer",
              color: T.muted,
              padding: 8,
              borderRadius: 10,
              display: "flex",
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => {
              const el = e.currentTarget as HTMLElement;
              el.style.background = T.hover;
              el.style.borderColor = T.border;
              el.style.color = T.text;
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget as HTMLElement;
              el.style.background = "none";
              el.style.borderColor = "transparent";
              el.style.color = T.muted;
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Skeleton */}
        {loading && (
          <div
            style={{
              maxWidth: 960,
              width: "100%",
              margin: "0 auto",
              padding: "40px 32px",
              display: "flex",
              flexDirection: "column",
              gap: 32,
            }}
          >
            <div
              style={{
                padding: "48px",
                borderRadius: 32,
                border: `1px solid ${T.border}`,
                background: T.card,
                display: "flex",
                alignItems: "flex-start",
                gap: 36,
              }}
            >
              <div
                style={{
                  width: 170,
                  height: 205,
                  borderRadius: 28,
                  flexShrink: 0,
                  ...shimmer(isDark),
                }}
              />
              <div
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  gap: 14,
                  paddingTop: 10,
                }}
              >
                <div
                  style={{
                    height: 40,
                    width: "50%",
                    borderRadius: 12,
                    ...shimmer(isDark),
                  }}
                />
                <div
                  style={{
                    height: 16,
                    width: "32%",
                    borderRadius: 8,
                    ...shimmer(isDark),
                  }}
                />
              </div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                  alignItems: "flex-end",
                  paddingTop: 6,
                }}
              >
                <div
                  style={{
                    height: 52,
                    width: 130,
                    borderRadius: 12,
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
              </div>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(270px, 1fr))",
                gap: 14,
              }}
            >
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  style={{
                    padding: "24px",
                    background: T.card,
                    borderRadius: 20,
                    border: `1px solid ${T.border}`,
                    display: "flex",
                    gap: 18,
                    alignItems: "center",
                  }}
                >
                  <div
                    style={{
                      width: 56,
                      height: 56,
                      borderRadius: 16,
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
                        width: "45%",
                        borderRadius: 6,
                        ...shimmer(isDark),
                      }}
                    />
                    <div style={{ display: "flex", gap: 20 }}>
                      <div
                        style={{
                          height: 24,
                          width: 64,
                          borderRadius: 6,
                          ...shimmer(isDark),
                        }}
                      />
                      <div
                        style={{
                          height: 24,
                          width: 52,
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

        {/* Profile content */}
        {!loading && profile && (
          <div
            style={{
              maxWidth: 960,
              width: "100%",
              margin: "0 auto",
              padding: "40px 32px",
              display: "flex",
              flexDirection: "column",
              gap: 32,
              animation: "fadeUp 0.35s ease",
            }}
          >
            {/* Hero */}
            <div
              style={{
                padding: "48px",
                borderRadius: 32,
                border: `1px solid ${isDark ? `${primaryColor}30` : `${primaryColor}20`}`,
                background: isDark
                  ? `linear-gradient(145deg, ${primaryColor}18 0%, #0A1221 55%, #060C18 100%)`
                  : `linear-gradient(145deg, ${primaryColor}10 0%, #FFFFFF 60%)`,
                boxShadow: isDark
                  ? `0 0 80px ${primaryColor}15, 0 32px 64px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.08)`
                  : `0 20px 48px rgba(0,0,0,0.1)`,
                overflow: "hidden",
                position: "relative",
              }}
            >
              {/* Background glow orb */}
              <div
                style={{
                  position: "absolute",
                  top: -60,
                  right: -60,
                  width: 280,
                  height: 280,
                  borderRadius: "50%",
                  background: `radial-gradient(circle, ${primaryColor}18 0%, transparent 70%)`,
                  pointerEvents: "none",
                }}
              />

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 40,
                  flexWrap: "wrap",
                  position: "relative",
                }}
              >
                <HelmetViewer custId={profile.cust_id} />

                <div style={{ flex: 1, minWidth: 200 }}>
                  <h1
                    style={{
                      fontFamily: "Syne, sans-serif",
                      fontWeight: 900,
                      fontSize: 40,
                      color: T.text,
                      margin: "0 0 12px",
                      letterSpacing: "-0.03em",
                      lineHeight: 1,
                    }}
                  >
                    {profile.display_name}
                  </h1>
                  <div
                    style={{
                      display: "flex",
                      gap: 16,
                      flexWrap: "wrap",
                      alignItems: "center",
                    }}
                  >
                    {profile.club_name && (
                      <span
                        style={{
                          fontFamily: "DM Mono, monospace",
                          fontSize: 13,
                          color: T.muted,
                          background: isDark
                            ? "rgba(255,255,255,0.06)"
                            : "rgba(0,0,0,0.05)",
                          padding: "4px 10px",
                          borderRadius: 8,
                          border: `1px solid ${T.border}`,
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
                        Since {new Date(profile.member_since).getFullYear()}
                      </span>
                    )}
                    <span
                      style={{
                        fontFamily: "DM Mono, monospace",
                        fontSize: 13,
                        color: T.faint,
                      }}
                    >
                      #{profile.cust_id}
                    </span>
                  </div>
                </div>

                {primary && (
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div
                      style={{
                        fontFamily: "DM Mono, monospace",
                        fontWeight: 900,
                        fontSize: 52,
                        lineHeight: 1,
                        color: "#60A5FA",
                        textShadow: `0 0 40px ${primaryColor}80, 0 0 80px ${primaryColor}40`,
                        letterSpacing: "-0.02em",
                      }}
                    >
                      {(primary.irating ?? 0).toLocaleString()}
                    </div>
                    <div
                      style={{
                        fontFamily: "DM Mono, monospace",
                        fontSize: 16,
                        color: primaryColor,
                        fontWeight: 700,
                        marginTop: 8,
                        textShadow: `0 0 20px ${primaryColor}60`,
                      }}
                    >
                      SR {(primary.safety_rating ?? 0).toFixed(2)}
                    </div>
                    <div
                      style={{
                        fontFamily: "DM Mono, monospace",
                        fontSize: 12,
                        color: T.muted,
                        marginTop: 6,
                        textTransform: "uppercase",
                        letterSpacing: "0.1em",
                      }}
                    >
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
                  gridTemplateColumns: "repeat(auto-fill, minmax(175px, 1fr))",
                  gap: 16,
                }}
              >
                {[
                  {
                    label: "Total Starts",
                    value: profile.summary.total_starts.toLocaleString(),
                    icon: <Flag size={22} color="#3B9EFF" />,
                    glow: "#3B9EFF",
                  },
                  {
                    label: "Wins",
                    value: profile.summary.total_wins.toLocaleString(),
                    icon: <Trophy size={22} color="#EAB308" />,
                    glow: "#EAB308",
                  },
                  {
                    label: "Top 5",
                    value: profile.summary.total_top5.toLocaleString(),
                    icon: <Shield size={22} color="#22C55E" />,
                    glow: "#22C55E",
                  },
                  {
                    label: "Win %",
                    value: `${profile.summary.win_pct}%`,
                    icon: <TrendingUp size={22} color="#A855F7" />,
                    glow: "#A855F7",
                  },
                ].map((s) => (
                  <div
                    key={s.label}
                    style={{
                      padding: "22px 24px",
                      background: T.card,
                      borderRadius: 20,
                      border: `1px solid ${T.border}`,
                      transition: "all 0.3s cubic-bezier(0.34,1.56,0.64,1)",
                      cursor: "default",
                    }}
                    onMouseEnter={(e) => {
                      const el = e.currentTarget as HTMLElement;
                      el.style.transform = "translateY(-6px)";
                      el.style.boxShadow = `0 20px 40px rgba(0,0,0,0.25), 0 0 30px ${s.glow}18`;
                      el.style.borderColor = `${s.glow}35`;
                    }}
                    onMouseLeave={(e) => {
                      const el = e.currentTarget as HTMLElement;
                      el.style.transform = "translateY(0)";
                      el.style.boxShadow = "none";
                      el.style.borderColor = T.border;
                    }}
                  >
                    <div style={{ marginBottom: 14, opacity: 0.9 }}>
                      {s.icon}
                    </div>
                    <div
                      style={{
                        fontFamily: "DM Mono, monospace",
                        fontWeight: 900,
                        fontSize: 26,
                        color: T.text,
                        letterSpacing: "-0.02em",
                      }}
                    >
                      {s.value}
                    </div>
                    <div
                      style={{
                        fontFamily: "DM Mono, monospace",
                        fontSize: 10.5,
                        color: T.muted,
                        textTransform: "uppercase",
                        letterSpacing: "0.1em",
                        marginTop: 8,
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
              style={{
                display: "flex",
                borderBottom: `1px solid ${T.border}`,
                gap: 4,
              }}
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
                    transition: "all 0.2s",
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
                  gridTemplateColumns: "repeat(auto-fill, minmax(270px, 1fr))",
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
                        padding: "24px",
                        background: T.card,
                        borderRadius: 20,
                        border: `1px solid ${T.border}`,
                        display: "flex",
                        gap: 20,
                        alignItems: "center",
                        transition: "all 0.3s cubic-bezier(0.34,1.56,0.64,1)",
                        cursor: "default",
                      }}
                      onMouseEnter={(e) => {
                        const el = e.currentTarget as HTMLElement;
                        el.style.transform = "translateY(-5px)";
                        el.style.boxShadow = `0 16px 40px rgba(0,0,0,0.2), 0 0 24px ${color}20`;
                        el.style.borderColor = `${color}35`;
                      }}
                      onMouseLeave={(e) => {
                        const el = e.currentTarget as HTMLElement;
                        el.style.transform = "translateY(0)";
                        el.style.boxShadow = "none";
                        el.style.borderColor = T.border;
                      }}
                    >
                      <div
                        style={{
                          width: 56,
                          height: 56,
                          borderRadius: 16,
                          background: `radial-gradient(circle at 35% 35%, ${color}30, ${color}12)`,
                          border: `2px solid ${color}45`,
                          boxShadow: `0 0 24px ${color}35, inset 0 1px 0 rgba(255,255,255,0.15)`,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        <span
                          style={{
                            fontFamily: "DM Mono, monospace",
                            fontSize: 19,
                            fontWeight: 900,
                            color,
                            textShadow: `0 0 16px ${color}`,
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
                            marginBottom: 12,
                            textTransform: "uppercase",
                            letterSpacing: "0.05em",
                          }}
                        >
                          {CATEGORY_LABELS[key] ?? key}
                        </div>
                        <div style={{ display: "flex", gap: 24 }}>
                          <div>
                            <div
                              style={{
                                fontFamily: "DM Mono, monospace",
                                fontWeight: 900,
                                fontSize: 24,
                                color: "#60A5FA",
                                letterSpacing: "-0.02em",
                              }}
                            >
                              {(lic.irating ?? 0).toLocaleString()}
                            </div>
                            <div
                              style={{
                                fontFamily: "DM Mono, monospace",
                                fontSize: 9.5,
                                color: T.muted,
                                textTransform: "uppercase",
                                letterSpacing: "0.1em",
                                marginTop: 3,
                              }}
                            >
                              iRating
                            </div>
                          </div>
                          <div>
                            <div
                              style={{
                                fontFamily: "DM Mono, monospace",
                                fontWeight: 900,
                                fontSize: 24,
                                color,
                                letterSpacing: "-0.02em",
                              }}
                            >
                              {(lic.safety_rating ?? 0).toFixed(2)}
                            </div>
                            <div
                              style={{
                                fontFamily: "DM Mono, monospace",
                                fontSize: 9.5,
                                color: T.muted,
                                textTransform: "uppercase",
                                letterSpacing: "0.1em",
                                marginTop: 3,
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
                  const isWin = race.finish_position === 1;
                  return (
                    <div
                      key={race.subsession_id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 20,
                        padding: "18px 24px",
                        background: T.card,
                        borderRadius: 18,
                        border: `1px solid ${isWin ? "rgba(234,179,8,0.35)" : T.border}`,
                        transition: "all 0.25s ease",
                        cursor: "default",
                      }}
                      onMouseEnter={(e) => {
                        const el = e.currentTarget as HTMLElement;
                        el.style.transform = "translateX(6px)";
                        el.style.borderColor = isWin
                          ? "rgba(234,179,8,0.5)"
                          : "rgba(59,158,255,0.3)";
                        el.style.boxShadow = "0 8px 24px rgba(0,0,0,0.15)";
                      }}
                      onMouseLeave={(e) => {
                        const el = e.currentTarget as HTMLElement;
                        el.style.transform = "translateX(0)";
                        el.style.borderColor = isWin
                          ? "rgba(234,179,8,0.35)"
                          : T.border;
                        el.style.boxShadow = "none";
                      }}
                    >
                      <div
                        style={{
                          width: 48,
                          height: 48,
                          borderRadius: 14,
                          flexShrink: 0,
                          background: isPodium ? "rgba(234,179,8,0.12)" : T.row,
                          border: `2px solid ${isPodium ? "rgba(234,179,8,0.4)" : T.border}`,
                          boxShadow: isPodium
                            ? "0 0 20px rgba(234,179,8,0.2)"
                            : "none",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <span
                          style={{
                            fontFamily: "DM Mono, monospace",
                            fontWeight: 900,
                            fontSize: 14,
                            color: isPodium ? "#EAB308" : T.muted,
                          }}
                        >
                          {isWin ? "🏆" : `P${race.finish_position}`}
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
                            marginTop: 5,
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
                          gap: 24,
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
                                fontSize: 16,
                                color: iRatingColor,
                                textShadow:
                                  race.irating_change !== 0
                                    ? `0 0 12px ${iRatingColor}60`
                                    : "none",
                              }}
                            >
                              {race.irating_change > 0 ? "+" : ""}
                              {race.irating_change}
                            </span>
                          </div>
                          <div
                            style={{
                              fontFamily: "DM Mono, monospace",
                              fontSize: 9.5,
                              color: T.muted,
                              textTransform: "uppercase",
                              letterSpacing: "0.08em",
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
                              fontSize: 16,
                              color: T.text,
                            }}
                          >
                            {(race.sof ?? 0).toLocaleString()}
                          </div>
                          <div
                            style={{
                              fontFamily: "DM Mono, monospace",
                              fontSize: 9.5,
                              color: T.muted,
                              textTransform: "uppercase",
                              letterSpacing: "0.08em",
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
                                fontSize: 16,
                                color: "#F97316",
                              }}
                            >
                              {race.incidents}x
                            </div>
                            <div
                              style={{
                                fontFamily: "DM Mono, monospace",
                                fontSize: 9.5,
                                color: T.muted,
                                textTransform: "uppercase",
                                letterSpacing: "0.08em",
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
        background: "rgba(0,0,0,0.8)",
        backdropFilter: "blur(24px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      <style>{`
        @keyframes modalIn { from{opacity:0;transform:scale(0.96) translateY(12px)} to{opacity:1;transform:scale(1) translateY(0)} }
        .driver-input:focus { border-color: rgba(59,158,255,0.6) !important; box-shadow: 0 0 0 3px rgba(59,158,255,0.15), 0 0 20px rgba(59,158,255,0.1) !important; }
      `}</style>
      <div
        style={{
          width: "100%",
          maxWidth: 540,
          background: isDark ? "rgba(10,18,33,0.98)" : "#FFFFFF",
          borderRadius: 28,
          border: `1px solid ${isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.08)"}`,
          boxShadow: isDark
            ? "0 40px 100px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.05)"
            : "0 32px 80px rgba(0,0,0,0.2)",
          overflow: "hidden",
          animation: "modalIn 0.25s cubic-bezier(0.34,1.56,0.64,1)",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "26px 26px 20px",
            borderBottom: `1px solid ${isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)"}`,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              marginBottom: 20,
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: "rgba(59,158,255,0.12)",
                border: "1px solid rgba(59,158,255,0.25)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <User size={18} color="#3B9EFF" />
            </div>
            <span
              style={{
                fontFamily: "Syne, sans-serif",
                fontWeight: 800,
                fontSize: 19,
                color: isDark ? "#F1F5F9" : "#0F172A",
              }}
            >
              {t.driverSearch}
            </span>
            <button
              onClick={onClose}
              style={{
                marginLeft: "auto",
                background: "none",
                border: `1px solid transparent`,
                cursor: "pointer",
                color: isDark ? "#64748B" : "#94A3B8",
                display: "flex",
                padding: 8,
                borderRadius: 10,
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                const el = e.currentTarget as HTMLElement;
                el.style.background = isDark
                  ? "rgba(255,255,255,0.08)"
                  : "rgba(0,0,0,0.06)";
                el.style.borderColor = isDark
                  ? "rgba(255,255,255,0.12)"
                  : "rgba(0,0,0,0.1)";
                el.style.color = isDark ? "#E2E8F0" : "#1E293B";
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget as HTMLElement;
                el.style.background = "none";
                el.style.borderColor = "transparent";
                el.style.color = isDark ? "#64748B" : "#94A3B8";
              }}
            >
              <X size={20} />
            </button>
          </div>
          <div style={{ position: "relative" }}>
            <Search
              size={16}
              color={isDark ? "#475569" : "#94A3B8"}
              style={{
                position: "absolute",
                left: 16,
                top: "50%",
                transform: "translateY(-50%)",
                pointerEvents: "none",
              }}
            />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => handleSearch(e.target.value)}
              onFocus={() => setInputFocused(true)}
              onBlur={() => setInputFocused(false)}
              placeholder={t.searchDriverPlaceholder}
              className="driver-input"
              style={{
                width: "100%",
                padding: "14px 16px 14px 46px",
                borderRadius: 16,
                background: isDark
                  ? "rgba(255,255,255,0.05)"
                  : "rgba(0,0,0,0.04)",
                border: `1.5px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}`,
                color: isDark ? "#F1F5F9" : "#0F172A",
                fontFamily: "DM Sans, sans-serif",
                fontSize: 15,
                outline: "none",
                boxSizing: "border-box",
                transition: "border-color 0.2s, box-shadow 0.2s",
              }}
            />
            {searching && (
              <span
                style={{
                  position: "absolute",
                  right: 18,
                  top: "50%",
                  transform: "translateY(-50%)",
                  fontSize: 18,
                  color: isDark ? "#64748B" : "#94A3B8",
                  letterSpacing: 2,
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
                  padding: "14px 26px",
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
                    ? "rgba(59,158,255,0.07)"
                    : "rgba(59,158,255,0.05)")
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
                  <User size={16} color="#3B9EFF" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontFamily: "Syne, sans-serif",
                      fontWeight: 700,
                      fontSize: 14,
                      color: isDark ? "#F1F5F9" : "#0F172A",
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
                    color: isDark ? "#334155" : "#CBD5E1",
                    padding: "3px 8px",
                    background: isDark
                      ? "rgba(255,255,255,0.05)"
                      : "rgba(0,0,0,0.04)",
                    borderRadius: 6,
                  }}
                >
                  #{r.cust_id}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Empty state */}
        {results.length === 0 && query.length < 2 && (
          <div style={{ padding: "52px 28px", textAlign: "center" }}>
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: 20,
                background: isDark
                  ? "rgba(255,255,255,0.04)"
                  : "rgba(0,0,0,0.04)",
                border: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 20px",
              }}
            >
              <User
                size={28}
                strokeWidth={1.5}
                color={isDark ? "#334155" : "#CBD5E1"}
              />
            </div>
            <p
              style={{
                fontFamily: "Syne, sans-serif",
                fontWeight: 700,
                fontSize: 17,
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
                lineHeight: 1.7,
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
