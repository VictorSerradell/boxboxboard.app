"use client";
// /app/components/SeriesCard.tsx — iRacing-inspired redesign

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
} from "lucide-react";
import type { SeriesSeason } from "../types/iracing";
import { toggleFavoriteSeries } from "../lib/iracing-client";

interface SeriesCardProps {
  series: SeriesSeason;
  isFavorite: boolean;
  onFavoriteToggle: (seriesId: number, newFavs: number[]) => void;
  onClick?: () => void;
}

const CATEGORY_STYLE: Record<
  string,
  { gradient: string; accent: string; label: string }
> = {
  "Sports Car": {
    gradient: "linear-gradient(135deg, #0E2A4A 0%, #070F1C 100%)",
    accent: "#3B9EFF",
    label: "Sports Car",
  },
  "Formula Car": {
    gradient: "linear-gradient(135deg, #2A0E4A 0%, #10071C 100%)",
    accent: "#A855F7",
    label: "Formula",
  },
  Oval: {
    gradient: "linear-gradient(135deg, #2A1800 0%, #120A00 100%)",
    accent: "#F97316",
    label: "Oval",
  },
  "Dirt Oval": {
    gradient: "linear-gradient(135deg, #2A2000 0%, #121000 100%)",
    accent: "#EAB308",
    label: "Dirt Oval",
  },
  "Dirt Road": {
    gradient: "linear-gradient(135deg, #0A2A14 0%, #041209 100%)",
    accent: "#22C55E",
    label: "Dirt Road",
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
  onFavoriteToggle,
  onClick,
}: SeriesCardProps) {
  const [localFav, setLocalFav] = useState(isFavorite);
  const [favAnimating, setFavAnimating] = useState(false);
  const [hovered, setHovered] = useState(false);

  const catStyle =
    CATEGORY_STYLE[series.category ?? ""] ?? CATEGORY_STYLE["Sports Car"];
  const licConfig =
    LICENSE_CONFIG[series.minLicenseLevel as keyof typeof LICENSE_CONFIG] ??
    LICENSE_CONFIG[0];
  const duration = getSessionDuration(series);
  const weekCount = series.schedules?.length ?? 0;
  const tracks = series.schedules ?? [];

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
        background: "#070D19",
        border: `1px solid ${hovered ? catStyle.accent + "55" : "rgba(255,255,255,0.08)"}`,
        borderRadius: 16,
        overflow: "hidden",
        cursor: "pointer",
        transform: hovered ? "translateY(-4px)" : "translateY(0)",
        boxShadow: hovered
          ? `0 24px 64px rgba(0,0,0,0.7), 0 0 0 1px ${catStyle.accent}25`
          : "0 4px 20px rgba(0,0,0,0.5)",
        transition:
          "transform 0.22s ease, box-shadow 0.22s ease, border-color 0.22s ease",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* ── HEADER ────────────────────────────────────────────── */}
      <div
        style={{
          background: catStyle.gradient,
          padding: "18px 18px 16px",
          position: "relative",
        }}
      >
        {/* Barra de acento superior */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 3,
            background: `linear-gradient(90deg, ${catStyle.accent} 0%, ${catStyle.accent}00 100%)`,
            borderRadius: "16px 16px 0 0",
          }}
        />

        {/* Fila: categoría + acciones */}
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
                background: catStyle.accent,
                boxShadow: `0 0 8px ${catStyle.accent}`,
              }}
            />
            <span
              style={{
                fontFamily: "Syne, sans-serif",
                fontSize: 11,
                fontWeight: 700,
                color: catStyle.accent,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
              }}
            >
              {catStyle.label}
            </span>
          </div>

          <div style={{ display: "flex", gap: 6 }}>
            <div
              title={series.isOwned ? "All content owned" : "Missing content"}
              style={{
                width: 30,
                height: 30,
                borderRadius: 8,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: series.isOwned
                  ? "rgba(34,197,94,0.18)"
                  : "rgba(255,255,255,0.08)",
                border: `1px solid ${series.isOwned ? "rgba(34,197,94,0.4)" : "rgba(255,255,255,0.14)"}`,
                color: series.isOwned ? "#22C55E" : "#475569",
              }}
            >
              {series.isOwned ? (
                <Check size={14} strokeWidth={2.5} />
              ) : (
                <Lock size={13} strokeWidth={2} />
              )}
            </div>
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
                background: localFav
                  ? "rgba(239,68,68,0.2)"
                  : "rgba(255,255,255,0.08)",
                border: `1px solid ${localFav ? "rgba(239,68,68,0.5)" : "rgba(255,255,255,0.14)"}`,
                color: localFav ? "#EF4444" : "#475569",
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

        {/* Nombre de la serie */}
        <h3
          style={{
            fontFamily: "Syne, sans-serif",
            fontSize: 18,
            fontWeight: 900,
            color: "#FFFFFF",
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
              letterSpacing: "0.04em",
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
            <Wrench size={10} strokeWidth={2.5} />
            {series.fixed_setup ? "Fixed" : "Open"}
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
              <Trophy size={10} strokeWidth={2.5} /> Official
            </span>
          )}
        </div>
      </div>

      {/* ── TRACK ROTATION ────────────────────────────────────── */}
      <div
        style={{
          padding: "14px 18px 16px",
          flex: 1,
          borderBottom: "1px solid rgba(255,255,255,0.06)",
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
              color: "#334155",
              letterSpacing: "0.14em",
              textTransform: "uppercase",
            }}
          >
            Track Rotation
          </span>
          <span
            style={{
              fontFamily: "DM Mono, monospace",
              fontSize: 10,
              color: catStyle.accent + "AA",
            }}
          >
            {weekCount} wks
          </span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          {tracks.slice(0, 6).map((week, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "7px 10px",
                borderRadius: 8,
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.05)",
              }}
            >
              <span
                style={{
                  fontFamily: "DM Mono, monospace",
                  fontSize: 10,
                  fontWeight: 700,
                  color: catStyle.accent,
                  minWidth: 24,
                  flexShrink: 0,
                }}
              >
                W{i + 1}
              </span>
              <Flag
                size={11}
                strokeWidth={1.8}
                color="rgba(255,255,255,0.2)"
                style={{ flexShrink: 0 }}
              />
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 500,
                  color: "rgba(255,255,255,0.8)",
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
                      color: "rgba(255,255,255,0.35)",
                      fontSize: 11,
                      marginLeft: 6,
                    }}
                  >
                    {week.track.config_name}
                  </span>
                )}
              </span>
            </div>
          ))}

          {tracks.length > 6 && (
            <div
              style={{
                padding: "6px 10px",
                borderRadius: 8,
                textAlign: "center",
                background: "rgba(255,255,255,0.02)",
                border: "1px solid rgba(255,255,255,0.04)",
              }}
            >
              <span
                style={{
                  fontFamily: "DM Mono, monospace",
                  fontSize: 11,
                  color: "#334155",
                }}
              >
                +{tracks.length - 6} more tracks
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ── STATS FOOTER ──────────────────────────────────────── */}
      <div style={{ display: "flex", background: "rgba(0,0,0,0.35)" }}>
        {[
          {
            icon: <Clock size={12} strokeWidth={2} />,
            label: "Duration",
            value: duration,
            accent: true,
          },
          {
            icon: <Calendar size={12} strokeWidth={2} />,
            label: "Weeks",
            value: String(weekCount),
            accent: false,
          },
          {
            icon: <Trophy size={12} strokeWidth={2} />,
            label: "Official",
            value: series.official ? "Yes" : "No",
            accent: false,
          },
        ].map((stat, i) => (
          <div
            key={i}
            style={{
              flex: 1,
              padding: "11px 14px",
              borderRight: i < 2 ? "1px solid rgba(255,255,255,0.06)" : "none",
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
                color: "#334155",
              }}
            >
              {stat.icon} {stat.label}
            </span>
            <span
              style={{
                fontFamily: "DM Mono, monospace",
                fontSize: 15,
                fontWeight: 700,
                color: stat.accent ? catStyle.accent : "rgba(255,255,255,0.82)",
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
