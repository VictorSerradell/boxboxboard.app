"use client";
// /app/components/SeriesDetailPanel.tsx
// Panel lateral de detalle de serie — desliza desde la derecha

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
  MapPin,
  BarChart2,
  Users,
  ChevronRight,
  Zap,
  Weight,
} from "lucide-react";
import type { SeriesSeason } from "../types/iracing";
import { toggleFavoriteSeries } from "../lib/iracing-client";
import { getCurrentRaceWeek } from "../lib/season-week";

interface Props {
  series: SeriesSeason | null;
  isFavorite: boolean;
  onClose: () => void;
  onFavoriteToggle: (seriesId: number, newFavs: number[]) => void;
}

// Demo cars por serie — en producción vendrán del API
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

// Demo race times — en producción del API
const DEMO_TIMES: Record<number, string[]> = {
  301: ["Sat 14:00 UTC", "Sat 20:00 UTC", "Sun 02:00 UTC"],
  302: ["Tue 18:00 UTC", "Sat 17:00 UTC"],
  303: ["Every 2h repeating"],
  304: ["Every 2h repeating"],
  305: ["Wed 18:00 UTC", "Sat 19:00 UTC"],
  308: ["Every 4h repeating"],
};

// Demo stats
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

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p
      style={{
        fontFamily: "DM Mono, monospace",
        fontSize: 10,
        fontWeight: 600,
        color: "#334155",
        letterSpacing: "0.14em",
        textTransform: "uppercase",
        margin: "0 0 10px",
      }}
    >
      {children}
    </p>
  );
}

