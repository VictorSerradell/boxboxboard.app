"use client";
import { useT } from "../lib/i18n";
// /app/components/CompareBar.tsx
// Panel inferior fijo para comparar hasta 3 series en paralelo

import { useState } from "react";
import { X, ChevronUp, ChevronDown, Flag, GitCompare } from "lucide-react";
import type { SeriesSeason } from "../types/iracing";
import { getCurrentRaceWeek } from "../lib/season-week";
import { useTheme } from "../lib/theme";

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

interface Props {
  series: SeriesSeason[];
  onRemove: (seriesId: number) => void;
  onClear: () => void;
}

export default function CompareBar({ series, onRemove, onClear }: Props) {
  const [expanded, setExpanded] = useState(true);
  const { theme } = useTheme();
  const { t } = useT();
  const isDark = theme === "dark";

  if (series.length === 0) return null;

  const T = {
    bg: isDark ? "#0A1221" : "#FFFFFF",
    border: isDark ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.10)",
    headerBg: isDark ? "#070D19" : "#F8FAFC",
    colBg: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)",
    colBorder: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.07)",
    rowBg: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)",
    rowBorder: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.07)",
    text: isDark ? "rgba(255,255,255,0.85)" : "#1E293B",
    textMuted: isDark ? "#475569" : "#94A3B8",
    textFaint: isDark ? "#334155" : "#CBD5E1",
    flagColor: isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.18)",
    closeBtn: isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)",
    closeBtnBorder: isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.10)",
    shadow: isDark
      ? "0 -8px 40px rgba(0,0,0,0.6)"
      : "0 -8px 32px rgba(0,0,0,0.10)",
  };

  // Max weeks across all selected series
  const maxWeeks = Math.max(...series.map((s) => s.schedules?.length ?? 0));

  return (
    <div
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 300,
        background: T.bg,
        borderTop: `2px solid ${series[0] ? (CATEGORY_ACCENT[series[0].category ?? ""] ?? "#3B9EFF") + "60" : "rgba(59,158,255,0.4)"}`,
        boxShadow: T.shadow,
        transition: "transform 0.3s cubic-bezier(0.4,0,0.2,1)",
      }}
    >
      {/* ── HANDLE BAR ─────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 20px",
          background: T.headerBg,
          borderBottom: `1px solid ${T.border}`,
          cursor: "pointer",
        }}
        onClick={() => setExpanded(!expanded)}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <GitCompare size={15} color="#3B9EFF" />
          <span
            style={{
              fontFamily: "Syne, sans-serif",
              fontWeight: 800,
              fontSize: 14,
              color: "#3B9EFF",
            }}
          >
            Comparing {series.length} serie{series.length > 1 ? "s" : ""}
          </span>
          <div style={{ display: "flex", gap: 6 }}>
            {series.map((s) => {
              const accent = CATEGORY_ACCENT[s.category ?? ""] ?? "#3B9EFF";
              return (
                <span
                  key={s.series_id}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 5,
                    padding: "2px 8px",
                    borderRadius: 20,
                    background: accent + "18",
                    border: `1px solid ${accent}35`,
                    fontFamily: "DM Mono, monospace",
                    fontSize: 10,
                    fontWeight: 700,
                    color: accent,
                  }}
                >
                  {s.series_short_name ??
                    s.series_name.split(" ").slice(0, 2).join(" ")}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemove(s.series_id);
                    }}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color: "inherit",
                      padding: 0,
                      display: "flex",
                      lineHeight: 1,
                    }}
                  >
                    <X size={10} />
                  </button>
                </span>
              );
            })}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClear();
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              padding: "4px 10px",
              borderRadius: 8,
              cursor: "pointer",
              background: T.closeBtn,
              border: `1px solid ${T.closeBtnBorder}`,
              color: T.textMuted,
              fontSize: 12,
              fontFamily: "Syne, sans-serif",
              fontWeight: 600,
            }}
          >
            Clear all
          </button>
          <div style={{ color: T.textMuted }}>
            {expanded ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
          </div>
        </div>
      </div>

      {/* ── COLUMNS ────────────────────────────────────────── */}
      {expanded && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${series.length}, 1fr)`,
            gap: 1,
            maxHeight: "55vh",
            overflowY: "auto",
            background: T.colBorder,
          }}
        >
          {series.map((s, si) => {
            const accent = CATEGORY_ACCENT[s.category ?? ""] ?? "#3B9EFF";
            const lic =
              LICENSE_CONFIG[
                s.minLicenseLevel as keyof typeof LICENSE_CONFIG
              ] ?? LICENSE_CONFIG[0];
            const currentWeek = getCurrentRaceWeek(
              s.season_year,
              s.season_quarter,
            );

            return (
              <div
                key={s.series_id}
                style={{
                  background: T.bg,
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                {/* Column header */}
                <div
                  style={{
                    padding: "14px 16px 12px",
                    background: `linear-gradient(160deg, ${accent}12 0%, transparent 100%)`,
                    borderBottom: `1px solid ${accent}25`,
                    position: "sticky",
                    top: 0,
                    zIndex: 10,
                    backdropFilter: "blur(12px)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      marginBottom: 6,
                    }}
                  >
                    <div
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        background: accent,
                        boxShadow: `0 0 6px ${accent}`,
                      }}
                    />
                    <span
                      style={{
                        fontFamily: "DM Mono, monospace",
                        fontSize: 9,
                        fontWeight: 700,
                        color: accent,
                        textTransform: "uppercase",
                        letterSpacing: "0.12em",
                      }}
                    >
                      {s.category ?? "Road"}
                    </span>
                  </div>
                  <p
                    style={{
                      fontFamily: "Syne, sans-serif",
                      fontWeight: 800,
                      fontSize: 13,
                      color: T.text,
                      margin: "0 0 8px",
                      lineHeight: 1.25,
                    }}
                  >
                    {s.series_name}
                  </p>
                  <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                    <span
                      style={{
                        padding: "2px 8px",
                        borderRadius: 20,
                        fontSize: 11,
                        fontWeight: 700,
                        fontFamily: "DM Mono, monospace",
                        background: lic.color + "22",
                        border: `1px solid ${lic.color}40`,
                        color: lic.color,
                      }}
                    >
                      {lic.label}
                    </span>
                    <span
                      style={{
                        padding: "2px 8px",
                        borderRadius: 20,
                        fontSize: 11,
                        fontWeight: 700,
                        fontFamily: "DM Mono, monospace",
                        background: s.fixed_setup
                          ? "rgba(59,158,255,0.12)"
                          : "rgba(34,197,94,0.12)",
                        border: `1px solid ${s.fixed_setup ? "rgba(59,158,255,0.3)" : "rgba(34,197,94,0.3)"}`,
                        color: s.fixed_setup ? "#3B9EFF" : "#22C55E",
                      }}
                    >
                      {s.fixed_setup ? "Fixed" : "Open"}
                    </span>
                    <span
                      style={{
                        padding: "2px 8px",
                        borderRadius: 20,
                        fontSize: 11,
                        fontWeight: 700,
                        fontFamily: "DM Mono, monospace",
                        background: T.rowBg,
                        border: `1px solid ${T.rowBorder}`,
                        color: T.textMuted,
                      }}
                    >
                      {s.schedules?.length ?? 0} wks
                    </span>
                  </div>
                </div>

                {/* Week rows */}
                <div style={{ padding: "8px" }}>
                  {Array.from({ length: maxWeeks }).map((_, wi) => {
                    const week = s.schedules?.[wi];
                    const isActive = currentWeek === wi;
                    const isEmpty = !week;

                    return (
                      <div
                        key={wi}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          padding: "7px 10px",
                          borderRadius: 8,
                          marginBottom: 3,
                          background: isActive
                            ? `${accent}15`
                            : isEmpty
                              ? "transparent"
                              : T.rowBg,
                          border: `1px solid ${isActive ? accent + "45" : isEmpty ? "transparent" : T.rowBorder}`,
                          opacity: isEmpty ? 0.3 : 1,
                        }}
                      >
                        <span
                          style={{
                            fontFamily: "DM Mono, monospace",
                            fontSize: 10,
                            fontWeight: 700,
                            color: isActive ? accent : T.textMuted,
                            minWidth: 22,
                            flexShrink: 0,
                          }}
                        >
                          W{wi + 1}
                        </span>
                        {isActive ? (
                          <span
                            style={{
                              width: 8,
                              height: 8,
                              borderRadius: "50%",
                              background: "#22C55E",
                              flexShrink: 0,
                              boxShadow: "0 0 5px #22C55E",
                            }}
                          />
                        ) : (
                          <Flag
                            size={10}
                            strokeWidth={1.8}
                            color={isEmpty ? "transparent" : T.flagColor}
                            style={{ flexShrink: 0 }}
                          />
                        )}
                        <span
                          style={{
                            fontSize: 12,
                            fontWeight: isActive ? 700 : 400,
                            color: isEmpty
                              ? T.textFaint
                              : isActive
                                ? T.text
                                : T.text,
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            flex: 1,
                          }}
                        >
                          {isEmpty ? "—" : week.track.track_name}
                          {!isEmpty && week.track.config_name && (
                            <span
                              style={{
                                color: T.textMuted,
                                fontSize: 10,
                                marginLeft: 5,
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
                              fontSize: 8,
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
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
