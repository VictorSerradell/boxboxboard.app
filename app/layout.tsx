// /app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PitBoard — iRacing Season Planner",
  description:
    "Browse every iRacing series, track rotation and schedule. Filter by license, category and owned content.",
  keywords: [
    "iRacing",
    "sim racing",
    "season planner",
    "race schedule",
    "track rotation",
  ],
  openGraph: {
    title: "PitBoard — iRacing Season Planner",
    description: "Browse every iRacing series, track rotation and schedule.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=DM+Mono:wght@400;500&family=DM+Sans:ital,wght@0,300;0,400;0,500;1,400&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-[#080A0E] text-white antialiased">{children}</body>
    </html>
  );
}
