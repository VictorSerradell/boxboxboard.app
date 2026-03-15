// /app/layout.tsx
import type { Metadata, Viewport } from "next";
import { Syne, DM_Mono, DM_Sans } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "./lib/theme";
import { I18nProvider } from "./lib/i18n";

// ── Fonts via next/font (optimized, self-hosted by Vercel) ────
const syne = Syne({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-syne",
  display: "swap",
});

const dmMono = DM_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-dm-mono",
  display: "swap",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  variable: "--font-dm-sans",
  display: "swap",
});

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "https://pitboard.app";

export const viewport: Viewport = {
  themeColor: "#3B9EFF",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

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
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "PitBoard",
  },
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
    <html
      lang="en"
      data-theme="dark"
      className={`${syne.variable} ${dmMono.variable} ${dmSans.variable}`}
    >
      <head>
        {/* No-flash theme script */}
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
        {/* PWA service worker registration */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
          if ('serviceWorker' in navigator) {
            window.addEventListener('load', function() {
              navigator.serviceWorker.register('/sw.js').catch(function(err) {
                console.log('SW registration failed:', err);
              });
            });
          }
        `,
          }}
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
