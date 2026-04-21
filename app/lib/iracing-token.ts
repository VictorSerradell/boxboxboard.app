// /app/lib/iracing-token.ts
// Gets a valid iRacing access token with auto-refresh

import { NextRequest } from 'next/server';

const OAUTH_TOKEN_URL = 'https://oauth.iracing.com/oauth2/token';

export async function getValidToken(request: NextRequest): Promise<string | null> {
  const accessToken  = request.cookies.get('iracing_access_token')?.value;
  const refreshToken = request.cookies.get('iracing_refresh_token')?.value;

  if (accessToken) return accessToken;
  if (!refreshToken) return null;

  const clientId     = process.env.IRACING_CLIENT_ID;
  const clientSecret = process.env.IRACING_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  try {
    const res = await fetch(OAUTH_TOKEN_URL, {
      method:  'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body:    new URLSearchParams({
        grant_type:    'refresh_token',
        client_id:     clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
      }).toString(),
    });

    if (!res.ok) {
      console.error('[token-refresh] failed:', res.status);
      return null;
    }

    const data = await res.json();
    const newToken = data.access_token;
    if (!newToken) return null;

    console.log('[token-refresh] success');
    return newToken;
    // Note: we don't set the cookie here to avoid Next.js 14 issues.
    // The new token will work for this request; re-auth happens on next login.
  } catch (e: any) {
    console.error('[token-refresh] error:', e.message);
    return null;
  }
}