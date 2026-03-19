"use client";
// /app/components/ScheduleView.tsx

import { useState } from "react";
import {
  CalendarClock,
  X,
  Flag,
  Clock,
  Trophy,
  Wrench,
  Download,
  Calendar,
  Check,
} from "lucide-react";
import type { SeriesSeason } from "../types/iracing";
import { getCurrentRaceWeek } from "../lib/season-week";
import { useTheme } from "../lib/theme";
import { useT } from "../lib/i18n";
import {
  downloadICS,
  buildEvents,
  googleCalendarUrl,
} from "../lib/export-calendar";
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

interface Props {
  series: SeriesSeason[]; // todas las series de la temporada
  scheduledIds: number[]; // series_ids marcadas por el usuario
  onRemove: (id: number) => void;
  onSeriesClick: (s: SeriesSeason) => void;
}

export default function ScheduleView({
  series,
  scheduledIds,
  onRemove,
  onSeriesClick,
}: Props) {
  const { theme } = useTheme();
  const { t } = useT();
  const isDark = theme === "dark";
  const [exported, setExported] = useState(false);

  const T = {
    border: isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.08)",
    cardBg: isDark ? "#070D19" : "#FFFFFF",
    cardBorder: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.09)",
    rowBg: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)",
    rowBorder: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.06)",
    text: isDark ? "rgba(255,255,255,0.88)" : "#1E293B",
    textMuted: isDark ? "#64748B" : "#94A3B8",
    textFaint: isDark ? "#334155" : "#CBD5E1",
    weekHdrBg: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)",
    weekHdrBorder: isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.08)",
    emptyBg: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)",
    emptyBorder: isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.08)",
    removeBtn: isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.05)",
    removeBtnBorder: isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.09)",
    flagColor: isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.2)",
  };

  const scheduled = series.filter((s) => scheduledIds.includes(s.series_id));

  // Empty state
  if (scheduled.length === 0) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "96px 0",
          gap: 16,
          textAlign: "center",
        }}
      >
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: 20,
            background: T.emptyBg,
            border: `1px solid ${T.emptyBorder}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: T.textFaint,
          }}
        >
          <CalendarClock size={30} strokeWidth={1.5} />
        </div>
        <p
          style={{
            fontFamily: "Syne, sans-serif",
            fontSize: 20,
            fontWeight: 800,
            color: T.textMuted,
            margin: 0,
          }}
        >
          {t.noSchedule}
        </p>
        <p
          style={{ fontSize: 14, color: T.textFaint, margin: 0, maxWidth: 320 }}
        >
          {t.noScheduleHint}
        </p>
      </div>
    );
  }

  // Build week-by-week view
  const weekCounts = scheduled.map((s) =>
    Array.isArray(s.schedules) ? s.schedules.length : 0,
  );
  const maxWeeks = weekCounts.length > 0 ? Math.max(...weekCounts, 1) : 0;
  const currentWeek =
    scheduled.length > 0
      ? getCurrentRaceWeek(
          scheduled[0].season_year,
          scheduled[0].season_quarter,
        )
      : null;

  // Group by week: for each week, collect which scheduled series are racing
  const weeks = Array.from({ length: maxWeeks }, (_, wi) => ({
    weekNum: wi,
    isActive: currentWeek === wi,
    isPast: currentWeek !== null && wi < currentWeek,
    entries: scheduled
      .filter((s) => {
        if (!Array.isArray(s.schedules)) return false;
        // Try by index first, then by race_week_num
        return (
          s.schedules[wi] ??
          s.schedules.find((w: any) => w.race_week_num === wi)
        );
      })
      .map((s) => {
        const week =
          s.schedules[wi] ??
          s.schedules.find((w: any) => w.race_week_num === wi);
        return {
          series: s,
          track: week?.track ?? null,
        };
      }),
  })).filter((w) => w.entries.length > 0); // only show weeks with something scheduled

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Header summary */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <CalendarClock size={18} color="#3B9EFF" />
          <span
            style={{
              fontFamily: "Syne, sans-serif",
              fontWeight: 800,
              fontSize: 18,
              color: "var(--text-primary)",
            }}
          >
            {t.mySchedule}
          </span>
        </div>
        <span
          style={{
            fontFamily: "DM Mono, monospace",
            fontSize: 12,
            color: T.textMuted,
          }}
        >
          {t.activeWeeks(scheduled.length, weeks.length)}
        </span>

        {/* Series pills */}
        <div
          style={{ display: "flex", gap: 6, flexWrap: "wrap", marginLeft: 8 }}
        >
          {scheduled.map((s) => {
            const accent = CATEGORY_ACCENT[s.category ?? ""] ?? "#3B9EFF";
            return (
              <span
                key={s.series_id}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                  padding: "3px 10px",
                  borderRadius: 20,
                  background: accent + "15",
                  border: `1px solid ${accent}35`,
                  fontFamily: "DM Mono, monospace",
                  fontSize: 10,
                  fontWeight: 700,
                  color: accent,
                }}
              >
                {s.series_short_name ??
                  (s.series_name ?? "").split(" ").slice(0, 2).join(" ")}
                <button
                  onClick={() => onRemove(s.series_id)}
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

        {/* Export buttons */}
        <div
          style={{ display: "flex", gap: 6, marginLeft: "auto", flexShrink: 0 }}
        >
          <button
            onClick={() => {
              downloadICS(scheduled);
              setExported(true);
              setTimeout(() => setExported(false), 2500);
            }}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "7px 14px",
              borderRadius: 10,
              cursor: "pointer",
              border: `1px solid ${exported ? "rgba(34,197,94,0.4)" : T.cardBorder}`,
              background: exported ? "rgba(34,197,94,0.1)" : T.cardBg,
              color: exported ? "#22C55E" : T.textMuted,
              fontFamily: "Syne, sans-serif",
              fontWeight: 600,
              fontSize: 13,
              transition: "all 0.2s",
            }}
          >
            {exported ? <Check size={13} /> : <Download size={13} />}
            {exported ? t.exportedIcal : t.exportIcal}
          </button>
          {buildEvents(scheduled).length > 0 && (
            <a
              href={googleCalendarUrl(buildEvents(scheduled)[0])}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "7px 14px",
                borderRadius: 10,
                border: "1px solid rgba(66,133,244,0.4)",
                background: "rgba(66,133,244,0.08)",
                color: "#4285F4",
                fontFamily: "Syne, sans-serif",
                fontWeight: 600,
                fontSize: 13,
                textDecoration: "none",
              }}
            >
              <Calendar size={13} /> {t.exportGcal}
            </a>
          )}
        </div>
      </div>

      {/* Week groups */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {weeks.map((week) => (
          <div key={week.weekNum}>
            {/* Week header */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "8px 14px",
                borderRadius: 10,
                background: week.isActive
                  ? "rgba(34,197,94,0.08)"
                  : T.weekHdrBg,
                border: `1px solid ${week.isActive ? "rgba(34,197,94,0.3)" : T.weekHdrBorder}`,
                marginBottom: 6,
              }}
            >
              {week.isActive && (
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: "#22C55E",
                    boxShadow: "0 0 6px #22C55E",
                    flexShrink: 0,
                  }}
                />
              )}
              <span
                style={{
                  fontFamily: "DM Mono, monospace",
                  fontSize: 12,
                  fontWeight: 700,
                  color: week.isActive ? "#22C55E" : T.textMuted,
                }}
              >
                Week {week.weekNum + 1}
              </span>
              {week.isActive && (
                <span
                  style={{
                    fontFamily: "DM Mono, monospace",
                    fontSize: 10,
                    fontWeight: 700,
                    color: "#22C55E",
                    background: "rgba(34,197,94,0.12)",
                    border: "1px solid rgba(34,197,94,0.3)",
                    borderRadius: 4,
                    padding: "1px 6px",
                  }}
                >
                  {t.racingNow}
                </span>
              )}
              {week.isPast && (
                <span
                  style={{
                    fontFamily: "DM Mono, monospace",
                    fontSize: 10,
                    color: T.textFaint,
                  }}
                >
                  {t.past}
                </span>
              )}
              <span
                style={{
                  fontFamily: "DM Mono, monospace",
                  fontSize: 11,
                  color: T.textFaint,
                  marginLeft: "auto",
                }}
              >
                {week.entries.length} series
              </span>
            </div>

            {/* Series entries for this week */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))",
                gap: 8,
                paddingLeft: 8,
              }}
            >
              {week.entries.map(({ series: s, track }) => {
                const accent = CATEGORY_ACCENT[s.category ?? ""] ?? "#3B9EFF";
                const lic =
                  LICENSE_CONFIG[
                    s.minLicenseLevel as keyof typeof LICENSE_CONFIG
                  ] ?? LICENSE_CONFIG[0];
                const duration = getSessionDuration(s);

                return (
                  <div
                    key={s.series_id}
                    style={{
                      display: "flex",
                      alignItems: "stretch",
                      background: T.cardBg,
                      border: `1px solid ${week.isActive ? accent + "30" : T.cardBorder}`,
                      borderRadius: 12,
                      overflow: "hidden",
                      cursor: "pointer",
                      transition: "border-color 0.15s, transform 0.15s",
                    }}
                    onClick={() => onSeriesClick(s)}
                    onMouseEnter={(e) => {
                      const el = e.currentTarget as HTMLElement;
                      el.style.borderColor = accent + "55";
                      el.style.transform = "translateY(-2px)";
                    }}
                    onMouseLeave={(e) => {
                      const el = e.currentTarget as HTMLElement;
                      el.style.borderColor = week.isActive
                        ? accent + "30"
                        : T.cardBorder;
                      el.style.transform = "translateY(0)";
                    }}
                  >
                    {/* Accent left bar */}
                    <div
                      style={{
                        width: 4,
                        background: `linear-gradient(180deg, ${accent}, ${accent}55)`,
                        flexShrink: 0,
                      }}
                    />

                    <div style={{ flex: 1, padding: "12px 14px", minWidth: 0 }}>
                      {/* Category + series name */}
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
                            width: 5,
                            height: 5,
                            borderRadius: "50%",
                            background: accent,
                          }}
                        />
                        <span
                          style={{
                            fontFamily: "DM Mono, monospace",
                            fontSize: 9,
                            fontWeight: 700,
                            color: accent,
                            textTransform: "uppercase",
                            letterSpacing: "0.1em",
                          }}
                        >
                          {s.category ?? "Road"}
                        </span>
                      </div>
                      <p
                        style={{
                          fontFamily: "Syne, sans-serif",
                          fontWeight: 800,
                          fontSize: 14,
                          color: "var(--text-primary)",
                          margin: "0 0 8px",
                          lineHeight: 1.2,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {s.series_name}
                      </p>

                      {/* Track */}
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                          marginBottom: 8,
                        }}
                      >
                        {week.isActive ? (
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
                            size={11}
                            strokeWidth={1.8}
                            color={T.flagColor}
                            style={{ flexShrink: 0 }}
                          />
                        )}
                        <span
                          style={{
                            fontSize: 13,
                            fontWeight: week.isActive ? 700 : 500,
                            color: T.text,
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {track?.track_name ?? "—"}
                          {track?.config_name && (
                            <span
                              style={{
                                color: T.textMuted,
                                fontSize: 11,
                                marginLeft: 6,
                              }}
                            >
                              {track.config_name}
                            </span>
                          )}
                        </span>
                      </div>

                      {/* Badges */}
                      <div
                        style={{ display: "flex", gap: 5, flexWrap: "wrap" }}
                      >
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
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 4,
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
                          <Wrench size={9} /> {s.fixed_setup ? "Fixed" : "Open"}
                        </span>
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 4,
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
                          <Clock size={9} /> {duration}
                        </span>
                        {s.official && (
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 4,
                              padding: "2px 8px",
                              borderRadius: 20,
                              fontSize: 11,
                              fontWeight: 700,
                              fontFamily: "DM Mono, monospace",
                              background: "rgba(234,179,8,0.12)",
                              border: "1px solid rgba(234,179,8,0.3)",
                              color: "#EAB308",
                            }}
                          >
                            <Trophy size={9} /> Official
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Remove button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemove(s.series_id);
                      }}
                      title={t.removeFromSchedule}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: 36,
                        background: T.removeBtn,
                        border: "none",
                        borderLeft: `1px solid ${T.removeBtnBorder}`,
                        cursor: "pointer",
                        color: T.textFaint,
                        flexShrink: 0,
                        transition: "color 0.15s, background 0.15s",
                      }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLElement).style.color =
                          "#EF4444";
                        (e.currentTarget as HTMLElement).style.background =
                          "rgba(239,68,68,0.1)";
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLElement).style.color =
                          T.textFaint;
                        (e.currentTarget as HTMLElement).style.background =
                          T.removeBtn;
                      }}
                    >
                      <X size={14} />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