function StatBox({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <div
      style={{
        flex: 1,
        padding: "12px 14px",
        borderRadius: 10,
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.07)",
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
          color: "#334155",
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
          color: accent ?? "rgba(255,255,255,0.9)",
        }}
      >
        {value}
      </span>
    </div>
  );
}

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

  // Sincronizar fav con prop
  useEffect(() => setLocalFav(isFavorite), [isFavorite]);

  // Animación de entrada/salida
  useEffect(() => {
    if (series) {
      requestAnimationFrame(() => setVisible(true));
    } else {
      setVisible(false);
    }
  }, [series]);

  // Cerrar con Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!series) return null;

  const accent = CATEGORY_ACCENT[series.category ?? ""] ?? "#3B9EFF";
  const licConfig =
    LICENSE_CONFIG[series.minLicenseLevel as keyof typeof LICENSE_CONFIG] ??
    LICENSE_CONFIG[0];
  const duration = getSessionDuration(series);
  const weekCount = series.schedules?.length ?? 0;
  const cars = DEMO_CARS[series.series_id] ?? [
    { name: "Series car", owned: false, free: false },
  ];
  const times = DEMO_TIMES[series.series_id] ?? ["Every 2h repeating"];
  const stats = DEMO_STATS[series.series_id] ?? {
    avg_sof: 2000,
    avg_drivers: 20,
    splits: 1,
  };
  const currentWeek = getCurrentRaceWeek(
    series.season_year,
    series.season_quarter,
  );

  function handleFav() {
    const newFavs = toggleFavoriteSeries(series!.series_id);
    setLocalFav(!localFav);
    onFavoriteToggle(series!.series_id, newFavs);
  }

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 200,
          background: "rgba(0,0,0,0.55)",
          backdropFilter: "blur(4px)",
          opacity: visible ? 1 : 0,
          transition: "opacity 0.25s ease",
        }}
      />

      {/* Panel */}
      <div
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          bottom: 0,
          zIndex: 201,
          width: "min(520px, 100vw)",
          background: "#070D19",
          borderLeft: `1px solid ${accent}30`,
          display: "flex",
          flexDirection: "column",
          transform: visible ? "translateX(0)" : "translateX(100%)",
          transition: "transform 0.3s cubic-bezier(0.4,0,0.2,1)",
          overflowY: "auto",
        }}
      >
        {/* ── HEADER del panel ─────────────────────────────────── */}
        <div
          style={{
            background: `linear-gradient(160deg, ${accent}18 0%, #070D19 60%)`,
            borderBottom: `1px solid ${accent}20`,
            padding: "20px 20px 18px",
            position: "sticky",
            top: 0,
            zIndex: 10,
            backdropFilter: "blur(20px)",
          }}
        >
          {/* Barra de acento */}
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
                  {series.category ?? "Road"}
                </span>
              </div>

              {/* Nombre */}
              <h2
                style={{
                  fontFamily: "Syne, sans-serif",
                  fontSize: 22,
                  fontWeight: 900,
                  color: "white",
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
                  <Wrench size={10} /> {series.fixed_setup ? "Fixed" : "Open"}
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
                    <Trophy size={10} /> Official
                  </span>
                )}
                {series.driver_changes && (
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
                      background: "rgba(168,85,247,0.14)",
                      border: "1px solid rgba(168,85,247,0.35)",
                      color: "#A855F7",
                    }}
                  >
                    <Users size={10} /> Team
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
                  background: "rgba(255,255,255,0.07)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  color: "#64748B",
                }}
              >
                <X size={16} />
              </button>
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
                  background: localFav
                    ? "rgba(239,68,68,0.18)"
                    : "rgba(255,255,255,0.07)",
                  border: `1px solid ${localFav ? "rgba(239,68,68,0.45)" : "rgba(255,255,255,0.12)"}`,
                  color: localFav ? "#EF4444" : "#64748B",
                }}
              >
                <Heart
                  size={15}
                  fill={localFav ? "currentColor" : "none"}
                  strokeWidth={2}
                />
              </button>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: series.isOwned
                    ? "rgba(34,197,94,0.15)"
                    : "rgba(255,255,255,0.07)",
                  border: `1px solid ${series.isOwned ? "rgba(34,197,94,0.35)" : "rgba(255,255,255,0.12)"}`,
                  color: series.isOwned ? "#22C55E" : "#475569",
                }}
                title={series.isOwned ? "Content owned" : "Missing content"}
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

        {/* ── CONTENIDO ────────────────────────────────────────── */}
        <div
          style={{
            padding: "20px",
            display: "flex",
            flexDirection: "column",
            gap: 24,
          }}
        >
          {/* ESTADÍSTICAS */}
          <section>
            <SectionTitle>
              <BarChart2
                size={10}
                style={{ display: "inline", marginRight: 5 }}
              />
              Stats
            </SectionTitle>
            <div style={{ display: "flex", gap: 8 }}>
              <StatBox
                icon={<Zap size={11} />}
                label="Avg SOF"
                value={stats.avg_sof.toLocaleString()}
                accent={accent}
              />
              <StatBox
                icon={<Users size={11} />}
                label="Avg Drivers"
                value={String(stats.avg_drivers)}
              />
              <StatBox
                icon={<BarChart2 size={11} />}
                label="Splits"
                value={String(stats.splits)}
              />
              <StatBox
                icon={<Clock size={11} />}
                label="Race Time"
                value={duration}
              />
            </div>
          </section>

          {/* COCHES PERMITIDOS */}
          <section>
            <SectionTitle>
              <Car size={10} style={{ display: "inline", marginRight: 5 }} />
              Allowed Cars
            </SectionTitle>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {cars.map((car, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "10px 14px",
                    borderRadius: 10,
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.07)",
                  }}
                >
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 10 }}
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
                          : "rgba(255,255,255,0.05)",
                        border: `1px solid ${car.owned ? "rgba(34,197,94,0.3)" : "rgba(255,255,255,0.08)"}`,
                        color: car.owned ? "#22C55E" : "#475569",
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
                        color: car.owned
                          ? "rgba(255,255,255,0.85)"
                          : "rgba(255,255,255,0.45)",
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
                      FREE
                    </span>
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* HORARIOS */}
          <section>
            <SectionTitle>
              <Clock size={10} style={{ display: "inline", marginRight: 5 }} />
              Race Schedule
            </SectionTitle>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {times.map((t, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "10px 14px",
                    borderRadius: 10,
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.07)",
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
                      color: "rgba(255,255,255,0.8)",
                      fontFamily: "DM Mono, monospace",
                    }}
                  >
                    {t}
                  </span>
                </div>
              ))}
            </div>
          </section>

          {/* CALENDARIO COMPLETO */}
          <section>
            <SectionTitle>
              <Calendar
                size={10}
                style={{ display: "inline", marginRight: 5 }}
              />
              Full Track Calendar
            </SectionTitle>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
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
                          ? "rgba(255,255,255,0.04)"
                          : "rgba(255,255,255,0.025)",
                      border: `1px solid ${isActive ? accent + "45" : "rgba(255,255,255,0.06)"}`,
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
                        color="rgba(255,255,255,0.2)"
                        style={{ flexShrink: 0 }}
                      />
                    )}

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: isActive ? 700 : 600,
                          color: isActive ? "white" : "rgba(255,255,255,0.85)",
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
                            color: "#475569",
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
                        NOW
                      </span>
                    ) : (
                      week.start_date && (
                        <span
                          style={{
                            fontFamily: "DM Mono, monospace",
                            fontSize: 10,
                            color: "#334155",
                            flexShrink: 0,
                          }}
                        >
                          {new Date(week.start_date).toLocaleDateString(
                            "en-GB",
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

          {/* Info adicional */}
          <section>
            <SectionTitle>Series Info</SectionTitle>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 8,
              }}
            >
              {[
                {
                  label: "Season",
                  value: `S${series.season_quarter} ${series.season_year}`,
                },
                {
                  label: "Min License",
                  value: series.allowed_licenses?.[0]?.group_name ?? "—",
                },
                {
                  label: "Team Driving",
                  value: series.driver_changes ? "Yes" : "No",
                },
                {
                  label: "Multiclass",
                  value: series.multiclass ? "Yes" : "No",
                },
              ].map((item) => (
                <div
                  key={item.label}
                  style={{
                    padding: "10px 14px",
                    borderRadius: 10,
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.06)",
                  }}
                >
                  <div
                    style={{
                      fontSize: 10,
                      fontFamily: "DM Mono, monospace",
                      color: "#334155",
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
                      color: "rgba(255,255,255,0.8)",
                    }}
                  >
                    {item.value}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
