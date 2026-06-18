// /app/app/layout.tsx
// Metadata específica para la ruta /app

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Season Planner",
  description:
    "Browse all iRacing series for Season 2 2026. Filter by license, category, setup type and owned content. Plan your schedule and export to Google Calendar.",
  openGraph: {
    title: "BoxBoxBoard — iRacing Season 2 2026 Planner",
    description:
      "Browse all iRacing series, track rotations and schedules for Season 2 2026.",
  },
};

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return children;
}
