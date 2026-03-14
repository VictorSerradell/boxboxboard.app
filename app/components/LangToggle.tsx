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
      style={{
        display: "flex",
        gap: 2,
        background: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)",
        border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}`,
        borderRadius: 8,
        padding: 2,
      }}
    >
      {(["en", "es"] as const).map((l) => (
        <button
          key={l}
          onClick={() => setLang(l)}
          style={{
            padding: "4px 9px",
            borderRadius: 6,
            border: "none",
            cursor: "pointer",
            fontFamily: "DM Mono, monospace",
            fontWeight: 700,
            fontSize: 11,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            background:
              lang === l
                ? isDark
                  ? "rgba(255,255,255,0.12)"
                  : "rgba(0,0,0,0.10)"
                : "transparent",
            color:
              lang === l
                ? isDark
                  ? "#E2E8F0"
                  : "#1E293B"
                : isDark
                  ? "#475569"
                  : "#94A3B8",
            transition: "all 0.15s",
          }}
        >
          {l}
        </button>
      ))}
    </div>
  );
}
