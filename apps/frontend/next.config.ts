import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  output: 'standalone',
  compress: true,
  poweredByHeader: false,
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '3333',
        pathname: '/uploads/**',
      },
      {
        protocol: 'https',
        hostname: 'm4dn1kc6-3333.uks1.devtunnels.ms',
        pathname: '/uploads/**',
      },
      {
        protocol: 'https',
        hostname: 'henhouse.hydro-dev.ovh',
        pathname: '/api/uploads/**',
      },
    ],
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 60,
  },
  experimental: {
    optimizeCss: true,
  },
};

export default nextConfig;
