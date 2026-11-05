"use client";
// /app/components/LoginModal.tsx

import { useEffect } from "react";
import { X, ShieldCheck, ExternalLink } from "lucide-react";
import { useTheme } from "../lib/theme";
import { useT } from "../lib/i18n";

interface LoginModalProps {
  onClose: () => void;
}

export default function LoginModal({ onClose }: LoginModalProps) {
  const { theme } = useTheme();
  const { t } = useT();
  const isDark = theme === "dark";

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  function handleConnect() {
    window.location.href = "/api/auth/login";
  }

  const bg = isDark ? "#0D1117" : "#FFFFFF";
  const border = isDark ? "rgba(255,255,255,0.14)" : "#E2E8F0";
  const itemBg = isDark ? "#111520" : "#F8FAFC";
  const itemBorder = isDark ? "#1E293B" : "#E2E8F0";
  const text = isDark ? "#F8FAFC" : "#0F172A";
  const muted = isDark ? "#CBD5E1" : "#334155";
  const faint = isDark ? "#94A3B8" : "#64748B";

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 2000,
        background: "rgba(0,0,0,0.7)",
        backdropFilter: "blur(12px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="login-modal-title"
        style={{
          background: bg,
          border: `1px solid ${border}`,
          borderRadius: 20,
          padding: "32px",
          width: 400,
          maxWidth: "100%",
          position: "relative",
          animation: "modalIn 0.25s ease",
        }}
      >
        {/* Close */}
        <button
          onClick={onClose}
          aria-label="Close login dialog"
          style={{
            position: "absolute",
            top: 12,
            right: 12,
            width: 44,
            height: 44,
            borderRadius: 10,
            background: itemBg,
            border: `1px solid ${itemBorder}`,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: muted,
          }}
        >
          <X size={18} strokeWidth={2.5} />
        </button>

        {/* Icon */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            marginBottom: 20,
          }}
        >
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 18,
              background: "rgba(232,0,45,0.08)",
              border: `1px solid ${border}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <ShieldCheck size={30} color="#22D3EE" strokeWidth={1.5} />
          </div>
        </div>

        {/* Title */}
        <h2
          id="login-modal-title"
          style={{
            fontFamily: "Rajdhani, sans-serif",
            fontWeight: 900,
            fontSize: 20,
            color: "var(--text-primary)",
            textAlign: "center",
            margin: "0 0 8px",
            letterSpacing: "-0.4px",
          }}
        >
          {t.connectIRacing}
        </h2>

        {/* Subtitle */}
        <p
          style={{
            fontSize: 12,
            color: muted,
            textAlign: "center",
            margin: "0 0 20px",
            lineHeight: 1.6,
          }}
        >
          {t.loginRedirect}
        </p>

        {/* Benefits */}
        <div
          style={{
            background: itemBg,
            border: `1px solid ${itemBorder}`,
            borderRadius: 12,
            padding: "14px 16px",
            marginBottom: 20,
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          {[t.loginBenefit1, t.loginBenefit2, t.loginBenefit3].map(
            (item, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  fontSize: 13,
                  color: text,
                }}
              >
                <span
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: "50%",
                    background: "rgba(34,211,238,0.1)",
                    border: "1px solid rgba(34,211,238,0.2)",
                    color: "#22D3EE",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 10,
                    fontWeight: 700,
                    flexShrink: 0,
                  }}
                >
                  ✓
                </span>
                {item}
              </div>
            ),
          )}
        </div>

        {/* CTA */}
        <button
          onClick={handleConnect}
          style={{
            width: "100%",
            padding: "13px",
            background: "#E8002D",
            border: "none",
            borderRadius: 12,
            cursor: "pointer",
            fontFamily: "Rajdhani, sans-serif",
            fontWeight: 900,
            fontSize: 14,
            color: "#FFFFFF",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
          }}
        >
          {t.loginCta}
          <ExternalLink size={14} strokeWidth={2.5} />
        </button>

        {/* Fine print */}
        <p
          style={{
            fontSize: 11,
            color: faint,
            textAlign: "center",
            margin: "14px 0 0",
            lineHeight: 1.6,
          }}
        >
          {t.loginFinePrint}
        </p>
      </div>

      <style>{`
        @keyframes modalIn {
          from { opacity: 0; transform: translateY(-12px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
}
