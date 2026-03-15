// next.config.ts
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Allow iRacing S3 images
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'ir-core-repo-production-1.s3.amazonaws.com' },
      { protocol: 'https', hostname: '*.s3.amazonaws.com' },
    ],
  },
  // Security headers
  async headers() {
    return [
      {
        source: '/sw.js',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=0, must-revalidate' },
          { key: 'Service-Worker-Allowed', value: '/' },
        ],
      },
      {
        source: '/api/iracing/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
        ],
      },
    ];
  },
};

export default nextConfig;
