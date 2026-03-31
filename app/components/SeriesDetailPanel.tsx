"use client";
import { useT } from "../lib/i18n";
import { useIsMobile } from "../lib/useBreakpoint";
// /app/components/SeriesDetailPanel.tsx

import { useEffect, useState } from "react";
import {
  X,
  Heart,
  Lock,
  Check,
  Clock,
  Calendar,
  Wrench,
  Flag,
  Trophy,
  Car,
  BarChart2,
  Users,
  Zap,
  Link,
} from "lucide-react";
import type { SeriesSeason } from "../types/iracing";
import { toggleFavoriteSeries } from "../lib/iracing-client";
import { getCurrentRaceWeek } from "../lib/season-week";
import { useTheme } from "../lib/theme";

interface Props {
  series: SeriesSeason | null;
  isFavorite: boolean;
  onClose: () => void;
  onFavoriteToggle: (seriesId: number, newFavs: number[]) => void;
}

const DEMO_CARS: Record<
  number,
  { name: string; owned: boolean; free: boolean }[]
> = {
  301: [
    { name: "Porsche 911 GT3 R (992)", owned: true, free: false },
    { name: "Ferrari 296 GT3", owned: false, free: false },
    { name: "BMW M4 GT3", owned: true, free: false },
    { name: "Lamborghini Huracán GT3 EVO", owned: false, free: false },
  ],
  302: [{ name: "Porsche 911 GT3 Cup (992)", owned: true, free: false }],
  303: [{ name: "Dallara F3", owned: false, free: true }],
  304: [
    { name: "NASCAR Cup Series Chevrolet", owned: true, free: false },
    { name: "NASCAR Cup Series Ford", owned: false, free: false },
    { name: "NASCAR Cup Series Toyota", owned: false, free: false },
  ],
  305: [
    { name: "Porsche 963 GTP", owned: false, free: false },
    { name: "Acura ARX-06 GTP", owned: true, free: false },
    { name: "Porsche 911 GT3 R (992)", owned: true, free: false },
    { name: "Aston Martin Vantage GT3", owned: false, free: false },
  ],
  308: [{ name: "Dallara IR18", owned: false, free: false }],
  310: [{ name: "Super Formula SF23", owned: false, free: false }],
  312: [{ name: "ORECA LMP2 07", owned: true, free: false }],
};

const DEMO_TIMES: Record<number, string[]> = {
  301: ["Sat 14:00 UTC", "Sat 20:00 UTC", "Sun 02:00 UTC"],
  302: ["Tue 18:00 UTC", "Sat 17:00 UTC"],
  303: ["Every 2h repeating"],
  304: ["Every 2h repeating"],
  305: ["Wed 18:00 UTC", "Sat 19:00 UTC"],
  308: ["Every 4h repeating"],
};

const DEMO_STATS: Record<
  number,
  { avg_sof: number; avg_drivers: number; splits: number }
> = {
  301: { avg_sof: 3120, avg_drivers: 22, splits: 1 },
  302: { avg_sof: 5840, avg_drivers: 30, splits: 2 },
  303: { avg_sof: 2650, avg_drivers: 18, splits: 3 },
  304: { avg_sof: 4200, avg_drivers: 36, splits: 4 },
  305: { avg_sof: 3580, avg_drivers: 40, splits: 2 },
  308: { avg_sof: 6100, avg_drivers: 24, splits: 1 },
  310: { avg_sof: 4900, avg_drivers: 20, splits: 1 },
  312: { avg_sof: 2900, avg_drivers: 32, splits: 2 },
};

const CATEGORY_ACCENT: Record<string, string> = {
  "Sports Car": "#3B9EFF",
  "Formula Car": "#A855F7",
  Oval: "#F97316",
  "Dirt Oval": "#EAB308",
  "Dirt Road": "#22C55E",
};

