// /app/lib/iracing-token.ts
import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';

const OAUTH_TOKEN_URL = 'https://oauth.iracing.com/oauth2/token';
const COOKIE_MAX_AGE  = 60 * 60; // 1h

function maskSecret(secret: string, clientId: string): string {
  return createHash('sha256')
    .update(`${secret}${clientId.trim().toLowerCase()}`)
    .digest('base64');
}

/**
 * Returns { token, response? }.
 * If response is set, the caller MUST return it (it carries the refreshed cookie).
 */
export async function getValidToken(
  request: NextRequest
): Promise<{ token: string | null; setCookieHeader?: string }> {
  const accessToken  = request.cookies.get('iracing_access_token')?.value;
  const refreshToken = request.cookies.get('iracing_refresh_token')?.value;

  if (accessToken) return { token: accessToken };
  if (!refreshToken) return { token: null };

  const clientId     = process.env.IRACING_CLIENT_ID;
  const clientSecret = process.env.IRACING_CLIENT_SECRET;
  if (!clientId || !clientSecret) return { token: null };

  try {
    const res = await fetch(OAUTH_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type:    'refresh_token',
        client_id:     clientId,
        client_secret: maskSecret(clientSecret, clientId),
        refresh_token: refreshToken,
      }).toString(),
    });

    if (!res.ok) {
      console.error('[token-refresh] failed:', res.status);
      return { token: null };
    }

    const data = await res.json();
    const newToken = data.access_token ?? null;
    if (!newToken) return { token: null };

    console.log('[token-refresh] success');

    // Build a Set-Cookie header so the caller can persist the new token
    const cookieParts = [
      `iracing_access_token=${newToken}`,
      `Path=/`,
      `HttpOnly`,
      `Secure`,
      `SameSite=Lax`,
      `Max-Age=${COOKIE_MAX_AGE}`,
      `Domain=.boxboxboard.app`,
    ];

    return { token: newToken, setCookieHeader: cookieParts.join('; ') };
  } catch (e: any) {
    console.error('[token-refresh] error:', e.message);
    return { token: null };
  }
}