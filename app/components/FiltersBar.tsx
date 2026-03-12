'use client';
// /app/components/FiltersBar.tsx

import { Heart, Shield, RotateCcw, Search } from 'lucide-react';
import type { FilterState, CarCategory, LicenseLevel, SessionType } from '../types/iracing';

interface FiltersBarProps {
  filters: FilterState;
  onChange: (newFilters: FilterState) => void;
}

const CATEGORIES: { label: string; value: CarCategory }[] = [
  { label: 'Sports Car', value: 'Sports Car' },
  { label: 'Formula', value: 'Formula Car' },
  { label: 'Oval', value: 'Oval' },
  { label: 'Dirt Oval', value: 'Dirt Oval' },
  { label: 'Dirt Road', value: 'Dirt Road' },
];

const LICENSES: { label: string; value: LicenseLevel; chipClass: string }[] = [
  { label: 'R', value: 0, chipClass: 'text-red-400 bg-red-400/10 border-red-400/25' },
  { label: 'D', value: 1, chipClass: 'text-orange-400 bg-orange-400/10 border-orange-400/25' },
  { label: 'C', value: 2, chipClass: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/25' },
  { label: 'B', value: 3, chipClass: 'text-green-400 bg-green-400/10 border-green-400/25' },
  { label: 'A', value: 4, chipClass: 'text-cyan-400 bg-cyan-400/10 border-cyan-400/25' },
];

const STATUSES: { label: string; value: SessionType; activeClass: string }[] = [
  { label: 'FIXED', value: 'FIXED', activeClass: 'text-cyan-400 bg-cyan-400/10 border-cyan-400/30' },
  { label: 'OPEN', value: 'OPEN', activeClass: 'text-green-400 bg-green-400/10 border-green-400/30' },
  { label: 'RANKED', value: 'RANKED', activeClass: 'text-violet-400 bg-violet-400/10 border-violet-400/30' },
  { label: 'UNRANKED', value: 'UNRANKED', activeClass: 'text-slate-400 bg-slate-400/10 border-slate-400/20' },
];

function Chip({
  label,
  active,
  onClick,
  activeClass = 'text-cyan-400 bg-cyan-400/10 border-cyan-400/30',
  children,
}: {
  label?: string;
  active: boolean;
  onClick: () => void;
  activeClass?: string;
  children?: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium transition-all duration-150 whitespace-nowrap cursor-pointer font-sans ${
        active
          ? `${activeClass}`
          : 'text-slate-400 border-white/10 bg-transparent hover:text-white hover:bg-white/5 hover:border-white/15'
      }`}
    >
      {children}
      {label}
    </button>
  );
}

function Divider() {
  return <div className="w-px h-5 bg-white/10 flex-shrink-0" />;
}

function GroupLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="font-mono text-[10px] text-slate-600 uppercase tracking-widest pr-1 border-r border-white/10 mr-1 whitespace-nowrap">
      {children}
    </span>
  );
}

export default function FiltersBar({ filters, onChange }: FiltersBarProps) {
  function toggleCategory(cat: CarCategory) {
    const cats = filters.categories.includes(cat)
      ? filters.categories.filter(c => c !== cat)
      : [...filters.categories, cat];
    onChange({ ...filters, categories: cats });
  }

  function toggleLicense(lic: LicenseLevel) {
    const lics = filters.licenses.includes(lic)
      ? filters.licenses.filter(l => l !== lic)
      : [...filters.licenses, lic];
    onChange({ ...filters, licenses: lics });
  }

  function toggleStatus(s: SessionType) {
    const stats = filters.statuses.includes(s)
      ? filters.statuses.filter(x => x !== s)
      : [...filters.statuses, s];
    onChange({ ...filters, statuses: stats });
  }

  function reset() {
    onChange({ categories: [], licenses: [], statuses: [], favoritesOnly: false, ownedOnly: false, searchQuery: '' });
  }

  const hasActiveFilters =
    filters.categories.length > 0 ||
    filters.licenses.length > 0 ||
    filters.statuses.length > 0 ||
    filters.favoritesOnly ||
    filters.ownedOnly ||
    filters.searchQuery.length > 0;

  return (
    <div className="sticky top-14 z-[90] bg-[rgba(8,10,14,0.9)] backdrop-blur-xl border-b border-white/06 px-6 py-3">
      <div className="flex items-center gap-2 flex-wrap">
        {/* Categories */}
        <GroupLabel>Type</GroupLabel>
        {CATEGORIES.map(cat => (
          <Chip
            key={cat.value}
            label={cat.label}
            active={filters.categories.includes(cat.value)}
            onClick={() => toggleCategory(cat.value)}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
          </Chip>
        ))}

        <Divider />

        {/* Licenses */}
        <GroupLabel>License</GroupLabel>
        {LICENSES.map(lic => (
          <Chip
            key={lic.value}
            active={filters.licenses.includes(lic.value)}
            onClick={() => toggleLicense(lic.value)}
            activeClass={lic.chipClass}
          >
            <span className={`px-1 py-0.5 rounded text-[9px] font-mono font-bold border ${lic.chipClass}`}>
              {lic.label}
            </span>
          </Chip>
        ))}

        <Divider />

        {/* Statuses */}
        <GroupLabel>Status</GroupLabel>
        {STATUSES.map(s => (
          <Chip
            key={s.value}
            label={s.value}
            active={filters.statuses.includes(s.value)}
            onClick={() => toggleStatus(s.value)}
            activeClass={s.activeClass}
          />
        ))}

        <Divider />

        {/* Special filters */}
        <Chip
          active={filters.favoritesOnly}
          onClick={() => onChange({ ...filters, favoritesOnly: !filters.favoritesOnly })}
          activeClass="text-green-400 bg-green-400/10 border-green-400/30"
        >
          <Heart size={10} fill={filters.favoritesOnly ? 'currentColor' : 'none'} />
          Favorites
        </Chip>

        <Chip
          active={filters.ownedOnly}
          onClick={() => onChange({ ...filters, ownedOnly: !filters.ownedOnly })}
          activeClass="text-orange-400 bg-orange-400/10 border-orange-400/30"
        >
          <Shield size={10} fill={filters.ownedOnly ? 'currentColor' : 'none'} />
          Owned
        </Chip>

        {hasActiveFilters && (
          <button
            onClick={reset}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border border-transparent text-xs text-slate-600 hover:text-red-400 hover:border-red-400/25 transition-all duration-150"
          >
            <RotateCcw size={10} />
            Reset
          </button>
        )}

        {/* Search */}
        <div className="relative ml-auto">
          <Search
            size={13}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-600 pointer-events-none"
          />
          <input
            type="text"
            placeholder="Search series..."
            value={filters.searchQuery}
            onChange={e => onChange({ ...filters, searchQuery: e.target.value })}
            className="bg-[#111520] border border-white/10 rounded-lg text-white text-xs pl-8 pr-3 py-1.5 w-48 outline-none transition-all duration-150 placeholder:text-slate-600 focus:border-cyan-500/40 focus:w-56 focus:shadow-[0_0_0_3px_rgba(0,229,255,0.06)]"
          />
        </div>
      </div>
    </div>
  );
}
