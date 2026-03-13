"use client";
// /app/components/FiltersBar.tsx — UI refresh: larger chips, better spacing

import { Heart, Shield, RotateCcw, Search } from "lucide-react";
import type {
  FilterState,
  CarCategory,
  LicenseLevel,
  SessionType,
} from "../types/iracing";

interface FiltersBarProps {
  filters: FilterState;
  onChange: (newFilters: FilterState) => void;
}

const CATEGORIES: { label: string; value: CarCategory }[] = [
  { label: "Sports Car", value: "Sports Car" },
  { label: "Formula", value: "Formula Car" },
  { label: "Oval", value: "Oval" },
  { label: "Dirt Oval", value: "Dirt Oval" },
  { label: "Dirt Road", value: "Dirt Road" },
];

const LICENSES: { label: string; value: LicenseLevel; activeClass: string }[] =
  [
    {
      label: "Rookie",
      value: 0,
      activeClass: "text-red-400 bg-red-400/10 border-red-400/30",
    },
    {
      label: "D",
      value: 1,
      activeClass: "text-orange-400 bg-orange-400/10 border-orange-400/30",
    },
    {
      label: "C",
      value: 2,
      activeClass: "text-yellow-400 bg-yellow-400/10 border-yellow-400/30",
    },
    {
      label: "B",
      value: 3,
      activeClass: "text-green-400 bg-green-400/10 border-green-400/30",
    },
    {
      label: "A",
      value: 4,
      activeClass: "text-cyan-400 bg-cyan-400/10 border-cyan-400/30",
    },
  ];

const STATUSES: { label: string; value: SessionType; activeClass: string }[] = [
  {
    label: "Fixed",
    value: "FIXED",
    activeClass: "text-cyan-400 bg-cyan-400/10 border-cyan-400/30",
  },
  {
    label: "Open",
    value: "OPEN",
    activeClass: "text-green-400 bg-green-400/10 border-green-400/30",
  },
  {
    label: "Ranked",
    value: "RANKED",
    activeClass: "text-violet-400 bg-violet-400/10 border-violet-400/30",
  },
  {
    label: "Unranked",
    value: "UNRANKED",
    activeClass: "text-slate-400 bg-slate-400/10 border-slate-400/20",
  },
];

function Divider() {
  return <div className="w-px h-6 bg-white/10 flex-shrink-0 mx-1" />;
}

function GroupLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="font-mono text-[11px] text-slate-600 uppercase tracking-widest whitespace-nowrap">
      {children}
    </span>
  );
}

function Chip({
  label,
  active,
  onClick,
  activeClass = "text-cyan-400 bg-cyan-400/10 border-cyan-400/30",
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
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-medium transition-all duration-150 whitespace-nowrap cursor-pointer ${
        active
          ? activeClass
          : "text-slate-400 border-white/10 bg-transparent hover:text-white hover:bg-white/5 hover:border-white/20"
      }`}
    >
      {children}
      {label}
    </button>
  );
}

export default function FiltersBar({ filters, onChange }: FiltersBarProps) {
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
    });
  }

  const hasActiveFilters =
    filters.categories.length > 0 ||
    filters.licenses.length > 0 ||
    filters.statuses.length > 0 ||
    filters.favoritesOnly ||
    filters.ownedOnly ||
    filters.searchQuery.length > 0;

  return (
    <div className="sticky top-16 z-[90] bg-[rgba(8,10,14,0.92)] backdrop-blur-xl border-b border-white/07 px-6 py-3.5">
      <div className="flex items-center gap-2.5 flex-wrap">
        <GroupLabel>Type</GroupLabel>
        {CATEGORIES.map((cat) => (
          <Chip
            key={cat.value}
            label={cat.label}
            active={filters.categories.includes(cat.value)}
            onClick={() => toggleCategory(cat.value)}
          >
            <span className="w-2 h-2 rounded-full bg-current opacity-70" />
          </Chip>
        ))}

        <Divider />

        <GroupLabel>License</GroupLabel>
        {LICENSES.map((lic) => (
          <Chip
            key={lic.value}
            label={lic.label}
            active={filters.licenses.includes(lic.value)}
            onClick={() => toggleLicense(lic.value)}
            activeClass={lic.activeClass}
          />
        ))}

        <Divider />

        <GroupLabel>Status</GroupLabel>
        {STATUSES.map((s) => (
          <Chip
            key={s.value}
            label={s.label}
            active={filters.statuses.includes(s.value)}
            onClick={() => toggleStatus(s.value)}
            activeClass={s.activeClass}
          />
        ))}

        <Divider />

        <Chip
          label="Favorites"
          active={filters.favoritesOnly}
          onClick={() =>
            onChange({ ...filters, favoritesOnly: !filters.favoritesOnly })
          }
          activeClass="text-red-400 bg-red-400/10 border-red-400/30"
        >
          <Heart
            size={13}
            fill={filters.favoritesOnly ? "currentColor" : "none"}
          />
        </Chip>

        <Chip
          label="Owned"
          active={filters.ownedOnly}
          onClick={() =>
            onChange({ ...filters, ownedOnly: !filters.ownedOnly })
          }
          activeClass="text-orange-400 bg-orange-400/10 border-orange-400/30"
        >
          <Shield
            size={13}
            fill={filters.ownedOnly ? "currentColor" : "none"}
          />
        </Chip>

        {hasActiveFilters && (
          <button
            onClick={reset}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-transparent text-sm text-slate-600 hover:text-red-400 hover:border-red-400/25 transition-all duration-150"
          >
            <RotateCcw size={12} /> Reset
          </button>
        )}

        {/* Search */}
        <div className="relative ml-auto">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600 pointer-events-none"
          />
          <input
            type="text"
            placeholder="Search series..."
            value={filters.searchQuery}
            onChange={(e) =>
              onChange({ ...filters, searchQuery: e.target.value })
            }
            className="bg-[#111520] border border-white/10 rounded-xl text-sm text-white pl-9 pr-4 py-2 w-52 outline-none transition-all duration-150 placeholder:text-slate-600 focus:border-cyan-500/40 focus:w-64 focus:shadow-[0_0_0_3px_rgba(0,229,255,0.06)]"
          />
        </div>
      </div>
    </div>
  );
}
