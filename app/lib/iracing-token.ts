// /app/lib/iracing-token.ts
import { NextRequest } from 'next/server';
import { createHash } from 'crypto';

const OAUTH_TOKEN_URL = 'https://oauth.iracing.com/oauth2/token';

// iRacing requires client_secret as SHA256(secret + clientId)
function maskSecret(secret: string, clientId: string): string {
  return createHash('sha256')
    .update(`${secret}${clientId.trim().toLowerCase()}`)
    .digest('base64');
}

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
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type:    'refresh_token',
        client_id:     clientId,
        client_secret: maskSecret(clientSecret, clientId), // same hashing as callback
        refresh_token: refreshToken,
      }).toString(),
    });

    if (!res.ok) {
      console.error('[token-refresh] failed:', res.status);
      return null;
    }

    const data = await res.json();
    const newToken = data.access_token ?? null;
    if (newToken) console.log('[token-refresh] success');
    return newToken;
  } catch (e: any) {
    console.error('[token-refresh] error:', e.message);
    return null;
  }
}