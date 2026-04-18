// /app/lib/iracing-token.ts
// Gets a valid iRacing access token — refreshes automatically if expired

import { NextRequest } from "next/server";
import { cookies } from "next/headers";

const OAUTH_TOKEN_URL = "https://oauth2.iracing.com/oauth2/token";

/**
 * Returns a valid access token from the request cookies.
 * If the access token is expired but a refresh token exists,
 * exchanges it silently and sets the new cookie directly.
 */
export async function getValidToken(
  request: NextRequest,
): Promise<string | null> {
  const accessToken = request.cookies.get("iracing_access_token")?.value;
  const refreshToken = request.cookies.get("iracing_refresh_token")?.value;

  if (accessToken) return accessToken;
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

    console.log("[token-refresh] success, expires_in:", data.expires_in);

    // Set cookie directly — no need to pass Set-Cookie through response chain
    const cookieStore = await cookies();
    cookieStore.set("iracing_access_token", newToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: data.expires_in ?? 600,
      path: "/",
    });

    return newToken;
  } catch (e) {
    console.error("[token-refresh] error:", e);
    return null;
  }
}
