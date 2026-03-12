'use client';
// /app/components/SeriesCard.tsx

import { useState } from 'react';
import { Heart, Lock, Check, Clock, Calendar, Settings2 } from 'lucide-react';
import type { SeriesSeason } from '../types/iracing';
import { toggleFavoriteSeries } from '../lib/iracing-client';

interface SeriesCardProps {
  series: SeriesSeason;
  isFavorite: boolean;
  onFavoriteToggle: (seriesId: number, newFavs: number[]) => void;
}

const LICENSE_CONFIG = {
  0: { label: 'R', class: 'text-red-400 bg-red-400/10 border-red-400/25' },
  1: { label: 'D', class: 'text-orange-400 bg-orange-400/10 border-orange-400/25' },
  2: { label: 'C', class: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/25' },
  3: { label: 'B', class: 'text-green-400 bg-green-400/10 border-green-400/25' },
  4: { label: 'A', class: 'text-cyan-400 bg-cyan-400/10 border-cyan-400/25' },
  5: { label: 'PRO', class: 'text-cyan-300 bg-cyan-300/10 border-cyan-300/25' },
} as const;

const STATUS_CONFIG = {
  FIXED: { class: 'text-cyan-400 bg-cyan-400/10 border-cyan-400/20' },
  OPEN: { class: 'text-green-400 bg-green-400/10 border-green-400/20' },
  RANKED: { class: 'text-violet-400 bg-violet-400/10 border-violet-400/25' },
  UNRANKED: { class: 'text-slate-400 bg-slate-400/10 border-slate-400/15' },
} as const;

function getSessionDuration(series: SeriesSeason): string {
  const td = series.race_time_descriptors;
  if (!td?.[0]?.session_minutes) return '—';
  const mins = td[0].session_minutes;
  if (mins >= 60) return `${Math.floor(mins / 60)}h${mins % 60 > 0 ? ` ${mins % 60}m` : ''}`;
  return `${mins}m`;
}

function getIconLetters(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map(w => w[0])
    .join('')
    .toUpperCase();
}

export default function SeriesCard({ series, isFavorite, onFavoriteToggle }: SeriesCardProps) {
  const [localFav, setLocalFav] = useState(isFavorite);
  const [favAnimating, setFavAnimating] = useState(false);

  const licConfig = LICENSE_CONFIG[series.minLicenseLevel as keyof typeof LICENSE_CONFIG] ?? LICENSE_CONFIG[0];
  const statusConfig = STATUS_CONFIG[series.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG['OPEN'];
  const duration = getSessionDuration(series);
  const weekCount = series.schedules?.length ?? 0;
  const MAX_TRACKS = 6;
  const shownTracks = series.schedules?.slice(0, MAX_TRACKS) ?? [];
  const overflowCount = (series.schedules?.length ?? 0) - MAX_TRACKS;

  function handleFavClick(e: React.MouseEvent) {
    e.stopPropagation();
    setFavAnimating(true);
    const newFavs = toggleFavoriteSeries(series.series_id);
    setLocalFav(!localFav);
    onFavoriteToggle(series.series_id, newFavs);
    setTimeout(() => setFavAnimating(false), 250);
  }

  return (
    <div className="group bg-[#0D1117] border border-white/[0.07] rounded-xl p-[18px] cursor-pointer relative overflow-hidden transition-all duration-200 hover:border-white/[0.14] hover:-translate-y-0.5 hover:shadow-[0_12px_40px_rgba(0,0,0,0.4),0_0_30px_rgba(0,229,255,0.08)]">
      {/* Gradient overlay */}
      <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/[0.02] to-transparent pointer-events-none" />

      {/* Top row */}
      <div className="flex items-start gap-3 mb-3.5">
        {/* Icon */}
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#161B27] to-[#111520] border border-white/10 flex items-center justify-center font-bold font-mono text-sm text-cyan-400 flex-shrink-0 tracking-tight">
          {getIconLetters(series.series_name)}
        </div>

        {/* Title & badges */}
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-sm text-white/90 leading-snug mb-1.5 truncate" title={series.series_name}>
            {series.series_name}
          </h3>
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-medium tracking-wide border ${statusConfig.class}`}>
              {series.status ?? 'OPEN'}
            </span>
            <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-mono font-bold tracking-wide border ${licConfig.class}`}>
              {licConfig.label}
            </span>
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono border bg-[#161B27] border-white/10 text-slate-400">
              {series.category ?? 'Road'}
            </span>
            {series.official && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono border bg-yellow-400/8 border-yellow-400/18 text-yellow-400">
                ✦ OFFICIAL
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {/* Owned indicator */}
          <div
            className={`w-[22px] h-[22px] rounded flex items-center justify-center border ${
              series.isOwned
                ? 'bg-green-400/10 border-green-400/20 text-green-400'
                : 'bg-[#111520] border-white/06 text-slate-600'
            }`}
            title={series.isOwned ? 'All content owned' : 'Some content not owned'}
          >
            {series.isOwned ? (
              <Check size={11} strokeWidth={2.5} />
            ) : (
              <Lock size={11} strokeWidth={2} />
            )}
          </div>

          {/* Favorite button */}
          <button
            onClick={handleFavClick}
            className={`w-[30px] h-[30px] rounded-lg flex items-center justify-center border transition-all duration-150 ${
              localFav
                ? 'border-red-500/50 text-red-400 bg-red-400/10'
                : 'border-white/10 text-slate-600 hover:border-red-500/40 hover:text-red-400'
            } ${favAnimating ? 'scale-125' : 'scale-100'}`}
            title={localFav ? 'Remove from favorites' : 'Add to favorites'}
          >
            <Heart size={13} fill={localFav ? 'currentColor' : 'none'} strokeWidth={2} />
          </button>
        </div>
      </div>

      {/* Track rotation */}
      <p className="font-mono text-[10px] text-slate-600 uppercase tracking-widest mb-2">
        Track Rotation
      </p>
      <div className="flex gap-1 flex-wrap mb-3.5">
        {shownTracks.map((week, i) => (
          <div key={i} className="flex flex-col items-center gap-0.5">
            <div
              className="px-2 py-1 bg-[#111520] border border-white/06 rounded text-[10px] text-slate-400 truncate max-w-[80px] cursor-default transition-all duration-150 hover:border-cyan-500/30 hover:text-cyan-400 hover:bg-cyan-400/5"
              title={`${week.track.track_name}${week.track.config_name ? ` — ${week.track.config_name}` : ''}`}
            >
              {week.track.track_name}
            </div>
            <span className="font-mono text-[9px] text-slate-600">W{i + 1}</span>
          </div>
        ))}
        {overflowCount > 0 && (
          <div className="flex flex-col items-center gap-0.5">
            <div className="px-2 py-1 bg-[#111520] border border-white/06 rounded font-mono text-[10px] text-slate-600">
              +{overflowCount}
            </div>
            <span className="font-mono text-[9px] text-transparent">W</span>
          </div>
        )}
      </div>

      {/* Stats row */}
      <div className="flex items-stretch pt-3 border-t border-white/06">
        <div className="flex-1 flex flex-col gap-0.5 pr-3">
          <span className="font-mono text-[9px] text-slate-600 uppercase tracking-widest flex items-center gap-1">
            <Clock size={8} /> Duration
          </span>
          <span className="font-mono text-xs text-cyan-400 font-medium">{duration}</span>
        </div>
        <div className="flex-1 flex flex-col gap-0.5 px-3 border-l border-white/06">
          <span className="font-mono text-[9px] text-slate-600 uppercase tracking-widest flex items-center gap-1">
            <Calendar size={8} /> Weeks
          </span>
          <span className="font-mono text-xs text-white/80">{weekCount}</span>
        </div>
        <div className="flex-1 flex flex-col gap-0.5 pl-3 border-l border-white/06">
          <span className="font-mono text-[9px] text-slate-600 uppercase tracking-widest flex items-center gap-1">
            <Settings2 size={8} /> Setup
          </span>
          <span className="font-mono text-xs text-white/80">{series.fixed_setup ? 'Fixed' : 'Open'}</span>
        </div>
      </div>
    </div>
  );
}
