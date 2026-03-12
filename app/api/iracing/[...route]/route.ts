// /app/api/iracing/[...route]/route.ts
// Proxy for all iRacing /data/* endpoints
// Uses Bearer token from httpOnly cookie, with auto-refresh

import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";

const IRACING_BASE = "https://members-ng.iracing.com";
const OAUTH_TOKEN_URL = "https://oauth.iracing.com/oauth2/token";

function mask(secret: string, id: string): string {
  return createHash("sha256")
    .update(`${secret}${id.trim().toLowerCase()}`)
    .digest("base64");
}

async function refreshAccessToken(
  refreshToken: string,
): Promise<string | null> {
  const clientId = process.env.IRACING_CLIENT_ID;
  const clientSecret = process.env.IRACING_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  const params = new URLSearchParams({
    grant_type: "refresh_token",
    client_id: clientId,
    client_secret: mask(clientSecret, clientId),
    refresh_token: refreshToken,
  });

  const res = await fetch(OAUTH_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });

  if (!res.ok) return null;
  const data = await res.json();
  return data.access_token ?? null;
}

async function iracingFetch(
  path: string,
  searchParams: URLSearchParams,
  accessToken: string,
) {
  const url = new URL(`${IRACING_BASE}/data/${path}`);
  searchParams.forEach((v, k) => url.searchParams.set(k, v));

  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "User-Agent": "SimPlan/1.0",
      Accept: "application/json",
    },
  });

  return res;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { route: string[] } },
) {
  const path = params.route.join("/");
  const searchParams = request.nextUrl.searchParams;

  // Get access token from cookie
  let accessToken = request.cookies.get("iracing_access_token")?.value;
  const refreshToken = request.cookies.get("iracing_refresh_token")?.value;

  if (!accessToken && !refreshToken) {
    return NextResponse.json(
      { error: "Not authenticated. Please log in to your iRacing account." },
      { status: 401 },
    );
  }

  // Try request, refresh token if 401
  let iracingRes = accessToken
    ? await iracingFetch(path, searchParams, accessToken)
    : null;

  if ((!iracingRes || iracingRes.status === 401) && refreshToken) {
    const newToken = await refreshAccessToken(refreshToken);
    if (newToken) {
      accessToken = newToken;
      iracingRes = await iracingFetch(path, searchParams, newToken);
    }
  }

  if (!iracingRes) {
    return NextResponse.json(
      { error: "Authentication failed" },
      { status: 401 },
    );
  }

  if (iracingRes.status === 401) {
    return NextResponse.json(
      { error: "Session expired. Please log in again." },
      { status: 401 },
    );
  }

  if (iracingRes.status === 429) {
    return NextResponse.json(
      { error: "iRacing API rate limit exceeded. Please wait." },
      { status: 429 },
    );
  }

  if (!iracingRes.ok) {
    return NextResponse.json(
      { error: `iRacing API error: ${iracingRes.status}` },
      { status: iracingRes.status },
    );
  }

  const data = await iracingRes.json();

  // Handle S3 redirect pattern
  let finalData = data;
  if (
    data &&
    typeof data === "object" &&
    "link" in data &&
    typeof data.link === "string"
  ) {
    const s3Res = await fetch(data.link);
    if (s3Res.ok) finalData = await s3Res.json();
  }

  const response = NextResponse.json(finalData);

  // Update access token cookie if refreshed
  if (accessToken !== request.cookies.get("iracing_access_token")?.value) {
    response.cookies.set("iracing_access_token", accessToken!, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 600,
      path: "/",
    });
  }

  // Cache public data 1 hour
  const isPublic = ["season", "series", "carclass", "track", "cars"].some((p) =>
    path.startsWith(p),
  );
  if (isPublic) {
    response.headers.set(
      "Cache-Control",
      "public, s-maxage=3600, stale-while-revalidate=7200",
    );
  }

  return response;
}
