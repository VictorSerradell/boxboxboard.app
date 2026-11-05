// app/api/map-tile/route.ts
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const z = searchParams.get('z');
  const x = searchParams.get('x');
  const y = searchParams.get('y');
  const theme = searchParams.get('theme') || 'dark';

  const apiKey = process.env.CARTO_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'CARTO API key not configured' }, { status: 500 });
  }

  const baseStyle = theme === 'dark' ? 'dark_all' : 'light_all';
  const cartoUrl = `https://a.basemaps.cartocdn.com/${baseStyle}/${z}/${x}/${y}.png?api_key=${apiKey}`;

  try {
    const response = await fetch(cartoUrl);
    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to fetch tile' }, { status: response.status });
    }

    const imageBuffer = await response.arrayBuffer();

    return new NextResponse(imageBuffer, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=86400, immutable',
      },
    });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}