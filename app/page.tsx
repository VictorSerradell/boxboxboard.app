'use client';
// /app/page.tsx — SimPlan main page

import { useState, useEffect, useCallback } from 'react';
import { Info, Coffee } from 'lucide-react';
import SeriesCard from './components/SeriesCard';
import FiltersBar from './components/FiltersBar';
import LoginModal from './components/LoginModal';
import type { SeriesSeason, FilterState, SeasonInfo, AppUser } from './types/iracing';
import {
  getSeasonList,
  getSeriesSeasons,
  getFavoriteSeriesIds,
} from './lib/iracing-client';

function SkeletonCard({ delay = 0 }: { delay?: number }) {
  return (
    <div
      className="bg-[#0D1117] border border-white/[0.07] rounded-xl p-[18px]"
      style={{ animationDelay: `${delay}s` }}
    >
      <div className="flex gap-3 mb-3.5">
        <div className="w-10 h-10 rounded-lg skeleton" />
        <div className="flex-1">
          <div className="skeleton h-3.5 w-2/3 rounded mb-2" />
          <div className="flex gap-1">
            <div className="skeleton h-4 w-12 rounded" />
            <div className="skeleton h-4 w-16 rounded" />
          </div>
        </div>
      </div>
      <div className="flex gap-1 mb-3.5 flex-wrap">
        {[72, 80, 64].map((w, i) => (
          <div key={i} className="skeleton h-6 rounded" style={{ width: w }} />
        ))}
      </div>
      <div className="flex gap-2 pt-3 border-t border-white/06">
        <div className="skeleton h-7 flex-1 rounded" />
        <div className="skeleton h-7 flex-1 rounded" />
        <div className="skeleton h-7 flex-1 rounded" />
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
  const [filters, setFilters] = useState<FilterState>({
    categories: [],
    licenses: [],
    statuses: [],
    favoritesOnly: false,
    ownedOnly: false,
    searchQuery: '',
  });
  const [activeSection, setActiveSection] = useState<'all' | 'favorites' | 'myContent'>('all');

  // Load seasons on mount
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

  // Load series when season changes
  useEffect(() => {
    if (!currentSeason) return;
    setLoading(true);
    getSeriesSeasons(currentSeason.season_year, currentSeason.season_quarter)
      .then(data => setSeries(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [currentSeason]);

  const filteredSeries = useCallback(() => {
    return series.filter(s => {
      if (filters.categories.length && !filters.categories.includes(s.category as never)) return false;
      if (filters.licenses.length && !filters.licenses.includes((s.minLicenseLevel ?? 0) as never)) return false;
      if (filters.statuses.length && !filters.statuses.includes(s.status as never)) return false;
      if (filters.favoritesOnly && !favorites.includes(s.series_id)) return false;
      if (filters.ownedOnly && !s.isOwned) return false;
      if (filters.searchQuery) {
        const q = filters.searchQuery.toLowerCase();
        if (!s.series_name.toLowerCase().includes(q) && !(s.series_short_name ?? '').toLowerCase().includes(q)) {
          return false;
        }
      }
      if (activeSection === 'favorites' && !favorites.includes(s.series_id)) return false;
      if (activeSection === 'myContent' && !s.isOwned) return false;
      return true;
    });
  }, [series, filters, favorites, activeSection]);

  const displayed = filteredSeries();

  return (
    <div className="min-h-screen bg-[#080A0E] text-white">
      {/* HEADER */}
      <header className="fixed top-0 left-0 right-0 h-14 bg-[rgba(8,10,14,0.92)] backdrop-blur-xl border-b border-white/06 z-[100] flex items-center px-6 gap-0">
        {/* Logo */}
        <a href="/" className="flex items-center gap-2 mr-8 no-underline">
          <div className="w-7 h-7 rounded-md bg-gradient-to-br from-cyan-400 to-violet-500 flex items-center justify-center font-black text-xs font-mono text-black tracking-tighter">
            SP
          </div>
          <span className="font-black text-[17px] tracking-tight" style={{ fontFamily: 'Syne, sans-serif' }}>
            SimPlan
          </span>
        </a>

        {/* Season selector */}
        <div className="flex items-center gap-0.5 bg-[#111520] border border-white/10 rounded-lg p-1 h-[34px]">
          {seasons.map(s => (
            <button
              key={`${s.season_year}-${s.season_quarter}`}
              onClick={() => setCurrentSeason(s)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all duration-150 whitespace-nowrap ${
                currentSeason?.season_year === s.season_year && currentSeason?.season_quarter === s.season_quarter
                  ? 'bg-[#161B27] text-cyan-400 font-semibold'
                  : 'text-slate-400 hover:text-white hover:bg-[#161B27]'
              }`}
              style={{ fontFamily: 'DM Sans, sans-serif' }}
            >
              {s.label}
            </button>
          ))}
        </div>

        <div className="flex-1" />

        {/* Nav */}
        <nav className="flex items-center gap-1 mr-4">
          {(['favorites', 'myContent'] as const).map(section => (
            <button
              key={section}
              onClick={() => setActiveSection(activeSection === section ? 'all' : section)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 ${
                activeSection === section
                  ? 'bg-[#111520] text-white'
                  : 'text-slate-400 hover:text-white hover:bg-[#111520]'
              }`}
            >
              {section === 'favorites' ? '♥' : '⊞'}{' '}
              {section === 'favorites' ? 'Favorites' : 'My Content'}
            </button>
          ))}
        </nav>

        <button
          className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-[#FF5E5B] to-[#FF8A4C] rounded-lg text-white text-xs font-bold hover:opacity-85 transition-opacity"
          style={{ fontFamily: 'Syne, sans-serif' }}
          onClick={() => window.open('https://ko-fi.com', '_blank')}
        >
          <Coffee size={12} /> Ko-fi
        </button>

        <button
          onClick={() => setShowLogin(true)}
          className={`ml-2 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all duration-150 ${
            user
              ? 'border-green-500/40 text-green-400 bg-green-400/10'
              : 'border-white/10 text-white hover:bg-[#111520] hover:border-cyan-500/40 hover:text-cyan-400'
          }`}
        >
          {user ? user.display_name : 'Login'}
        </button>
      </header>

      {/* DEMO BANNER */}
      {!user && (
        <div className="mt-14 bg-cyan-400/5 border-b border-cyan-400/10 px-6 py-2 flex items-center gap-2.5 text-xs text-slate-400">
          <Info size={13} className="text-cyan-400 flex-shrink-0" />
          <span>
            Showing <strong className="text-cyan-400">demo data</strong>. Connect your iRacing account for real schedules and owned content.
          </span>
          <button
            onClick={() => setShowLogin(true)}
            className="ml-auto text-cyan-400 underline underline-offset-2 font-medium"
          >
            Connect iRacing →
          </button>
        </div>
      )}

      {/* FILTERS */}
      <div className={user ? 'mt-14' : ''}>
        <FiltersBar filters={filters} onChange={setFilters} />
      </div>

      {/* CONTENT */}
      <main className="px-6 pt-6 pb-12 max-w-[1600px] mx-auto">
        {/* Header row */}
        <div className="flex items-baseline gap-3 mb-5">
          <h1 className="text-xl font-black tracking-tight" style={{ fontFamily: 'Syne, sans-serif' }}>
            {currentSeason ? `Season ${currentSeason.season_quarter} ${currentSeason.season_year}` : 'Loading...'}
          </h1>
          <span className="font-mono text-xs text-slate-600">
            {loading ? 'Loading...' : `${displayed.length} series`}
          </span>
          <span className="font-mono text-[10px] text-cyan-400 bg-cyan-400/8 border border-cyan-400/15 rounded px-1.5 py-0.5 tracking-wide">
            LIVE
          </span>
        </div>

        {/* Grid */}
        <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))' }}>
          {loading
            ? Array(6).fill(0).map((_, i) => <SkeletonCard key={i} delay={i * 0.08} />)
            : displayed.length === 0
            ? (
              <div className="col-span-full flex flex-col items-center justify-center py-20 gap-3 text-center">
                <div className="w-16 h-16 bg-[#111520] border border-white/06 rounded-2xl flex items-center justify-center text-slate-600 mb-2">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
                  </svg>
                </div>
                <p className="font-bold text-lg text-slate-400" style={{ fontFamily: 'Syne, sans-serif' }}>
                  No series found
                </p>
                <p className="text-xs text-slate-600">Try adjusting your filters or resetting them.</p>
                <button
                  onClick={() => setFilters({ categories: [], licenses: [], statuses: [], favoritesOnly: false, ownedOnly: false, searchQuery: '' })}
                  className="px-3 py-1.5 rounded-lg border border-white/10 text-xs text-slate-400 hover:text-white hover:border-white/20 mt-2 transition-all"
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
                onFavoriteToggle={(_, newFavs) => setFavorites(newFavs)}
              />
            ))
          }
        </div>
      </main>

      {/* LOGIN MODAL */}
      {showLogin && (
        <LoginModal
          onClose={() => setShowLogin(false)}
          onSuccess={(userData) => {
            setUser(userData as unknown as AppUser);
            setShowLogin(false);
          }}
        />
      )}

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;700;800&family=DM+Mono:wght@400;500&family=DM+Sans:wght@300;400;500&display=swap');
        
        .skeleton {
          background: linear-gradient(90deg, #111520 0%, #161B27 50%, #111520 100%);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
        }
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #161B27; border-radius: 3px; }
      `}</style>
    </div>
  );
}
