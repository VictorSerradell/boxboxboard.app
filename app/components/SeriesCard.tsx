"use client";
// /app/components/SeriesCard.tsx

import { useState } from "react";
import {
  Heart,
  Lock,
  Check,
  Clock,
  Calendar,
  Wrench,
  Flag,
  Trophy,
  GitCompare,
  CalendarClock,
} from "lucide-react";
import type { SeriesSeason } from "../types/iracing";
import { toggleFavoriteSeries } from "../lib/iracing-client";
import { getCurrentRaceWeek } from "../lib/season-week";
import { useTheme } from "../lib/theme";
import { useT } from "../lib/i18n";
import { useIsMobile } from "../lib/useBreakpoint";

interface SeriesCardProps {
  series: SeriesSeason;
  isFavorite: boolean;
  isComparing?: boolean;
  isScheduled?: boolean;
  isEligible?: boolean;
  onFavoriteToggle: (seriesId: number, newFavs: number[]) => void;
  onClick?: () => void;
  onCompare?: () => void;
  onSchedule?: () => void;
}

const CATEGORY_STYLE: Record<
  string,
  { gradientDark: string; gradientLight: string; accent: string; label: string }
> = {
  "Sports Car": {
    gradientDark: "linear-gradient(135deg, #0E2A4A 0%, #070F1C 100%)",
    gradientLight: "linear-gradient(135deg, #EBF4FF 0%, #F0F7FF 100%)",
    accent: "#3B9EFF",
    label: "Sports Car",
  },
  "Formula Car": {
    gradientDark: "linear-gradient(135deg, #2A0E4A 0%, #10071C 100%)",
    gradientLight: "linear-gradient(135deg, #F5EEFF 0%, #F9F5FF 100%)",
    accent: "#A855F7",
    label: "Formula",
  },
  Oval: {
    gradientDark: "linear-gradient(135deg, #2A1800 0%, #120A00 100%)",
    gradientLight: "linear-gradient(135deg, #FFF4EB 0%, #FFF8F2 100%)",
    accent: "#F97316",
    label: "Oval",
  },
  "Dirt Oval": {
    gradientDark: "linear-gradient(135deg, #2A2000 0%, #121000 100%)",
    gradientLight: "linear-gradient(135deg, #FEFCE8 0%, #FFFDF2 100%)",
    accent: "#EAB308",
    label: "Dirt Oval",
  },
  "Dirt Road": {
    gradientDark: "linear-gradient(135deg, #0A2A14 0%, #041209 100%)",
    gradientLight: "linear-gradient(135deg, #EDFAF2 0%, #F2FCF5 100%)",
    accent: "#22C55E",
    label: "Dirt Road",
  },
  Endurance: {
    gradientDark: "linear-gradient(135deg, #1A0A2E 0%, #0A0514 100%)",
    gradientLight: "linear-gradient(135deg, #F5F0FF 0%, #FAF7FF 100%)",
    accent: "#E879F9",
    label: "Endurance",
  },
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

export default function SeriesCard({
  series,
  isFavorite,
  isComparing,
  isScheduled,
  isEligible,
  onFavoriteToggle,
  onClick,
  onCompare,
  onSchedule,
}: SeriesCardProps) {
  const [localFav, setLocalFav] = useState(isFavorite);
  const [favAnimating, setFavAnimating] = useState(false);
  const [hovered, setHovered] = useState(false);
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const { t } = useT();

  const catStyle =
    CATEGORY_STYLE[series.category ?? ""] ?? CATEGORY_STYLE["Sports Car"];
  const licConfig =
    LICENSE_CONFIG[series.minLicenseLevel as keyof typeof LICENSE_CONFIG] ??
    LICENSE_CONFIG[0];
  const duration = getSessionDuration(series);
  const weekCount = series.schedules?.length ?? 0;
  const tracks = series.schedules ?? [];
  const currentWeek = getCurrentRaceWeek(
    series.season_year,
    series.season_quarter,
  );
  const accent = catStyle.accent;

  // Theme-aware local tokens
  const T = {
    cardBg: isDark ? "#070D19" : "#FFFFFF",
    cardBorder: hovered
      ? accent + "55"
      : isDark
        ? "rgba(255,255,255,0.08)"
        : "rgba(0,0,0,0.10)",
    cardShadow: hovered
      ? isDark
        ? `0 24px 64px rgba(0,0,0,0.7), 0 0 0 1px ${accent}25`
        : `0 16px 40px rgba(0,0,0,0.12), 0 0 0 1px ${accent}30`
      : isDark
        ? "0 4px 20px rgba(0,0,0,0.5)"
        : "0 2px 12px rgba(0,0,0,0.08)",
    headerGrad: isDark ? catStyle.gradientDark : catStyle.gradientLight,
    seriesName: isDark ? "#FFFFFF" : "#0F172A",
    trackRowBg: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)",
    trackRowBorder: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.07)",
    trackName: isDark ? "rgba(255,255,255,0.8)" : "#1E293B",
    trackConfig: isDark ? "rgba(255,255,255,0.35)" : "#94A3B8",
    trackNameActive: isDark ? "rgba(255,255,255,0.95)" : "#0F172A",
    trackConfigActive: isDark ? "rgba(255,255,255,0.55)" : "#64748B",
    flagColor: isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.2)",
    moreTracksBg: isDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.03)",
    moreTracksBorder: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.06)",
    moreTracksText: isDark ? "#334155" : "#94A3B8",
    sectionBorder: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.07)",
    labelColor: isDark ? "#334155" : "#94A3B8",
    statValue: isDark ? "rgba(255,255,255,0.82)" : "#1E293B",
    footerBg: isDark ? "rgba(0,0,0,0.35)" : "rgba(0,0,0,0.04)",
    iconBtnBg: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
    iconBtnBorder: isDark ? "rgba(255,255,255,0.14)" : "rgba(0,0,0,0.12)",
    iconBtnColor: isDark ? "#475569" : "#94A3B8",
  };

  function handleFavClick(e: React.MouseEvent) {
    e.stopPropagation();
    setFavAnimating(true);
    const newFavs = toggleFavoriteSeries(series.series_id);
    setLocalFav(!localFav);
    onFavoriteToggle(series.series_id, newFavs);
    setTimeout(() => setFavAnimating(false), 200);
  }

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onClick}
      style={{
        background: T.cardBg,
        border: `1px solid ${T.cardBorder}`,
        borderRadius: 16,
        overflow: "hidden",
        cursor: "pointer",
        transform: hovered ? "translateY(-4px)" : "translateY(0)",
        boxShadow: T.cardShadow,
        transition:
          "transform 0.22s ease, box-shadow 0.22s ease, border-color 0.22s ease",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* ── HEADER ──────────────────────────────────────────── */}
      <div
        style={{
          background: T.headerGrad,
          padding: "18px 18px 16px",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 3,
            background: `linear-gradient(90deg, ${accent} 0%, ${accent}00 100%)`,
            borderRadius: "16px 16px 0 0",
          }}
        />

        {/* Categoría + live badge + acciones */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 14,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
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
              {catStyle.label}
            </span>
            {/* Endurance duration badge */}
            {series.category === "Endurance" && duration !== "—" && (
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  padding: "2px 8px",
                  borderRadius: 20,
                  background: "rgba(232,121,249,0.15)",
                  border: "1px solid rgba(232,121,249,0.35)",
                  fontFamily: "DM Mono, monospace",
                  fontSize: 10,
                  fontWeight: 700,
                  color: "#E879F9",
                  letterSpacing: "0.06em",
                }}
              >
                ⏱ {duration}
              </span>
            )}
            {currentWeek !== null && currentWeek < tracks.length && (
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  padding: "2px 8px",
                  borderRadius: 20,
                  background: "rgba(34,197,94,0.15)",
                  border: "1px solid rgba(34,197,94,0.35)",
                  fontFamily: "DM Mono, monospace",
                  fontSize: 10,
                  fontWeight: 700,
                  color: "#22C55E",
                  letterSpacing: "0.06em",
                }}
              >
                <span
                  style={{
                    width: 5,
                    height: 5,
                    borderRadius: "50%",
                    background: "#22C55E",
                    display: "inline-block",
                  }}
                />
                {t.wkLive(currentWeek + 1)}
              </span>
            )}
            {isEligible && (
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  padding: "2px 8px",
                  borderRadius: 20,
                  background: "rgba(168,85,247,0.15)",
                  border: "1px solid rgba(168,85,247,0.35)",
                  fontFamily: "DM Mono, monospace",
                  fontSize: 10,
                  fontWeight: 700,
                  color: "#A855F7",
                  letterSpacing: "0.06em",
                }}
              >
                ✓ {t.eligible}
              </span>
            )}
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <div
              title={series.isOwned ? t.allContentOwned : t.missingContent}
              style={{
                width: 30,
                height: 30,
                borderRadius: 8,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: series.isOwned
                  ? "rgba(34,197,94,0.18)"
                  : T.iconBtnBg,
                border: `1px solid ${series.isOwned ? "rgba(34,197,94,0.4)" : T.iconBtnBorder}`,
                color: series.isOwned ? "#22C55E" : T.iconBtnColor,
              }}
            >
              {series.isOwned ? (
                <Check size={14} strokeWidth={2.5} />
              ) : (
                <Lock size={13} strokeWidth={2} />
              )}
            </div>
            {onCompare && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onCompare();
                }}
                title={isComparing ? t.removeFromCompare : t.addToCompare}
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 8,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: isComparing
                    ? "rgba(59,158,255,0.2)"
                    : T.iconBtnBg,
                  border: `1px solid ${isComparing ? "rgba(59,158,255,0.5)" : T.iconBtnBorder}`,
                  color: isComparing ? "#3B9EFF" : T.iconBtnColor,
                  transition: "all 0.15s ease",
                }}
              >
                <GitCompare size={13} strokeWidth={2} />
              </button>
            )}
            {onSchedule && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onSchedule();
                }}
                title={isScheduled ? t.removeFromSchedule : t.addToSchedule}
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 8,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: isScheduled
                    ? "rgba(168,85,247,0.2)"
                    : T.iconBtnBg,
                  border: `1px solid ${isScheduled ? "rgba(168,85,247,0.5)" : T.iconBtnBorder}`,
                  color: isScheduled ? "#A855F7" : T.iconBtnColor,
                  transition: "all 0.15s ease",
                }}
              >
                <CalendarClock size={13} strokeWidth={2} />
              </button>
            )}
            <button
              onClick={handleFavClick}
              style={{
                width: 30,
                height: 30,
                borderRadius: 8,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: localFav ? "rgba(239,68,68,0.2)" : T.iconBtnBg,
                border: `1px solid ${localFav ? "rgba(239,68,68,0.5)" : T.iconBtnBorder}`,
                color: localFav ? "#EF4444" : T.iconBtnColor,
                transform: favAnimating ? "scale(1.35)" : "scale(1)",
                transition: "transform 0.15s ease",
              }}
            >
              <Heart
                size={14}
                fill={localFav ? "currentColor" : "none"}
                strokeWidth={2}
              />
            </button>
          </div>
        </div>

        {/* Nombre */}
        <h3
          style={{
            fontFamily: "Syne, sans-serif",
            fontSize: 18,
            fontWeight: 900,
            color: T.seriesName,
            lineHeight: 1.2,
            margin: "0 0 14px",
            letterSpacing: "-0.4px",
          }}
        >
          {series.series_name}
        </h3>

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
            <Wrench size={10} strokeWidth={2.5} />{" "}
            {series.fixed_setup ? t.fixed : t.open}
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
              <Trophy size={10} strokeWidth={2.5} /> {t.official}
            </span>
          )}
        </div>
      </div>

      {/* ── TRACK ROTATION ──────────────────────────────────── */}
      <div
        style={{
          padding: "14px 18px 16px",
          flex: 1,
          borderBottom: `1px solid ${T.sectionBorder}`,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 10,
          }}
        >
          <span
            style={{
              fontFamily: "DM Mono, monospace",
              fontSize: 10,
              fontWeight: 600,
              color: T.labelColor,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
            }}
          >
            {t.trackRotation}
          </span>
          <span
            style={{
              fontFamily: "DM Mono, monospace",
              fontSize: 10,
              color: accent + "AA",
            }}
          >
            {weekCount} wks
          </span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          {tracks.slice(0, 6).map((week, i) => {
            const isActive = currentWeek === i;
            return (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "7px 10px",
                  borderRadius: 8,
                  background: isActive ? `${accent}18` : T.trackRowBg,
                  border: `1px solid ${isActive ? accent + "50" : T.trackRowBorder}`,
                  transition: "background 0.15s",
                }}
              >
                <span
                  style={{
                    fontFamily: "DM Mono, monospace",
                    fontSize: 10,
                    fontWeight: 700,
                    color: accent,
                    minWidth: 24,
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
                      boxShadow: "0 0 6px #22C55E",
                    }}
                  />
                ) : (
                  <Flag
                    size={11}
                    strokeWidth={1.8}
                    color={T.flagColor}
                    style={{ flexShrink: 0 }}
                  />
                )}
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: isActive ? 700 : 500,
                    color: isActive ? T.trackNameActive : T.trackName,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    flex: 1,
                  }}
                  title={`${week.track.track_name}${week.track.config_name ? ` — ${week.track.config_name}` : ""}`}
                >
                  {week.track.track_name}
                  {week.track.config_name && (
                    <span
                      style={{
                        color: isActive ? T.trackConfigActive : T.trackConfig,
                        fontSize: 11,
                        marginLeft: 6,
                      }}
                    >
                      {week.track.config_name}
                    </span>
                  )}
                </span>
                {isActive && (
                  <span
                    style={{
                      fontFamily: "DM Mono, monospace",
                      fontSize: 9,
                      fontWeight: 700,
                      color: "#22C55E",
                      background: "rgba(34,197,94,0.15)",
                      border: "1px solid rgba(34,197,94,0.3)",
                      borderRadius: 4,
                      padding: "1px 5px",
                      flexShrink: 0,
                    }}
                  >
                    NOW
                  </span>
                )}
              </div>
            );
          })}
          {tracks.length > 6 && (
            <div
              style={{
                padding: "6px 10px",
                borderRadius: 8,
                textAlign: "center",
                background: T.moreTracksBg,
                border: `1px solid ${T.moreTracksBorder}`,
              }}
            >
              <span
                style={{
                  fontFamily: "DM Mono, monospace",
                  fontSize: 11,
                  color: T.moreTracksText,
                }}
              >
                {t.moreWeeks(tracks.length - 6)}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ── STATS FOOTER ────────────────────────────────────── */}
      <div style={{ display: "flex", background: T.footerBg }}>
        {[
          {
            icon: <Clock size={12} strokeWidth={2} />,
            label: t.duration,
            value: duration,
            accent: true,
          },
          {
            icon: <Calendar size={12} strokeWidth={2} />,
            label: t.weeks,
            value: String(weekCount),
            accent: false,
          },
          {
            icon: <Trophy size={12} strokeWidth={2} />,
            label: t.official,
            value: series.official ? t.yes : t.no,
            accent: false,
          },
        ].map((stat, i) => (
          <div
            key={i}
            style={{
              flex: 1,
              padding: "11px 14px",
              borderRight: i < 2 ? `1px solid ${T.sectionBorder}` : "none",
              display: "flex",
              flexDirection: "column",
              gap: 3,
            }}
          >
            <span
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                fontFamily: "DM Mono, monospace",
                fontSize: 10,
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                color: T.labelColor,
              }}
            >
              {stat.icon} {stat.label}
            </span>
            <span
              style={{
                fontFamily: "DM Mono, monospace",
                fontSize: 15,
                fontWeight: 700,
                color: stat.accent ? accent : T.statValue,
              }}
            >
              {stat.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
