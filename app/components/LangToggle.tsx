"use client";
// /app/components/LangToggle.tsx

import { useT } from "../lib/i18n";
import { useTheme } from "../lib/theme";

export default function LangToggle() {
  const { lang, setLang } = useT();
  const { theme } = useTheme();
  const isDark = theme === "dark";

  return (
    <div
      role="group"
      aria-label="Language selector"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 3,
        background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)",
        border: `1px solid ${isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.12)"}`,
        borderRadius: 10,
        padding: 2,
      }}
    >
      {(["en", "es"] as const).map((l) => (
        <button
          key={l}
          onClick={() => setLang(l)}
          aria-pressed={lang === l}
          aria-label={`Switch language to ${l === "en" ? "English" : "Spanish"}`}
          style={{
            minWidth: 38,
            minHeight: 38,
            padding: "8px 11px",
            borderRadius: 8,
            border: "none",
            cursor: "pointer",
            fontFamily: "Orbitron, monospace",
            fontWeight: 700,
            fontSize: 12,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            background:
              lang === l
                ? isDark
                  ? "rgba(255,255,255,0.16)"
                  : "rgba(0,0,0,0.12)"
                : "transparent",
            color:
              lang === l
                ? isDark
                  ? "#F8FAFC"
                  : "#0F172A"
                : isDark
                  ? "#CBD5E1"
                  : "#334155",
            transition: "all 0.15s",
          }}
        >
          {l}
        </button>
      ))}
    </div>
  );
}
