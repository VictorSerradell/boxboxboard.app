"use client";
// /app/components/ThemeToggle.tsx

import { Sun, Moon } from "lucide-react";
import { useTheme } from "../lib/theme";

export default function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      onClick={toggle}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      style={{
        width: 36,
        height: 36,
        borderRadius: 10,
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--bg-card)",
        border: "1px solid var(--border)",
        color: "var(--text-muted)",
        transition: "all 0.15s ease",
        flexShrink: 0,
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.color = "var(--text-primary)";
        (e.currentTarget as HTMLElement).style.borderColor =
          "var(--border-hover)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.color = "var(--text-muted)";
        (e.currentTarget as HTMLElement).style.borderColor = "var(--border)";
      }}
    >
      {isDark ? (
        <Sun size={15} strokeWidth={2} />
      ) : (
        <Moon size={15} strokeWidth={2} />
      )}
    </button>
  );
}