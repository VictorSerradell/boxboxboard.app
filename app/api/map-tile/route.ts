// app/api/map-tile/route.ts
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const z = searchParams.get("z");
  const x = searchParams.get("x");
  const y = searchParams.get("y");
  const theme = searchParams.get("theme") || "dark";

  // Usamos los subdominios públicos oficiales de CARTO para basemaps libres
  const baseStyle = theme === "dark" ? "dark_all" : "light_all";
  const subdomains = ["a", "b", "c", "d"];
  const sub =
    subdomains[
      Math.abs(parseInt(x || "0", 10) + parseInt(y || "0", 10)) %
        subdomains.length
    ];

  const cartoUrl = `https://${sub}.basemaps.cartocdn.com/${baseStyle}/${z}/${x}/${y}.png`;

  try {
    const response = await fetch(cartoUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: "Failed to fetch tile" },
        { status: response.status },
      );
    }

    const imageBuffer = await response.arrayBuffer();
    return new NextResponse(imageBuffer, {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=86400, immutable",
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
