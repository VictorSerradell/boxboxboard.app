'use client';
// /app/page.tsx — PitBoard landing page

import { useState, useEffect } from 'react';
import { ArrowRight, Flag, Calendar, Car, BarChart2, Shield, Users, Github, Coffee, Star } from 'lucide-react';

const ACCENT = '#3B9EFF';

const CATEGORY_COLORS: Record<string, string> = {
  'Sports Car':  '#3B9EFF',
  'Formula':     '#A855F7',
  'Oval':        '#F97316',
  'Dirt Oval':   '#EAB308',
  'Dirt Road':   '#22C55E',
};

const DEMO_SERIES = [
  { name: 'iRacing Endurance Series',    cat: 'Sports Car', lic: 'B', weeks: 6, duration: '8h'   },
  { name: 'Porsche TAG Heuer Supercup',  cat: 'Sports Car', lic: 'A', weeks: 8, duration: '30m'  },
  { name: 'Formula iRacing',            cat: 'Formula',    lic: 'B', weeks: 7, duration: '20m'  },
  { name: 'NASCAR Cup Series',          cat: 'Oval',       lic: 'C', weeks: 8, duration: '1h'   },
  { name: 'IMSA Sportscar Championship',cat: 'Sports Car', lic: 'C', weeks: 7, duration: '1h30m'},
  { name: 'IndyCar Series',             cat: 'Oval',       lic: 'A', weeks: 8, duration: '45m'  },
];

const FEATURES = [
  {
    icon: <Calendar size={20} />,
    title: "Full Season Calendar",
    desc: "Browse every series, every week. Track rotations visualized clearly so you can plan ahead.",
  },
  {
    icon: <Car size={20} />,
    title: "Owned Content",
    desc: "Connect your iRacing account to see exactly which cars and tracks you already own.",
  },
  {
    icon: <BarChart2 size={20} />,
    title: "Series Stats",
    desc: "Average SOF, typical driver counts and split info so you know what level of competition to expect.",
  },
  {
    icon: <Calendar size={20} />,
    title: "Full Season Calendar",
    desc: "Browse every series, every week. Track rotations visualized clearly so you can plan ahead.",
  },
  {
    icon: <Flag size={20} />,
    title: "Track Details",
    desc: "Every circuit for every week at a glance — including config name and start dates.",
  },
  {
    icon: <Users size={20} />,
    title: "Team Racing",
    desc: "Quickly identify team driving series and multi-class events for endurance planning.",
  },
];

