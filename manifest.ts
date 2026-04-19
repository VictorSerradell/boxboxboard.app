// /app/manifest.ts
// Next.js App Router manifest route — fixes /manifest.json 404 caused by sw.js

import { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "BoxBoxBoard — iRacing Season Planner",
    short_name: "BoxBoxBoard",
    description:
      "Browse every iRacing series, track rotation and schedule. Filter by license, category and owned content.",
    start_url: "/app",
    display: "standalone",
    background_color: "#060C18",
    theme_color: "#3B9EFF",
    orientation: "portrait-primary",
    icons: [
      { src: "/favicon-16.png", sizes: "16x16", type: "image/png" },
      { src: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icon.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
