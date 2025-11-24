/** @type {import('next').NextConfig} */
const path = require("path");

// CSP configuration that's different for dev and production
const getCsp = (isDev) => {
  const scriptSrc = isDev
    ? "'self' 'unsafe-eval' 'unsafe-inline'" // Dev needs unsafe-eval for webpack HMR
    : "'self'"; // Production stays strict
  
  return [
    "default-src 'self' https://*.supabase.co https://api.resend.com",
    "frame-src 'self' blob: https://*.supabase.co",
    "object-src 'self' blob: https://*.supabase.co data:",
    "img-src 'self' https: data: blob:",
    "media-src 'self' blob:",
    "connect-src 'self' https://*.supabase.co https://api.resend.com https://nominatim.openstreetmap.org",
    "style-src 'self' 'unsafe-inline'",
    `script-src ${scriptSrc}`,
    "base-uri 'none'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join('; ');
};

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
    // Only apply strict CSP in production
    const isDev = process.env.NODE_ENV === 'development';
    
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Content-Security-Policy", value: getCsp(isDev) },
        ],
      },
      // CORS headers for mobile app (development only)
      {
        source: "/api/:path*",
        headers: [
          { key: "Access-Control-Allow-Credentials", value: "true" },
          { key: "Access-Control-Allow-Origin", value: isDev ? "*" : "https://your-production-domain.com" },
          { key: "Access-Control-Allow-Methods", value: "GET,DELETE,PATCH,POST,PUT,OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization" },
        ],
      },
    ];
  },
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    // Exclude mobile directory from compilation
    config.module.rules.push({
      test: /\.(tsx?|jsx?)$/,
      include: path.resolve(__dirname, 'mobile'),
      loader: 'ignore-loader',
    });

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
