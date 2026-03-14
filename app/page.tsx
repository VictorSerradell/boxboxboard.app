"use client";
// /app/page.tsx — PitBoard landing page

import { useState, useEffect, useRef } from "react";
import {
  ArrowRight,
  Flag,
  Calendar,
  Car,
  BarChart2,
  Shield,
  Users,
  Github,
  Coffee,
  Star,
  LogIn,
  Filter,
  Eye,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import ThemeToggle from "./components/ThemeToggle";
import LangToggle from "./components/LangToggle";
import { useT } from "./lib/i18n";
import { useTheme } from "./lib/theme";

const ACCENT = "#3B9EFF";

const CATEGORY_COLORS: Record<string, string> = {
  "Sports Car": "#3B9EFF",
  Formula: "#A855F7",
  Oval: "#F97316",
  "Dirt Oval": "#EAB308",
  "Dirt Road": "#22C55E",
};

const DEMO_SERIES = [
  {
    name: "iRacing Endurance Series",
    cat: "Sports Car",
    lic: "B",
    weeks: 6,
    duration: "8h",
  },
  {
    name: "Porsche TAG Heuer Supercup",
    cat: "Sports Car",
    lic: "A",
    weeks: 8,
    duration: "30m",
  },
  {
    name: "Formula iRacing",
    cat: "Formula",
    lic: "B",
    weeks: 7,
    duration: "20m",
  },
  {
    name: "NASCAR Cup Series",
    cat: "Oval",
    lic: "C",
    weeks: 8,
    duration: "1h",
  },
  {
    name: "IMSA Sportscar Championship",
    cat: "Sports Car",
    lic: "C",
    weeks: 7,
    duration: "1h30m",
  },
  { name: "IndyCar Series", cat: "Oval", lic: "A", weeks: 8, duration: "45m" },
];

// Iconos en orden fijo — los textos vienen de t.features
const FEATURE_ICONS = [
  <Calendar size={20} />,
  <Car size={20} />,
  <BarChart2 size={20} />,
  <Shield size={20} />,
  <Flag size={20} />,
  <Users size={20} />,
];

// ── Hook: scroll-triggered visibility ────────────────────────
function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          obs.disconnect();
        }
      },
      { threshold },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, inView };
}

// ── Animated counter ─────────────────────────────────────────
function Counter({ to, suffix = "" }: { to: number; suffix?: string }) {
  const [val, setVal] = useState(0);
  const { ref, inView } = useInView(0.5);
  useEffect(() => {
    if (!inView) return;
    let start = 0;
    const step = Math.ceil(to / 40);
    const id = setInterval(() => {
      start += step;
      if (start >= to) {
        setVal(to);
        clearInterval(id);
      } else setVal(start);
    }, 30);
    return () => clearInterval(id);
  }, [inView, to]);
  return (
    <span ref={ref}>
      {val.toLocaleString()}
      {suffix}
    </span>
  );
}

