"use client";
// /app/components/DriverStats.tsx
// Estadísticas del piloto conectado — inline en el header con popover al hover

import { useState, useRef, useEffect } from "react";
import {
  User,
  TrendingUp,
  Shield,
  Calendar,
  Flag,
  ChevronDown,
  LogOut,
} from "lucide-react";
import { useTheme } from "../lib/theme";
import { useT } from "../lib/i18n";
import type { AppUser } from "../types/iracing";

// Demo stats shown when no real data available yet
const DEMO_STATS = {
  road: { irating: 2450, sr: 3.84, license: "A", starts: 312 },
  oval: { irating: 1820, sr: 4.12, license: "B", starts: 88 },
  dirt_road: { irating: 1340, sr: 3.2, license: "C", starts: 24 },
  dirt_oval: { irating: 1100, sr: 2.75, license: "D", starts: 11 },
};

const LICENSE_COLORS: Record<string, string> = {
  Rookie: "#FF4444",
  "Class D": "#F97316",
  "Class C": "#EAB308",
  "Class B": "#22C55E",
  "Class A": "#3B9EFF",
  PRO: "#A855F7",
  // Short versions as fallback
  D: "#F97316",
  C: "#EAB308",
  B: "#22C55E",
  A: "#3B9EFF",
};

const SR_COLOR = (sr: number) =>
  sr >= 4.5
    ? "#22C55E"
    : sr >= 3.0
      ? "#EAB308"
      : sr >= 1.5
        ? "#F97316"
        : "#FF4444";

interface Props {
  user: AppUser;
  memberSince?: string;
  onLogout: () => void;
}

