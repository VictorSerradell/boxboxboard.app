// /app/api/auth/logout/route.ts
// Limpia todas las cookies de sesión y redirige al inicio

import { NextResponse } from "next/server";

export async function GET() {
  const response = NextResponse.redirect(
    (process.env.NEXTAUTH_URL ?? "http://localhost:3000") + "/",
  );

  response.cookies.delete("iracing_access_token");
  response.cookies.delete("iracing_refresh_token");
  response.cookies.delete("iracing_cust_id");
  response.cookies.delete("iracing_display_name");

  return response;
}
