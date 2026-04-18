// /app/lib/iracing-token.ts
// Gets a valid iRacing access token — refreshes automatically if expired

import { NextRequest } from "next/server";
import { cookies } from "next/headers";

const OAUTH_TOKEN_URL = "https://oauth2.iracing.com/oauth2/token";

export async function getValidToken(
  request: NextRequest,
): Promise<string | null> {
  const accessToken = request.cookies.get("iracing_access_token")?.value;
  const refreshToken = request.cookies.get("iracing_refresh_token")?.value;

  // Access token still valid
  if (accessToken) return accessToken;

  // No refresh token — session fully expired
  if (!refreshToken) return null;

  const clientId = process.env.IRACING_CLIENT_ID;
  const clientSecret = process.env.IRACING_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  const params = new URLSearchParams({
    grant_type: "refresh_token",
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
  });

  let newToken: string | null = null;
  let maxAge = 600;

  try {
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
    newToken = data.access_token ?? null;
    maxAge = data.expires_in ?? 600;

    if (!newToken) return null;
    console.log("[token-refresh] success, expires_in:", maxAge);
  } catch (e) {
    console.error("[token-refresh] fetch error:", e);
    return null;
  }

  // Set new cookie — outside try/catch so any Next.js context error is visible
  try {
    cookies().set("iracing_access_token", newToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge,
      path: "/",
    });
  } catch (e) {
    console.error(
      "[token-refresh] cookie.set error (token still valid for this request):",
      e,
    );
  }

  return newToken;
}
