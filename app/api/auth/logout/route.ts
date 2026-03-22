// /app/api/auth/logout/route.ts
import { NextResponse } from "next/server";

export async function GET() {
  const base = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
  const response = NextResponse.redirect(`${base}/app`);

  const cookieOpts = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: 0,
    ...(process.env.NODE_ENV === "production" && {
      domain: ".boxboxboard.app",
    }),
  };

  response.cookies.set("iracing_access_token", "", cookieOpts);
  response.cookies.set("iracing_refresh_token", "", cookieOpts);
  response.cookies.set("iracing_cust_id", "", cookieOpts);
  response.cookies.set("iracing_display_name", "", {
    ...cookieOpts,
    httpOnly: false,
  });

  return response;
}
