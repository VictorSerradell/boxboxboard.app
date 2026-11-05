// app/api/map-tile/route.ts
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const z = searchParams.get("z");
  const x = searchParams.get("x");
  const y = searchParams.get("y");
  const theme = searchParams.get("theme") || "dark";

  const baseStyle = theme === "dark" ? "dark_all" : "light_all";

  // Para los basemaps estándar de CARTO de libre acceso (sin token restrictivo de cuenta),
  // la URL pública estándar funciona perfectamente si no requiere auth privada de SQL/Data Warehouse:
  const cartoUrl = `https://a.basemaps.cartocdn.com/${baseStyle}/${z}/${x}/${y}.png`;

  try {
    const response = await fetch(cartoUrl);
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
