'use client';
import { useState, useEffect } from 'react';
import { Heart, Lock, Check, Clock, Wrench, Trophy, GitCompare, CalendarClock, Calendar, Flag } from 'lucide-react';
import type { SeriesSeason } from '../types/iracing';
import { toggleFavoriteSeries } from '../lib/iracing-client';
import { getCurrentRaceWeek } from '../lib/season-week';
import { useTheme } from '../lib/theme';
import { useT } from '../lib/i18n';
import { useIsMobile } from '../lib/useBreakpoint';

interface SeriesCardProps {
  series: SeriesSeason;
  logoUrl?: string;
  isFavorite: boolean;
  isComparing?: boolean;
  isScheduled?: boolean;
  isEligible?: boolean;
  onFavoriteToggle: (seriesId: number, newFavs: number[]) => void;
  onClick?: () => void;
  onCompare?: () => void;
  onSchedule?: () => void;
}

const CATEGORY_STYLE: Record<string, { accent: string; label: string; borderColor: string }> = {
  'Sports Car':  { accent: '#3B9EFF', label: 'Sports Car', borderColor: 'rgba(59,158,255,0.35)' },
  'Formula Car': { accent: '#A855F7', label: 'Formula',    borderColor: 'rgba(168,85,247,0.35)' },
  'Oval':        { accent: '#F97316', label: 'Oval',        borderColor: 'rgba(249,115,22,0.35)'  },
  'Dirt Oval':   { accent: '#EAB308', label: 'Dirt Oval',   borderColor: 'rgba(234,179,8,0.35)'   },
  'Dirt Road':   { accent: '#22C55E', label: 'Dirt Road',   borderColor: 'rgba(34,197,94,0.35)'   },
  'Endurance':   { accent: '#E879F9', label: 'Endurance',   borderColor: 'rgba(232,121,249,0.35)' },
};

const LICENSE_CONFIG = {
  0: { label: 'Rookie', color: '#FF4444' },
  1: { label: 'D',      color: '#F97316' },
  2: { label: 'C',      color: '#EAB308' },
  3: { label: 'B',      color: '#22C55E' },
  4: { label: 'A',      color: '#3B9EFF' },
  5: { label: 'PRO',    color: '#A855F7' },
} as const;

function getSessionDuration(series: SeriesSeason): string {
  const td = series.race_time_descriptors;
  if (!td?.[0]?.session_minutes) return '—';
  const mins = td[0].session_minutes;
  if (mins >= 60) return `${Math.floor(mins / 60)}h${mins % 60 > 0 ? ` ${mins % 60}m` : ''}`;
  return `${mins}m`;
}

// iRacing track images CDN
function getTrackImageUrl(trackId: number): string {
  return `https://images-static.iracing.com/img/tracks/track_${trackId}_landscape.jpg`;
}

// Next race countdown — uses start_date if available, otherwise race_time_descriptors
function getNextRaceCountdown(series: SeriesSeason): string | null {
  const currentWeek = getCurrentRaceWeek(series.season_year, series.season_quarter);
  if (currentWeek === null) return null;

  // Try start_date first (weekly schedule)
  const schedule = series.schedules?.[currentWeek];
  if (schedule?.start_date) {
    const diff = new Date(schedule.start_date).getTime() - Date.now();
    if (diff > 0) return formatCountdown(diff);
  }

  // Fallback: find next slot from race_time_descriptors today
  const rtd = series.race_time_descriptors?.[0];
  if (!rtd?.start_time) return null;
  const [hStr, mStr] = rtd.start_time.split(':');
  if (!hStr) return null;
  const now = new Date();
  const candidate = new Date(now);
  candidate.setUTCHours(parseInt(hStr), parseInt(mStr || '0'), 0, 0);
  if (candidate.getTime() <= now.getTime()) candidate.setUTCDate(candidate.getUTCDate() + 1);
  const diff = candidate.getTime() - now.getTime();
  return formatCountdown(diff);
}

