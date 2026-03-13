"use client";
// /app/components/LoginModal.tsx
// Authorization Code flow — el usuario es redirigido a iRacing
// para autenticarse en su pantalla oficial, sin exponer credenciales.

import { X, ShieldCheck, ExternalLink } from "lucide-react";

interface LoginModalProps {
  onClose: () => void;
}

export default function LoginModal({ onClose }: LoginModalProps) {
  function handleConnect() {
    // Redirige al endpoint que genera PKCE y lanza el flujo OAuth2
    window.location.href = "/api/auth/login";
  }

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-lg z-[200] flex items-center justify-center"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-[#0D1117] border border-white/10 rounded-2xl p-8 w-[400px] max-w-[calc(100vw-2rem)] relative animate-in">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-7 h-7 bg-[#111520] border border-white/06 rounded-lg text-slate-400 hover:text-white flex items-center justify-center transition-colors"
        >
          <X size={12} strokeWidth={2.5} />
        </button>

        {/* Icon */}
        <div className="flex justify-center mb-5">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-violet-500/20 border border-white/10 flex items-center justify-center">
            <ShieldCheck
              size={32}
              className="text-cyan-400"
              strokeWidth={1.5}
            />
          </div>
        </div>

        <h2
          className="font-black text-xl tracking-tight text-center mb-2"
          style={{ fontFamily: "Syne, sans-serif" }}
        >
          Connect iRacing
        </h2>

        <p className="text-xs text-slate-400 text-center mb-6 leading-relaxed">
          You'll be redirected to iRacing's official login page. PitBoard never
          sees your password.
        </p>

        {/* What you get */}
        <div className="bg-[#111520] border border-white/06 rounded-xl p-4 mb-6 space-y-2.5">
          {[
            "Real season schedules & track rotations",
            "See which cars & tracks you own",
            "Sync favorites across devices",
          ].map((item) => (
            <div
              key={item}
              className="flex items-center gap-2.5 text-xs text-slate-300"
            >
              <span className="w-4 h-4 rounded-full bg-cyan-400/10 border border-cyan-400/20 text-cyan-400 flex items-center justify-center flex-shrink-0 text-[10px]">
                ✓
              </span>
              {item}
            </div>
          ))}
        </div>

        <button
          onClick={handleConnect}
          className="w-full py-3 bg-gradient-to-r from-cyan-600 to-cyan-400 rounded-xl text-black font-black text-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
          style={{ fontFamily: "Syne, sans-serif" }}
        >
          Continue with iRacing
          <ExternalLink size={14} strokeWidth={2.5} />
        </button>

        <p className="text-[11px] text-slate-600 text-center mt-4 leading-relaxed">
          You'll be taken to oauth.iracing.com to sign in securely.
          <br />
          PitBoard only requests read-only access.
        </p>
      </div>
    </div>
  );
}
