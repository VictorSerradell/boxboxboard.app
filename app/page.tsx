"use client";
// /app/page.tsx — PitBoard main page

import { useState, useEffect, useCallback } from "react";
import {
  Info,
  Coffee,
  Heart,
  LayoutGrid,
  Github,
  ExternalLink,
  ChevronDown,
  User,
} from "lucide-react";
import SeriesCard from "./components/SeriesCard";
import FiltersBar from "./components/FiltersBar";
import LoginModal from "./components/LoginModal";
import type {
  SeriesSeason,
  FilterState,
  SeasonInfo,
  AppUser,
} from "./types/iracing";
import {
  getSeasonList,
  getSeriesSeasons,
  getFavoriteSeriesIds,
} from "./lib/iracing-client";

function SkeletonCard() {
  return (
    <div
      style={{
        background: "#070D19",
        border: "1px solid rgba(255,255,255,0.07)",
        borderRadius: 16,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          background: "linear-gradient(135deg, #0E2A4A 0%, #070F1C 100%)",
          padding: "18px 18px 16px",
        }}
      >
        <div
          style={{
            height: 12,
            width: 80,
            borderRadius: 6,
            background: "rgba(255,255,255,0.07)",
            marginBottom: 14,
          }}
        />
        <div
          style={{
            height: 22,
            width: "70%",
            borderRadius: 6,
            background: "rgba(255,255,255,0.09)",
            marginBottom: 14,
          }}
        />
        <div style={{ display: "flex", gap: 8 }}>
          {[60, 72, 80].map((w, i) => (
            <div
              key={i}
              style={{
                height: 26,
                width: w,
                borderRadius: 20,
                background: "rgba(255,255,255,0.07)",
              }}
            />
          ))}
        </div>
      </div>
      <div style={{ padding: "14px 18px 16px" }}>
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            style={{
              height: 34,
              borderRadius: 8,
              background: "rgba(255,255,255,0.04)",
              marginBottom: i < 4 ? 4 : 0,
            }}
          />
        ))}
      </div>
      <div
        style={{
          display: "flex",
          borderTop: "1px solid rgba(255,255,255,0.06)",
          background: "rgba(0,0,0,0.3)",
        }}
      >
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            style={{
              flex: 1,
              padding: "11px 14px",
              borderRight: i < 3 ? "1px solid rgba(255,255,255,0.06)" : "none",
            }}
          >
            <div
              style={{
                height: 10,
                width: 50,
                borderRadius: 4,
                background: "rgba(255,255,255,0.06)",
                marginBottom: 6,
              }}
            />
            <div
              style={{
                height: 15,
                width: 35,
                borderRadius: 4,
                background: "rgba(255,255,255,0.09)",
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function HomePage() {
  const [seasons, setSeasons] = useState<SeasonInfo[]>([]);
  const [currentSeason, setCurrentSeason] = useState<SeasonInfo | null>(null);
  const [series, setSeries] = useState<SeriesSeason[]>([]);
  const [loading, setLoading] = useState(true);
  const [favorites, setFavorites] = useState<number[]>([]);
  const [user, setUser] = useState<AppUser | null>(null);
  const [showLogin, setShowLogin] = useState(false);
  const [activeSection, setActiveSection] = useState<
    "all" | "favorites" | "myContent"
  >("all");
  const [filters, setFilters] = useState<FilterState>({
    categories: [],
    licenses: [],
    statuses: [],
    favoritesOnly: false,
    ownedOnly: false,
    searchQuery: "",
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("auth") === "success") {
      const name = document.cookie.match(/iracing_display_name=([^;]+)/)?.[1];
      const cid = document.cookie.match(/iracing_cust_id=([^;]+)/)?.[1];
      if (name)
        setUser({
          display_name: decodeURIComponent(name),
          cust_id: Number(cid),
        } as unknown as AppUser);
      window.history.replaceState({}, "", "/");
    }
    if (params.get("auth_error")) {
      console.error("Auth error:", params.get("auth_error"));
      window.history.replaceState({}, "", "/");
    }
  }, []);

  useEffect(() => {
    async function init() {
      const [seasonList, favs] = await Promise.all([
        getSeasonList(),
        Promise.resolve(getFavoriteSeriesIds()),
      ]);
      setSeasons(seasonList);
      setFavorites(favs);
      const active = seasonList.find((s) => s.active) ?? seasonList[0];
      setCurrentSeason(active);
    }
    init();
  }, []);

  useEffect(() => {
    if (!currentSeason) return;
    setLoading(true);
    getSeriesSeasons(currentSeason.season_year, currentSeason.season_quarter)
      .then((data) => setSeries(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [currentSeason]);

  const displayed = useCallback(() => {
    return series.filter((s) => {
      if (
        filters.categories.length &&
        !filters.categories.includes(s.category as never)
      )
        return false;
      if (
        filters.licenses.length &&
        !filters.licenses.includes((s.minLicenseLevel ?? 0) as never)
      )
        return false;
      if (
        filters.statuses.length &&
        !filters.statuses.includes(s.status as never)
      )
        return false;
      if (filters.favoritesOnly && !favorites.includes(s.series_id))
        return false;
      if (filters.ownedOnly && !s.isOwned) return false;
      if (filters.searchQuery) {
        const q = filters.searchQuery.toLowerCase();
        if (
          !s.series_name.toLowerCase().includes(q) &&
          !(s.series_short_name ?? "").toLowerCase().includes(q)
        )
          return false;
      }
      if (activeSection === "favorites" && !favorites.includes(s.series_id))
        return false;
      if (activeSection === "myContent" && !s.isOwned) return false;
      return true;
    });
  }, [series, filters, favorites, activeSection])();

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#060C18",
        color: "white",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* ════════════════════════════════════════════════════════
          HEADER
      ════════════════════════════════════════════════════════ */}
      <header
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          height: 64,
          zIndex: 100,
          background: "rgba(6,12,24,0.92)",
          backdropFilter: "blur(20px)",
          borderBottom: "1px solid rgba(255,255,255,0.07)",
          display: "flex",
          alignItems: "center",
          padding: "0 24px",
          gap: 0,
        }}
      >
        {/* Logo */}
        <a
          href="/"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            textDecoration: "none",
            marginRight: 32,
            flexShrink: 0,
          }}
        >
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: 10,
              background: "linear-gradient(135deg, #3B9EFF 0%, #A855F7 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: "Syne, sans-serif",
              fontWeight: 900,
              fontSize: 13,
              color: "white",
              letterSpacing: "-0.5px",
              boxShadow: "0 0 20px rgba(59,158,255,0.3)",
            }}
          >
            PB
          </div>
          <span
            style={{
              fontFamily: "Syne, sans-serif",
              fontWeight: 900,
              fontSize: 20,
              color: "white",
              letterSpacing: "-0.5px",
            }}
          >
            PitBoard
          </span>
        </a>

        {/* Divisor */}
        <div
          style={{
            width: 1,
            height: 28,
            background: "rgba(255,255,255,0.1)",
            marginRight: 24,
            flexShrink: 0,
          }}
        />

        {/* Season selector */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 2,
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 12,
            padding: 4,
          }}
        >
          {seasons.map((s) => {
            const active =
              currentSeason?.season_year === s.season_year &&
              currentSeason?.season_quarter === s.season_quarter;
            return (
              <button
                key={`${s.season_year}-${s.season_quarter}`}
                onClick={() => setCurrentSeason(s)}
                style={{
                  padding: "6px 14px",
                  borderRadius: 8,
                  border: "none",
                  cursor: "pointer",
                  fontFamily: "Syne, sans-serif",
                  fontWeight: 700,
                  fontSize: 13,
                  background: active ? "rgba(59,158,255,0.18)" : "transparent",
                  color: active ? "#3B9EFF" : "#64748B",
                  transition: "all 0.15s",
                  whiteSpace: "nowrap",
                }}
              >
                {s.label}
              </button>
            );
          })}
        </div>

        <div style={{ flex: 1 }} />

        {/* Nav — Favorites / My Content */}
        <nav style={{ display: "flex", gap: 4, marginRight: 16 }}>
          {(
            [
              {
                id: "favorites",
                label: "Favorites",
                icon: <Heart size={14} />,
              },
              {
                id: "myContent",
                label: "My Content",
                icon: <LayoutGrid size={14} />,
              },
            ] as const
          ).map((item) => {
            const active = activeSection === item.id;
            return (
              <button
                key={item.id}
                onClick={() =>
                  setActiveSection(activeSection === item.id ? "all" : item.id)
                }
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 7,
                  padding: "8px 16px",
                  borderRadius: 10,
                  border: "none",
                  cursor: "pointer",
                  fontFamily: "Syne, sans-serif",
                  fontWeight: 600,
                  fontSize: 13,
                  background: active ? "rgba(59,158,255,0.12)" : "transparent",
                  color: active ? "#3B9EFF" : "#64748B",
                  transition: "all 0.15s",
                }}
                onMouseEnter={(e) => {
                  if (!active)
                    (e.currentTarget as HTMLElement).style.color = "#CBD5E1";
                }}
                onMouseLeave={(e) => {
                  if (!active)
                    (e.currentTarget as HTMLElement).style.color = "#64748B";
                }}
              >
                {item.icon} {item.label}
              </button>
            );
          })}
        </nav>

        {/* Ko-fi — sobrio, sin gradiente llamativo */}
        <button
          onClick={() => window.open("https://ko-fi.com", "_blank")}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 7,
            padding: "8px 14px",
            borderRadius: 10,
            border: "1px solid rgba(255,255,255,0.1)",
            background: "rgba(255,255,255,0.05)",
            cursor: "pointer",
            fontFamily: "Syne, sans-serif",
            fontWeight: 600,
            fontSize: 13,
            color: "#94A3B8",
            marginRight: 10,
            transition: "all 0.15s",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.color = "#FB923C";
            (e.currentTarget as HTMLElement).style.borderColor =
              "rgba(251,146,60,0.3)";
            (e.currentTarget as HTMLElement).style.background =
              "rgba(251,146,60,0.08)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.color = "#94A3B8";
            (e.currentTarget as HTMLElement).style.borderColor =
              "rgba(255,255,255,0.1)";
            (e.currentTarget as HTMLElement).style.background =
              "rgba(255,255,255,0.05)";
          }}
        >
          <Coffee size={14} /> Support
        </button>

        {/* Login / Username */}
        <button
          onClick={() =>
            user
              ? (window.location.href = "/api/auth/logout")
              : setShowLogin(true)
          }
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 18px",
            borderRadius: 10,
            border: "none",
            cursor: "pointer",
            fontFamily: "Syne, sans-serif",
            fontWeight: 700,
            fontSize: 13,
            background: user
              ? "rgba(34,197,94,0.15)"
              : "linear-gradient(135deg, #3B9EFF, #2563EB)",
            color: user ? "#22C55E" : "white",
            boxShadow: user ? "none" : "0 0 20px rgba(59,158,255,0.25)",
            transition: "all 0.15s",
          }}
        >
          <User size={14} />
          {user ? (user as any).display_name : "Connect iRacing"}
        </button>
      </header>

      {/* ── DEMO BANNER ─────────────────────────────────────── */}
      {!user && (
        <div
          style={{
            marginTop: 64,
            background: "rgba(59,158,255,0.06)",
            borderBottom: "1px solid rgba(59,158,255,0.12)",
            padding: "10px 24px",
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <Info size={14} color="#3B9EFF" style={{ flexShrink: 0 }} />
          <span style={{ fontSize: 13, color: "#64748B" }}>
            Showing <strong style={{ color: "#3B9EFF" }}>demo data</strong> —
            connect your iRacing account for live schedules and owned content.
          </span>
          <button
            onClick={() => setShowLogin(true)}
            style={{
              marginLeft: "auto",
              fontSize: 13,
              color: "#3B9EFF",
              background: "none",
              border: "none",
              cursor: "pointer",
              fontWeight: 600,
              textDecoration: "underline",
              textUnderlineOffset: 3,
              whiteSpace: "nowrap",
            }}
          >
            Connect iRacing →
          </button>
        </div>
      )}

      {/* ── FILTERS ─────────────────────────────────────────── */}
      <div style={{ marginTop: user ? 64 : 0 }}>
        <FiltersBar filters={filters} onChange={setFilters} />
      </div>

      {/* ════════════════════════════════════════════════════════
          MAIN CONTENT
      ════════════════════════════════════════════════════════ */}
      <main
        style={{
          flex: 1,
          padding: "28px 24px 48px",
          maxWidth: 1680,
          margin: "0 auto",
          width: "100%",
        }}
      >
        {/* Título de temporada */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            marginBottom: 24,
          }}
        >
          <h1
            style={{
              fontFamily: "Syne, sans-serif",
              fontSize: 26,
              fontWeight: 900,
              color: "white",
              letterSpacing: "-0.5px",
              margin: 0,
            }}
          >
            {currentSeason
              ? `Season ${currentSeason.season_quarter} · ${currentSeason.season_year}`
              : "Loading..."}
          </h1>
          <span
            style={{
              fontFamily: "DM Mono, monospace",
              fontSize: 13,
              color: "#334155",
            }}
          >
            {loading ? "" : `${displayed.length} series`}
          </span>
          {!loading && (
            <span
              style={{
                fontFamily: "DM Mono, monospace",
                fontSize: 11,
                fontWeight: 600,
                color: "#22C55E",
                background: "rgba(34,197,94,0.1)",
                border: "1px solid rgba(34,197,94,0.25)",
                borderRadius: 6,
                padding: "2px 8px",
                letterSpacing: "0.1em",
              }}
            >
              LIVE
            </span>
          )}
        </div>

        {/* Grid */}
        <div
          style={{
            display: "grid",
            gap: 16,
            gridTemplateColumns: "repeat(auto-fill, minmax(400px, 1fr))",
          }}
        >
          {loading ? (
            Array(6)
              .fill(0)
              .map((_, i) => <SkeletonCard key={i} />)
          ) : displayed.length === 0 ? (
            <div
              style={{
                gridColumn: "1 / -1",
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
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#334155",
                }}
              >
                <svg
                  width="30"
                  height="30"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                >
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.35-4.35" />
                </svg>
              </div>
              <p
                style={{
                  fontFamily: "Syne, sans-serif",
                  fontSize: 20,
                  fontWeight: 800,
                  color: "#475569",
                  margin: 0,
                }}
              >
                No series found
              </p>
              <p style={{ fontSize: 14, color: "#334155", margin: 0 }}>
                Try adjusting or resetting your filters.
              </p>
              <button
                onClick={() =>
                  setFilters({
                    categories: [],
                    licenses: [],
                    statuses: [],
                    favoritesOnly: false,
                    ownedOnly: false,
                    searchQuery: "",
                  })
                }
                style={{
                  marginTop: 8,
                  padding: "10px 20px",
                  borderRadius: 10,
                  border: "1px solid rgba(255,255,255,0.1)",
                  background: "transparent",
                  color: "#64748B",
                  cursor: "pointer",
                  fontSize: 14,
                  fontFamily: "Syne, sans-serif",
                  fontWeight: 600,
                }}
              >
                Reset Filters
              </button>
            </div>
          ) : (
            displayed.map((s) => (
              <SeriesCard
                key={s.season_id}
                series={s}
                isFavorite={favorites.includes(s.series_id)}
                onFavoriteToggle={(_, newFavs) => setFavorites(newFavs)}
              />
            ))
          )}
        </div>
      </main>

      {/* ════════════════════════════════════════════════════════
          FOOTER
      ════════════════════════════════════════════════════════ */}
      <footer
        style={{
          borderTop: "1px solid rgba(255,255,255,0.07)",
          background: "rgba(0,0,0,0.3)",
          padding: "32px 24px",
        }}
      >
        <div style={{ maxWidth: 1680, margin: "0 auto" }}>
          {/* Fila principal */}
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: 32,
              flexWrap: "wrap",
              marginBottom: 28,
            }}
          >
            {/* Logo + descripción */}
            <div style={{ maxWidth: 280 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  marginBottom: 12,
                }}
              >
                <div
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: 8,
                    background: "linear-gradient(135deg, #3B9EFF, #A855F7)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontFamily: "Syne, sans-serif",
                    fontWeight: 900,
                    fontSize: 12,
                    color: "white",
                  }}
                >
                  PB
                </div>
                <span
                  style={{
                    fontFamily: "Syne, sans-serif",
                    fontWeight: 900,
                    fontSize: 17,
                    color: "white",
                  }}
                >
                  PitBoard
                </span>
              </div>
              <p
                style={{
                  fontSize: 13,
                  color: "#334155",
                  lineHeight: 1.6,
                  margin: 0,
                }}
              >
                Season planner and schedule browser for iRacing drivers. Track
                rotations, license requirements, and owned content at a glance.
              </p>
            </div>

            {/* Links */}
            <div style={{ display: "flex", gap: 48, flexWrap: "wrap" }}>
              <div>
                <p
                  style={{
                    fontFamily: "DM Mono, monospace",
                    fontSize: 10,
                    fontWeight: 600,
                    color: "#1E293B",
                    textTransform: "uppercase",
                    letterSpacing: "0.14em",
                    margin: "0 0 12px",
                  }}
                >
                  Project
                </p>
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 8 }}
                >
                  {[
                    {
                      label: "GitHub",
                      href: "https://github.com/VictorSerradell/simplan.app",
                      icon: <Github size={13} />,
                    },
                    {
                      label: "Support on Ko-fi",
                      href: "https://ko-fi.com",
                      icon: <Coffee size={13} />,
                    },
                  ].map((link) => (
                    <a
                      key={link.label}
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 7,
                        fontSize: 13,
                        color: "#475569",
                        textDecoration: "none",
                        transition: "color 0.15s",
                      }}
                      onMouseEnter={(e) =>
                        ((e.currentTarget as HTMLElement).style.color =
                          "#94A3B8")
                      }
                      onMouseLeave={(e) =>
                        ((e.currentTarget as HTMLElement).style.color =
                          "#475569")
                      }
                    >
                      {link.icon} {link.label}
                    </a>
                  ))}
                </div>
              </div>

              <div>
                <p
                  style={{
                    fontFamily: "DM Mono, monospace",
                    fontSize: 10,
                    fontWeight: 600,
                    color: "#1E293B",
                    textTransform: "uppercase",
                    letterSpacing: "0.14em",
                    margin: "0 0 12px",
                  }}
                >
                  iRacing
                </p>
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 8 }}
                >
                  {[
                    { label: "iRacing.com", href: "https://www.iracing.com" },
                    {
                      label: "Members Site",
                      href: "https://members.iracing.com",
                    },
                    {
                      label: "API Docs",
                      href: "https://members-ng.iracing.com/data/doc",
                    },
                  ].map((link) => (
                    <a
                      key={link.label}
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        fontSize: 13,
                        color: "#475569",
                        textDecoration: "none",
                        transition: "color 0.15s",
                      }}
                      onMouseEnter={(e) =>
                        ((e.currentTarget as HTMLElement).style.color =
                          "#94A3B8")
                      }
                      onMouseLeave={(e) =>
                        ((e.currentTarget as HTMLElement).style.color =
                          "#475569")
                      }
                    >
                      <ExternalLink size={11} /> {link.label}
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Divisor */}
          <div
            style={{
              height: 1,
              background: "rgba(255,255,255,0.06)",
              marginBottom: 20,
            }}
          />

          {/* Legal disclaimer */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 16,
              flexWrap: "wrap",
            }}
          >
            <p
              style={{
                fontSize: 12,
                color: "#1E293B",
                margin: 0,
                lineHeight: 1.5,
              }}
            >
              PitBoard is not affiliated with, endorsed by, or associated with
              iRacing.com Motorsport Simulations. iRacing is a registered
              trademark of iRacing.com Motorsport Simulations.
            </p>
            <p
              style={{
                fontSize: 12,
                color: "#1E293B",
                margin: 0,
                whiteSpace: "nowrap",
              }}
            >
              Made with ♥ by Victor
            </p>
          </div>
        </div>
      </footer>

      {showLogin && <LoginModal onClose={() => setShowLogin(false)} />}

      <style jsx global>{`
        @import url("https://fonts.googleapis.com/css2?family=Syne:wght@400;700;800;900&family=DM+Mono:wght@400;500;600&family=DM+Sans:wght@300;400;500&display=swap");
        * {
          box-sizing: border-box;
        }
        ::-webkit-scrollbar {
          width: 6px;
        }
        ::-webkit-scrollbar-track {
          background: transparent;
        }
        ::-webkit-scrollbar-thumb {
          background: #0f1623;
          border-radius: 3px;
        }
      `}</style>
    </div>
  );
}
