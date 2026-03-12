// /app/api/iracing/auth/route.ts
//
// iRacing OAuth2 - Password Limited Grant
// Legacy /auth endpoint was REMOVED Dec 9, 2025.
// Now requires OAuth2 with client_id + client_secret from iRacing.
//
// To get credentials: https://oauth.iracing.com/oauth2/book/client_registration.html
// Set in .env.local:
//   IRACING_CLIENT_ID=your_client_id
//   IRACING_CLIENT_SECRET=your_client_secret
//
// Password masking: base64( SHA-256( password + email.trim().toLowerCase() ) )
// Client secret masking: base64( SHA-256( client_secret + client_id.trim().toLowerCase() ) )

import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";

const OAUTH_TOKEN_URL = "https://oauth.iracing.com/oauth2/token";
const DATA_BASE = "https://members-ng.iracing.com";

// iRacing masking algorithm: SHA-256(secret + id.trim().toLowerCase()) → base64
function mask(secret: string, id: string): string {
  return createHash("sha256")
    .update(`${secret}${id.trim().toLowerCase()}`)
    .digest("base64");
}

// Store tokens in memory per-request (in production use Redis or DB)
// For now we store in httpOnly cookies
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 },
      );
    }

    const clientId = process.env.IRACING_CLIENT_ID;
    const clientSecret = process.env.IRACING_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return NextResponse.json(
        {
          error:
            "OAuth credentials not configured. Set IRACING_CLIENT_ID and IRACING_CLIENT_SECRET in .env.local. " +
            "Request credentials at: https://oauth.iracing.com/oauth2/book/client_registration.html",
          setup_required: true,
        },
        { status: 503 },
      );
    }

    // Mask password and client_secret per iRacing spec
    const maskedPassword = mask(password, username);
    const maskedClientSecret = mask(clientSecret, clientId);

    const params = new URLSearchParams({
      grant_type: "password_limited",
      client_id: clientId,
      client_secret: maskedClientSecret,
      username: username.trim().toLowerCase(),
      password: maskedPassword,
      scope: "iracing.auth",
    });

    const tokenResponse = await fetch(OAUTH_TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "SimPlan/1.0",
      },
      body: params.toString(),
    });

    if (!tokenResponse.ok) {
      const errText = await tokenResponse.text();
      console.error("iRacing OAuth error:", tokenResponse.status, errText);

      if (tokenResponse.status === 401 || tokenResponse.status === 400) {
        return NextResponse.json(
          {
            error:
              "Invalid credentials. Check your iRacing email and password.",
          },
          { status: 401 },
        );
      }
      return NextResponse.json(
        { error: `iRacing auth service error: ${tokenResponse.status}` },
        { status: 502 },
      );
    }

    const tokenData = await tokenResponse.json();
    const { access_token, refresh_token, expires_in } = tokenData;

    if (!access_token) {
      return NextResponse.json(
        { error: "No access token received from iRacing" },
        { status: 502 },
      );
    }

    // Fetch member info to get cust_id and display_name
    let custId: number | null = null;
    let displayName = "Driver";

    try {
      const memberRes = await fetch(`${DATA_BASE}/data/member/info`, {
        headers: {
          Authorization: `Bearer ${access_token}`,
          "User-Agent": "SimPlan/1.0",
        },
      });
      if (memberRes.ok) {
        const memberData = await memberRes.json();
        // Handle S3 redirect
        if (memberData?.link) {
          const s3Res = await fetch(memberData.link);
          if (s3Res.ok) {
            const s3Data = await s3Res.json();
            custId = s3Data?.cust_id ?? null;
            displayName = s3Data?.display_name ?? "Driver";
          }
        } else {
          custId = memberData?.cust_id ?? null;
          displayName = memberData?.display_name ?? "Driver";
        }
      }
    } catch (e) {
      console.warn("Could not fetch member info:", e);
    }

    const response = NextResponse.json({
      success: true,
      cust_id: custId,
      display_name: displayName,
      expires_in,
    });

    // Store access token in httpOnly cookie
    response.cookies.set("iracing_access_token", access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: expires_in ?? 600,
      path: "/",
    });

    // Store refresh token in httpOnly cookie
    if (refresh_token) {
      response.cookies.set("iracing_refresh_token", refresh_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: tokenData.refresh_token_expires_in ?? 3600,
        path: "/",
      });
    }

    // Store cust_id (non-sensitive) for frontend use
    if (custId) {
      response.cookies.set("iracing_cust_id", String(custId), {
        httpOnly: false,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 3600,
        path: "/",
      });
    }

    return response;
  } catch (error) {
    console.error("Auth route error:", error);
    return NextResponse.json(
      { error: "Internal server error during authentication" },
      { status: 500 },
    );
  }
}

export async function DELETE() {
  const response = NextResponse.json({ success: true, message: "Logged out" });
  response.cookies.delete("iracing_access_token");
  response.cookies.delete("iracing_refresh_token");
  response.cookies.delete("iracing_cust_id");
  return response;
}
