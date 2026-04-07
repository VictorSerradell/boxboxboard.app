"use client";
// /app/components/InstallBanner.tsx
// Banner discreto que aparece cuando el navegador ofrece instalar la PWA

import { useState, useEffect } from "react";
import { Download, X } from "lucide-react";
import { useTheme } from "../lib/theme";
import { useT } from "../lib/i18n";

export default function InstallBanner() {
  const [prompt, setPrompt] = useState<any>(null);
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const { theme } = useTheme();
  const { t } = useT();
  const isDark = theme === "dark";

  useEffect(() => {
    // Don't show if already dismissed this session
    if (sessionStorage.getItem("boxboxboard_install_dismissed")) return;

    function handler(e: Event) {
      e.preventDefault();
      setPrompt(e);
      setVisible(true);
    }
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  async function install() {
    if (!prompt) return;
    prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === "accepted") setVisible(false);
    setPrompt(null);
  }

  function dismiss() {
    setVisible(false);
    setDismissed(true);
    sessionStorage.setItem("boxboxboard_install_dismissed", "1");
  }

  if (!visible || dismissed) return null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: 80,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 1500,
        width: "min(380px, calc(100vw - 32px))",
        background: isDark ? "#0A1628" : "#FFFFFF",
        border: `1px solid rgba(232,0,45,0.1)`,
        borderRadius: 14,
        boxShadow: isDark
          ? "0 8px 32px rgba(0,0,0,0.5)"
          : "0 8px 24px rgba(0,0,0,0.12)",
        overflow: "hidden",
        animation: "slideUp 0.3s ease",
      }}
    >
      <div
        style={{
          height: 3,
          background: "linear-gradient(90deg, #E8002D, #FF4060)",
        }}
      />
      <div
        style={{
          padding: "14px 16px",
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        {/* Icon */}
        <img
          src="/icon.png"
          alt="BoxBoxBoard"
          style={{ width: 40, height: 40, borderRadius: 10, flexShrink: 0 }}
        />
        {/* Text */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p
            style={{
              fontFamily: "Syne, sans-serif",
              fontWeight: 800,
              fontSize: 13,
              color: isDark ? "white" : "#0F172A",
              margin: 0,
            }}
          >
            {t.installTitle}
          </p>
          <p
            style={{
              fontFamily: "DM Sans, sans-serif",
              fontSize: 12,
              color: isDark ? "#666677" : "#999AAA",
              margin: "2px 0 0",
            }}
          >
            {t.installDesc}
          </p>
        </div>
        {/* Actions */}
        <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
          <button
            onClick={install}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              padding: "7px 12px",
              borderRadius: 8,
              border: "none",
              cursor: "pointer",
              background: "#E8002D",
              color: "white",
              fontFamily: "Syne, sans-serif",
              fontWeight: 700,
              fontSize: 12,
            }}
          >
            <Download size={13} /> {t.installBtn}
          </button>
          <button
            onClick={dismiss}
            style={{
              width: 30,
              height: 30,
              borderRadius: 8,
              border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}`,
              background: isDark ? "#141418" : "rgba(0,0,0,0.04)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: isDark ? "#555566" : "#999AAA",
            }}
          >
            <X size={13} />
          </button>
        </div>
      </div>
      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateX(-50%) translateY(12px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      `}</style>
    </div>
  );
}
