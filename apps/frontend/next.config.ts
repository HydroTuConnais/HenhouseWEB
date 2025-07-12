import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
    ],
  },
};

export default nextConfig;
