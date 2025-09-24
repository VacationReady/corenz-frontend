/** @type {import('next').NextConfig} */
const csp = [
  "default-src 'self' https://*.supabase.co https://api.resend.com",
  "frame-src 'self' blob: https://*.supabase.co",
  "object-src 'self' blob: https://*.supabase.co data:",
  "img-src 'self' https: data: blob:",
  "media-src 'self' blob:",
  "connect-src 'self' https://*.supabase.co https://api.resend.com",
  "style-src 'self' 'unsafe-inline'",
  "script-src 'self'",
  "base-uri 'none'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ');

const path = require("path");

const nextConfig = {
  reactStrictMode: true,
  // Most important: disables static export
  output: "standalone",
  // Explicitly set root to avoid monorepo lockfile inference
  outputFileTracingRoot: __dirname,
  eslint: {
    ignoreDuringBuilds: true,
  },
  experimental: {
    optimizePackageImports: ["lucide-react", "@heroicons/react"],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Content-Security-Policy", value: csp },
        ],
      },
    ];
  },
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    // Optimize bundle splitting
    if (!dev && !isServer) {
      config.optimization.splitChunks.cacheGroups = {
        ...config.optimization.splitChunks.cacheGroups,
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: "vendors",
          chunks: "all",
          priority: 10,
        },
      };
    }
    return config;
  },
};

module.exports = nextConfig;
