// /app/api/auth/me/route.ts
// Returns current user info from httpOnly cookies — safe for frontend

import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const accessToken = request.cookies.get("iracing_access_token")?.value;
  const custId = request.cookies.get("iracing_cust_id")?.value;
  const displayName = request.cookies.get("iracing_display_name")?.value;

  if (!accessToken || !custId) {
    return NextResponse.json({ authenticated: false });
  }

  return NextResponse.json({
    authenticated: true,
    cust_id: Number(custId),
    display_name: displayName ? decodeURIComponent(displayName) : "Driver",
  });
}
