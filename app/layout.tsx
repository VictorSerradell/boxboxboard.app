// /app/layout.tsx
import type { Metadata, Viewport } from "next";
import { Orbitron, Rajdhani } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "./lib/theme";
import { I18nProvider } from "./lib/i18n";

const orbitron = Orbitron({
  subsets: ["latin"],
  weight: ["400", "700", "900"],
  variable: "--font-orbitron",
  display: "swap",
});
const rajdhani = Rajdhani({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-rajdhani",
  display: "swap",
});

const BASE_URL =
  process.env.NEXT_PUBLIC_BASE_URL ?? "https://www.boxboxboard.app";
const TITLE = "BoxBoxBoard — iRacing Season Planner";
const DESCRIPTION =
  "Plan your iRacing season with BoxBoxBoard. Browse all series, track rotations, license requirements and owned content. Filter by category, license and setup type. Free, no login required.";

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#060C18" },
    { media: "(prefers-color-scheme: light)", color: "#F1F5F9" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: TITLE,
    template: "%s | BoxBoxBoard",
  },
  description: DESCRIPTION,
  keywords: [
    "iRacing",
    "iRacing season planner",
    "iRacing schedule",
    "iRacing series",
    "iRacing track rotation",
    "sim racing calendar",
    "iRacing 2026",
    "iRacing season 2 2026",
    "iRacing license",
    "iRacing owned content",
    "sim racing planner",
    "iRacing app",
    "iRacing tools",
  ],
  authors: [{ name: "Victor Serradell", url: BASE_URL }],
  creator: "Victor Serradell",
  publisher: "BoxBoxBoard",
  category: "Sports / Sim Racing",
  manifest: "/manifest.json",

  // Canonical
  alternates: {
    canonical: BASE_URL,
    languages: {
      en: `${BASE_URL}`,
      es: `${BASE_URL}`,
    },
  },

  // Robots
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },

  // Open Graph
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    type: "website",
    url: BASE_URL,
    siteName: "BoxBoxBoard",
    locale: "en_US",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "BoxBoxBoard — iRacing Season Planner",
        type: "image/png",
      },
    ],
  },

  // Twitter / X
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description:
      "Plan your iRacing season — browse all series, track rotations and schedules. Free, no login required.",
    images: [
      { url: "/og-image.png", alt: "BoxBoxBoard — iRacing Season Planner" },
    ],
    creator: "@boxboxboard",
  },

  // PWA / Apple
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "BoxBoxBoard",
    startupImage: "/icon.png",
  },

  // Icons
  icons: {
    icon: [
      { url: "/favicon.ico?v=2" },
      { url: "/favicon-32.png?v=2", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16.png?v=2", sizes: "16x16", type: "image/png" },
    ],
    apple: [{ url: "/icon-192.png?v=2", sizes: "192x192", type: "image/png" }],
    shortcut: "/favicon.ico?v=2",
    other: [{ rel: "mask-icon", url: "/favicon.ico?v=2", color: "#3B9EFF" }],
  },

  // Verification (add when available)
  // verification: { google: 'xxx' },
};

// JSON-LD Structured Data
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "BoxBoxBoard",
  url: BASE_URL,
  description: DESCRIPTION,
  applicationCategory: "SportsApplication",
  operatingSystem: "Web, iOS, Android",
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  author: { "@type": "Person", name: "Victor Serradell" },
  screenshot: `${BASE_URL}/og-image.png`,
  featureList: [
    "iRacing season schedule browser",
    "Track rotation calendar",
    "License requirement filter",
    "Owned content indicator",
    "Personal schedule planner",
    "iCal and Google Calendar export",
    "World track map",
    "Series comparator",
    "Dark and light mode",
    "Spanish and English support",
  ],
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
      className={`${orbitron.variable} ${rajdhani.variable}`}
    >
      <head>
        {/* JSON-LD Structured Data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        {/* No-flash theme script */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('boxboxboard_theme');if(!t)t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';document.documentElement.setAttribute('data-theme',t);}catch(e){}})();`,
          }}
        />
        {/* PWA service worker */}
        <script
          dangerouslySetInnerHTML={{
            __html: `if('serviceWorker' in navigator){window.addEventListener('load',function(){navigator.serviceWorker.register('/sw.js').catch(function(){});});}`,
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
