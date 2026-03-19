'use client';
// /app/page.tsx — BoxBoxBoard main page

import { useState, useEffect, useCallback } from 'react';
import { Info, Coffee, Heart, LayoutGrid, LayoutList, CalendarClock, ExternalLink, ChevronDown, User, Menu, X as XIcon } from 'lucide-react';
import SeriesCard from '../components/SeriesCard';
import FiltersBar from '../components/FiltersBar';
import LoginModal from '../components/LoginModal';
import SeriesDetailPanel from '../components/SeriesDetailPanel';
import ThemeToggle from '../components/ThemeToggle';
import LangToggle from '../components/LangToggle';
import DriverStats from '../components/DriverStats';
import CompareBar from '../components/CompareBar';
import CalendarView from '../components/CalendarView';
import ScheduleView from '../components/ScheduleView';
import WeekChangeBanner from '../components/WeekChangeBanner';
import InstallBanner from '../components/InstallBanner';
import { useBreakpoint } from '../lib/useBreakpoint';
import { useT } from '../lib/i18n';
import type { SeriesSeason, FilterState, SeasonInfo, AppUser } from '../types/iracing';
import { getSeasonList, getSeriesSeasons, getFavoriteSeriesIds, getMemberInfo } from '../lib/iracing-client';
import { useTheme } from '../lib/theme';

