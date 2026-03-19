"use client";
// /app/components/TrackMap.tsx
// Interactive world map of iRacing circuits using Leaflet + OpenStreetMap

import { useEffect, useRef, useState } from "react";
import type { SeriesSeason } from "../types/iracing";
import { useTheme } from "../lib/theme";
import { useT } from "../lib/i18n";
import { findTrackCoords } from "../lib/track-coordinates";
import { getCurrentRaceWeek } from "../lib/season-week";

interface Props {
  series: SeriesSeason[];
  ownedTrackIds?: number[];
  onSeriesClick?: (s: SeriesSeason) => void;
}

interface TrackPin {
  trackName: string;
  configName?: string;
  lat: number;
  lng: number;
  country: string;
  series: SeriesSeason[];
  isActiveThisWeek: boolean;
  isOwned: boolean;
  categories: string[];
}

const CATEGORY_COLORS: Record<string, string> = {
  "Sports Car": "#3B9EFF",
  "Formula Car": "#A855F7",
  Oval: "#F97316",
  "Dirt Oval": "#EAB308",
  "Dirt Road": "#22C55E",
};

function buildTrackPins(
  series: SeriesSeason[],
  ownedTrackIds: number[],
): TrackPin[] {
  const pinMap = new Map<string, TrackPin>();

  for (const s of series) {
    if (!s.schedules?.length) continue;
    const currentWeek = getCurrentRaceWeek(s.season_year, s.season_quarter);

    s.schedules.forEach((week, wi) => {
      if (!week?.track) return;
      const { track_name, config_name, track_id } = week.track;
      const coords = findTrackCoords(track_name);
      if (!coords) return;

      const key = `${coords.lat},${coords.lng}`;
      const isActive = currentWeek === wi;
      const isOwned = ownedTrackIds.includes(track_id);

      if (!pinMap.has(key)) {
        pinMap.set(key, {
          trackName: track_name,
          configName: config_name,
          lat: coords.lat,
          lng: coords.lng,
          country: coords.country,
          series: [],
          isActiveThisWeek: false,
          isOwned,
          categories: [],
        });
      }

      const pin = pinMap.get(key)!;
      if (!pin.series.find((x) => x.series_id === s.series_id)) {
        pin.series.push(s);
      }
      if (isActive) pin.isActiveThisWeek = true;
      if (s.category && !pin.categories.includes(s.category)) {
        pin.categories.push(s.category);
      }
    });
  }

  return Array.from(pinMap.values());
}