// ── Mini preview card ─────────────────────────────────────────
function MiniCard({
  name,
  cat,
  lic,
  weeks,
  duration,
  delay,
  isDark,
}: (typeof DEMO_SERIES)[0] & { delay: number; isDark: boolean }) {
  const accent = CATEGORY_COLORS[cat] ?? ACCENT;
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(t);
  }, [delay]);

  return (
    <div
      style={{
        background: isDark ? "#070D19" : "#FFFFFF",
        border: `1px solid ${accent}30`,
        borderRadius: 12,
        overflow: "hidden",
        flexShrink: 0,
        width: 210,
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(14px)",
        transition: "opacity 0.5s ease, transform 0.5s ease",
        boxShadow: isDark ? "none" : "0 2px 12px rgba(0,0,0,0.07)",
      }}
    >
      <div
        style={{
          background: `linear-gradient(135deg, ${accent}15 0%, transparent 100%)`,
          borderBottom: `1px solid ${accent}20`,
          padding: "12px 14px 10px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            marginBottom: 7,
          }}
        >
          <div
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: accent,
            }}
          />
          <span
            style={{
              fontFamily: "DM Mono, monospace",
              fontSize: 10,
              fontWeight: 700,
              color: accent,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
            }}
          >
            {cat}
          </span>
        </div>
        <p
          style={{
            fontFamily: "Syne, sans-serif",
            fontWeight: 800,
            fontSize: 13,
            color: isDark ? "white" : "#0F172A",
            margin: 0,
            lineHeight: 1.3,
          }}
        >
          {name}
        </p>
      </div>
      <div style={{ padding: "8px 14px", display: "flex", gap: 14 }}>
        {[
          { label: "Lic", value: lic },
          { label: "Weeks", value: String(weeks) },
          { label: "Time", value: duration },
        ].map((s) => (
          <div key={s.label}>
            <div
              style={{
                fontFamily: "DM Mono, monospace",
                fontSize: 9,
                color: isDark ? "#334155" : "#94A3B8",
                textTransform: "uppercase",
                letterSpacing: "0.1em",
              }}
            >
              {s.label}
            </div>
            <div
              style={{
                fontFamily: "DM Mono, monospace",
                fontSize: 12,
                fontWeight: 700,
                color: isDark ? "rgba(255,255,255,0.75)" : "#1E293B",
                marginTop: 2,
              }}
            >
              {s.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── FAQ item ──────────────────────────────────────────────────
function FaqItem({ q, a, isDark }: { q: string; a: string; isDark: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      style={{
        borderRadius: 12,
        overflow: "hidden",
        border: `1px solid ${open ? "rgba(59,158,255,0.3)" : isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.09)"}`,
        transition: "border-color 0.2s",
      }}
    >
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "18px 20px",
          background: "transparent",
          border: "none",
          cursor: "pointer",
          gap: 16,
          textAlign: "left",
        }}
      >
        <span
          style={{
            fontFamily: "Syne, sans-serif",
            fontWeight: 700,
            fontSize: 15,
            color: isDark ? "rgba(255,255,255,0.9)" : "#0F172A",
          }}
        >
          {q}
        </span>
        <span
          style={{
            color: open ? ACCENT : isDark ? "#475569" : "#94A3B8",
            flexShrink: 0,
            transition: "color 0.2s",
          }}
        >
          {open ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </span>
      </button>
      {open && (
        <div style={{ padding: "0 20px 18px" }}>
          <p
            style={{
              fontSize: 14,
              color: isDark ? "#64748B" : "#475569",
              lineHeight: 1.7,
              margin: 0,
            }}
          >
            {a}
          </p>
        </div>
      )}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────
export default function LandingPage() {
  const [heroVisible, setHeroVisible] = useState(false);
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const { t } = useT();

  useEffect(() => {
    setTimeout(() => setHeroVisible(true), 80);
  }, []);

  const featuresAnim = useInView();
  const howAnim = useInView();
  const statsAnim = useInView(0.3);
  const faqAnim = useInView();
  const ctaAnim = useInView();

  // Theme tokens
  const T = {
    text: isDark ? "#FFFFFF" : "#0F172A",
    textSub: isDark ? "#64748B" : "#475569",
    textMuted: isDark ? "#334155" : "#94A3B8",
    border: isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.08)",
    cardBg: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)",
    cardBorder: isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.08)",
    footerBg: isDark ? "rgba(0,0,0,0.3)" : "rgba(0,0,0,0.04)",
    githubBtn: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)",
    githubBtnBorder: isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.12)",
    githubBtnColor: isDark ? "#94A3B8" : "#64748B",
    stepNum: isDark ? "rgba(59,158,255,0.12)" : "rgba(59,158,255,0.08)",
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--bg-base)",
        color: T.text,
        overflowX: "hidden",
      }}
    >
      {/* ── NAV ─────────────────────────────────────────────── */}
      <nav
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 100,
          height: 60,
          background: "var(--bg-header)",
          backdropFilter: "blur(20px)",
          borderBottom: `1px solid ${T.border}`,
          display: "flex",
          alignItems: "center",
          padding: "0 32px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
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
              fontSize: 18,
              color: "var(--text-primary)",
              letterSpacing: "-0.4px",
            }}
          >
            PitBoard
          </span>
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <LangToggle />
          <ThemeToggle />
          <a
            href="https://github.com/VictorSerradell/simplan.app"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 7,
              padding: "7px 14px",
              borderRadius: 8,
              border: `1px solid ${T.githubBtnBorder}`,
              background: T.githubBtn,
              color: T.githubBtnColor,
              textDecoration: "none",
              fontSize: 13,
              fontFamily: "Syne, sans-serif",
              fontWeight: 600,
            }}
          >
            <Github size={14} /> GitHub
          </a>
          <a
            href="/app"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 7,
              padding: "8px 18px",
              borderRadius: 8,
              background: "linear-gradient(135deg, #3B9EFF, #2563EB)",
              color: "white",
              textDecoration: "none",
              fontFamily: "Syne, sans-serif",
              fontWeight: 700,
              fontSize: 13,
              boxShadow: "0 0 20px rgba(59,158,255,0.2)",
            }}
          >
            {t.openApp} <ArrowRight size={14} />
          </a>
        </div>
      </nav>

      {/* ── HERO ────────────────────────────────────────────── */}
      <section
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "120px 32px 80px",
          position: "relative",
          textAlign: "center",
        }}
      >
        {/* Glow */}
        <div
          style={{
            position: "absolute",
            top: "25%",
            left: "50%",
            transform: "translateX(-50%)",
            width: 700,
            height: 500,
            borderRadius: "50%",
            background:
              "radial-gradient(ellipse, rgba(59,158,255,0.07) 0%, transparent 70%)",
            pointerEvents: "none",
          }}
        />

        {/* Badge */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "6px 16px",
            borderRadius: 20,
            marginBottom: 28,
            background: "rgba(59,158,255,0.1)",
            border: "1px solid rgba(59,158,255,0.25)",
            opacity: heroVisible ? 1 : 0,
            transform: heroVisible ? "translateY(0)" : "translateY(8px)",
            transition: "opacity 0.5s ease, transform 0.5s ease",
          }}
        >
          <Star size={12} color="#3B9EFF" fill="#3B9EFF" />
          <span
            style={{
              fontFamily: "DM Mono, monospace",
              fontSize: 12,
              fontWeight: 600,
              color: "#3B9EFF",
              letterSpacing: "0.06em",
            }}
          >
            {t.freeOpenSource}
          </span>
        </div>

        {/* Headline */}
        <h1
          style={{
            fontFamily: "Syne, sans-serif",
            fontWeight: 900,
            fontSize: "clamp(38px, 7vw, 74px)",
            lineHeight: 1.05,
            letterSpacing: "-2px",
            color: "var(--text-primary)",
            margin: "0 0 16px",
            maxWidth: 820,
            opacity: heroVisible ? 1 : 0,
            transform: heroVisible ? "translateY(0)" : "translateY(12px)",
            transition: "opacity 0.6s ease 0.1s, transform 0.6s ease 0.1s",
          }}
        >
          {t.heroTitle1}
          <br />
          <span
            style={{
              background: "linear-gradient(90deg, #3B9EFF 0%, #A855F7 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            {t.heroTitle2}
          </span>
        </h1>

        <p
          style={{
            fontSize: 18,
            color: T.textSub,
            lineHeight: 1.7,
            maxWidth: 500,
            margin: "0 0 44px",
            opacity: heroVisible ? 1 : 0,
            transform: heroVisible ? "translateY(0)" : "translateY(12px)",
            transition: "opacity 0.6s ease 0.2s, transform 0.6s ease 0.2s",
          }}
        >
          Browse every series, track rotation and schedule for the current{" "}
          {t.heroTitle2}. Filter by license, category, and owned content.
        </p>

        {/* CTAs */}
        <div
          style={{
            display: "flex",
            gap: 12,
            flexWrap: "wrap",
            justifyContent: "center",
            opacity: heroVisible ? 1 : 0,
            transform: heroVisible ? "translateY(0)" : "translateY(12px)",
            transition: "opacity 0.6s ease 0.3s, transform 0.6s ease 0.3s",
          }}
        >
          <a
            href="/app"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 10,
              padding: "14px 30px",
              borderRadius: 12,
              background: "linear-gradient(135deg, #3B9EFF, #2563EB)",
              color: "white",
              textDecoration: "none",
              fontFamily: "Syne, sans-serif",
              fontWeight: 800,
              fontSize: 16,
              boxShadow: "0 0 40px rgba(59,158,255,0.28)",
            }}
          >
            {t.openPitBoard} <ArrowRight size={16} />
          </a>
          <a
            href="https://github.com/VictorSerradell/simplan.app"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 10,
              padding: "14px 30px",
              borderRadius: 12,
              background: T.githubBtn,
              border: `1px solid ${T.githubBtnBorder}`,
              color: T.githubBtnColor,
              textDecoration: "none",
              fontFamily: "Syne, sans-serif",
              fontWeight: 700,
              fontSize: 16,
            }}
          >
            <Github size={16} /> {t.viewOnGithub}
          </a>
        </div>

        {/* Preview cards */}
        <div
          style={{
            marginTop: 68,
            display: "flex",
            gap: 12,
            justifyContent: "center",
            flexWrap: "wrap",
            maxWidth: 1050,
            opacity: heroVisible ? 1 : 0,
            transition: "opacity 0.6s ease 0.5s",
          }}
        >
          {DEMO_SERIES.map((s, i) => (
            <MiniCard
              key={s.name}
              {...s}
              delay={600 + i * 90}
              isDark={isDark}
            />
          ))}
        </div>
      </section>

      {/* ── STATS BAR ───────────────────────────────────────── */}
      <div
        ref={statsAnim.ref}
        style={{
          borderTop: `1px solid ${T.border}`,
          borderBottom: `1px solid ${T.border}`,
          padding: "32px 32px",
          display: "flex",
          justifyContent: "center",
          gap: 0,
          flexWrap: "wrap",
        }}
      >
        {[
          { label: "{t.seriesPerSeason}", value: 80, suffix: "+" },
          { label: "{t.activeDrivers}", value: 80000, suffix: "+" },
          { label: "{t.trackConfigs}", value: 120, suffix: "+" },
          { label: "{t.seasonsTracked}", value: 4, suffix: "" },
        ].map((stat, i) => (
          <div
            key={i}
            style={{
              flex: "1 1 180px",
              textAlign: "center",
              padding: "12px 24px",
              borderRight: i < 3 ? `1px solid ${T.border}` : "none",
            }}
          >
            <div
              style={{
                fontFamily: "Syne, sans-serif",
                fontWeight: 900,
                fontSize: 36,
                color: ACCENT,
                letterSpacing: "-1px",
                opacity: statsAnim.inView ? 1 : 0,
                transition: `opacity 0.5s ease ${i * 0.1}s`,
              }}
            >
              {statsAnim.inView ? (
                <Counter to={stat.value} suffix={stat.suffix} />
              ) : (
                "0"
              )}
            </div>
            <div
              style={{
                fontFamily: "DM Mono, monospace",
                fontSize: 11,
                color: T.textMuted,
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                marginTop: 4,
              }}
            >
              {stat.label}
            </div>
          </div>
        ))}
      </div>

      {/* ── HOW IT WORKS ────────────────────────────────────── */}
      <section
        ref={howAnim.ref}
        style={{ padding: "88px 32px", maxWidth: 1000, margin: "0 auto" }}
      >
        <div style={{ textAlign: "center", marginBottom: 56 }}>
          <h2
            style={{
              fontFamily: "Syne, sans-serif",
              fontWeight: 900,
              fontSize: "clamp(26px, 4vw, 40px)",
              letterSpacing: "-1px",
              color: "var(--text-primary)",
              margin: "0 0 14px",
              opacity: howAnim.inView ? 1 : 0,
              transform: howAnim.inView ? "translateY(0)" : "translateY(20px)",
              transition: "opacity 0.6s ease, transform 0.6s ease",
            }}
          >
            {t.howItWorksTitle}
          </h2>
          <p
            style={{
              fontSize: 16,
              color: T.textSub,
              maxWidth: 420,
              margin: "0 auto",
              opacity: howAnim.inView ? 1 : 0,
              transition: "opacity 0.6s ease 0.1s",
            }}
          >
            {t.howItWorksSubtitle}
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: 24,
          }}
        >
          {[
            {
              step: "01",
              icon: <Eye size={24} />,
              title: t.step1Title,
              desc: t.step1Desc,
            },
            {
              step: "02",
              icon: <Filter size={24} />,
              title: t.step2Title,
              desc: t.step2Desc,
            },
            {
              step: "03",
              icon: <LogIn size={24} />,
              title: t.step3Title,
              desc: t.step3Desc,
            },
          ].map((step, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 16,
                padding: "28px",
                borderRadius: 16,
                background: T.cardBg,
                border: `1px solid ${T.cardBorder}`,
                opacity: howAnim.inView ? 1 : 0,
                transform: howAnim.inView
                  ? "translateY(0)"
                  : "translateY(24px)",
                transition: `opacity 0.6s ease ${0.1 + i * 0.12}s, transform 0.6s ease ${0.1 + i * 0.12}s`,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 14,
                    background: "rgba(59,158,255,0.1)",
                    border: "1px solid rgba(59,158,255,0.2)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: ACCENT,
                    flexShrink: 0,
                  }}
                >
                  {step.icon}
                </div>
                <span
                  style={{
                    fontFamily: "DM Mono, monospace",
                    fontSize: 13,
                    fontWeight: 700,
                    color: ACCENT,
                    letterSpacing: "0.06em",
                  }}
                >
                  {step.step}
                </span>
              </div>
              <h3
                style={{
                  fontFamily: "Syne, sans-serif",
                  fontWeight: 800,
                  fontSize: 17,
                  color: "var(--text-primary)",
                  margin: 0,
                }}
              >
                {step.title}
              </h3>
              <p
                style={{
                  fontSize: 14,
                  color: T.textSub,
                  lineHeight: 1.65,
                  margin: 0,
                }}
              >
                {step.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── FEATURES ────────────────────────────────────────── */}
      <section
        ref={featuresAnim.ref}
        style={{ padding: "72px 32px 88px", maxWidth: 1100, margin: "0 auto" }}
      >
        <div style={{ textAlign: "center", marginBottom: 52 }}>
          <h2
            style={{
              fontFamily: "Syne, sans-serif",
              fontWeight: 900,
              fontSize: "clamp(26px, 4vw, 40px)",
              letterSpacing: "-1px",
              color: "var(--text-primary)",
              margin: "0 0 14px",
              opacity: featuresAnim.inView ? 1 : 0,
              transform: featuresAnim.inView
                ? "translateY(0)"
                : "translateY(20px)",
              transition: "opacity 0.6s ease, transform 0.6s ease",
            }}
          >
            {t.everythingTitle}
          </h2>
          <p
            style={{
              fontSize: 16,
              color: T.textSub,
              maxWidth: 460,
              margin: "0 auto",
              opacity: featuresAnim.inView ? 1 : 0,
              transition: "opacity 0.6s ease 0.1s",
            }}
          >
            {t.everythingSubtitle}
          </p>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
            gap: 14,
          }}
        >
          {t.features.map((f, i) => (
            <div
              key={i}
              style={{
                padding: "24px",
                borderRadius: 14,
                background: T.cardBg,
                border: `1px solid ${T.cardBorder}`,
                transition:
                  "border-color 0.2s, background 0.2s, transform 0.2s",
                opacity: featuresAnim.inView ? 1 : 0,
                transform: featuresAnim.inView
                  ? "translateY(0)"
                  : "translateY(24px)",
                transitionDelay: `${i * 0.07}s`,
              }}
              onMouseEnter={(e) => {
                const el = e.currentTarget as HTMLElement;
                el.style.borderColor = "rgba(59,158,255,0.28)";
                el.style.background = "rgba(59,158,255,0.04)";
                el.style.transform = "translateY(-3px)";
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget as HTMLElement;
                el.style.borderColor = T.cardBorder;
                el.style.background = T.cardBg;
                el.style.transform = "translateY(0)";
              }}
            >
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 10,
                  marginBottom: 16,
                  background: "rgba(59,158,255,0.1)",
                  border: "1px solid rgba(59,158,255,0.2)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: ACCENT,
                }}
              >
                {FEATURE_ICONS[i]}
              </div>
              <h3
                style={{
                  fontFamily: "Syne, sans-serif",
                  fontWeight: 800,
                  fontSize: 16,
                  color: "var(--text-primary)",
                  margin: "0 0 8px",
                }}
              >
                {f.title}
              </h3>
              <p
                style={{
                  fontSize: 14,
                  color: T.textSub,
                  lineHeight: 1.65,
                  margin: 0,
                }}
              >
                {f.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── FAQ ─────────────────────────────────────────────── */}
      <section
        ref={faqAnim.ref}
        style={{ padding: "72px 32px 88px", maxWidth: 740, margin: "0 auto" }}
      >
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <h2
            style={{
              fontFamily: "Syne, sans-serif",
              fontWeight: 900,
              fontSize: "clamp(26px, 4vw, 40px)",
              letterSpacing: "-1px",
              color: "var(--text-primary)",
              margin: "0 0 14px",
              opacity: faqAnim.inView ? 1 : 0,
              transform: faqAnim.inView ? "translateY(0)" : "translateY(20px)",
              transition: "opacity 0.6s ease, transform 0.6s ease",
            }}
          >
            {t.faqTitle}
          </h2>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {t.faq.map((item, i) => (
            <div
              key={i}
              style={{
                opacity: faqAnim.inView ? 1 : 0,
                transform: faqAnim.inView
                  ? "translateY(0)"
                  : "translateY(16px)",
                transition: `opacity 0.5s ease ${i * 0.07}s, transform 0.5s ease ${i * 0.07}s`,
              }}
            >
              <FaqItem q={item.q} a={item.a} isDark={isDark} />
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA FINAL ───────────────────────────────────────── */}
      <section
        ref={ctaAnim.ref}
        style={{
          padding: "56px 32px 88px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
          gap: 20,
          borderTop: `1px solid ${T.border}`,
        }}
      >
        <h2
          style={{
            fontFamily: "Syne, sans-serif",
            fontWeight: 900,
            fontSize: "clamp(22px, 3.5vw, 36px)",
            color: "var(--text-primary)",
            margin: 0,
            letterSpacing: "-0.8px",
            opacity: ctaAnim.inView ? 1 : 0,
            transform: ctaAnim.inView ? "translateY(0)" : "translateY(16px)",
            transition: "opacity 0.6s ease, transform 0.6s ease",
          }}
        >
          {t.readyTitle}
        </h2>
        <p
          style={{
            fontSize: 16,
            color: T.textSub,
            margin: 0,
            maxWidth: 380,
            opacity: ctaAnim.inView ? 1 : 0,
            transition: "opacity 0.6s ease 0.1s",
          }}
        >
          {t.readyCta}
        </p>
        <a
          href="/app"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 10,
            padding: "14px 32px",
            borderRadius: 12,
            background: "linear-gradient(135deg, #3B9EFF, #2563EB)",
            color: "white",
            textDecoration: "none",
            fontFamily: "Syne, sans-serif",
            fontWeight: 800,
            fontSize: 16,
            boxShadow: "0 0 40px rgba(59,158,255,0.22)",
            opacity: ctaAnim.inView ? 1 : 0,
            transform: ctaAnim.inView ? "translateY(0)" : "translateY(16px)",
            transition: "opacity 0.6s ease 0.2s, transform 0.6s ease 0.2s",
          }}
        >
          {t.openPitBoard} <ArrowRight size={16} />
        </a>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────── */}
      <footer
        style={{
          borderTop: `1px solid ${T.border}`,
          background: T.footerBg,
          padding: "20px 32px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <span style={{ fontSize: 12, color: T.textMuted }}>
          {t.notAffiliated}
        </span>
        <div style={{ display: "flex", gap: 16 }}>
          <a
            href="https://github.com/VictorSerradell/simplan.app"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontSize: 13,
              color: T.textMuted,
              textDecoration: "none",
            }}
          >
            <Github size={13} /> GitHub
          </a>
          <a
            href="https://ko-fi.com"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontSize: 13,
              color: T.textMuted,
              textDecoration: "none",
            }}
          >
            <Coffee size={13} /> Ko-fi
          </a>
        </div>
      </footer>
    </div>
  );
}
