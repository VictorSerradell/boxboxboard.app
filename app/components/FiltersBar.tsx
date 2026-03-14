"use client";
// /app/components/FiltersBar.tsx

import { useState } from "react";
import {
  Heart,
  Shield,
  RotateCcw,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import type {
  FilterState,
  CarCategory,
  LicenseLevel,
  SessionType,
} from "../types/iracing";
import { useTheme } from "../lib/theme";
import { useT } from "../lib/i18n";
import { useIsMobile } from "../lib/useBreakpoint";

interface FiltersBarProps {
  filters: FilterState;
  onChange: (newFilters: FilterState) => void;
  autoLicense?: LicenseLevel | null; // detected from connected account
}

const CATEGORIES: { label: string; value: CarCategory }[] = [
  { label: "Sports Car", value: "Sports Car" },
  { label: "Formula", value: "Formula Car" },
  { label: "Oval", value: "Oval" },
  { label: "Dirt Oval", value: "Dirt Oval" },
  { label: "Dirt Road", value: "Dirt Road" },
];

const LICENSES: { label: string; value: LicenseLevel; color: string }[] = [
  { label: "Rookie", value: 0, color: "#FF4444" },
  { label: "D", value: 1, color: "#F97316" },
  { label: "C", value: 2, color: "#EAB308" },
  { label: "B", value: 3, color: "#22C55E" },
  { label: "A", value: 4, color: "#3B9EFF" },
];

const STATUSES: { label: string; value: SessionType; color: string }[] = [
  { label: "Fixed", value: "FIXED", color: "#3B9EFF" },
  { label: "Open", value: "OPEN", color: "#22C55E" },
  { label: "Ranked", value: "RANKED", color: "#A855F7" },
  { label: "Unranked", value: "UNRANKED", color: "#64748B" },
];

export default function FiltersBar({
  filters,
  onChange,
  autoLicense,
}: FiltersBarProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const { t } = useT();
  const isMobile = useIsMobile();
  const [drawerOpen, setDrawerOpen] = useState(false);

  // If account is connected, auto-license overrides manual
  // Safe fallback in case myLicense is undefined (old FilterState without the field)
  const effectiveLicense =
    autoLicense !== undefined ? autoLicense : (filters.myLicense ?? null);

  const T = {
    barBg: isDark ? "rgba(6,12,24,0.94)" : "rgba(248,250,252,0.96)",
    barBorder: isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.09)",
    divider: isDark ? "rgba(255,255,255,0.09)" : "rgba(0,0,0,0.10)",
    groupLabel: isDark ? "#334155" : "#94A3B8",
    chipDefault: isDark
      ? {
          color: "#64748B",
          border: "rgba(255,255,255,0.10)",
          bg: "transparent",
        }
      : { color: "#64748B", border: "rgba(0,0,0,0.12)", bg: "transparent" },
    chipHover: isDark
      ? {
          color: "#E2E8F0",
          border: "rgba(255,255,255,0.2)",
          bg: "rgba(255,255,255,0.05)",
        }
      : {
          color: "#1E293B",
          border: "rgba(0,0,0,0.22)",
          bg: "rgba(0,0,0,0.04)",
        },
    searchBg: isDark ? "#0A1221" : "#FFFFFF",
    searchBorder: isDark ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.12)",
    searchText: isDark ? "#FFFFFF" : "#0F172A",
    searchPlaceholder: isDark ? "#334155" : "#CBD5E1",
    resetColor: isDark ? "#475569" : "#94A3B8",
  };

  function toggleCategory(cat: CarCategory) {
    const cats = filters.categories.includes(cat)
      ? filters.categories.filter((c) => c !== cat)
      : [...filters.categories, cat];
    onChange({ ...filters, categories: cats });
  }

  function toggleLicense(lic: LicenseLevel) {
    const lics = filters.licenses.includes(lic)
      ? filters.licenses.filter((l) => l !== lic)
      : [...filters.licenses, lic];
    onChange({ ...filters, licenses: lics });
  }

  function toggleStatus(s: SessionType) {
    const stats = filters.statuses.includes(s)
      ? filters.statuses.filter((x) => x !== s)
      : [...filters.statuses, s];
    onChange({ ...filters, statuses: stats });
  }

  function reset() {
    onChange({
      categories: [],
      licenses: [],
      statuses: [],
      favoritesOnly: false,
      ownedOnly: false,
      searchQuery: "",
      myLicense: null,
    });
  }

  const hasActiveFilters =
    filters.categories.length > 0 ||
    filters.licenses.length > 0 ||
    filters.statuses.length > 0 ||
    filters.favoritesOnly ||
    filters.ownedOnly ||
    filters.searchQuery.length > 0 ||
    (filters.myLicense ?? null) !== null;

  // Chip helper
  function chip({
    label,
    active,
    color,
    onClick,
    children,
  }: {
    label?: string;
    active: boolean;
    color?: string;
    onClick: () => void;
    children?: React.ReactNode;
  }) {
    const c = T.chipDefault;
    return (
      <button
        onClick={onClick}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          padding: "5px 12px",
          borderRadius: 20,
          border: `1px solid ${active ? (color ?? "#3B9EFF") + "50" : c.border}`,
          background: active ? (color ?? "#3B9EFF") + "15" : c.bg,
          color: active ? (color ?? "#3B9EFF") : c.color,
          fontSize: 13,
          fontWeight: 600,
          fontFamily: "Syne, sans-serif",
          cursor: "pointer",
          whiteSpace: "nowrap",
          transition: "all 0.15s ease",
        }}
        onMouseEnter={(e) => {
          if (!active) {
            const el = e.currentTarget as HTMLElement;
            el.style.color = T.chipHover.color;
            el.style.borderColor = T.chipHover.border;
            el.style.background = T.chipHover.bg;
          }
        }}
        onMouseLeave={(e) => {
          if (!active) {
            const el = e.currentTarget as HTMLElement;
            el.style.color = c.color;
            el.style.borderColor = c.border;
            el.style.background = c.bg;
          }
        }}
      >
        {children}
        {label}
      </button>
    );
  }

  // Shared filters content
  const filtersContent = (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        flexWrap: "wrap",
      }}
    >
      {/* Type */}
      <span
        style={{
          fontFamily: "DM Mono, monospace",
          fontSize: 10,
          color: T.groupLabel,
          textTransform: "uppercase",
          letterSpacing: "0.12em",
          whiteSpace: "nowrap",
        }}
      >{`${t.filterType}`}</span>
      {CATEGORIES.map((cat) => (
        <div key={cat.value}>
          {chip({
            label: cat.label,
            active: filters.categories.includes(cat.value),
            onClick: () => toggleCategory(cat.value),
            children: (
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  background: "currentColor",
                  opacity: 0.8,
                  flexShrink: 0,
                }}
              />
            ),
          })}
        </div>
      ))}

      <div
        style={{
          width: 1,
          height: 22,
          background: T.divider,
          flexShrink: 0,
          margin: "0 2px",
        }}
      />

      {/* License */}
      <span
        style={{
          fontFamily: "DM Mono, monospace",
          fontSize: 10,
          color: T.groupLabel,
          textTransform: "uppercase",
          letterSpacing: "0.12em",
          whiteSpace: "nowrap",
        }}
      >{`${t.filterLicense}`}</span>
      {LICENSES.map((lic) => (
        <div key={lic.value}>
          {chip({
            label: lic.label,
            active: filters.licenses.includes(lic.value),
            color: lic.color,
            onClick: () => toggleLicense(lic.value),
          })}
        </div>
      ))}

      <div
        style={{
          width: 1,
          height: 22,
          background: T.divider,
          flexShrink: 0,
          margin: "0 2px",
        }}
      />

      {/* Status */}
      <span
        style={{
          fontFamily: "DM Mono, monospace",
          fontSize: 10,
          color: T.groupLabel,
          textTransform: "uppercase",
          letterSpacing: "0.12em",
          whiteSpace: "nowrap",
        }}
      >{`${t.filterStatus}`}</span>
      {STATUSES.map((s) => (
        <div key={s.value}>
          {chip({
            label: s.label,
            active: filters.statuses.includes(s.value),
            color: s.color,
            onClick: () => toggleStatus(s.value),
          })}
        </div>
      ))}

      <div
        style={{
          width: 1,
          height: 22,
          background: T.divider,
          flexShrink: 0,
          margin: "0 2px",
        }}
      />

      {chip({
        label: t.filterFavorites,
        active: filters.favoritesOnly,
        color: "#EF4444",
        onClick: () =>
          onChange({ ...filters, favoritesOnly: !filters.favoritesOnly }),
        children: (
          <Heart
            size={12}
            fill={filters.favoritesOnly ? "currentColor" : "none"}
          />
        ),
      })}
      {chip({
        label: t.filterOwned,
        active: filters.ownedOnly,
        color: "#F97316",
        onClick: () => onChange({ ...filters, ownedOnly: !filters.ownedOnly }),
        children: (
          <Shield
            size={12}
            fill={filters.ownedOnly ? "currentColor" : "none"}
          />
        ),
      })}

      {hasActiveFilters && (
        <button
          onClick={reset}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
            padding: "5px 12px",
            borderRadius: 20,
            border: "1px solid transparent",
            background: "transparent",
            color: T.resetColor,
            fontSize: 13,
            fontWeight: 600,
            fontFamily: "Syne, sans-serif",
            cursor: "pointer",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.color = "#EF4444";
            (e.currentTarget as HTMLElement).style.borderColor =
              "rgba(239,68,68,0.25)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.color = T.resetColor;
            (e.currentTarget as HTMLElement).style.borderColor = "transparent";
          }}
        >
          <RotateCcw size={11} /> {t.filterReset}
        </button>
      )}

      {/* My License selector */}
      {autoLicense === undefined && (
        <>
          <div
            style={{
              width: 1,
              height: 22,
              background: T.divider,
              flexShrink: 0,
              margin: "0 2px",
            }}
          />
          <span
            style={{
              fontFamily: "DM Mono, monospace",
              fontSize: 10,
              color: T.groupLabel,
              textTransform: "uppercase",
              letterSpacing: "0.12em",
              whiteSpace: "nowrap",
            }}
          >
            {t.myLicenseLabel}
          </span>
          {LICENSES.map((lic) => {
            const active = filters.myLicense === lic.value;
            return (
              <button
                key={lic.value}
                onClick={() =>
                  onChange({ ...filters, myLicense: active ? null : lic.value })
                }
                title={t.myLicenseTooltip}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                  padding: "4px 10px",
                  borderRadius: 20,
                  border: `1px solid ${active ? lic.color + "60" : T.chipDefault.border}`,
                  background: active ? lic.color + "18" : "transparent",
                  color: active ? lic.color : T.chipDefault.color,
                  fontSize: 12,
                  fontWeight: 700,
                  fontFamily: "DM Mono, monospace",
                  cursor: "pointer",
                  transition: "all 0.15s",
                }}
              >
                {active && (
                  <span
                    style={{
                      width: 5,
                      height: 5,
                      borderRadius: "50%",
                      background: lic.color,
                    }}
                  />
                )}
                {lic.label}
              </button>
            );
          })}
        </>
      )}
      {autoLicense !== undefined &&
        autoLicense !== null &&
        (() => {
          const lic = LICENSES.find((l) => l.value === autoLicense);
          if (!lic) return null;
          return (
            <>
              <div
                style={{
                  width: 1,
                  height: 22,
                  background: T.divider,
                  flexShrink: 0,
                  margin: "0 2px",
                }}
              />
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                  padding: "4px 10px",
                  borderRadius: 20,
                  border: `1px solid ${lic.color}50`,
                  background: lic.color + "15",
                  fontFamily: "DM Mono, monospace",
                  fontSize: 11,
                  fontWeight: 700,
                  color: lic.color,
                }}
              >
                <span
                  style={{
                    width: 5,
                    height: 5,
                    borderRadius: "50%",
                    background: lic.color,
                  }}
                />
                {t.myLicenseLabel}: {lic.label}
              </span>
            </>
          );
        })()}

      {/* Search — desktop only inline */}
      {!isMobile && (
        <div style={{ position: "relative", marginLeft: "auto" }}>
          <Search
            size={13}
            style={{
              position: "absolute",
              left: 10,
              top: "50%",
              transform: "translateY(-50%)",
              color: T.searchPlaceholder,
              pointerEvents: "none",
            }}
          />
          <input
            type="text"
            placeholder={t.searchPlaceholder}
            value={filters.searchQuery}
            onChange={(e) =>
              onChange({ ...filters, searchQuery: e.target.value })
            }
            style={{
              background: T.searchBg,
              border: `1px solid ${T.searchBorder}`,
              borderRadius: 10,
              fontSize: 13,
              color: T.searchText,
              paddingLeft: 32,
              paddingRight: 16,
              paddingTop: 7,
              paddingBottom: 7,
              width: 200,
              outline: "none",
              transition: "all 0.15s",
              fontFamily: "DM Sans, sans-serif",
            }}
            onFocus={(e) => {
              e.currentTarget.style.width = "256px";
              e.currentTarget.style.borderColor = "rgba(59,158,255,0.4)";
            }}
            onBlur={(e) => {
              e.currentTarget.style.width = "200px";
              e.currentTarget.style.borderColor = T.searchBorder;
            }}
          />
        </div>
      )}
    </div>
  );

  // ── Mobile: compact bar + drawer ─────────────────────────────
  if (isMobile) {
    const activeCount =
      filters.categories.length +
      filters.licenses.length +
      filters.statuses.length +
      (filters.favoritesOnly ? 1 : 0) +
      (filters.ownedOnly ? 1 : 0) +
      (filters.myLicense !== null ? 1 : 0);
    return (
      <>
        {/* Compact mobile bar: search + filter button */}
        <div
          style={{
            position: "sticky",
            top: 60,
            zIndex: 90,
            background: T.barBg,
            backdropFilter: "blur(20px)",
            borderBottom: `1px solid ${T.barBorder}`,
            padding: "8px 12px",
            display: "flex",
            gap: 8,
          }}
        >
          <div style={{ position: "relative", flex: 1 }}>
            <Search
              size={13}
              style={{
                position: "absolute",
                left: 10,
                top: "50%",
                transform: "translateY(-50%)",
                color: T.searchPlaceholder,
                pointerEvents: "none",
              }}
            />
            <input
              type="text"
              placeholder={t.searchPlaceholder}
              value={filters.searchQuery}
              onChange={(e) =>
                onChange({ ...filters, searchQuery: e.target.value })
              }
              style={{
                width: "100%",
                background: T.searchBg,
                border: `1px solid ${T.searchBorder}`,
                borderRadius: 10,
                fontSize: 13,
                color: T.searchText,
                paddingLeft: 32,
                paddingRight: 12,
                paddingTop: 8,
                paddingBottom: 8,
                outline: "none",
                fontFamily: "DM Sans, sans-serif",
                boxSizing: "border-box",
              }}
            />
          </div>
          <button
            onClick={() => setDrawerOpen(true)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "8px 14px",
              borderRadius: 10,
              border: `1px solid ${activeCount > 0 ? "rgba(59,158,255,0.4)" : T.barBorder}`,
              background: activeCount > 0 ? "rgba(59,158,255,0.1)" : T.searchBg,
              color: activeCount > 0 ? "#3B9EFF" : T.groupLabel,
              fontFamily: "Syne, sans-serif",
              fontWeight: 600,
              fontSize: 13,
              cursor: "pointer",
              flexShrink: 0,
            }}
          >
            <SlidersHorizontal size={14} />
            {activeCount > 0 && (
              <span
                style={{
                  background: "#3B9EFF",
                  color: "white",
                  borderRadius: "50%",
                  width: 16,
                  height: 16,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 10,
                  fontWeight: 800,
                }}
              >
                {activeCount}
              </span>
            )}
          </button>
        </div>

        {/* Drawer overlay */}
        {drawerOpen && (
          <>
            <div
              onClick={() => setDrawerOpen(false)}
              style={{
                position: "fixed",
                inset: 0,
                zIndex: 150,
                background: "rgba(0,0,0,0.5)",
                backdropFilter: "blur(4px)",
              }}
            />
            <div
              style={{
                position: "fixed",
                bottom: 0,
                left: 0,
                right: 0,
                zIndex: 151,
                background: T.barBg,
                borderTop: `2px solid rgba(59,158,255,0.3)`,
                borderRadius: "16px 16px 0 0",
                padding: "20px 16px 32px",
                maxHeight: "80vh",
                overflowY: "auto",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 16,
                }}
              >
                <span
                  style={{
                    fontFamily: "Syne, sans-serif",
                    fontWeight: 800,
                    fontSize: 16,
                    color: "var(--text-primary)",
                  }}
                >
                  Filters
                </span>
                <button
                  onClick={() => setDrawerOpen(false)}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    border: `1px solid ${T.barBorder}`,
                    background: T.searchBg,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: T.groupLabel,
                  }}
                >
                  <X size={15} />
                </button>
              </div>
              {filtersContent}
            </div>
          </>
        )}
      </>
    );
  }

  // ── Desktop: sticky bar ───────────────────────────────────────
  return (
    <div
      style={{
        position: "sticky",
        top: 60,
        zIndex: 90,
        background: T.barBg,
        backdropFilter: "blur(20px)",
        borderBottom: `1px solid ${T.barBorder}`,
        padding: "10px 24px",
      }}
    >
      {filtersContent}
    </div>
  );
}
