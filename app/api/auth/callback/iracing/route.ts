// /app/api/auth/callback/iracing/route.ts
// ─────────────────────────────────────────────────────────────────
// PASO 2 del flujo Authorization Code:
// iRacing redirige aquí con ?code=XXX&state=YYY
// Esta ruta canjea el code por access_token + refresh_token,
// obtiene info del miembro y guarda todo en cookies httpOnly.
// ─────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';

const OAUTH_TOKEN_URL = 'https://oauth.iracing.com/oauth2/token';
const DATA_BASE       = 'https://members-ng.iracing.com';
const APP_BASE = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000';

// Mismo masking que iRacing requiere para client_secret
function mask(secret: string, id: string): string {
  return createHash('sha256')
    .update(`${secret}${id.trim().toLowerCase()}`)
    .digest('base64');
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code             = searchParams.get('code');
  const returnedState    = searchParams.get('state');
  const error            = searchParams.get('error');

  // ── Error devuelto por iRacing ──────────────────────────────
  if (error) {
    const desc = searchParams.get('error_description') ?? error;
    return NextResponse.redirect(`${APP_BASE}/app?auth_error=${encodeURIComponent(desc)}`);
  }

  if (!code) {
    return NextResponse.redirect(`${APP_BASE}/app?auth_error=no_code`);
  }

  // ── Validar state (CSRF) ────────────────────────────────────
  const savedState = request.cookies.get('oauth_state')?.value;

  if (!savedState || savedState !== returnedState) {
    return NextResponse.redirect(`${APP_BASE}/app?auth_error=invalid_state`);
  }

  // ── Recuperar code_verifier ─────────────────────────────────
  const codeVerifier = request.cookies.get('pkce_verifier')?.value;
  if (!codeVerifier) {
    return NextResponse.redirect(`${APP_BASE}/app?auth_error=missing_verifier`);
  }

  const clientId     = process.env.IRACING_CLIENT_ID!;
  const clientSecret = process.env.IRACING_CLIENT_SECRET!;
  const redirectUri  =
    process.env.IRACING_REDIRECT_URI ??
    'http://localhost:3000/api/auth/callback/iracing';

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(`${APP_BASE}/app?auth_error=not_configured`);
  }

  // ── Canjear code por tokens ─────────────────────────────────
  const params = new URLSearchParams({
    grant_type:    'authorization_code',
    client_id:     clientId,
    client_secret: mask(clientSecret, clientId),
    code,
    redirect_uri:  redirectUri,
    code_verifier: codeVerifier,
  });

  let tokenData: {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    refresh_token_expires_in?: number;
  };

  try {
    const tokenRes = await fetch(OAUTH_TOKEN_URL, {
      method:  'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body:    params.toString(),
    });

    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      console.error('Token exchange error:', tokenRes.status, errText);
      return NextResponse.redirect(
        `${APP_BASE}/app?auth_error=token_exchange_failed`
      );
    }

    tokenData = await tokenRes.json();
  } catch (e) {
    console.error('Token fetch error:', e);
    return NextResponse.redirect(`${APP_BASE}/app?auth_error=network_error`);
  }

  const { access_token, refresh_token, expires_in, refresh_token_expires_in } =
    tokenData;

  if (!access_token) {
    return NextResponse.redirect(`${APP_BASE}/app?auth_error=no_token`);
  }

  // ── Obtener info del miembro ────────────────────────────────
  let custId: number | null = null;
  let displayName           = 'Driver';

  try {
    const memberRes = await fetch(`${DATA_BASE}/data/member/info`, {
      headers: {
        Authorization: `Bearer ${access_token}`,
        'User-Agent':  'BoxBoxBoard/1.0',
      },
    });

    if (memberRes.ok) {
      const raw = await memberRes.json();
      // Resolver S3 redirect si lo hay
      const data = raw?.link
        ? await fetch(raw.link).then(r => r.json())
        : raw;

      custId      = data?.cust_id    ?? null;
      displayName = data?.display_name ?? 'Driver';
    }
  } catch (e) {
    console.warn('Could not fetch member info:', e);
  }

  // ── Guardar tokens en cookies httpOnly y redirigir al inicio ─
  const response = NextResponse.redirect(`${APP_BASE}/app?auth=success`);

  const secureCookie = {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path:     '/',
    // Share cookies across www and root domain
    ...(process.env.NODE_ENV === 'production' && { domain: '.boxboxboard.app' }),
  };

  response.cookies.set('iracing_access_token', access_token, {
    ...secureCookie,
    maxAge: expires_in ?? 600,
  });

  if (refresh_token) {
    response.cookies.set('iracing_refresh_token', refresh_token, {
      ...secureCookie,
      maxAge: refresh_token_expires_in ?? 3600,
    });
  }

  if (custId) {
    response.cookies.set('iracing_cust_id', String(custId), {
      ...secureCookie,
      maxAge: refresh_token_expires_in ?? 3600,
    });
  }

  // Guardar display_name para el frontend (no sensible)
  response.cookies.set('iracing_display_name', displayName, {
    httpOnly: false,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge:   refresh_token_expires_in ?? 3600,
    path:     '/',
    ...(process.env.NODE_ENV === 'production' && { domain: '.boxboxboard.app' }),
  });

  // Limpiar cookies temporales del flujo
  response.cookies.delete('pkce_verifier');
  response.cookies.delete('oauth_state');

  return response;
}