// /app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "./lib/theme";

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
    <html lang="en" data-theme="dark">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
          (function() {
            try {
              var t = localStorage.getItem('pitboard_theme');
              if (!t) t = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
              document.documentElement.setAttribute('data-theme', t);
            } catch(e) {}
          })();
        `,
          }}
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800;900&family=DM+Mono:wght@400;500;600&family=DM+Sans:ital,wght@0,300;0,400;0,500;1,400&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
