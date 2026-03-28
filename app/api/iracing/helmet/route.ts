// /app/api/iracing/helmet/route.ts
// Proxy autenticado para imágenes de cascos de iRacing

import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const token = request.cookies.get("iracing_access_token")?.value;
  if (!token) return new NextResponse(null, { status: 401 });

  const custId = request.nextUrl.searchParams.get("cust_id");
  if (!custId) return new NextResponse(null, { status: 400 });

  try {
    const res = await fetch(
      `https://images-static.iracing.com/img/helmets/${custId}.png`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "User-Agent": "BoxBoxBoard/1.0",
        },
      },
    );

    if (!res.ok) return new NextResponse(null, { status: 404 });

    const buffer = await res.arrayBuffer();
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch {
    return new NextResponse(null, { status: 500 });
  }
}
