// /app/lib/iracing-token.ts
// Gets a valid iRacing access token — refreshes automatically if expired

import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const OAUTH_TOKEN_URL = "https://oauth2.iracing.com/oauth2/token";

interface TokenResult {
  token: string;
  headers: Record<string, string>; // Set-Cookie headers to forward if refreshed
}

/**
 * Returns a valid access token for the current request.
 * If the access token cookie is missing but a refresh token exists,
 * exchanges it for a new access token and returns Set-Cookie headers.
 * Returns null if no valid session exists.
 */
export async function getValidToken(): Promise<TokenResult | null> {
  const cookieStore = await (cookies as any)();
  const accessToken = cookieStore.get("iracing_access_token")?.value;
  const refreshToken = cookieStore.get("iracing_refresh_token")?.value;

  // Access token still valid
  if (accessToken) return { token: accessToken, headers: {} };

  // Try refresh
  if (!refreshToken) return null;

  const clientId = process.env.IRACING_CLIENT_ID;
  const clientSecret = process.env.IRACING_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  try {
    const params = new URLSearchParams({
      grant_type: "refresh_token",
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
    });

    const res = await fetch(OAUTH_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });

    if (!res.ok) {
      console.error("[token-refresh] failed:", res.status);
      return null;
    }

    const data = await res.json();
    const newToken = data.access_token;
    if (!newToken) return null;

    console.log(
      "[token-refresh] refreshed successfully, expires_in:",
      data.expires_in,
    );

    const isProduction = process.env.NODE_ENV === "production";
    const maxAge = data.expires_in ?? 600;
    const cookieOpts = [
      `iracing_access_token=${newToken}`,
      `Max-Age=${maxAge}`,
      `Path=/`,
      `HttpOnly`,
      isProduction ? "Secure" : "",
      "SameSite=Lax",
    ]
      .filter(Boolean)
      .join("; ");

    return { token: newToken, headers: { "Set-Cookie": cookieOpts } };
  } catch (e) {
    console.error("[token-refresh] error:", e);
    return null;
  }
}
