"use client";
// /app/components/LoginModal.tsx

import { useState } from "react";
import { X, ShieldCheck } from "lucide-react";

interface LoginModalProps {
  onClose: () => void;
  onSuccess: (userData: unknown) => void;
}

export default function LoginModal({ onClose, onSuccess }: LoginModalProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) {
      setError("Please enter your email and password.");
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/iracing/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: email, password }),
        credentials: "include",
      });

      const data = await res.json();
      if (!res.ok) {
        setError(
          data.error || "Authentication failed. Check your credentials.",
        );
        return;
      }
      onSuccess(data);
    } catch {
      setError("Network error. Please check your connection.");
    } finally {
      setLoading(false);
    }
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

        <div className="flex items-center gap-2 mb-1">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-400 to-violet-500 flex items-center justify-center">
            <ShieldCheck size={15} className="text-black" strokeWidth={2.5} />
          </div>
          <h2
            className="font-black text-xl tracking-tight"
            style={{ fontFamily: "Syne, sans-serif" }}
          >
            Connect iRacing
          </h2>
        </div>

        <p className="text-xs text-slate-400 mb-6 leading-relaxed mt-1">
          Sign in with your iRacing credentials to access your content, owned
          cars & tracks, and live race schedules.
        </p>

        {error && (
          <div className="bg-red-400/10 border border-red-400/20 rounded-lg px-3.5 py-2.5 text-red-400 text-xs mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-3.5">
          <div>
            <label className="block font-mono text-[10px] text-slate-600 uppercase tracking-widest mb-1.5">
              iRacing Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full bg-[#111520] border border-white/10 rounded-lg text-white text-sm px-3.5 py-2.5 outline-none transition-all placeholder:text-slate-600 focus:border-cyan-500/40 focus:shadow-[0_0_0_3px_rgba(0,229,255,0.06)]"
              autoComplete="email"
            />
          </div>
          <div>
            <label className="block font-mono text-[10px] text-slate-600 uppercase tracking-widest mb-1.5">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-[#111520] border border-white/10 rounded-lg text-white text-sm px-3.5 py-2.5 outline-none transition-all placeholder:text-slate-600 focus:border-cyan-500/40 focus:shadow-[0_0_0_3px_rgba(0,229,255,0.06)]"
              autoComplete="current-password"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-cyan-600 to-cyan-400 rounded-xl text-black font-black text-sm hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed mt-1"
            style={{ fontFamily: "Syne, sans-serif" }}
          >
            {loading ? "Connecting..." : "Connect Account"}
          </button>
        </form>

        <p className="text-[11px] text-slate-600 text-center mt-4 leading-relaxed">
          Your credentials are sent directly to iRacing via a secure proxy.
          <br />
          SimPlan never stores your password.
        </p>
      </div>
    </div>
  );
}