function SkeletonCard() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const shimA = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';
  const shimB = isDark ? 'rgba(255,255,255,0.09)' : 'rgba(0,0,0,0.08)';
  const headerBg = isDark ? 'linear-gradient(135deg, #0E2A4A 0%, #070F1C 100%)' : 'linear-gradient(135deg, #EBF4FF 0%, #F0F7FF 100%)';
  const border = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.08)';
  const footerBg = isDark ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.03)';

  return (
    <div style={{
      background: 'var(--bg-surface)', border: `1px solid ${border}`,
      borderRadius: 16, overflow: 'hidden',
    }}>
      <div style={{ background: headerBg, padding: '18px 18px 16px' }}>
        <div style={{ height: 12, width: 80, borderRadius: 6, background: shimA, marginBottom: 14 }} />
        <div style={{ height: 22, width: '70%', borderRadius: 6, background: shimB, marginBottom: 14 }} />
        <div style={{ display: 'flex', gap: 8 }}>
          {[60, 72, 80].map((w, i) => (
            <div key={i} style={{ height: 26, width: w, borderRadius: 20, background: shimA }} />
          ))}
        </div>
      </div>
      <div style={{ padding: '14px 18px 16px' }}>
        {[1,2,3,4].map(i => (
          <div key={i} style={{ height: 34, borderRadius: 8, background: shimA, marginBottom: i < 4 ? 4 : 0 }} />
        ))}
      </div>
      <div style={{ display: 'flex', borderTop: `1px solid ${border}`, background: footerBg }}>
        {[1,2,3].map(i => (
          <div key={i} style={{ flex: 1, padding: '11px 14px', borderRight: i < 3 ? `1px solid ${border}` : 'none' }}>
            <div style={{ height: 10, width: 50, borderRadius: 4, background: shimA, marginBottom: 6 }} />
            <div style={{ height: 15, width: 35, borderRadius: 4, background: shimB }} />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function HomePage() {
  const [seasons, setSeasons]             = useState<SeasonInfo[]>([]);
  const [currentSeason, setCurrentSeason] = useState<SeasonInfo | null>(null);
  const [series, setSeries]               = useState<SeriesSeason[]>([]);
  const [loading, setLoading]             = useState(true);
  const [favorites, setFavorites]         = useState<number[]>([]);
  const [user, setUser]                   = useState<AppUser | null>(null);
  const [showLogin, setShowLogin]         = useState(false);
  const [selectedSeries, setSelectedSeries] = useState<SeriesSeason | null>(null);
  const [comparingSeries, setComparingSeries] = useState<SeriesSeason[]>([]);
  const [scheduledIds, setScheduledIds] = useState<number[]>(() => {
    try { return JSON.parse(localStorage.getItem('boxboxboard_schedule') ?? '[]'); } catch { return []; }
  });
  const [viewMode, setViewMode] = useState<'grid' | 'calendar' | 'schedule'>('grid');
  const [menuOpen, setMenuOpen] = useState(false);
  const bp = useBreakpoint();
  const isMobile = bp === 'mobile';
  const isTablet = bp === 'tablet';
  const [activeSection, setActiveSection] = useState<'all' | 'favorites' | 'myContent'>('all');
  const [filters, setFilters] = useState<FilterState>({
    categories: [], licenses: [], statuses: [],
    favoritesOnly: false, ownedOnly: false, searchQuery: '', myLicense: null,
  });

  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { t } = useT();
  const T = {
    border:      isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.08)',
    cardBg:      isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
    cardBorder:  isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.09)',
    textMuted:   isDark ? '#64748B'                : '#94A3B8',
    textFaint:   isDark ? '#334155'                : '#94A3B8',
    textDimmed:  isDark ? '#1E293B'                : '#CBD5E1',
    footerBg:    isDark ? 'rgba(0,0,0,0.3)'        : 'rgba(0,0,0,0.04)',
    divider:     isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.07)',
    emptyIcon:   isDark ? '#334155'                : '#CBD5E1',
    emptyTitle:  isDark ? '#475569'                : '#94A3B8',
    emptyText:   isDark ? '#334155'                : '#CBD5E1',
    btnBorder:   isDark ? 'rgba(255,255,255,0.1)'  : 'rgba(0,0,0,0.12)',
    btnColor:    isDark ? '#64748B'                : '#94A3B8',
  };

  // Derive auto-license from connected account (highest level across categories)
  const autoLicense: number | null | undefined = user
    ? (() => {
        const lics = (user as any).licenses as any[] | undefined;
        if (!lics?.length) return null;
        return Math.max(...lics.map((l: any) => l.license_level ?? 0)) as number;
      })()
    : undefined; // undefined = no account → show manual selector

  // Effective license for eligibility badge
  const effectiveLicense: number | null = autoLicense !== undefined ? autoLicense : (filters.myLicense ?? null);

  useEffect(() => {
    // Detect session from URL params (just after OAuth callback)
    const params = new URLSearchParams(window.location.search);
    if (params.get('auth') === 'success') {
      const name = document.cookie.match(/iracing_display_name=([^;]+)/)?.[1];
      const cid  = document.cookie.match(/iracing_cust_id=([^;]+)/)?.[1];
      if (name) setUser({ display_name: decodeURIComponent(name), cust_id: Number(cid) } as unknown as AppUser);
      window.history.replaceState({}, '', '/app');
    } else if (params.get('auth_error')) {
      console.error('Auth error:', params.get('auth_error'));
      window.history.replaceState({}, '', '/app');
      return;
    } else {
      // Detect persistent session from cookies (page refresh, back navigation)
      const name = document.cookie.match(/iracing_display_name=([^;]+)/)?.[1];
      const cid  = document.cookie.match(/iracing_cust_id=([^;]+)/)?.[1];
      if (name) setUser({ display_name: decodeURIComponent(name), cust_id: Number(cid) } as unknown as AppUser);
    }
  }, []);

  // Fetch real member info (licenses, iRating, SR) once session is detected
  useEffect(() => {
    if (!user) return;
    console.log('[BoxBoxBoard] Fetching member info for:', user.display_name);
    getMemberInfo().then(member => {
      console.log('[BoxBoxBoard] getMemberInfo result:', member);
      if (member) setUser(member as unknown as AppUser);
    }).catch(e => console.error('[BoxBoxBoard] getMemberInfo failed:', e));
  }, [user?.cust_id]);

  // Open panel from URL param ?series=ID once series data is loaded
  useEffect(() => {
    if (series.length === 0) return;
    const params = new URLSearchParams(window.location.search);
    const seriesId = params.get('series');
    if (seriesId) {
      const found = series.find(s => s.series_id === Number(seriesId));
      if (found) setSelectedSeries(found);
    }
  }, [series]);

  // Sync URL when panel opens/closes
  function openSeries(s: SeriesSeason) {
    setSelectedSeries(s);
    const url = new URL(window.location.href);
    url.searchParams.set('series', String(s.series_id));
    window.history.pushState({}, '', url.toString());
  }

  function closeSeries() {
    setSelectedSeries(null);
    const url = new URL(window.location.href);
    url.searchParams.delete('series');
    window.history.replaceState({}, '', url.toString());
  }

  function toggleCompare(s: SeriesSeason) {
    setComparingSeries(prev => {
      const exists = prev.find(x => x.series_id === s.series_id);
      if (exists) return prev.filter(x => x.series_id !== s.series_id);
      if (prev.length >= 3) return prev; // max 3
      return [...prev, s];
    });
  }

  function toggleSchedule(id: number) {
    setScheduledIds(prev => {
      const next = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id];
      try { localStorage.setItem('boxboxboard_schedule', JSON.stringify(next)); } catch {}
      return next;
    });
  }

  useEffect(() => {
    async function init() {
      const [seasonList, favs] = await Promise.all([
        getSeasonList(),
        Promise.resolve(getFavoriteSeriesIds()),
      ]);
      setSeasons(seasonList);
      setFavorites(favs);
      const active = seasonList.find(s => s.active) ?? seasonList[0];
      setCurrentSeason(active);
    }
    init();
  }, []);

  useEffect(() => {
    if (!currentSeason) return;
    setLoading(true);
    getSeriesSeasons(currentSeason.season_year, currentSeason.season_quarter)
      .then(data => setSeries(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [currentSeason]);

  const displayed = useCallback(() => {
    return series.filter(s => {
      if (filters.categories.length && !filters.categories.includes(s.category as never)) return false;
      if (filters.licenses.length   && !filters.licenses.includes((s.minLicenseLevel ?? 0) as never)) return false;
      if (filters.statuses.length   && !filters.statuses.includes(s.status as never)) return false;
      if (filters.favoritesOnly     && !favorites.includes(s.series_id)) return false;
      if (filters.ownedOnly         && !s.isOwned) return false;
      if (filters.searchQuery) {
        const q = filters.searchQuery.toLowerCase();
        if (!s.series_name.toLowerCase().includes(q) &&
            !(s.series_short_name ?? '').toLowerCase().includes(q)) return false;
      }
      if (activeSection === 'favorites' && !favorites.includes(s.series_id)) return false;
      if (activeSection === 'myContent' && !s.isOwned) return false;
      return true;
    });
  }, [series, filters, favorites, activeSection])();

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)', color: 'var(--text-primary)', display: 'flex', flexDirection: 'column' }}>

      {/* ════════════════════════════════════════════════════════
          HEADER
      ════════════════════════════════════════════════════════ */}
      <header style={{
        position: 'fixed', top: 0, left: 0, right: 0, height: 64, zIndex: 100,
        background: 'var(--bg-header)', backdropFilter: 'blur(20px)',
        borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center',
        padding: '0 16px', gap: 0,
      }}>
        {/* Logo */}
        <a href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', flexShrink: 0 }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, background: 'linear-gradient(135deg, #3B9EFF 0%, #A855F7 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Syne, sans-serif', fontWeight: 900, fontSize: 13, color: 'white', boxShadow: '0 0 20px rgba(59,158,255,0.3)' }}>B3</div>
          {!isMobile && <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 900, fontSize: 20, color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>BoxBoxBoard</span>}
        </a>

        {/* Season selector — hidden on mobile or when only one season */}
        {!isMobile && seasons.length > 1 && (
          <>
            <div style={{ width: 1, height: 28, background: 'var(--border)', margin: '0 20px', flexShrink: 0 }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 2, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: 4 }}>
              {seasons.map(s => {
                const active = currentSeason?.season_year === s.season_year && currentSeason?.season_quarter === s.season_quarter;
                return (
                  <button key={`${s.season_year}-${s.season_quarter}`} onClick={() => setCurrentSeason(s)} style={{ padding: '6px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 13, background: active ? 'rgba(59,158,255,0.18)' : 'transparent', color: active ? '#3B9EFF' : '#64748B', transition: 'all 0.15s', whiteSpace: 'nowrap' }}>
                    {s.label}
                  </button>
                );
              })}
            </div>
          </>
        )}

        <div style={{ flex: 1 }} />

        {/* Desktop nav */}
        {!isMobile && !isTablet && (
          <nav style={{ display: 'flex', gap: 4, marginRight: 12 }}>
            {([
              { id: 'favorites', label: t.favorites,  icon: <Heart size={14} /> },
              { id: 'myContent', label: t.myContent,  icon: <LayoutGrid size={14} /> },
            ] as const).map(item => {
              const active = activeSection === item.id;
              return (
                <button key={item.id} onClick={() => setActiveSection(activeSection === item.id ? 'all' : item.id)} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '8px 14px', borderRadius: 10, border: 'none', cursor: 'pointer', fontFamily: 'Syne, sans-serif', fontWeight: 600, fontSize: 13, background: active ? 'rgba(59,158,255,0.12)' : 'transparent', color: active ? '#3B9EFF' : '#64748B', transition: 'all 0.15s' }}>
                  {item.icon} {item.label}
                </button>
              );
            })}
          </nav>
        )}

        {/* Desktop: Ko-fi + toggles + login */}
        {!isMobile && (
          <>
            {!isTablet && (
              <button onClick={() => window.open('https://ko-fi.com', '_blank')} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '8px 14px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg-card)', cursor: 'pointer', fontFamily: 'Syne, sans-serif', fontWeight: 600, fontSize: 13, color: 'var(--text-muted)', marginRight: 10, transition: 'all 0.15s' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#FB923C'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(251,146,60,0.3)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'; (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'; }}
              >
                <Coffee size={14} /> {t.support}
              </button>
            )}
            <LangToggle />
            <div style={{ width: 6 }} />
            <ThemeToggle />
            <div style={{ width: 6 }} />
            {user ? (
              <DriverStats user={user} memberSince={(user as any).member_since} onLogout={() => window.location.href = '/api/auth/logout'} />
            ) : (
              <button onClick={() => setShowLogin(true)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 18px', borderRadius: 10, border: 'none', cursor: 'pointer', fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 13, background: 'linear-gradient(135deg, #3B9EFF, #2563EB)', color: 'white', boxShadow: '0 0 20px rgba(59,158,255,0.25)' }}>
                <User size={14} /> {t.connectIRacing}
              </button>
            )}
          </>
        )}

        {/* Mobile: toggles + hamburger */}
        {isMobile && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <LangToggle />
            <ThemeToggle />
            <button onClick={() => setMenuOpen(o => !o)} style={{ width: 36, height: 36, borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg-card)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
              {menuOpen ? <XIcon size={16} /> : <Menu size={16} />}
            </button>
          </div>
        )}
      </header>

      {/* Mobile menu drawer */}
      {isMobile && menuOpen && (
        <div style={{ position: 'fixed', top: 64, left: 0, right: 0, bottom: 0, zIndex: 99, background: 'var(--bg-base)', overflowY: 'auto', padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Season selector — only show if multiple seasons */}
          {seasons.length > 1 && (
            <div>
              <p style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.12em', margin: '0 0 8px' }}>{t.season}</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {seasons.map(s => {
                  const active = currentSeason?.season_year === s.season_year && currentSeason?.season_quarter === s.season_quarter;
                  return (
                    <button key={`${s.season_year}-${s.season_quarter}`} onClick={() => { setCurrentSeason(s); setMenuOpen(false); }} style={{ padding: '8px 16px', borderRadius: 10, border: `1px solid ${active ? 'rgba(59,158,255,0.4)' : 'var(--border)'}`, background: active ? 'rgba(59,158,255,0.12)' : 'var(--bg-card)', color: active ? '#3B9EFF' : 'var(--text-muted)', fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
                      {s.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div style={{ height: 1, background: 'var(--border)' }} />

          {/* Nav sections */}
          {([
            { id: 'all',        label: t.cards,      icon: <LayoutGrid size={16} /> },
            { id: 'favorites',  label: t.favorites,  icon: <Heart size={16} /> },
            { id: 'myContent',  label: t.myContent,  icon: <LayoutGrid size={16} /> },
          ] as const).map(item => (
            <button key={item.id} onClick={() => { setActiveSection(item.id === 'all' ? 'all' : item.id as any); setMenuOpen(false); }} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderRadius: 12, border: `1px solid ${activeSection === item.id ? 'rgba(59,158,255,0.3)' : 'var(--border)'}`, background: activeSection === item.id ? 'rgba(59,158,255,0.08)' : 'var(--bg-card)', color: activeSection === item.id ? '#3B9EFF' : 'var(--text-primary)', fontFamily: 'Syne, sans-serif', fontWeight: 600, fontSize: 15, cursor: 'pointer', textAlign: 'left' }}>
              {item.icon} {item.label}
            </button>
          ))}

          <div style={{ height: 1, background: 'var(--border)' }} />

          {/* Language toggle */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{t.languageLabel}</span>
            <LangToggle />
          </div>

          {/* Login button */}
          {user ? (
            <button onClick={() => window.location.href = '/api/auth/logout'} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '14px', borderRadius: 12, border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.08)', color: '#EF4444', fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>
              {t.logout}
            </button>
          ) : (
            <button onClick={() => { setShowLogin(true); setMenuOpen(false); }} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '14px', borderRadius: 12, background: 'linear-gradient(135deg, #3B9EFF, #2563EB)', color: 'white', fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 15, border: 'none', cursor: 'pointer' }}>
              <User size={16} /> {t.connectIRacing}
            </button>
          )}
        </div>
      )}

      {/* ── CONNECT BANNER ─────────────────────────────────────── */}
      {!user && (
        <div style={{
          marginTop: 64, background: 'rgba(59,158,255,0.06)',
          borderBottom: '1px solid rgba(59,158,255,0.12)',
          padding: '10px 24px', display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <Info size={14} color="#3B9EFF" style={{ flexShrink: 0 }} />
          <span style={{ fontSize: 13, color: '#64748B' }}>
            {t.demoBannerText}
          </span>
          <button
            onClick={() => setShowLogin(true)}
            style={{
              marginLeft: 'auto', fontSize: 13, color: '#3B9EFF',
              background: 'none', border: 'none', cursor: 'pointer',
              fontWeight: 600, textDecoration: 'underline', textUnderlineOffset: 3,
              whiteSpace: 'nowrap',
            }}
          >
            {t.connectIRacing} →
          </button>
        </div>
      )}

      {/* ── FILTERS ─────────────────────────────────────────── */}
      <div style={{ marginTop: user ? 64 : 0 }}>
        <FiltersBar filters={filters} onChange={setFilters} autoLicense={autoLicense as any} />
      </div>

      {/* ════════════════════════════════════════════════════════
          MAIN CONTENT
      ════════════════════════════════════════════════════════ */}
      <main style={{ flex: 1, padding: isMobile ? '16px 12px 48px' : '28px 24px 48px', maxWidth: 1680, margin: '0 auto', width: '100%', paddingBottom: comparingSeries.length > 0 ? 'calc(48px + 60vh)' : isMobile ? '80px' : '48px' }}>

        {/* Título de temporada + toggle de vista */}
        <div style={{ display: 'flex', alignItems: isMobile ? 'flex-start' : 'center', flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? 10 : 14, marginBottom: 24 }}>
          <h1 style={{
            fontFamily: 'Syne, sans-serif', fontSize: isMobile ? 20 : 26, fontWeight: 900,
            color: 'var(--text-primary)', letterSpacing: '-0.5px', margin: 0,
          }}>
            {currentSeason
              ? `${t.season} ${currentSeason.season_quarter} · ${currentSeason.season_year}`
              : t.loading}
          </h1>
          <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 13, color: T.textFaint }}>
            {loading ? '' : `${displayed.length} series`}
          </span>
          {!loading && (
            <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, fontWeight: 600, color: '#22C55E', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)', borderRadius: 6, padding: '2px 8px', letterSpacing: '0.1em' }}>
              {t.live}
            </span>
          )}
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 2, background: T.cardBg, border: `1px solid ${T.cardBorder}`, borderRadius: 10, padding: 3 }}>
            {([
              { mode: 'grid',     icon: <LayoutGrid size={15} />,     label: t.cards    },
              { mode: 'calendar', icon: <LayoutList size={15} />,     label: t.calendar },
              { mode: 'schedule', icon: <CalendarClock size={15} />,  label: t.schedule, badge: scheduledIds.length || undefined },
            ] as const).map(v => (
              <button key={v.mode} onClick={() => setViewMode(v.mode)} title={v.label} style={{
                display: 'flex', alignItems: 'center', gap: isMobile ? 0 : 6,
                padding: isMobile ? '6px 10px' : '6px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
                background: viewMode === v.mode ? (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)') : 'transparent',
                color: viewMode === v.mode ? 'var(--text-primary)' : T.textFaint,
                fontFamily: 'Syne, sans-serif', fontWeight: 600, fontSize: 13,
                transition: 'all 0.15s', position: 'relative',
              }}>
                {v.icon}
                {!isMobile && v.label}
                {'badge' in v && v.badge ? (
                  <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 16, height: 16, borderRadius: '50%', background: '#A855F7', color: 'white', fontSize: 9, fontWeight: 800, fontFamily: 'DM Mono, monospace' }}>
                    {v.badge}
                  </span>
                ) : null}
              </button>
            ))}
          </div>
        </div>

        {/* Schedule view */}
        {viewMode === 'schedule' && !loading && (
          <ScheduleView
            series={series}
            scheduledIds={scheduledIds}
            onRemove={id => toggleSchedule(id)}
            onSeriesClick={s => openSeries(s)}
          />
        )}

        {/* Calendar view */}
        {viewMode === 'calendar' && !loading && (
          <CalendarView series={series} onSeriesClick={s => openSeries(s)} />
        )}

        {/* Grid view */}
        {viewMode === 'grid' && <div style={{ display: 'grid', gap: isMobile ? 12 : 16, gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(400px, 1fr))' }}>
          {loading
            ? Array(6).fill(0).map((_, i) => <SkeletonCard key={i} />)
            : displayed.length === 0
            ? (
              <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '96px 0', gap: 16, textAlign: 'center' }}>
                <div style={{
                  width: 72, height: 72, borderRadius: 20,
                  background: T.cardBg, border: `1px solid ${T.cardBorder}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.emptyIcon,
                }}>
                  <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                  </svg>
                </div>
                <p style={{ fontFamily: 'Syne, sans-serif', fontSize: 20, fontWeight: 800, color: T.emptyTitle, margin: 0 }}>
                  No series found
                </p>
                <p style={{ fontSize: 14, color: T.emptyText, margin: 0 }}>
                  Try adjusting or resetting your filters.
                </p>
                <button
                  onClick={() => setFilters({ categories: [], licenses: [], statuses: [], favoritesOnly: false, ownedOnly: false, searchQuery: '', myLicense: null })}
                  style={{
                    marginTop: 8, padding: '10px 20px', borderRadius: 10,
                    border: `1px solid ${T.btnBorder}`, background: 'transparent',
                    color: T.btnColor, cursor: 'pointer', fontSize: 14,
                    fontFamily: 'Syne, sans-serif', fontWeight: 600,
                  }}
                >
                  Reset Filters
                </button>
              </div>
            )
            : displayed.map(s => (
              <SeriesCard
                key={s.season_id}
                series={s}
                isFavorite={favorites.includes(s.series_id)}
                isComparing={comparingSeries.some(x => x.series_id === s.series_id)}
                isScheduled={scheduledIds.includes(s.series_id)}
                isEligible={effectiveLicense !== null && (s.minLicenseLevel ?? 0) <= effectiveLicense}
                onFavoriteToggle={(_, newFavs) => setFavorites(newFavs)}
                onClick={() => openSeries(s)}
                onCompare={() => toggleCompare(s)}
                onSchedule={() => toggleSchedule(s.series_id)}
              />
            ))
          }
        </div>}
      </main>

      {/* ════════════════════════════════════════════════════════
          FOOTER
      ════════════════════════════════════════════════════════ */}
      <footer style={{
        borderTop: `1px solid ${T.border}`,
        background: T.footerBg,
        padding: '32px 24px',
      }}>
        <div style={{ maxWidth: 1680, margin: '0 auto' }}>

          {/* Fila principal */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 32, flexWrap: 'wrap', marginBottom: 28 }}>

            {/* Logo + descripción */}
            <div style={{ maxWidth: 280 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <div style={{
                  width: 30, height: 30, borderRadius: 8,
                  background: 'linear-gradient(135deg, #3B9EFF, #A855F7)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'Syne, sans-serif', fontWeight: 900, fontSize: 12, color: 'white',
                }}>
                  PB
                </div>
                <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 900, fontSize: 17, color: 'var(--text-primary)' }}>
                  BoxBoxBoard
                </span>
              </div>
              <p style={{ fontSize: 13, color: T.textFaint, lineHeight: 1.6, margin: 0 }}>
                {t.footerDesc}
              </p>
            </div>

            {/* Links */}
            <div style={{ display: 'flex', gap: 48, flexWrap: 'wrap' }}>
              <div>
                <p style={{
                  fontFamily: 'DM Mono, monospace', fontSize: 10, fontWeight: 600,
                  color: T.textDimmed, textTransform: 'uppercase', letterSpacing: '0.14em',
                  margin: '0 0 12px',
                }}>
                  {t.project}
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <a href="https://ko-fi.com" target="_blank" rel="noopener noreferrer" style={{
                    display: 'flex', alignItems: 'center', gap: 7,
                    fontSize: 13, color: T.textMuted, textDecoration: 'none', transition: 'color 0.15s',
                  }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)'}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = T.textMuted}
                  >
                    <Coffee size={13} /> Ko-fi
                  </a>
                </div>
              </div>

              <div>
                <p style={{
                  fontFamily: 'DM Mono, monospace', fontSize: 10, fontWeight: 600,
                  color: T.textDimmed, textTransform: 'uppercase', letterSpacing: '0.14em',
                  margin: '0 0 12px',
                }}>
                  iRacing
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {[
                    { label: 'iRacing.com', href: 'https://www.iracing.com' },
                    { label: 'Members Site', href: 'https://members.iracing.com' },
                    { label: 'API Docs', href: 'https://members-ng.iracing.com/data/doc' },
                  ].map(link => (
                    <a key={link.label} href={link.href} target="_blank" rel="noopener noreferrer" style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      fontSize: 13, color: T.textMuted, textDecoration: 'none',
                      transition: 'color 0.15s',
                    }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)'}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = T.textMuted}
                    >
                      <ExternalLink size={11} /> {link.label}
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Divisor */}
          <div style={{ height: 1, background: T.divider, marginBottom: 20 }} />

          {/* Legal disclaimer */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
            <p style={{ fontSize: 12, color: T.textDimmed, margin: 0, lineHeight: 1.5 }}>
              {t.notAffiliated}
            </p>
            <p style={{ fontSize: 12, color: T.textDimmed, margin: 0, whiteSpace: 'nowrap' }}>
              {t.madeBy}
            </p>
          </div>
        </div>
      </footer>

      {showLogin && <LoginModal onClose={() => setShowLogin(false)} />}

      <SeriesDetailPanel
        series={selectedSeries}
        isFavorite={selectedSeries ? favorites.includes(selectedSeries.series_id) : false}
        onClose={() => closeSeries()}
        onFavoriteToggle={(_, newFavs) => setFavorites(newFavs)}
      />

      <WeekChangeBanner
        series={series}
        scheduledIds={scheduledIds}
        seasonYear={currentSeason?.season_year ?? 0}
        seasonQuarter={currentSeason?.season_quarter ?? 0}
      />

      <CompareBar
        series={comparingSeries}
        onRemove={id => setComparingSeries(prev => prev.filter(x => x.series_id !== id))}
        onClear={() => setComparingSeries([])}
      />

      <InstallBanner />

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;700;800;900&family=DM+Mono:wght@400;500;600&family=DM+Sans:wght@300;400;500&display=swap');
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #0F1623; border-radius: 3px; }
      `}</style>
    </div>
  );
}