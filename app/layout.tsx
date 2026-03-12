import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'SimPlan — iRacing Season Planner',
  description: 'Plan your iRacing seasons with real-time schedules, track rotations, and content filtering.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=DM+Mono:wght@400;500&family=DM+Sans:wght@300;400;500&display=swap" rel="stylesheet" />
      </head>
      <body className="bg-[#080A0E] text-white antialiased">{children}</body>
    </html>
  );
}
