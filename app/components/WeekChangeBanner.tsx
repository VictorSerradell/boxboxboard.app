"use client";
// /app/components/WeekChangeBanner.tsx
// Banner in-app que aparece cuando la semana de iRacing ha cambiado desde la última visita

import { useState, useEffect } from "react";
import { X, Flag, Bell } from "lucide-react";
import type { SeriesSeason } from "../types/iracing";
import { getCurrentRaceWeek } from "../lib/season-week";
import { useTheme } from "../lib/theme";
import { useT } from "../lib/i18n";

const CATEGORY_ACCENT: Record<string, string> = {
  "Sports Car": "#3B9EFF",
  "Formula Car": "#A855F7",
  Oval: "#F97316",
  "Dirt Oval": "#EAB308",
  "Dirt Road": "#22C55E",
};

const STORAGE_KEY = "boxboxboard_last_seen_week";

interface Props {
  series: SeriesSeason[]; // todas las series cargadas
  scheduledIds: number[]; // series en el horario del usuario
  seasonYear: number;
  seasonQuarter: number;
}

export default function WeekChangeBanner({
  series,
  scheduledIds,
  seasonYear,
  seasonQuarter,
}: Props) {
  const [visible, setVisible] = useState(false);
  const [animate, setAnimate] = useState(false);
  const [newWeek, setNewWeek] = useState<number | null>(null);
  const { theme } = useTheme();
  const { t } = useT();
  const isDark = theme === "dark";

  useEffect(() => {
    if (!series.length || !seasonYear) return;

    const currentWeek = getCurrentRaceWeek(seasonYear, seasonQuarter);
    if (currentWeek === null) return;

    const storageKey = `${STORAGE_KEY}_${seasonYear}_${seasonQuarter}`;
    const lastSeen = localStorage.getItem(storageKey);
    const lastSeenWeek = lastSeen !== null ? parseInt(lastSeen, 10) : null;

    // Show banner if week changed since last visit
    if (lastSeenWeek === null || lastSeenWeek !== currentWeek) {
      setNewWeek(currentWeek);
      setVisible(true);
      setTimeout(() => setAnimate(true), 50);
      // Update last seen
      localStorage.setItem(storageKey, String(currentWeek));
    }
  }, [series, seasonYear, seasonQuarter]);

  function dismiss() {
    setAnimate(false);
    setTimeout(() => setVisible(false), 300);
  }

  if (!visible || newWeek === null) return null;

  // Find scheduled series that are racing this week
  const scheduledThisWeek = series
    .filter((s) => scheduledIds.includes(s.series_id) && s.schedules?.[newWeek])
    .map((s) => ({ series: s, track: s.schedules[newWeek].track }));

  // Also show a few non-scheduled series as discovery
  const otherThisWeek = series
    .filter(
      (s) => !scheduledIds.includes(s.series_id) && s.schedules?.[newWeek],
    )
    .slice(0, 3);

  const T = {
    bg: isDark ? "#0A1628" : "#FFFFFF",
    border: isDark ? "rgba(232,0,45,0.1)" : "rgba(232,0,45,0.1)",
    shadow: isDark
      ? "0 8px 40px rgba(0,0,0,0.5)"
      : "0 8px 32px rgba(0,0,0,0.12)",
    trackBg: isDark ? "#141418" : "rgba(0,0,0,0.04)",
    trackBorder: isDark ? "#1E1E2A" : "#E0E0E8",
    text: isDark ? "rgba(255,255,255,0.85)" : "#222230",
    textMuted: isDark ? "#666677" : "#999AAA",
    closeBtn: isDark ? "#1A1A26" : "rgba(0,0,0,0.06)",
    closeBorder: isDark ? "rgba(255,255,255,0.12)" : "#E0E0E8",
  };

  const isFirstVisit = !localStorage.getItem(
    `${STORAGE_KEY}_seen_before_${seasonYear}_${seasonQuarter}`,
  );

  return (
    <div
      style={{
        position: "fixed",
        top: 76,
        right: 16,
        zIndex: 400,
        width: "min(420px, calc(100vw - 32px))",
        background: T.bg,
        border: `1px solid ${T.border}`,
        borderRadius: 16,
        boxShadow: T.shadow,
        overflow: "hidden",
        opacity: animate ? 1 : 0,
        transform: animate
          ? "translateY(0) scale(1)"
          : "translateY(-12px) scale(0.97)",
        transition: "opacity 0.3s ease, transform 0.3s ease",
      }}
    >
      {/* Accent top bar */}
      <div
        style={{
          height: 3,
          background: "linear-gradient(90deg, #E8002D, #FF4060)",
        }}
      />

      <div style={{ padding: "16px 16px 14px" }}>
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 10,
            marginBottom: 12,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: 10,
                background: "rgba(232,0,45,0.1)",
                border: "1px solid rgba(232,0,45,0.1)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <Bell size={16} color="#E8002D" />
            </div>
            <div>
              <p
                style={{
                  fontFamily: "Rajdhani, sans-serif",
                  fontWeight: 800,
                  fontSize: 14,
                  color: "#E8002D",
                  margin: 0,
                }}
              >
                {t.weekChangedTitle} — {t.weekLabel} {newWeek + 1}
              </p>
              <p
                style={{
                  fontFamily: "Orbitron, monospace",
                  fontSize: 11,
                  color: T.textMuted,
                  margin: "2px 0 0",
                }}
              >
                {scheduledThisWeek.length > 0
                  ? t.weekChangedScheduled(scheduledThisWeek.length)
                  : t.weekChangedNoSchedule}
              </p>
            </div>
          </div>
          <button
            onClick={dismiss}
            style={{
              width: 28,
              height: 28,
              borderRadius: 8,
              border: `1px solid ${T.closeBorder}`,
              background: T.closeBtn,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: T.textMuted,
              flexShrink: 0,
            }}
          >
            <X size={13} />
          </button>
        </div>

        {/* Scheduled series this week */}
        {scheduledThisWeek.length > 0 && (
          <div style={{ marginBottom: otherThisWeek.length > 0 ? 10 : 0 }}>
            <p
              style={{
                fontFamily: "Orbitron, monospace",
                fontSize: 10,
                color: T.textMuted,
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                margin: "0 0 6px",
              }}
            >
              {t.yourSchedule}
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              {scheduledThisWeek.map(({ series: s, track }) => {
                const accent = CATEGORY_ACCENT[s.category ?? ""] ?? "#3B9EFF";
                return (
                  <div
                    key={s.series_id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "8px 10px",
                      borderRadius: 10,
                      background: `${accent}12`,
                      border: `1px solid ${accent}30`,
                    }}
                  >
                    <div
                      style={{
                        width: 5,
                        height: 5,
                        borderRadius: "50%",
                        background: accent,
                        flexShrink: 0,
                        boxShadow: `0 0 5px ${accent}`,
                      }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p
                        style={{
                          fontFamily: "Rajdhani, sans-serif",
                          fontWeight: 700,
                          fontSize: 12,
                          color: "var(--text-primary)",
                          margin: 0,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {s.series_name}
                      </p>
                      <p
                        style={{
                          fontFamily: "Orbitron, monospace",
                          fontSize: 10,
                          color: T.textMuted,
                          margin: "1px 0 0",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        <Flag
                          size={9}
                          style={{
                            display: "inline",
                            marginRight: 4,
                            verticalAlign: "middle",
                          }}
                        />
                        {track.track_name}
                        {track.config_name ? ` — ${track.config_name}` : ""}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Other series this week (discovery) */}
        {otherThisWeek.length > 0 && scheduledThisWeek.length === 0 && (
          <div>
            <p
              style={{
                fontFamily: "Orbitron, monospace",
                fontSize: 10,
                color: T.textMuted,
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                margin: "0 0 6px",
              }}
            >
              {t.racingThisWeek}
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {otherThisWeek.map((s) => {
                const accent = CATEGORY_ACCENT[s.category ?? ""] ?? "#3B9EFF";
                const track = s.schedules[newWeek].track;
                return (
                  <div
                    key={s.series_id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "7px 10px",
                      borderRadius: 10,
                      background: T.trackBg,
                      border: `1px solid ${T.trackBorder}`,
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
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p
                        style={{
                          fontFamily: "Rajdhani, sans-serif",
                          fontWeight: 600,
                          fontSize: 12,
                          color: T.text,
                          margin: 0,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {s.series_name}
                      </p>
                      <p
                        style={{
                          fontFamily: "Orbitron, monospace",
                          fontSize: 10,
                          color: T.textMuted,
                          margin: "1px 0 0",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {track.track_name}
                        {track.config_name ? ` — ${track.config_name}` : ""}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
