// app/api/map-tile/route.ts
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const z = searchParams.get("z");
  const x = searchParams.get("x");
  const y = searchParams.get("y");
  const theme = searchParams.get("theme") || "dark";

  const apiKey = process.env.CARTO_API_KEY;
  if (!apiKey) {
    console.error("[API Map Tile] Error: CARTO_API_KEY is missing.");
    return NextResponse.json(
      { error: "CARTO API key not configured" },
      { status: 500 },
    );
  }

  // Estilo de mapa (dark_all o light_all)
  const baseStyle = theme === "dark" ? "dark_all" : "light_all";

  // URL oficial de basemaps bajo tu organización de CARTO (Europa West / GCP)
  // O alternativamente usando la API de Maps de CARTO con el token Bearer
  const cartoUrl = `https://gcp-europe-west1.api.carto.com/v1/map/raster/{mapid}/{z}/{x}/{y}.png`; // O la URL estándar de basemaps con el token correcto:

  // Probemos primero con la URL de basemaps estándar de CARTO pero autenticada correctamente con el token Bearer si es un Access Token JWT:
  const basemapUrl = `https://{s}.basemaps.cartocdn.com/${baseStyle}/${z}/${x}/${y}.png`;

  try {
    // Los Access Tokens de CARTO (JWT) se envían normalmente como Bearer token o parámetro de query según la API
    const response = await fetch(
      `https://a.basemaps.cartocdn.com/${baseStyle}/${z}/${x}/${y}.png?api_key=${apiKey}`,
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      },
    );

    if (!response.ok) {
      // Fallback probando pasando el token como query param estándar si el Bearer falla
      const fallbackResponse = await fetch(
        `https://a.basemaps.cartocdn.com/${baseStyle}/${z}/${x}/${y}.png?access_token=${apiKey}`,
      );
      if (!fallbackResponse.ok) {
        console.error(
          `[API Map Tile] Carto error: ${response.status} / ${fallbackResponse.status}`,
        );
        return NextResponse.json(
          { error: "Failed to fetch tile" },
          { status: response.status },
        );
      }
      const imageBuffer = await fallbackResponse.arrayBuffer();
      return new NextResponse(imageBuffer, {
        headers: {
          "Content-Type": "image/png",
          "Cache-Control": "public, max-age=86400, immutable",
        },
      });
    }

    const imageBuffer = await response.arrayBuffer();

    return new NextResponse(imageBuffer, {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=86400, immutable",
      },
    });
  } catch (error) {
    console.error("[API Map Tile] Exception:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
