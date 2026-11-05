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
  4: { label: "A", color: "#E8002D" },
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
    bg: isDark ? "#111118" : "#FFFFFF",
    border: isDark ? "rgba(255,255,255,0.10)" : "#E0E0E8",
    headerBg: isDark ? "#0D0D12" : "#F8FAFC",
    colBg: isDark ? "#0F0F14" : "rgba(0,0,0,0.02)",
    colBorder: isDark ? "#161620" : "rgba(0,0,0,0.07)",
    rowBg: isDark ? "#111118" : "rgba(0,0,0,0.03)",
    rowBorder: isDark ? "#161620" : "rgba(0,0,0,0.07)",
    text: isDark ? "#F8FAFC" : "#0F172A",
    textMuted: isDark ? "#CBD5E1" : "#334155",
    textFaint: isDark ? "#94A3B8" : "#64748B",
    flagColor: isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.4)",
    closeBtn: isDark ? "#1E293B" : "rgba(0,0,0,0.06)",
    closeBtnBorder: isDark ? "#334155" : "#CBD5E1",
    shadow: isDark ? "0 -8px 40px rgba(0,0,0,0.6)" : "0 -8px 32px #E0E0E8",
  };

  // Max weeks across all selected series — guard against empty array
  const weekCounts = series.map((s) =>
    Array.isArray(s.schedules) ? s.schedules.length : 0,
  );
  const maxWeeks = weekCounts.length > 0 ? Math.max(...weekCounts, 1) : 1;

  return (
    <div
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 1300,
        background: T.bg,
        borderTop: `2px solid ${series[0] ? (CATEGORY_ACCENT[series[0].category ?? ""] ?? "#3B9EFF") + "60" : "rgba(232,0,45,0.1)"}`,
        boxShadow: T.shadow,
        transition: "transform 0.3s cubic-bezier(0.4,0,0.2,1)",
      }}
    >
      {/* ── HANDLE BAR ─────────────────────────────────────── */}
      <button
        type="button"
        aria-expanded={expanded}
        aria-label="Toggle series comparison panel"
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 20px",
          background: T.headerBg,
          border: "none",
          borderBottom: `1px solid ${T.border}`,
          cursor: "pointer",
          textAlign: "left",
        }}
        onClick={() => setExpanded(!expanded)}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <GitCompare size={15} color="#E8002D" />
          <span
            style={{
              fontFamily: "Rajdhani, sans-serif",
              fontWeight: 800,
              fontSize: 14,
              color: "#E8002D",
            }}
          >
            {t.comparing} {series.length}{" "}
            {series.length > 1 ? t.seriesLabel : t.seriesLabel}
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
                    fontFamily: "Orbitron, monospace",
                    fontSize: 10,
                    fontWeight: 700,
                    color: accent,
                  }}
                >
                  {s.series_short_name ??
                    (s.series_name ?? "").split(" ").slice(0, 2).join(" ")}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemove(s.series_id);
                    }}
                    aria-label={`Remove ${s.series_name ?? "series"} from comparison`}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color: "inherit",
                      padding: 4,
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      minWidth: 24,
                      minHeight: 24,
                      borderRadius: 4,
                    }}
                  >
                    <X size={12} />
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
            aria-label="Clear all compared series"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              minHeight: 32,
              padding: "6px 12px",
              borderRadius: 8,
              cursor: "pointer",
              background: T.closeBtn,
              border: `1px solid ${T.closeBtnBorder}`,
              color: T.textMuted,
              fontSize: 12,
              fontFamily: "Rajdhani, sans-serif",
              fontWeight: 600,
            }}
          >
            {t.clearAll}
          </button>
          <div style={{ color: T.textMuted }}>
            {expanded ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
          </div>
        </div>
      </button>

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
                        fontFamily: "Orbitron, monospace",
                        fontSize: 9,
                        fontWeight: 700,
                        color: accent,
                        textTransform: "uppercase",
                        letterSpacing: "0.12em",
                      }}
                    >
                      {s.category ?? t.catRoad}
                    </span>
                  </div>
                  <p
                    style={{
                      fontFamily: "Rajdhani, sans-serif",
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
                        fontFamily: "Orbitron, monospace",
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
                        fontFamily: "Orbitron, monospace",
                        background: s.fixed_setup
                          ? "rgba(232,0,45,0.1)"
                          : "rgba(34,197,94,0.12)",
                        border: `1px solid ${s.fixed_setup ? "rgba(232,0,45,0.1)" : "rgba(34,197,94,0.3)"}`,
                        color: s.fixed_setup ? "#E8002D" : "#22C55E",
                      }}
                    >
                      {s.fixed_setup ? t.fixed : t.open}
                    </span>
                    <span
                      style={{
                        padding: "2px 8px",
                        borderRadius: 20,
                        fontSize: 11,
                        fontWeight: 700,
                        fontFamily: "Orbitron, monospace",
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
                            fontFamily: "Orbitron, monospace",
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
                          {isEmpty ? "—" : (week.track?.track_name ?? "—")}
                          {!isEmpty && week.track?.config_name && (
                            <span
                              style={{
                                color: T.textMuted,
                                fontSize: 10,
                                marginLeft: 5,
                              }}
                            >
                              {week.track?.config_name}
                            </span>
                          )}
                        </span>
                        {isActive && (
                          <span
                            style={{
                              fontFamily: "Orbitron, monospace",
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