function MiniCard({ name, cat, lic, weeks, duration, delay }: typeof DEMO_SERIES[0] & { delay: number }) {
  const accent = CATEGORY_COLORS[cat] ?? ACCENT;
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(t);
  }, [delay]);

  return (
    <div style={{
      background: '#070D19', border: `1px solid ${accent}30`,
      borderRadius: 12, overflow: 'hidden', flexShrink: 0, width: 210,
      opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(14px)',
      transition: 'opacity 0.5s ease, transform 0.5s ease',
    }}>
      <div style={{ background: `linear-gradient(135deg, ${accent}15 0%, transparent 100%)`, borderBottom: `1px solid ${accent}20`, padding: '12px 14px 10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 7 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: accent }} />
          <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, fontWeight: 700, color: accent, letterSpacing: '0.1em', textTransform: 'uppercase' }}>{cat}</span>
        </div>
        <p style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 13, color: 'white', margin: 0, lineHeight: 1.3 }}>{name}</p>
      </div>
      <div style={{ padding: '8px 14px', display: 'flex', gap: 14 }}>
        {[{ label: 'Lic', value: lic }, { label: 'Weeks', value: String(weeks) }, { label: 'Time', value: duration }].map(s => (
          <div key={s.label}>
            <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 9, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{s.label}</div>
            <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.75)', marginTop: 2 }}>{s.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function LandingPage() {
  const [heroVisible, setHeroVisible] = useState(false);
  useEffect(() => { setTimeout(() => setHeroVisible(true), 80); }, []);

  return (
    <div style={{ minHeight: '100vh', background: '#060C18', color: 'white', overflowX: 'hidden' }}>

      {/* ── NAV ─────────────────────────────────────────────── */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, height: 60,
        background: 'rgba(6,12,24,0.88)', backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        display: 'flex', alignItems: 'center', padding: '0 32px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 30, height: 30, borderRadius: 8,
            background: 'linear-gradient(135deg, #3B9EFF, #A855F7)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'Syne, sans-serif', fontWeight: 900, fontSize: 12, color: 'white',
          }}>PB</div>
          <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 900, fontSize: 18, color: 'white', letterSpacing: '-0.4px' }}>PitBoard</span>
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <a href="https://github.com/VictorSerradell/simplan.app" target="_blank" rel="noopener noreferrer" style={{
            display: 'flex', alignItems: 'center', gap: 7, padding: '7px 14px',
            borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)',
            color: '#64748B', textDecoration: 'none', fontSize: 13,
            fontFamily: 'Syne, sans-serif', fontWeight: 600,
          }}>
            <Github size={14} /> GitHub
          </a>
          <a href="/app" style={{
            display: 'flex', alignItems: 'center', gap: 7, padding: '8px 18px',
            borderRadius: 8, background: 'linear-gradient(135deg, #3B9EFF, #2563EB)',
            color: 'white', textDecoration: 'none',
            fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 13,
            boxShadow: '0 0 20px rgba(59,158,255,0.2)',
          }}>
            Open App <ArrowRight size={14} />
          </a>
        </div>
      </nav>

      {/* ── HERO ────────────────────────────────────────────── */}
      <section style={{
        minHeight: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '120px 32px 80px', position: 'relative', textAlign: 'center',
      }}>
        <div style={{
          position: 'absolute', top: '25%', left: '50%', transform: 'translateX(-50%)',
          width: 700, height: 500, borderRadius: '50%',
          background: 'radial-gradient(ellipse, rgba(59,158,255,0.07) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        {/* Badge */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          padding: '6px 16px', borderRadius: 20, marginBottom: 28,
          background: 'rgba(59,158,255,0.1)', border: '1px solid rgba(59,158,255,0.25)',
          opacity: heroVisible ? 1 : 0, transform: heroVisible ? 'translateY(0)' : 'translateY(8px)',
          transition: 'opacity 0.5s ease, transform 0.5s ease',
        }}>
          <Star size={12} color="#3B9EFF" fill="#3B9EFF" />
          <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 12, fontWeight: 600, color: '#3B9EFF', letterSpacing: '0.06em' }}>
            Free & open source
          </span>
        </div>

        {/* Headline */}
        <h1 style={{
          fontFamily: 'Syne, sans-serif', fontWeight: 900,
          fontSize: 'clamp(38px, 7vw, 74px)',
          lineHeight: 1.05, letterSpacing: '-2px', color: 'white',
          margin: '0 0 16px', maxWidth: 820,
          opacity: heroVisible ? 1 : 0, transform: heroVisible ? 'translateY(0)' : 'translateY(12px)',
          transition: 'opacity 0.6s ease 0.1s, transform 0.6s ease 0.1s',
        }}>
          Plan your<br />
          <span style={{ background: 'linear-gradient(90deg, #3B9EFF 0%, #A855F7 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            iRacing season
          </span>
        </h1>

        <p style={{
          fontSize: 18, color: '#64748B', lineHeight: 1.7, maxWidth: 500, margin: '0 0 44px',
          opacity: heroVisible ? 1 : 0, transform: heroVisible ? 'translateY(0)' : 'translateY(12px)',
          transition: 'opacity 0.6s ease 0.2s, transform 0.6s ease 0.2s',
        }}>
          Browse every series, track rotation and schedule for the current iRacing season.
          Filter by license, category, and owned content.
        </p>

        {/* CTAs */}
        <div style={{
          display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center',
          opacity: heroVisible ? 1 : 0, transform: heroVisible ? 'translateY(0)' : 'translateY(12px)',
          transition: 'opacity 0.6s ease 0.3s, transform 0.6s ease 0.3s',
        }}>
          <a href="/app" style={{
            display: 'inline-flex', alignItems: 'center', gap: 10,
            padding: '14px 30px', borderRadius: 12,
            background: 'linear-gradient(135deg, #3B9EFF, #2563EB)',
            color: 'white', textDecoration: 'none',
            fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 16,
            boxShadow: '0 0 40px rgba(59,158,255,0.28)',
          }}>
            Open PitBoard <ArrowRight size={16} />
          </a>
          <a href="https://github.com/VictorSerradell/simplan.app" target="_blank" rel="noopener noreferrer" style={{
            display: 'inline-flex', alignItems: 'center', gap: 10,
            padding: '14px 30px', borderRadius: 12,
            background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)',
            color: '#94A3B8', textDecoration: 'none',
            fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 16,
          }}>
            <Github size={16} /> View on GitHub
          </a>
        </div>

        {/* Preview cards */}
        <div style={{
          marginTop: 68, display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap',
          maxWidth: 1050,
          opacity: heroVisible ? 1 : 0,
          transition: 'opacity 0.6s ease 0.5s',
        }}>
          {DEMO_SERIES.map((s, i) => <MiniCard key={s.name} {...s} delay={600 + i * 90} />)}
        </div>
      </section>

      {/* ── FEATURES ────────────────────────────────────────── */}
      <section style={{ padding: '72px 32px 88px', maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 52 }}>
          <h2 style={{
            fontFamily: 'Syne, sans-serif', fontWeight: 900,
            fontSize: 'clamp(26px, 4vw, 40px)', letterSpacing: '-1px',
            color: 'white', margin: '0 0 14px',
          }}>
            Everything you need to plan
          </h2>
          <p style={{ fontSize: 16, color: '#475569', maxWidth: 460, margin: '0 auto' }}>
            No more digging through PDFs or the iRacing member site. PitBoard puts it all in one place.
          </p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
          {FEATURES.map((f, i) => (
            <div key={i}
              style={{ padding: '24px', borderRadius: 14, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', transition: 'border-color 0.2s, background 0.2s' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(59,158,255,0.22)'; (e.currentTarget as HTMLElement).style.background = 'rgba(59,158,255,0.04)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.07)'; (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.03)'; }}
            >
              <div style={{
                width: 40, height: 40, borderRadius: 10, marginBottom: 16,
                background: 'rgba(59,158,255,0.1)', border: '1px solid rgba(59,158,255,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: ACCENT,
              }}>{f.icon}</div>
              <h3 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 16, color: 'white', margin: '0 0 8px' }}>{f.title}</h3>
              <p style={{ fontSize: 14, color: '#475569', lineHeight: 1.65, margin: 0 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────────── */}
      <section style={{ padding: '56px 32px 88px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 20, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <h2 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 900, fontSize: 'clamp(22px, 3.5vw, 36px)', color: 'white', margin: 0, letterSpacing: '-0.8px' }}>
          Ready to race smarter?
        </h2>
        <p style={{ fontSize: 16, color: '#475569', margin: 0, maxWidth: 380 }}>
          Free to use. No account required to browse. Connect iRacing for the full experience.
        </p>
        <a href="/app" style={{
          display: 'inline-flex', alignItems: 'center', gap: 10,
          padding: '14px 32px', borderRadius: 12,
          background: 'linear-gradient(135deg, #3B9EFF, #2563EB)',
          color: 'white', textDecoration: 'none',
          fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 16,
          boxShadow: '0 0 40px rgba(59,158,255,0.22)',
        }}>
          Open PitBoard <ArrowRight size={16} />
        </a>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────── */}
      <footer style={{
        borderTop: '1px solid rgba(255,255,255,0.07)', background: 'rgba(0,0,0,0.3)',
        padding: '20px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12,
      }}>
        <span style={{ fontSize: 12, color: '#1E293B' }}>
          PitBoard · Not affiliated with iRacing.com Motorsport Simulations
        </span>
        <div style={{ display: 'flex', gap: 16 }}>
          <a href="https://github.com/VictorSerradell/simplan.app" target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#334155', textDecoration: 'none' }}>
            <Github size={13} /> GitHub
          </a>
          <a href="https://ko-fi.com" target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#334155', textDecoration: 'none' }}>
            <Coffee size={13} /> Ko-fi
          </a>
        </div>
      </footer>

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800;900&family=DM+Mono:wght@400;500;600&display=swap');
        * { box-sizing: border-box; }
        body { margin: 0; }
      `}</style>
    </div>
  );
}