const LICENSE_CONFIG = {
  0: { label: "Rookie", color: "#FF4444" },
  1: { label: "D", color: "#F97316" },
  2: { label: "C", color: "#EAB308" },
  3: { label: "B", color: "#22C55E" },
  4: { label: "A", color: "#3B9EFF" },
  5: { label: "PRO", color: "#A855F7" },
} as const;

function getSessionDuration(series: SeriesSeason): string {
  const td = series.race_time_descriptors;
  if (!td?.[0]?.session_minutes) return "—";
  const mins = td[0].session_minutes;
  if (mins >= 60)
    return `${Math.floor(mins / 60)}h${mins % 60 > 0 ? ` ${mins % 60}m` : ""}`;
  return `${mins}m`;
}

export default function SeriesDetailPanel({
  series,
  isFavorite,
  onClose,
  onFavoriteToggle,
}: Props) {
  const [localFav, setLocalFav] = useState(isFavorite);
  const [visible, setVisible] = useState(false);
  const [copied, setCopied] = useState(false);
  const [realStats, setRealStats] = useState<{
    avg_sof: number;
    avg_drivers: number;
    splits: number;
    has_data: boolean;
  } | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"info" | "cars">("info");
  const [carStats, setCarStats] = useState<
    { car_id: number; car_name: string; count: number; pct: string }[]
  >([]);
  const [carsLoading, setCarsLoading] = useState(false);
  const [carsLoaded, setCarsLoaded] = useState(false);
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const { t } = useT();
  const isMobile = useIsMobile();

  useEffect(() => setLocalFav(isFavorite), [isFavorite]);
  useEffect(() => {
    if (series) {
      requestAnimationFrame(() => setVisible(true));
      setActiveTab("info");
      setCarsLoaded(false);
      setCarStats([]);
    } else setVisible(false);
  }, [series]);
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Fetch real stats when series opens
  useEffect(() => {
    if (!series) return;
    setRealStats(null);
    setStatsLoading(true);
    const currentWeek =
      getCurrentRaceWeek(series.season_year, series.season_quarter) ?? 0;
    const params = new URLSearchParams({
      series_id: String(series.series_id),
      race_week_num: String(currentWeek),
      season_year: String(series.season_year),
      season_quarter: String(series.season_quarter),
    });
    fetch(`/api/iracing/series-stats?${params}`, { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        if (data.has_data) setRealStats(data);
      })
      .catch(() => {})
      .finally(() => setStatsLoading(false));
  }, [series?.series_id]);

  if (!series) return null;

  const accent = CATEGORY_ACCENT[series.category ?? ""] ?? "#3B9EFF";
  const licConfig =
    LICENSE_CONFIG[series.minLicenseLevel as keyof typeof LICENSE_CONFIG] ??
    LICENSE_CONFIG[0];
  const duration = getSessionDuration(series);
  const cars = DEMO_CARS[series.series_id] ?? [
    { name: "Series car", owned: false, free: false },
  ];
  const times = DEMO_TIMES[series.series_id] ?? ["Every 2h repeating"];
  const demoStats = DEMO_STATS[series.series_id] ?? {
    avg_sof: 2000,
    avg_drivers: 20,
    splits: 1,
  };
  const stats = realStats ?? demoStats;
  const currentWeek = getCurrentRaceWeek(
    series.season_year,
    series.season_quarter,
  );

  // Theme-aware local tokens
  const T = {
    panelBg: isDark ? "#070D19" : "#FFFFFF",
    headerBg: isDark
      ? `linear-gradient(160deg, ${accent}18 0%, #070D19 60%)`
      : `linear-gradient(160deg, ${accent}10 0%, #FFFFFF 60%)`,
    sectionBorder: isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.08)",
    rowBg: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)",
    rowBgAlt: isDark ? "rgba(255,255,255,0.025)" : "rgba(0,0,0,0.02)",
    rowBorder: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.07)",
    labelColor: isDark ? "#334155" : "#94A3B8",
    textPrimary: isDark ? "#FFFFFF" : "#0F172A",
    textSecondary: isDark ? "rgba(255,255,255,0.85)" : "#1E293B",
    textMuted: isDark ? "rgba(255,255,255,0.8)" : "#334155",
    textFaint: isDark ? "rgba(255,255,255,0.45)" : "#94A3B8",
    statValue: isDark ? "rgba(255,255,255,0.9)" : "#0F172A",
    iconBtnBg: isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.05)",
    iconBtnBorder: isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.12)",
    iconBtnColor: isDark ? "#64748B" : "#94A3B8",
    flagColor: isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.2)",
    carIconBg: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)",
    carIconBorder: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)",
    dateColor: isDark ? "#334155" : "#94A3B8",
    infoGridBg: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)",
    infoGridBorder: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.07)",
  };

  function handleFav() {
    const newFavs = toggleFavoriteSeries(series!.series_id);
    setLocalFav(!localFav);
    onFavoriteToggle(series!.series_id, newFavs);
  }

  function copyLink() {
    const url = new URL(window.location.href);
    url.searchParams.set("series", String(series!.series_id));
    navigator.clipboard.writeText(url.toString()).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const SectionTitle = ({ children }: { children: React.ReactNode }) => (
    <p
      style={{
        fontFamily: "DM Mono, monospace",
        fontSize: 10,
        fontWeight: 600,
        color: T.labelColor,
        letterSpacing: "0.14em",
        textTransform: "uppercase",
        margin: "0 0 10px",
      }}
    >
      {children}
    </p>
  );

  const StatBox = ({
    icon,
    label,
    value,
    accent: a,
  }: {
    icon: React.ReactNode;
    label: string;
    value: string;
    accent?: string;
  }) => (
    <div
      style={{
        flex: 1,
        padding: "12px 14px",
        borderRadius: 10,
        background: T.rowBg,
        border: `1px solid ${T.sectionBorder}`,
        display: "flex",
        flexDirection: "column",
        gap: 5,
      }}
    >
      <span
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          color: T.labelColor,
          fontSize: 10,
          fontFamily: "DM Mono, monospace",
          textTransform: "uppercase",
          letterSpacing: "0.1em",
        }}
      >
        {icon} {label}
      </span>
      <span
        style={{
          fontSize: 18,
          fontWeight: 800,
          fontFamily: "Syne, sans-serif",
          color: a ?? T.statValue,
        }}
      >
        {value}
      </span>
    </div>
  );

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 200,
          background: isDark ? "rgba(0,0,0,0.6)" : "rgba(0,0,0,0.35)",
          backdropFilter: "blur(4px)",
          opacity: visible ? 1 : 0,
          transition: "opacity 0.25s ease",
        }}
      />

      {/* Panel */}
      <div
        style={{
          position: "fixed",
          top: isMobile ? 0 : 0,
          right: 0,
          bottom: 0,
          zIndex: 201,
          width: isMobile ? "100vw" : "min(520px, 100vw)",
          background: T.panelBg,
          borderLeft: isMobile ? "none" : `1px solid ${accent}30`,
          display: "flex",
          flexDirection: "column",
          transform: visible ? "translateX(0)" : "translateX(100%)",
          transition: "transform 0.3s cubic-bezier(0.4,0,0.2,1)",
          overflowY: "auto",
        }}
      >
        {/* ── HEADER ─────────────────────────────────────────── */}
        <div
          style={{
            background: T.headerBg,
            borderBottom: `1px solid ${accent}20`,
            padding: "20px 20px 18px",
            position: "sticky",
            top: 0,
            zIndex: 10,
            backdropFilter: "blur(20px)",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: 3,
              background: `linear-gradient(90deg, ${accent}, ${accent}00)`,
            }}
          />

          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: 12,
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              {/* Categoría */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 7,
                  marginBottom: 10,
                }}
              >
                <div
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: "50%",
                    background: accent,
                    boxShadow: `0 0 8px ${accent}`,
                  }}
                />
                <span
                  style={{
                    fontFamily: "Syne, sans-serif",
                    fontSize: 11,
                    fontWeight: 700,
                    color: accent,
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                  }}
                >
                  {series.category ?? t.catRoad}
                </span>
              </div>

              {/* Nombre */}
              <h2
                style={{
                  fontFamily: "Syne, sans-serif",
                  fontSize: 22,
                  fontWeight: 900,
                  color: T.textPrimary,
                  margin: "0 0 12px",
                  letterSpacing: "-0.4px",
                  lineHeight: 1.2,
                }}
              >
                {series.series_name}
              </h2>

              {/* Badges */}
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                <span
                  style={{
                    padding: "4px 11px",
                    borderRadius: 20,
                    fontSize: 12,
                    fontWeight: 700,
                    fontFamily: "DM Mono, monospace",
                    background: licConfig.color + "22",
                    border: `1px solid ${licConfig.color}50`,
                    color: licConfig.color,
                  }}
                >
                  {licConfig.label}
                </span>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 5,
                    padding: "4px 11px",
                    borderRadius: 20,
                    fontSize: 12,
                    fontWeight: 700,
                    fontFamily: "DM Mono, monospace",
                    background: series.fixed_setup
                      ? "rgba(59,158,255,0.14)"
                      : "rgba(34,197,94,0.14)",
                    border: `1px solid ${series.fixed_setup ? "rgba(59,158,255,0.35)" : "rgba(34,197,94,0.35)"}`,
                    color: series.fixed_setup ? "#3B9EFF" : "#22C55E",
                  }}
                >
                  <Wrench size={10} /> {series.fixed_setup ? t.fixed : t.open}
                </span>
                {series.official && (
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 5,
                      padding: "4px 11px",
                      borderRadius: 20,
                      fontSize: 12,
                      fontWeight: 700,
                      fontFamily: "DM Mono, monospace",
                      background: "rgba(234,179,8,0.14)",
                      border: "1px solid rgba(234,179,8,0.38)",
                      color: "#EAB308",
                    }}
                  >
                    <Trophy size={10} /> {t.official}
                  </span>
                )}
              </div>
            </div>

            {/* Botones de acción */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 8,
                flexShrink: 0,
              }}
            >
              {/* Cerrar */}
              <button
                onClick={onClose}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: T.iconBtnBg,
                  border: `1px solid ${T.iconBtnBorder}`,
                  color: T.iconBtnColor,
                }}
              >
                <X size={16} />
              </button>
              {/* Copiar link */}
              <button
                onClick={copyLink}
                title={t.copyLink}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: copied ? "rgba(34,197,94,0.15)" : T.iconBtnBg,
                  border: `1px solid ${copied ? "rgba(34,197,94,0.4)" : T.iconBtnBorder}`,
                  color: copied ? "#22C55E" : T.iconBtnColor,
                  transition: "all 0.2s",
                }}
              >
                {copied ? (
                  <Check size={15} strokeWidth={2.5} />
                ) : (
                  <Link size={14} strokeWidth={2} />
                )}
              </button>
              {/* Favorito */}
              <button
                onClick={handleFav}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: localFav ? "rgba(239,68,68,0.18)" : T.iconBtnBg,
                  border: `1px solid ${localFav ? "rgba(239,68,68,0.45)" : T.iconBtnBorder}`,
                  color: localFav ? "#EF4444" : T.iconBtnColor,
                }}
              >
                <Heart
                  size={15}
                  fill={localFav ? "currentColor" : "none"}
                  strokeWidth={2}
                />
              </button>
              {/* Owned */}
              <div
                title={series.isOwned ? t.contentOwned : t.missingContent}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: series.isOwned
                    ? "rgba(34,197,94,0.15)"
                    : T.iconBtnBg,
                  border: `1px solid ${series.isOwned ? "rgba(34,197,94,0.35)" : T.iconBtnBorder}`,
                  color: series.isOwned ? "#22C55E" : T.iconBtnColor,
                }}
              >
                {series.isOwned ? (
                  <Check size={15} strokeWidth={2.5} />
                ) : (
                  <Lock size={14} strokeWidth={2} />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── CONTENIDO ──────────────────────────────────────── */}
        <div
          style={{
            padding: "0 20px 20px",
            display: "flex",
            flexDirection: "column",
            gap: 24,
          }}
        >
          {/* Tab selector */}
          <div
            style={{
              display: "flex",
              borderBottom: `1px solid ${T.sectionBorder}`,
              gap: 4,
              paddingTop: 20,
            }}
          >
            {(
              [
                { id: "info", label: t.seriesInfo },
                { id: "cars", label: t.topCars },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  if (tab.id === "cars" && !carsLoaded) {
                    setCarsLoading(true);
                    const currentWeek =
                      getCurrentRaceWeek(
                        series.season_year,
                        series.season_quarter,
                      ) ?? 0;
                    const params = new URLSearchParams({
                      series_id: String(series.series_id),
                      race_week_num: String(currentWeek),
                      season_year: String(series.season_year),
                      season_quarter: String(series.season_quarter),
                    });
                    fetch(`/api/iracing/series-cars?${params}`, {
                      credentials: "include",
                    })
                      .then((r) => r.json())
                      .then((data) => {
                        setCarStats(data.cars ?? []);
                        setCarsLoaded(true);
                      })
                      .catch(() => {})
                      .finally(() => setCarsLoading(false));
                  }
                }}
                style={{
                  padding: "10px 16px",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontFamily: "Syne, sans-serif",
                  fontWeight: 700,
                  fontSize: 13,
                  color: activeTab === tab.id ? accent : "#64748B",
                  borderBottom: `2px solid ${activeTab === tab.id ? accent : "transparent"}`,
                  marginBottom: -1,
                  transition: "all 0.15s",
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* ── INFO TAB ── */}
          {
            activeTab === "info" && (
              <>
                {/* Stats */}
                <section>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      marginBottom: 10,
                    }}
                  >
                    <SectionTitle>
                      <BarChart2
                        size={10}
                        style={{ display: "inline", marginRight: 5 }}
                      />
                      {t.stats}
                    </SectionTitle>
                    {statsLoading && (
                      <span
                        style={{
                          fontSize: 10,
                          fontFamily: "DM Mono, monospace",
                          color: "#64748B",
                        }}
                      >
                        loading...
                      </span>
                    )}
                    {!statsLoading && realStats?.has_data && (
                      <span
                        style={{
                          fontSize: 10,
                          fontFamily: "DM Mono, monospace",
                          color: "#22C55E",
                          background: "rgba(34,197,94,0.1)",
                          border: "1px solid rgba(34,197,94,0.25)",
                          borderRadius: 4,
                          padding: "1px 6px",
                        }}
                      >
                        LIVE
                      </span>
                    )}
                    {!statsLoading && !realStats?.has_data && (
                      <span
                        style={{
                          fontSize: 10,
                          fontFamily: "DM Mono, monospace",
                          color: "#64748B",
                          background: "rgba(100,116,139,0.1)",
                          border: "1px solid rgba(100,116,139,0.2)",
                          borderRadius: 4,
                          padding: "1px 6px",
                        }}
                      >
                        EST
                      </span>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <StatBox
                      icon={<Zap size={11} />}
                      label={t.avgSof}
                      value={
                        stats.avg_sof > 0 ? stats.avg_sof.toLocaleString() : "—"
                      }
                      accent={accent}
                    />
                    <StatBox
                      icon={<Users size={11} />}
                      label={t.avgDrivers}
                      value={
                        stats.avg_drivers > 0 ? String(stats.avg_drivers) : "—"
                      }
                    />
                    <StatBox
                      icon={<BarChart2 size={11} />}
                      label={t.splits}
                      value={stats.splits > 0 ? String(stats.splits) : "—"}
                    />
                    <StatBox
                      icon={<Clock size={11} />}
                      label={t.raceTime}
                      value={duration}
                    />
                  </div>
                </section>

                {/* Cars */}
                <section>
                  <SectionTitle>
                    <Car
                      size={10}
                      style={{ display: "inline", marginRight: 5 }}
                    />
                    {t.allowedCars}
                  </SectionTitle>
                  <div
                    style={{ display: "flex", flexDirection: "column", gap: 6 }}
                  >
                    {cars.map((car, i) => (
                      <div
                        key={i}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "10px 14px",
                          borderRadius: 10,
                          background: T.rowBg,
                          border: `1px solid ${T.sectionBorder}`,
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                          }}
                        >
                          <div
                            style={{
                              width: 28,
                              height: 28,
                              borderRadius: 8,
                              flexShrink: 0,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              background: car.owned
                                ? "rgba(34,197,94,0.12)"
                                : T.carIconBg,
                              border: `1px solid ${car.owned ? "rgba(34,197,94,0.3)" : T.carIconBorder}`,
                              color: car.owned ? "#22C55E" : T.iconBtnColor,
                            }}
                          >
                            {car.owned ? (
                              <Check size={13} strokeWidth={2.5} />
                            ) : (
                              <Lock size={12} strokeWidth={2} />
                            )}
                          </div>
                          <span
                            style={{
                              fontSize: 13,
                              fontWeight: 500,
                              color: car.owned ? T.textSecondary : T.textFaint,
                            }}
                          >
                            {car.name}
                          </span>
                        </div>
                        {car.free && (
                          <span
                            style={{
                              fontSize: 10,
                              fontWeight: 700,
                              fontFamily: "DM Mono, monospace",
                              color: "#22C55E",
                              background: "rgba(34,197,94,0.1)",
                              border: "1px solid rgba(34,197,94,0.25)",
                              borderRadius: 6,
                              padding: "2px 7px",
                            }}
                          >
                            {t.free}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </section>

                {/* Race Schedule */}
                <section>
                  <SectionTitle>
                    <Clock
                      size={10}
                      style={{ display: "inline", marginRight: 5 }}
                    />
                    {t.raceSchedule}
                  </SectionTitle>
                  <div
                    style={{ display: "flex", flexDirection: "column", gap: 6 }}
                  >
                    {times.map((t, i) => (
                      <div
                        key={i}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 12,
                          padding: "10px 14px",
                          borderRadius: 10,
                          background: T.rowBg,
                          border: `1px solid ${T.sectionBorder}`,
                        }}
                      >
                        <div
                          style={{
                            width: 6,
                            height: 6,
                            borderRadius: "50%",
                            flexShrink: 0,
                            background: accent,
                            boxShadow: `0 0 6px ${accent}`,
                          }}
                        />
                        <span
                          style={{
                            fontSize: 13,
                            fontWeight: 500,
                            color: T.textMuted,
                            fontFamily: "DM Mono, monospace",
                          }}
                        >
                          {t}
                        </span>
                      </div>
                    ))}
                  </div>
                </section>

                {/* Full Calendar */}
                <section>
                  <SectionTitle>
                    <Calendar
                      size={10}
                      style={{ display: "inline", marginRight: 5 }}
                    />
                    {t.fullCalendar}
                  </SectionTitle>
                  <div
                    style={{ display: "flex", flexDirection: "column", gap: 4 }}
                  >
                    {series.schedules.map((week, i) => {
                      const isActive = currentWeek === i;
                      return (
                        <div
                          key={i}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 12,
                            padding: "10px 14px",
                            borderRadius: 10,
                            background: isActive
                              ? `${accent}15`
                              : i % 2 === 0
                                ? T.rowBg
                                : T.rowBgAlt,
                            border: `1px solid ${isActive ? accent + "45" : T.rowBorder}`,
                          }}
                        >
                          <span
                            style={{
                              fontFamily: "DM Mono, monospace",
                              fontSize: 11,
                              fontWeight: 700,
                              color: accent,
                              minWidth: 28,
                              flexShrink: 0,
                            }}
                          >
                            W{i + 1}
                          </span>
                          {isActive ? (
                            <span
                              style={{
                                width: 10,
                                height: 10,
                                borderRadius: "50%",
                                background: "#22C55E",
                                flexShrink: 0,
                                boxShadow: "0 0 8px #22C55E",
                              }}
                            />
                          ) : (
                            <Flag
                              size={12}
                              strokeWidth={1.8}
                              color={T.flagColor}
                              style={{ flexShrink: 0 }}
                            />
                          )}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div
                              style={{
                                fontSize: 13,
                                fontWeight: isActive ? 700 : 600,
                                color: isActive
                                  ? T.textPrimary
                                  : T.textSecondary,
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                              }}
                            >
                              {week.track.track_name}
                            </div>
                            {week.track.config_name && (
                              <div
                                style={{
                                  fontSize: 11,
                                  color: T.labelColor,
                                  marginTop: 1,
                                }}
                              >
                                {week.track.config_name}
                              </div>
                            )}
                          </div>
                          {isActive ? (
                            <span
                              style={{
                                fontFamily: "DM Mono, monospace",
                                fontSize: 9,
                                fontWeight: 700,
                                color: "#22C55E",
                                background: "rgba(34,197,94,0.15)",
                                border: "1px solid rgba(34,197,94,0.3)",
                                borderRadius: 5,
                                padding: "2px 7px",
                                flexShrink: 0,
                              }}
                            >
                              {t.now}
                            </span>
                          ) : (
                            week.start_date && (
                              <span
                                style={{
                                  fontFamily: "DM Mono, monospace",
                                  fontSize: 10,
                                  color: T.dateColor,
                                  flexShrink: 0,
                                }}
                              >
                                {new Date(week.start_date).toLocaleDateString(
                                  undefined,
                                  { day: "numeric", month: "short" },
                                )}
                              </span>
                            )
                          )}
                        </div>
                      );
                    })}
                  </div>
                </section>

                {/* Series Info */}
                <section>
                  <SectionTitle>{t.seriesInfo}</SectionTitle>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: 8,
                    }}
                  >
                    {[
                      {
                        label: t.seasonLabel,
                        value: `S${series.season_quarter} ${series.season_year}`,
                      },
                      {
                        label: t.minLicense,
                        value: series.allowed_licenses?.[0]?.group_name ?? "—",
                      },
                      {
                        label: t.teamDriving,
                        value: series.driver_changes ? t.yes : t.no,
                      },
                      {
                        label: t.multiclass,
                        value: series.multiclass ? t.yes : t.no,
                      },
                    ].map((item) => (
                      <div
                        key={item.label}
                        style={{
                          padding: "10px 14px",
                          borderRadius: 10,
                          background: T.infoGridBg,
                          border: `1px solid ${T.infoGridBorder}`,
                        }}
                      >
                        <div
                          style={{
                            fontSize: 10,
                            fontFamily: "DM Mono, monospace",
                            color: T.labelColor,
                            textTransform: "uppercase",
                            letterSpacing: "0.1em",
                            marginBottom: 4,
                          }}
                        >
                          {item.label}
                        </div>
                        <div
                          style={{
                            fontSize: 14,
                            fontWeight: 600,
                            color: T.textSecondary,
                          }}
                        >
                          {item.value}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              </>
            ) /* end info tab */
          }

          {/* ── CARS TAB ── */}
          {activeTab === "cars" && (
            <section>
              {/* Loading */}
              {carsLoading && (
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 8 }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "14px 0",
                      color: "#64748B",
                      fontFamily: "DM Mono, monospace",
                      fontSize: 12,
                    }}
                  >
                    <div
                      style={{
                        width: 14,
                        height: 14,
                        borderRadius: "50%",
                        border: `2px solid ${accent}`,
                        borderTopColor: "transparent",
                        animation: "spin 0.8s linear infinite",
                      }}
                    />
                    Analizando top 100 pilotos en carreras recientes...
                  </div>
                  <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div
                      key={i}
                      style={{
                        height: 52,
                        borderRadius: 10,
                        background: isDark
                          ? "rgba(255,255,255,0.04)"
                          : "rgba(0,0,0,0.04)",
                        animation: "pulse 1.5s ease infinite",
                      }}
                    />
                  ))}
                  <style>{`@keyframes pulse { 0%,100%{opacity:.5} 50%{opacity:1} }`}</style>
                </div>
              )}

              {/* Empty */}
              {!carsLoading && carsLoaded && carStats.length === 0 && (
                <div
                  style={{
                    textAlign: "center",
                    padding: "40px 0",
                    color: "#64748B",
                    fontFamily: "DM Mono, monospace",
                    fontSize: 12,
                  }}
                >
                  No hay datos de carreras para esta semana todavía
                </div>
              )}

              {/* Results */}
              {!carsLoading && carStats.length > 0 && (
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 6 }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      marginBottom: 6,
                    }}
                  >
                    <SectionTitle>
                      <Car
                        size={10}
                        style={{ display: "inline", marginRight: 5 }}
                      />
                      {t.topCars}
                    </SectionTitle>
                    <span
                      style={{
                        fontSize: 10,
                        fontFamily: "DM Mono, monospace",
                        color: "#22C55E",
                        background: "rgba(34,197,94,0.1)",
                        border: "1px solid rgba(34,197,94,0.25)",
                        borderRadius: 4,
                        padding: "1px 6px",
                      }}
                    >
                      LIVE
                    </span>
                  </div>
                  {carStats.slice(0, 10).map((car, i) => {
                    const pct = parseFloat(car.pct);
                    const isTop = i === 0;
                    return (
                      <div
                        key={car.car_id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 12,
                          padding: "12px 14px",
                          borderRadius: 10,
                          background: isTop ? `${accent}12` : T.rowBg,
                          border: `1px solid ${isTop ? accent + "35" : T.sectionBorder}`,
                          transition: "all 0.15s",
                        }}
                      >
                        {/* Position */}
                        <div
                          style={{
                            width: 24,
                            height: 24,
                            borderRadius: 8,
                            background: isTop ? accent : T.rowBgAlt,
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
                              fontWeight: 700,
                              color: isTop ? "#fff" : "#64748B",
                            }}
                          >
                            {i + 1}
                          </span>
                        </div>
                        {/* Car name */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div
                            style={{
                              fontSize: 13,
                              fontWeight: 600,
                              color: T.textSecondary,
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {car.car_name}
                          </div>
                          {/* Bar */}
                          <div
                            style={{
                              marginTop: 5,
                              height: 4,
                              borderRadius: 2,
                              background: isDark
                                ? "rgba(255,255,255,0.06)"
                                : "rgba(0,0,0,0.06)",
                              overflow: "hidden",
                            }}
                          >
                            <div
                              style={{
                                height: "100%",
                                borderRadius: 2,
                                width: `${Math.min(pct, 100)}%`,
                                background: isTop ? accent : `${accent}70`,
                                transition: "width 0.6s ease",
                              }}
                            />
                          </div>
                        </div>
                        {/* Pct */}
                        <div style={{ textAlign: "right", flexShrink: 0 }}>
                          <div
                            style={{
                              fontFamily: "DM Mono, monospace",
                              fontSize: 14,
                              fontWeight: 700,
                              color: isTop ? accent : T.textMuted,
                            }}
                          >
                            {car.pct}%
                          </div>
                          <div
                            style={{
                              fontFamily: "DM Mono, monospace",
                              fontSize: 10,
                              color: "#64748B",
                              marginTop: 1,
                            }}
                          >
                            {car.count} pilotos
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          )}
        </div>
      </div>
    </>
  );
}
