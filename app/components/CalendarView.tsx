// /app/components/CalendarView.tsx
// Vista de calendario global — filas = semanas, columnas = series
"use client";
import { useT } from "../lib/i18n";
import { useIsMobile } from "../lib/useBreakpoint";
import React, { ReactElement } from "react";
import { useState } from "react";
import { Flag } from "lucide-react";
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

const CATEGORY_ORDER = [
  "Sports Car",
  "Formula Car",
  "Oval",
  "Dirt Oval",
  "Dirt Road",
];

interface Props {
  series: SeriesSeason[];
  onSeriesClick: (s: SeriesSeason) => void;
}

export default function CalendarView({ series, onSeriesClick }: Props) {
  const { theme } = useTheme();
  const { t } = useT();
  const isMobile = useIsMobile();
  const isDark = theme === "dark";
  const [hoveredCol, setHoveredCol] = useState<number | null>(null);
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const T = {
    bg: isDark ? "#060C18" : "#F1F5F9",
    tableBg: isDark ? "#070D19" : "#FFFFFF",
    headerBg: isDark ? "#0A1221" : "#F8FAFC",
    border: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.07)",
    borderStrong: isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.12)",
    rowBg: isDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.01)",
    rowBgAlt: isDark ? "rgba(255,255,255,0.035)" : "rgba(0,0,0,0.025)",
    rowHover: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)",
    colHover: isDark ? "rgba(59,158,255,0.04)" : "rgba(59,158,255,0.03)",
    cellHover: isDark ? "rgba(59,158,255,0.08)" : "rgba(59,158,255,0.06)",
    text: isDark ? "rgba(255,255,255,0.85)" : "#1E293B",
    textMuted: isDark ? "#475569" : "#94A3B8",
    textFaint: isDark ? "#334155" : "#CBD5E1",
    weekLabel: isDark ? "#334155" : "#94A3B8",
    trackName: isDark ? "rgba(255,255,255,0.78)" : "#334155",
    configName: isDark ? "#334155" : "#94A3B8",
    emptyCell: isDark ? "rgba(255,255,255,0.015)" : "rgba(0,0,0,0.015)",
    chipBg: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)",
    chipBorder: isDark ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.09)",
    chipColor: isDark ? "#64748B" : "#94A3B8",
    stickyBg: isDark ? "#070D19" : "#FFFFFF",
  };

  // Sort series by category order, then by name
  const sorted = [...series].sort((a, b) => {
    const ai = CATEGORY_ORDER.indexOf(a.category ?? "");
    const bi = CATEGORY_ORDER.indexOf(b.category ?? "");
    if (ai !== bi) return ai - bi;
    return (a.series_name ?? "").localeCompare(b.series_name ?? "");
  });

  const filtered = activeCategory
    ? sorted.filter((s) => s.category === activeCategory)
    : sorted;

  // Max weeks across all series — guard against empty/invalid schedules
  const weekCounts = filtered.map((s) =>
    Array.isArray(s.schedules) ? s.schedules.length : 0,
  );
  const maxWeeks = weekCounts.length > 0 ? Math.max(...weekCounts, 1) : 12;

  // Current week for highlighting
  const currentWeek =
    filtered.length > 0
      ? getCurrentRaceWeek(filtered[0].season_year, filtered[0].season_quarter)
      : null;

  // Category filter chips
  const categories = CATEGORY_ORDER.filter((cat) =>
    series.some((s) => s.category === cat),
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Category filter chips */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          flexWrap: "wrap",
        }}
      >
        <span
          style={{
            fontFamily: "DM Mono, monospace",
            fontSize: 10,
            color: T.textMuted,
            textTransform: "uppercase",
            letterSpacing: "0.12em",
          }}
        >
          {t.filterType}
        </span>
        <button
          onClick={() => setActiveCategory(null)}
          style={{
            padding: "4px 12px",
            borderRadius: 20,
            border: `1px solid ${!activeCategory ? "rgba(59,158,255,0.5)" : T.chipBorder}`,
            background: !activeCategory ? "rgba(59,158,255,0.12)" : T.chipBg,
            color: !activeCategory ? "#3B9EFF" : T.chipColor,
            fontSize: 12,
            fontWeight: 600,
            fontFamily: "Syne, sans-serif",
            cursor: "pointer",
          }}
        >
          {t.filterAll(series.length)}
        </button>
        {categories.map((cat) => {
          const accent = CATEGORY_ACCENT[cat] ?? "#3B9EFF";
          const active = activeCategory === cat;
          const count = series.filter((s) => s.category === cat).length;
          return (
            <button
              key={cat}
              onClick={() => setActiveCategory(active ? null : cat)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "4px 12px",
                borderRadius: 20,
                border: `1px solid ${active ? accent + "50" : T.chipBorder}`,
                background: active ? accent + "15" : T.chipBg,
                color: active ? accent : T.chipColor,
                fontSize: 12,
                fontWeight: 600,
                fontFamily: "Syne, sans-serif",
                cursor: "pointer",
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: active ? accent : "currentColor",
                  opacity: active ? 1 : 0.5,
                }}
              />
              {cat} ({count})
            </button>
          );
        })}
        <span
          style={{
            fontFamily: "DM Mono, monospace",
            fontSize: 11,
            color: T.textFaint,
            marginLeft: "auto",
          }}
        >
          {filtered.length} {t.seriesLabel} · {maxWeeks} {t.weeksLabel}
        </span>
      </div>

      {/* Table wrapper */}
      <div
        style={{
          overflowX: "auto",
          overflowY: "auto",
          maxHeight: isMobile ? "calc(100vh - 200px)" : "calc(100vh - 260px)",
          borderRadius: 14,
          border: `1px solid ${T.borderStrong}`,
          background: T.tableBg,
        }}
      >
        <table
          style={{
            borderCollapse: "collapse",
            width: "100%",
            tableLayout: "fixed",
            minWidth: filtered.length * (isMobile ? 120 : 180) + 60,
          }}
        >
          {/* Column widths */}
          <colgroup>
            <col style={{ width: isMobile ? 40 : 56 }} />
            {filtered.map((s) => (
              <col key={s.series_id} style={{ width: isMobile ? 120 : 180 }} />
            ))}
          </colgroup>

          {/* Header row — series names */}
          <thead>
            <tr>
              {/* Corner cell */}
              <th
                style={{
                  position: "sticky",
                  left: 0,
                  top: 0,
                  zIndex: 30,
                  background: T.headerBg,
                  borderRight: `1px solid ${T.borderStrong}`,
                  borderBottom: `2px solid ${T.borderStrong}`,
                  padding: "10px 8px",
                  textAlign: "center",
                }}
              >
                <span
                  style={{
                    fontFamily: "DM Mono, monospace",
                    fontSize: 9,
                    color: T.weekLabel,
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                  }}
                >
                  {t.calendarWeek}
                </span>
              </th>

              {filtered.map((s, si) => {
                const accent = CATEGORY_ACCENT[s.category ?? ""] ?? "#3B9EFF";
                const isHovered = hoveredCol === si;
                return (
                  <th
                    key={s.series_id}
                    onMouseEnter={() => setHoveredCol(si)}
                    onMouseLeave={() => setHoveredCol(null)}
                    onClick={() => onSeriesClick(s)}
                    style={{
                      position: "sticky",
                      top: 0,
                      zIndex: 20,
                      background: isHovered ? `${accent}12` : T.headerBg,
                      borderRight: `1px solid ${T.border}`,
                      borderBottom: `2px solid ${isHovered ? accent + "60" : T.borderStrong}`,
                      padding: "10px 10px 8px",
                      cursor: "pointer",
                      transition: "background 0.15s, border-color 0.15s",
                      verticalAlign: "bottom",
                    }}
                  >
                    {/* Accent top bar */}
                    <div
                      style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        right: 0,
                        height: 2,
                        background: isHovered ? accent : "transparent",
                        transition: "background 0.15s",
                      }}
                    />
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 5,
                        marginBottom: 5,
                      }}
                    >
                      <div
                        style={{
                          width: 5,
                          height: 5,
                          borderRadius: "50%",
                          background: accent,
                          flexShrink: 0,
                        }}
                      />
                      <span
                        style={{
                          fontFamily: "DM Mono, monospace",
                          fontSize: 9,
                          color: accent,
                          textTransform: "uppercase",
                          letterSpacing: "0.1em",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {s.category ?? t.catRoad}
                      </span>
                    </div>
                    <p
                      style={{
                        fontFamily: "Syne, sans-serif",
                        fontWeight: 800,
                        fontSize: 11,
                        color: T.text,
                        margin: 0,
                        lineHeight: 1.3,
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                      }}
                    >
                      {s.series_name}
                    </p>
                  </th>
                );
              })}
            </tr>
          </thead>

          {/* Week rows */}
          <tbody>
            {Array.from({ length: maxWeeks }).map((_, wi) => {
              const isActiveWeek = currentWeek === wi;
              const isHoveredRow = hoveredRow === wi;
              return (
                <tr
                  key={wi}
                  onMouseEnter={() => setHoveredRow(wi)}
                  onMouseLeave={() => setHoveredRow(null)}
                  style={{
                    background: isActiveWeek
                      ? "rgba(34,197,94,0.04)"
                      : wi % 2 === 0
                        ? T.rowBg
                        : T.rowBgAlt,
                  }}
                >
                  {/* Week label — sticky left */}
                  <td
                    style={{
                      position: "sticky",
                      left: 0,
                      zIndex: 10,
                      background: isActiveWeek
                        ? "rgba(34,197,94,0.08)"
                        : T.stickyBg,
                      borderRight: `1px solid ${T.borderStrong}`,
                      borderBottom: `1px solid ${T.border}`,
                      padding: "8px 6px",
                      textAlign: "center",
                      verticalAlign: "middle",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: 3,
                      }}
                    >
                      {isActiveWeek && (
                        <span
                          style={{
                            width: 6,
                            height: 6,
                            borderRadius: "50%",
                            background: "#22C55E",
                            boxShadow: "0 0 6px #22C55E",
                          }}
                        />
                      )}
                      <span
                        style={{
                          fontFamily: "DM Mono, monospace",
                          fontSize: 11,
                          fontWeight: 700,
                          color: isActiveWeek ? "#22C55E" : T.weekLabel,
                        }}
                      >
                        W{wi + 1}
                      </span>
                    </div>
                  </td>

                  {/* Series cells */}
                  {filtered.map((s, si) => {
                    const accent =
                      CATEGORY_ACCENT[s.category ?? ""] ?? "#3B9EFF";
                    const week = s.schedules?.[wi];
                    const isColHovered = hoveredCol === si;
                    const isCellHovered =
                      hoveredCol === si && hoveredRow === wi;
                    const isEmpty = !week;

                    return (
                      <td
                        key={s.series_id}
                        onClick={() => !isEmpty && onSeriesClick(s)}
                        style={{
                          borderRight: `1px solid ${T.border}`,
                          borderBottom: `1px solid ${T.border}`,
                          padding: "7px 10px",
                          background:
                            isCellHovered && !isEmpty
                              ? T.cellHover
                              : isColHovered
                                ? T.colHover
                                : isActiveWeek
                                  ? `${accent}08`
                                  : "transparent",
                          cursor: isEmpty ? "default" : "pointer",
                          transition: "background 0.1s",
                          verticalAlign: "middle",
                        }}
                      >
                        {isEmpty ? (
                          <span style={{ color: T.textFaint, fontSize: 11 }}>
                            —
                          </span>
                        ) : (
                          <div
                            style={{
                              display: "flex",
                              alignItems: "flex-start",
                              gap: 6,
                            }}
                          >
                            {isActiveWeek ? (
                              <span
                                style={{
                                  width: 7,
                                  height: 7,
                                  borderRadius: "50%",
                                  background: "#22C55E",
                                  flexShrink: 0,
                                  marginTop: 3,
                                  boxShadow: "0 0 5px #22C55E",
                                }}
                              />
                            ) : (
                              <Flag
                                size={10}
                                strokeWidth={1.8}
                                color={T.configName}
                                style={{ flexShrink: 0, marginTop: 3 }}
                              />
                            )}
                            <div style={{ minWidth: 0 }}>
                              <div
                                style={{
                                  fontSize: isMobile ? 10 : 12,
                                  fontWeight: isActiveWeek ? 700 : 500,
                                  color: isActiveWeek ? T.text : T.trackName,
                                  whiteSpace: "nowrap",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                }}
                              >
                                {week.track?.track_name ?? "—"}
                              </div>
                              {week.track?.config_name && (
                                <div
                                  style={{
                                    fontSize: isMobile ? 9 : 10,
                                    color: T.configName,
                                    marginTop: 1,
                                    whiteSpace: "nowrap",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                  }}
                                >
                                  {week.track.config_name}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