export default function TrackMap({
  series,
  ownedTrackIds = [],
  onSeriesClick,
}: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMap = useRef<any>(null);
  const [selectedPin, setSelectedPin] = useState<TrackPin | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const { theme } = useTheme();
  const { t } = useT();
  const isDark = theme === "dark";

  const pins = buildTrackPins(series, ownedTrackIds);
  const filtered = categoryFilter
    ? pins.filter((p) => p.categories.includes(categoryFilter))
    : pins;
  const categories = Object.keys(CATEGORY_COLORS).filter((cat) =>
    pins.some((p) => p.categories.includes(cat)),
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || !mapRef.current) return;

    // Dynamically import Leaflet (avoid SSR issues)
    import("leaflet").then((L) => {
      if (leafletMap.current) {
        leafletMap.current.remove();
        leafletMap.current = null;
      }

      // Fix default icon path issue
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl:
          "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
        iconUrl:
          "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
        shadowUrl:
          "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
      });

      const map = L.map(mapRef.current!, {
        center: [30, 10],
        zoom: 2,
        minZoom: 2,
        maxZoom: 10,
        zoomControl: true,
        attributionControl: true,
      });

      // Dark/light tile layer
      const tileUrl = isDark
        ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";

      L.tileLayer(tileUrl, {
        attribution:
          '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors © <a href="https://carto.com/">CARTO</a>',
        subdomains: "abcd",
        maxZoom: 19,
      }).addTo(map);

      // Add pins
      filtered.forEach((pin) => {
        const primaryCat = pin.categories[0] ?? "Sports Car";
        const color = CATEGORY_COLORS[primaryCat] ?? "#3B9EFF";

        // Create custom SVG marker
        const size = pin.isActiveThisWeek ? 20 : 14;
        const svgIcon = L.divIcon({
          html: `
            <div style="
              width: ${size}px; height: ${size}px; border-radius: 50%;
              background: ${color};
              border: ${pin.isActiveThisWeek ? "3px solid #22C55E" : pin.isOwned ? "2px solid white" : "2px solid rgba(255,255,255,0.5)"};
              box-shadow: 0 0 ${pin.isActiveThisWeek ? "12px" : "4px"} ${pin.isActiveThisWeek ? "#22C55E" : color}80;
              cursor: pointer;
              ${pin.isActiveThisWeek ? "animation: pulse 1.5s infinite;" : ""}
            "></div>
            ${pin.isActiveThisWeek ? `<style>@keyframes pulse { 0%,100%{box-shadow:0 0 8px #22C55E80} 50%{box-shadow:0 0 16px #22C55E} }</style>` : ""}
          `,
          className: "",
          iconSize: [size, size],
          iconAnchor: [size / 2, size / 2],
        });

        const marker = L.marker([pin.lat, pin.lng], { icon: svgIcon });
        marker.on("click", () => setSelectedPin(pin));
        marker.addTo(map);

        // Tooltip on hover
        marker.bindTooltip(
          `
          <div style="font-family: Syne, sans-serif; font-weight: 700; font-size: 12px; white-space: nowrap;">
            ${pin.trackName}${pin.configName ? ` · ${pin.configName}` : ""}
            ${pin.isActiveThisWeek ? " 🟢" : ""}
          </div>
          <div style="font-size: 11px; color: #94A3B8; margin-top: 2px;">
            ${pin.series.length} series · ${pin.country}
          </div>
        `,
          { direction: "top", offset: [0, -size / 2] },
        );
      });

      leafletMap.current = map;
    });

    return () => {
      if (leafletMap.current) {
        leafletMap.current.remove();
        leafletMap.current = null;
      }
    };
  }, [mounted, isDark, filtered.length, categoryFilter]);

  if (!mounted)
    return (
      <div
        style={{
          height: 500,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: isDark ? "#070D19" : "#F1F5F9",
          borderRadius: 16,
          color: "#64748B",
        }}
      >
        Loading map...
      </div>
    );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* CSS for Leaflet */}
      <style>{`
        @import url('https://unpkg.com/leaflet@1.9.4/dist/leaflet.css');
        .leaflet-container { background: ${isDark ? "#060C18" : "#F1F5F9"}; border-radius: 16px; }
        .leaflet-tooltip { background: ${isDark ? "#0A1221" : "#FFFFFF"} !important; border: 1px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"} !important; color: ${isDark ? "#E2E8F0" : "#1E293B"} !important; border-radius: 8px !important; padding: 6px 10px !important; }
        .leaflet-tooltip-top:before { border-top-color: ${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"} !important; }
        .leaflet-control-attribution { background: ${isDark ? "rgba(0,0,0,0.6)" : "rgba(255,255,255,0.8)"} !important; color: ${isDark ? "#475569" : "#94A3B8"} !important; font-size: 9px !important; }
        .leaflet-control-attribution a { color: ${isDark ? "#3B9EFF" : "#2563EB"} !important; }
      `}</style>

      {/* Category filters + stats */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          flexWrap: "wrap",
        }}
      >
        <button
          onClick={() => setCategoryFilter(null)}
          style={{
            padding: "4px 12px",
            borderRadius: 20,
            border: `1px solid ${!categoryFilter ? "rgba(59,158,255,0.5)" : isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}`,
            background: !categoryFilter
              ? "rgba(59,158,255,0.12)"
              : "transparent",
            color: !categoryFilter ? "#3B9EFF" : "#64748B",
            fontSize: 12,
            fontWeight: 600,
            fontFamily: "Syne, sans-serif",
            cursor: "pointer",
          }}
        >
          All ({pins.length})
        </button>
        {categories.map((cat) => {
          const color = CATEGORY_COLORS[cat] ?? "#3B9EFF";
          const active = categoryFilter === cat;
          const count = pins.filter((p) => p.categories.includes(cat)).length;
          return (
            <button
              key={cat}
              onClick={() => setCategoryFilter(active ? null : cat)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                padding: "4px 12px",
                borderRadius: 20,
                border: `1px solid ${active ? color + "60" : isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}`,
                background: active ? color + "18" : "transparent",
                color: active ? color : "#64748B",
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
                  background: color,
                }}
              />
              {cat} ({count})
            </button>
          );
        })}

        {/* Legend */}
        <div
          style={{
            marginLeft: "auto",
            display: "flex",
            gap: 14,
            flexWrap: "wrap",
          }}
        >
          <span
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              fontSize: 11,
              color: "#64748B",
              fontFamily: "DM Mono, monospace",
            }}
          >
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                background: "#22C55E",
                display: "inline-block",
                boxShadow: "0 0 6px #22C55E",
              }}
            />
            Active this week
          </span>
          {ownedTrackIds.length > 0 && (
            <span
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                fontSize: 11,
                color: "#64748B",
                fontFamily: "DM Mono, monospace",
              }}
            >
              <span
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  background: "#3B9EFF",
                  border: "2px solid white",
                  display: "inline-block",
                }}
              />
              Owned
            </span>
          )}
        </div>
      </div>

      {/* Map container */}
      <div style={{ position: "relative" }}>
        <div
          ref={mapRef}
          style={{
            height: 520,
            borderRadius: 16,
            border: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"}`,
            overflow: "hidden",
          }}
        />

        {/* Track detail panel */}
        {selectedPin && (
          <div
            style={{
              position: "absolute",
              top: 12,
              right: 12,
              zIndex: 1000,
              width: 300,
              background: isDark ? "#0A1221" : "#FFFFFF",
              border: `1px solid ${isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.12)"}`,
              borderRadius: 14,
              overflow: "hidden",
              boxShadow: isDark
                ? "0 8px 32px rgba(0,0,0,0.6)"
                : "0 8px 24px rgba(0,0,0,0.12)",
            }}
          >
            {/* Header */}
            <div
              style={{
                padding: "14px 16px 12px",
                background: isDark
                  ? "rgba(255,255,255,0.03)"
                  : "rgba(0,0,0,0.02)",
                borderBottom: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"}`,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                  gap: 8,
                }}
              >
                <div>
                  <p
                    style={{
                      fontFamily: "Syne, sans-serif",
                      fontWeight: 800,
                      fontSize: 14,
                      color: isDark ? "white" : "#0F172A",
                      margin: "0 0 3px",
                      lineHeight: 1.3,
                    }}
                  >
                    {selectedPin.trackName}
                    {selectedPin.isActiveThisWeek && (
                      <span
                        style={{
                          marginLeft: 6,
                          fontSize: 11,
                          color: "#22C55E",
                        }}
                      >
                        ● LIVE
                      </span>
                    )}
                  </p>
                  <p
                    style={{
                      fontFamily: "DM Mono, monospace",
                      fontSize: 10,
                      color: "#64748B",
                      margin: 0,
                    }}
                  >
                    {selectedPin.country}
                    {selectedPin.isOwned && " · ✓ Owned"}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedPin(null)}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "#64748B",
                    padding: 0,
                    fontSize: 16,
                    lineHeight: 1,
                  }}
                >
                  ×
                </button>
              </div>
              {/* Category pills */}
              <div
                style={{
                  display: "flex",
                  gap: 4,
                  marginTop: 8,
                  flexWrap: "wrap",
                }}
              >
                {selectedPin.categories.map((cat) => (
                  <span
                    key={cat}
                    style={{
                      padding: "2px 8px",
                      borderRadius: 20,
                      fontSize: 10,
                      fontWeight: 700,
                      fontFamily: "DM Mono, monospace",
                      background: (CATEGORY_COLORS[cat] ?? "#3B9EFF") + "18",
                      color: CATEGORY_COLORS[cat] ?? "#3B9EFF",
                    }}
                  >
                    {cat}
                  </span>
                ))}
              </div>
            </div>

            {/* Series list */}
            <div
              style={{ padding: "10px 0", maxHeight: 240, overflowY: "auto" }}
            >
              {selectedPin.series.map((s) => {
                const color = CATEGORY_COLORS[s.category ?? ""] ?? "#3B9EFF";
                const currentWeek = getCurrentRaceWeek(
                  s.season_year,
                  s.season_quarter,
                );
                const weekIdx = s.schedules?.findIndex(
                  (w) => w?.track?.track_name === selectedPin.trackName,
                );
                const isHere = weekIdx !== undefined && weekIdx >= 0;
                const isActive = isHere && currentWeek === weekIdx;

                return (
                  <div
                    key={s.series_id}
                    onClick={() => onSeriesClick?.(s)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "8px 16px",
                      cursor: onSeriesClick ? "pointer" : "default",
                      transition: "background 0.1s",
                    }}
                    onMouseEnter={(e) =>
                      ((e.currentTarget as HTMLElement).style.background =
                        isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)")
                    }
                    onMouseLeave={(e) =>
                      ((e.currentTarget as HTMLElement).style.background =
                        "transparent")
                    }
                  >
                    <div
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        background: color,
                        flexShrink: 0,
                      }}
                    />
                    <span
                      style={{
                        fontFamily: "DM Sans, sans-serif",
                        fontSize: 12,
                        fontWeight: 500,
                        color: isDark ? "rgba(255,255,255,0.8)" : "#1E293B",
                        flex: 1,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {s.series_name}
                    </span>
                    {isActive && (
                      <span
                        style={{
                          fontSize: 9,
                          fontWeight: 700,
                          color: "#22C55E",
                          background: "rgba(34,197,94,0.12)",
                          border: "1px solid rgba(34,197,94,0.3)",
                          borderRadius: 4,
                          padding: "1px 5px",
                          flexShrink: 0,
                          fontFamily: "DM Mono, monospace",
                        }}
                      >
                        NOW
                      </span>
                    )}
                    {isHere && !isActive && weekIdx !== undefined && (
                      <span
                        style={{
                          fontSize: 9,
                          color: "#64748B",
                          fontFamily: "DM Mono, monospace",
                          flexShrink: 0,
                        }}
                      >
                        W{weekIdx + 1}
                      </span>
                    )}
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
