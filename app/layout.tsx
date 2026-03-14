// /app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "./lib/theme";
import { I18nProvider } from "./lib/i18n";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "https://pitboard.app";

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
  metadataBase: new URL(BASE_URL),
  openGraph: {
    title: "PitBoard — iRacing Season Planner",
    description:
      "Browse every iRacing series, track rotation and schedule. Filter by license, category and owned content.",
    type: "website",
    url: BASE_URL,
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "PitBoard — iRacing Season Planner",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "PitBoard — iRacing Season Planner",
    description: "Browse every iRacing series, track rotation and schedule.",
    images: ["/og-image.png"],
  },
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: [{ url: "/icon-192.png", sizes: "192x192", type: "image/png" }],
    shortcut: "/favicon.ico",
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
        {/* No-flash script: apply saved theme before first paint */}
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
        <ThemeProvider>
          <I18nProvider>{children}</I18nProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
