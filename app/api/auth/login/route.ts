// /app/api/auth/login/route.ts
// ─────────────────────────────────────────────────────────────────
// PASO 1 del flujo Authorization Code:
// El usuario clica "Connect iRacing" → esta ruta genera PKCE y
// redirige al usuario a la pantalla oficial de login de iRacing.
// ─────────────────────────────────────────────────────────────────

import { NextResponse } from "next/server";
import { randomBytes, createHash } from "crypto";

const OAUTH_AUTHORIZE_URL = "https://oauth.iracing.com/oauth2/authorize";

// code_verifier: 128 caracteres URL-safe aleatorios
function generateCodeVerifier(): string {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";
  const bytes = randomBytes(96);
  return Array.from(bytes)
    .map((b) => chars[b % chars.length])
    .join("")
    .slice(0, 128);
}

// code_challenge = base64url( SHA-256( code_verifier ) )  método S256
function generateCodeChallenge(verifier: string): string {
  return createHash("sha256")
    .update(verifier)
    .digest("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

// state aleatorio para prevenir CSRF
function generateState(): string {
  return randomBytes(32).toString("hex");
}

export async function GET() {
  const clientId = process.env.IRACING_CLIENT_ID;

  if (!clientId) {
    return NextResponse.json(
      {
        error: "IRACING_CLIENT_ID no configurado. Añádelo a .env.local",
        docs: "https://oauth.iracing.com/oauth2/book/client_registration.html",
      },
      { status: 503 },
    );
  }

  const redirectUri =
    process.env.IRACING_REDIRECT_URI ??
    "http://localhost:3000/api/auth/callback/iracing";

  const codeVerifier = generateCodeVerifier();
  const codeChallenge = generateCodeChallenge(codeVerifier);
  const state = generateState();

  // URL de autorización de iRacing
  const authUrl = new URL(OAUTH_AUTHORIZE_URL);
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("code_challenge", codeChallenge);
  authUrl.searchParams.set("code_challenge_method", "S256");
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("scope", "iracing.auth");

  // Redirigir al usuario a iRacing
  const response = NextResponse.redirect(authUrl.toString());

  // Guardar verifier y state en cookies httpOnly temporales
  // (solo duran el tiempo del flujo de login ~10 min)
  const isProduction = process.env.NODE_ENV === "production";
  const cookieOpts = {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax" as const,
    maxAge: 60 * 10,
    path: "/",
    // Share cookies across apex and www subdomain in production
    ...(isProduction && { domain: ".boxboxboard.app" }),
  };

  response.cookies.set("pkce_verifier", codeVerifier, cookieOpts);
  response.cookies.set("oauth_state", state, cookieOpts);

  return response;
}
  