export default function DriverStats({ user, memberSince, onLogout }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { theme } = useTheme();
  const { t } = useT();
  const isDark = theme === "dark";

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Use real license data if available, otherwise demo
  const licenses = (user as any).licenses as any[] | undefined;
  const stats = licenses?.length
    ? licenses.reduce((acc: any, l: any) => {
        // iRacing category keys: oval, sports_car, formula_car, dirt_oval, dirt_road
        const key = l.category?.toLowerCase().replace(" ", "_") ?? "sports_car";
        acc[key] = {
          irating: l.irating ?? 0,
          sr: l.safety_rating ?? 0,
          license: l.group_name ?? "?",
          starts: l.mpr_num_races ?? 0,
          color: l.color,
        };
        return acc;
      }, {})
    : DEMO_STATS;

  // Pick primary category — iRacing uses sports_car as main road category
  const primary =
    stats["sports_car"] ??
    stats["road"] ??
    stats["formula_car"] ??
    (Object.values(stats)[0] as any);
  const licColor =
    LICENSE_COLORS[primary?.license ?? "D"] ??
    LICENSE_COLORS[(primary?.license ?? "").replace("Class ", "")] ??
    "#666677";

  const T = {
    bg: isDark ? "#111118" : "#FFFFFF",
    border: isDark ? "rgba(255,255,255,0.10)" : "#E0E0E8",
    shadow: isDark
      ? "0 8px 32px rgba(0,0,0,0.6)"
      : "0 8px 28px rgba(0,0,0,0.12)",
    rowBg: isDark ? "#111118" : "rgba(0,0,0,0.03)",
    rowBorder: isDark ? "#1A1A26" : "#E0E0E8",
    text: isDark ? "rgba(255,255,255,0.85)" : "#222230",
    textMuted: isDark ? "#555566" : "#999AAA",
    divider: isDark ? "#1A1A26" : "#E0E0E8",
    logoutBg: isDark ? "rgba(239,68,68,0.1)" : "rgba(239,68,68,0.08)",
    logoutBorder: isDark ? "rgba(239,68,68,0.25)" : "rgba(239,68,68,0.2)",
  };

  const categories = [
    { key: "sports_car", label: t.catRoad },
    { key: "oval", label: t.catOval },
    { key: "formula_car", label: "Formula" },
    { key: "dirt_road", label: t.catDirtRoad },
    { key: "dirt_oval", label: t.catDirtOval },
  ];

  return (
    <div ref={ref} style={{ position: "relative" }}>
      {/* Trigger button */}
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "7px 14px",
          borderRadius: 10,
          border: `1px solid ${open ? licColor + "60" : "rgba(34,197,94,0.3)"}`,
          background: open ? licColor + "15" : "rgba(34,197,94,0.1)",
          cursor: "pointer",
          transition: "all 0.15s",
        }}
      >
        {/* License badge */}
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 22,
            height: 22,
            borderRadius: 6,
            background: licColor + "25",
            border: `1px solid ${licColor}50`,
            fontFamily: "Orbitron, monospace",
            fontSize: 10,
            fontWeight: 800,
            color: licColor,
          }}
        >
          {(primary?.license ?? "A")
            .replace("Class ", "")
            .replace("Rookie", "R")}
        </span>

        {/* Name */}
        <span
          style={{
            fontFamily: "Rajdhani, sans-serif",
            fontWeight: 700,
            fontSize: 13,
            color: "#22C55E",
          }}
        >
          {(user as any).display_name}
        </span>

        {/* Primary iRating */}
        <span
          style={{
            fontFamily: "Orbitron, monospace",
            fontSize: 12,
            fontWeight: 600,
            color: "#3B9EFF",
          }}
        >
          {primary?.irating?.toLocaleString() ?? "—"}
        </span>

        <ChevronDown
          size={13}
          color="#555566"
          style={{
            transform: open ? "rotate(180deg)" : "rotate(0)",
            transition: "transform 0.2s",
          }}
        />
      </button>

      {/* Popover */}
      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            right: 0,
            zIndex: 500,
            width: 320,
            background: T.bg,
            border: `1px solid ${T.border}`,
            borderRadius: 14,
            boxShadow: T.shadow,
            overflow: "hidden",
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: "14px 16px 12px",
              borderBottom: `1px solid ${T.divider}`,
              background: isDark ? "#0F0F14" : "rgba(0,0,0,0.02)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 10,
                  background: licColor + "20",
                  border: `1px solid ${licColor}40`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <User size={18} color={licColor} />
              </div>
              <div>
                <p
                  style={{
                    fontFamily: "Rajdhani, sans-serif",
                    fontWeight: 800,
                    fontSize: 15,
                    color: "var(--text-primary)",
                    margin: 0,
                  }}
                >
                  {(user as any).display_name}
                </p>
                {memberSince && (
                  <p
                    style={{
                      fontFamily: "Orbitron, monospace",
                      fontSize: 10,
                      color: T.textMuted,
                      margin: "2px 0 0",
                    }}
                  >
                    <Calendar
                      size={9}
                      style={{
                        display: "inline",
                        marginRight: 4,
                        verticalAlign: "middle",
                      }}
                    />
                    {t.memberSince} {new Date(memberSince).getFullYear()}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Stats per category */}
          <div style={{ padding: "10px 12px" }}>
            <p
              style={{
                fontFamily: "Orbitron, monospace",
                fontSize: 9,
                color: T.textMuted,
                textTransform: "uppercase",
                letterSpacing: "0.12em",
                margin: "0 0 8px 4px",
              }}
            >
              {t.statsPerCategory}
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              {categories.map(({ key, label }) => {
                const s = stats[key];
                if (!s) return null;
                const lc =
                  LICENSE_COLORS[s.license] ??
                  LICENSE_COLORS[s.license?.replace("Class ", "")] ??
                  "#666677";
                return (
                  <div
                    key={key}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "8px 10px",
                      borderRadius: 10,
                      background: T.rowBg,
                      border: `1px solid ${T.rowBorder}`,
                    }}
                  >
                    {/* License */}
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: 24,
                        height: 24,
                        borderRadius: 6,
                        background: lc + "20",
                        border: `1px solid ${lc}40`,
                        fontFamily: "Orbitron, monospace",
                        fontSize: 10,
                        fontWeight: 800,
                        color: lc,
                        flexShrink: 0,
                      }}
                    >
                      {(s.license ?? "?")
                        .replace("Class ", "")
                        .replace("Rookie", "R")}
                    </span>
                    {/* Category */}
                    <span
                      style={{
                        fontFamily: "Rajdhani, sans-serif",
                        fontWeight: 600,
                        fontSize: 12,
                        color: T.text,
                        flex: 1,
                      }}
                    >
                      {label}
                    </span>
                    {/* iRating */}
                    <div style={{ textAlign: "right" }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 4,
                        }}
                      >
                        <TrendingUp size={10} color="#3B9EFF" />
                        <span
                          style={{
                            fontFamily: "Orbitron, monospace",
                            fontSize: 12,
                            fontWeight: 700,
                            color: "#3B9EFF",
                          }}
                        >
                          {s.irating.toLocaleString()}
                        </span>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 4,
                          marginTop: 2,
                        }}
                      >
                        <Shield size={10} color={SR_COLOR(s.sr)} />
                        <span
                          style={{
                            fontFamily: "Orbitron, monospace",
                            fontSize: 11,
                            fontWeight: 600,
                            color: SR_COLOR(s.sr),
                          }}
                        >
                          {s.sr.toFixed(2)}
                        </span>
                        {s.starts > 0 && (
                          <span
                            style={{
                              fontFamily: "Orbitron, monospace",
                              fontSize: 10,
                              color: T.textMuted,
                              marginLeft: 4,
                            }}
                          >
                            · {s.starts} {t.starts}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Footer */}
          <div
            style={{
              padding: "8px 12px 12px",
              borderTop: `1px solid ${T.divider}`,
            }}
          >
            {!licenses?.length && !(user as any).cust_id && (
              <p
                style={{
                  fontFamily: "Orbitron, monospace",
                  fontSize: 10,
                  color: T.textMuted,
                  margin: "0 0 8px 2px",
                }}
              >
                ⚠ {t.demoStatsNote}
              </p>
            )}
            <button
              onClick={onLogout}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 7,
                padding: "9px",
                borderRadius: 10,
                border: `1px solid ${T.logoutBorder}`,
                background: T.logoutBg,
                cursor: "pointer",
                fontFamily: "Rajdhani, sans-serif",
                fontWeight: 700,
                fontSize: 13,
                color: "#EF4444",
              }}
            >
              <LogOut size={13} /> {t.logout}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
