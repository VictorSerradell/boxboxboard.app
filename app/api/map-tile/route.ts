// app/api/map-tile/route.ts
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const z = searchParams.get("z");
  const x = searchParams.get("x");
  const y = searchParams.get("y");
  const theme = searchParams.get("theme") || "dark";

  // Lee la API key declarada en tu .env.local
  const apiKey =
    process.env.CARTO_API_KEY || "cb1_53g5_1_e5f00bad379ef5811626e76a";

  // Identificador de capa de CARTO Basemaps
  const mapStyle = theme === "dark" ? "dark_all" : "light_all";

  // URL exacta según la estructura documentada por CARTO Basemaps
  const cartoUrl = `https://basemaps.cartocdn.com/rastertiles/${mapStyle}/${z}/${x}/${y}.png?key=${apiKey}`;

  try {
    const response = await fetch(cartoUrl, {
      headers: {
        "User-Agent": "BoxBoxBoard/1.0 (https://www.boxboxboard.app)",
        Accept: "image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
      },
      cache: "force-cache",
    });

    if (!response.ok) {
      console.error(
        `[CARTO Proxy Error] Status ${response.status} for tile ${z}/${x}/${y}`,
      );
      return NextResponse.json(
        { error: "Failed to fetch tile from CARTO" },
        { status: response.status },
      );
    }

    const imageBuffer = await response.arrayBuffer();
    return new NextResponse(imageBuffer, {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=604800, immutable",
      },
    });
  } catch (error) {
    console.error("[CARTO Proxy Server Error]", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