function formatCountdown(ms: number): string {
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  if (h >= 48) return `${Math.floor(h / 24)}d`;
  if (h >= 1)  return `${h}h ${m}m`;
  return `${m}m`;
}

export default function SeriesCard({ series, logoUrl, isFavorite, isComparing, isScheduled, isEligible, onFavoriteToggle, onClick, onCompare, onSchedule }: SeriesCardProps) {
  const [localFav, setLocalFav]         = useState(isFavorite);
  const [favAnimating, setFavAnimating] = useState(false);
  const [hovered, setHovered]           = useState(false);
  const [countdown, setCountdown]       = useState<string | null>(() => getNextRaceCountdown(series));
  const [logoError, setLogoError]       = useState(false);
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { t } = useT();

  // Update countdown every minute
  useEffect(() => {
    const update = () => setCountdown(getNextRaceCountdown(series));
    update();
    const id = setInterval(update, 60000);
    return () => clearInterval(id);
  }, [series]);

  const catStyle    = CATEGORY_STYLE[series.category ?? ''] ?? CATEGORY_STYLE['Sports Car'];
  const licConfig   = LICENSE_CONFIG[series.minLicenseLevel as keyof typeof LICENSE_CONFIG] ?? LICENSE_CONFIG[0];
  const duration    = getSessionDuration(series);
  const weekCount   = series.schedules?.length ?? 0;
  const tracks      = series.schedules ?? [];
  const currentWeek = getCurrentRaceWeek(series.season_year, series.season_quarter);
  const accent      = catStyle.accent;
  const activeTrack = currentWeek !== null ? tracks[currentWeek] : null;
  const trackImgUrl = activeTrack?.track?.track_id ? getTrackImageUrl(activeTrack.track.track_id) : null;

  const T = {
    cardBg:       isDark ? '#1C1C1C' : '#FFFFFF',
    cardBorder:   hovered ? accent + '60' : isDark ? '#1E1E2A' : '#E0E0E8',
    cardShadow:   hovered
      ? isDark ? `0 20px 60px rgba(0,0,0,0.8), 0 0 0 1px ${accent}40` : `0 12px 32px rgba(0,0,0,0.12), 0 0 0 1px ${accent}30`
      : isDark ? '0 2px 12px rgba(0,0,0,0.6)' : '0 1px 6px rgba(0,0,0,0.06)',
    headerGrad:   isDark
      ? `linear-gradient(160deg, ${accent}20 0%, #181818 100%)`
      : `linear-gradient(160deg, ${accent}10 0%, #FAFAFA 100%)`,
    seriesName:   isDark ? '#FFFFFF' : '#0A0A0F',
    trackRowBg:   isDark ? '#222222' : '#F8F8F8',
    trackRowBorder: isDark ? '#2A2A2A' : '#E8E8EC',
    trackName:    isDark ? '#CCCCCC' : '#222222',
    trackConfig:  isDark ? '#666666' : '#888888',
    trackNameActive: isDark ? '#F0F0F0' : '#111111',
    trackConfigActive: isDark ? '#999999' : '#555555',
    flagColor:    isDark ? '#3A3A3A' : '#CCCCCC',
    moreTracksBg: isDark ? '#222222' : '#F8F8F8',
    moreTracksBorder: isDark ? '#1A1A24'             : '#EBEBF0',
    moreTracksText: isDark ? '#2E2E3E'               : '#CCCCDD',
    sectionBorder: isDark ? '#252525' : '#EBEBEF',
    labelColor:   isDark ? '#555555' : '#999999',
    statValue:    isDark ? '#E8E8E8' : '#111111',
    footerBg:     isDark ? 'rgba(0,0,0,0.4)' : 'rgba(0,0,0,0.02)',
    iconBtnBg:    isDark ? '#141418'  : 'rgba(0,0,0,0.04)',
    iconBtnBorder: isDark ? '#333333' : '#E0E0E4',
    iconBtnColor: isDark ? '#555555' : '#999999',
  };

  function handleFavClick(e: React.MouseEvent) {
    e.stopPropagation();
    setFavAnimating(true);
    const newFavs = toggleFavoriteSeries(series.series_id);
    setLocalFav(!localFav);
    onFavoriteToggle(series.series_id, newFavs);
    setTimeout(() => setFavAnimating(false), 200);
  }

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onClick}
      style={{
        background: T.cardBg,
        border: `1px solid ${T.cardBorder}`,
        borderRadius: 16, overflow: 'hidden', cursor: 'pointer',
        transform: hovered ? 'translateY(-4px)' : 'translateY(0)',
        boxShadow: T.cardShadow,
        transition: 'transform 0.22s ease, box-shadow 0.22s ease, border-color 0.22s ease',
        display: 'flex', flexDirection: 'column',
      }}
    >
      {/* ── HEADER ──────────────────────────────────────────── */}
      <div style={{ background: T.headerGrad, padding: '14px 16px 12px', position: 'relative', borderBottom: `1px solid ${T.sectionBorder}`, overflow: 'hidden' }}>
        {/* Track image background */}
        {trackImgUrl && (
          <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
            <img src={trackImgUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: isDark ? 0.08 : 0.05 }}
              onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
            <div style={{ position: 'absolute', inset: 0, background: isDark ? 'linear-gradient(90deg, rgba(28,28,28,0.95) 40%, rgba(28,28,28,0.7) 100%)' : 'linear-gradient(90deg, rgba(255,255,255,0.97) 40%, rgba(255,255,255,0.85) 100%)' }} />
          </div>
        )}
        {/* Series logo watermark */}
        {logoUrl && (
          <div style={{
            position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
            width: 72, height: 72, zIndex: 0,
            backgroundImage: `url(${logoUrl})`,
            backgroundSize: 'contain', backgroundRepeat: 'no-repeat', backgroundPosition: 'center right',
            opacity: isDark ? 0.12 : 0.10,
            pointerEvents: 'none',
          }} />
        )}
        {/* Top accent line */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: accent, zIndex: 1 }} />

        {/* Categoría + live badge + acciones */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: accent, boxShadow: `0 0 8px ${accent}` }} />
            <span style={{ fontFamily: 'Orbitron, monospace', fontSize: 11, fontWeight: 700, color: accent, letterSpacing: '0.14em', textTransform: 'uppercase' }}>
              {catStyle.label}
            </span>
            {/* Endurance duration badge */}
            {series.category === 'Endurance' && duration !== '—' && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 20, background: 'rgba(232,121,249,0.15)', border: '1px solid rgba(232,121,249,0.35)', fontFamily: 'Orbitron, monospace', fontSize: 10, fontWeight: 700, color: '#E879F9', letterSpacing: '0.06em' }}>
                ⏱ {duration}
              </span>
            )}
            {currentWeek !== null && currentWeek < tracks.length && (
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                padding: '2px 8px', borderRadius: 20,
                background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.35)',
                fontFamily: 'Orbitron, monospace', fontSize: 10, fontWeight: 700,
                color: '#22C55E', letterSpacing: '0.06em',
              }}>
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#22C55E', display: 'inline-block' }} />
                {t.wkLive(currentWeek + 1)}
              </span>
            )}
            {isEligible && (
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                padding: '2px 8px', borderRadius: 20,
                background: 'rgba(168,85,247,0.15)', border: '1px solid rgba(168,85,247,0.35)',
                fontFamily: 'Orbitron, monospace', fontSize: 10, fontWeight: 700,
                color: '#A855F7', letterSpacing: '0.06em',
              }}>
                ✓ {t.eligible}
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <div title={series.isOwned ? t.allContentOwned : t.missingContent} style={{
              width: 30, height: 30, borderRadius: 8,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: series.isOwned ? 'rgba(34,197,94,0.18)' : T.iconBtnBg,
              border: `1px solid ${series.isOwned ? 'rgba(34,197,94,0.4)' : T.iconBtnBorder}`,
              color: series.isOwned ? '#22C55E' : T.iconBtnColor,
            }}>
              {series.isOwned ? <Check size={14} strokeWidth={2.5} /> : <Lock size={13} strokeWidth={2} />}
            </div>
            {onCompare && (
              <button onClick={e => { e.stopPropagation(); onCompare(); }} title={isComparing ? t.removeFromCompare : t.addToCompare} style={{
                width: 30, height: 30, borderRadius: 8, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: isComparing ? 'rgba(232,0,45,0.12)' : T.iconBtnBg,
                border: `1px solid ${isComparing ? 'rgba(232,0,45,0.5)' : T.iconBtnBorder}`,
                color: isComparing ? '#3B9EFF' : T.iconBtnColor,
                transition: 'all 0.15s ease',
              }}>
                <GitCompare size={13} strokeWidth={2} />
              </button>
            )}
            {onSchedule && (
              <button onClick={e => { e.stopPropagation(); onSchedule(); }} title={isScheduled ? t.removeFromSchedule : t.addToSchedule} style={{
                width: 30, height: 30, borderRadius: 8, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: isScheduled ? 'rgba(168,85,247,0.2)' : T.iconBtnBg,
                border: `1px solid ${isScheduled ? 'rgba(168,85,247,0.5)' : T.iconBtnBorder}`,
                color: isScheduled ? '#A855F7' : T.iconBtnColor,
                transition: 'all 0.15s ease',
              }}>
                <CalendarClock size={13} strokeWidth={2} />
              </button>
            )}
            <button onClick={handleFavClick} style={{
              width: 30, height: 30, borderRadius: 8, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: localFav ? 'rgba(239,68,68,0.2)' : T.iconBtnBg,
              border: `1px solid ${localFav ? 'rgba(239,68,68,0.5)' : T.iconBtnBorder}`,
              color: localFav ? '#EF4444' : T.iconBtnColor,
              transform: favAnimating ? 'scale(1.35)' : 'scale(1)',
              transition: 'transform 0.15s ease',
            }}>
              <Heart size={14} fill={localFav ? 'currentColor' : 'none'} strokeWidth={2} />
            </button>
          </div>
        </div>

        {/* Nombre */}
        <h3 style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 16, fontWeight: 700, color: T.seriesName, lineHeight: 1.2, margin: '0 0 10px', letterSpacing: '0.02em', textTransform: 'uppercase', position: 'relative', zIndex: 1 }}>
          {series.series_name ?? series.season_name ?? '—'}
        </h3>

        {/* Badges */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', position: 'relative', zIndex: 1 }}>
          <span style={{ padding: '4px 11px', borderRadius: 20, fontSize: 12, fontWeight: 700, fontFamily: 'Orbitron, monospace', background: licConfig.color + '22', border: `1px solid ${licConfig.color}50`, color: licConfig.color }}>
            {licConfig.label}
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 11px', borderRadius: 20, fontSize: 12, fontWeight: 700, fontFamily: 'Orbitron, monospace', background: series.fixed_setup ? 'rgba(232,0,45,0.10)' : 'rgba(34,197,94,0.14)', border: `1px solid ${series.fixed_setup ? 'rgba(232,0,45,0.35)' : 'rgba(34,197,94,0.35)'}`, color: series.fixed_setup ? '#E8002D' : '#22C55E' }}>
            <Wrench size={10} strokeWidth={2.5} /> {series.fixed_setup ? t.fixed : t.open}
          </span>
          {series.official && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 11px', borderRadius: 20, fontSize: 12, fontWeight: 700, fontFamily: 'Orbitron, monospace', background: 'rgba(234,179,8,0.14)', border: '1px solid rgba(234,179,8,0.38)', color: '#EAB308' }}>
              <Trophy size={10} strokeWidth={2.5} /> {t.official}
            </span>
          )}
        </div>
      </div>

      {/* ── TRACK ROTATION ──────────────────────────────────── */}
      <div style={{ padding: '14px 18px 16px', flex: 1, borderBottom: `1px solid ${T.sectionBorder}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <span style={{ fontFamily: 'Orbitron, monospace', fontSize: 10, fontWeight: 600, color: T.labelColor, letterSpacing: '0.14em', textTransform: 'uppercase' }}>
            {t.trackRotation}
          </span>
          <span style={{ fontFamily: 'Orbitron, monospace', fontSize: 10, color: accent + 'AA' }}>
            {weekCount} wks
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {tracks.slice(0, 6).map((week, i) => {
            const isActive = currentWeek === i;
            return (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '7px 10px', borderRadius: 8,
                background: isActive ? `${accent}18` : T.trackRowBg,
                border: `1px solid ${isActive ? accent + '50' : T.trackRowBorder}`,
                transition: 'background 0.15s',
              }}>
                <span style={{ fontFamily: 'Orbitron, monospace', fontSize: 10, fontWeight: 700, color: accent, minWidth: 24, flexShrink: 0 }}>
                  W{i + 1}
                </span>
                {isActive
                  ? <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#22C55E', flexShrink: 0, boxShadow: '0 0 6px #22C55E' }} />
                  : <Flag size={11} strokeWidth={1.8} color={T.flagColor} style={{ flexShrink: 0 }} />
                }
                <span style={{ fontSize: 13, fontWeight: isActive ? 700 : 500, color: isActive ? T.trackNameActive : T.trackName, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1 }}
                  title={`${week.track.track_name}${week.track.config_name ? ` — ${week.track.config_name}` : ''}`}
                >
                  {week.track.track_name}
                  {week.track.config_name && (
                    <span style={{ color: isActive ? T.trackConfigActive : T.trackConfig, fontSize: 11, marginLeft: 6 }}>
                      {week.track.config_name}
                    </span>
                  )}
                </span>
                {isActive && (
                  <span style={{ fontFamily: 'Orbitron, monospace', fontSize: 9, fontWeight: 700, color: '#22C55E', background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 4, padding: '1px 5px', flexShrink: 0 }}>
                    NOW
                  </span>
                )}
              </div>
            );
          })}
          {tracks.length > 6 && (
            <div style={{ padding: '6px 10px', borderRadius: 8, textAlign: 'center', background: T.moreTracksBg, border: `1px solid ${T.moreTracksBorder}` }}>
              <span style={{ fontFamily: 'Orbitron, monospace', fontSize: 11, color: T.moreTracksText }}>
                {t.moreWeeks(tracks.length - 6)}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ── STATS FOOTER ────────────────────────────────────── */}
      <div style={{ display: 'flex', background: T.footerBg }}>
        {[
          { icon: <Clock size={12} strokeWidth={2} />,    label: t.duration,   value: duration,                        accent: true  },
          { icon: <Calendar size={12} strokeWidth={2} />, label: t.weeks,      value: String(weekCount),               accent: false },
          countdown
            ? { icon: <Clock size={12} strokeWidth={2} />, label: 'NEXT',      value: countdown,                       accent: true  }
            : { icon: <Trophy size={12} strokeWidth={2} />, label: t.official, value: series.official ? t.yes : t.no,  accent: false },
        ].map((stat, i) => (
          <div key={i} style={{ flex: 1, padding: '11px 14px', borderRight: i < 2 ? `1px solid ${T.sectionBorder}` : 'none', display: 'flex', flexDirection: 'column', gap: 3 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontFamily: 'Orbitron, monospace', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', color: T.labelColor }}>
              {stat.icon} {stat.label}
            </span>
            <span style={{ fontFamily: 'Orbitron, monospace', fontSize: 15, fontWeight: 700, color: stat.accent ? accent : T.statValue }}>
              {stat.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}