/** @type {import('next').NextConfig} */
const path = require("path");

// CSP configuration that's different for dev and production
const getCsp = (isDev) => {
  const scriptSrc = isDev
    ? "'self' 'unsafe-eval' 'unsafe-inline'" // Dev needs unsafe-eval for webpack HMR
    : "'self'"; // Production stays strict
  
  // Allow framing from marketing site (peoplecore.co.nz) for embedding
  const frameAncestors = "'self' https://people-core-website.vercel.app https://*.peoplecore.co.nz https://peoplecore.co.nz https://www.peoplecore.co.nz";
  
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
    `frame-ancestors ${frameAncestors}`,
  ].join('; ');
};

const nextConfig = {
  reactStrictMode: true,
  // Most important: disables static export
  output: "standalone",
  // Explicitly set root to avoid monorepo lockfile inference
  outputFileTracingRoot: __dirname,
  experimental: {
    optimizePackageImports: ["lucide-react", "@heroicons/react"],
  },
  async headers() {
    // Only apply strict CSP in production
    const isDev = process.env.NODE_ENV === 'development';
    
    return [
      // All pages - allow framing from peoplecore.co.nz
      {
        source: "/(.*)",
        headers: [
          { key: "Content-Security-Policy", value: getCsp(isDev) },
          { key: "Permissions-Policy", value: "geolocation=(self), camera=(self)" },
        ],
      },
      // CORS headers for mobile app and web clients
      // SECURITY: In production, CORS origin MUST be explicitly set via environment variables
      // Never use "*" with credentials in production as it allows any origin to make authenticated requests
      {
        source: "/api/:path*",
        headers: [
          { key: "Access-Control-Allow-Credentials", value: "true" },
          { 
            key: "Access-Control-Allow-Origin", 
            // CRITICAL: When using credentials, origin cannot be "*"
            // Development: Allow localhost origins for testing
            // Production: MUST set CORS_ALLOWED_ORIGINS or MOBILE_APP_ORIGIN env vars
            value: isDev 
              ? (process.env.CORS_ALLOWED_ORIGINS || "http://localhost:3000")
              : (process.env.CORS_ALLOWED_ORIGINS || process.env.MOBILE_APP_ORIGIN || process.env.NEXT_PUBLIC_APP_URL)
          },
          { key: "Access-Control-Allow-Methods", value: "GET,DELETE,PATCH,POST,PUT,OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization, Cookie" },
          // Prevent browsers from caching preflight responses too long
          { key: "Access-Control-Max-Age", value: "86400" },
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


// Injected content via Sentry wizard below

const { withSentryConfig } = require("@sentry/nextjs");

module.exports = withSentryConfig(
  module.exports,
  {
    // For all available options, see:
    // https://www.npmjs.com/package/@sentry/webpack-plugin#options

    org: "peoplecore",
    project: "javascript-nextjs",

    // Only print logs for uploading source maps in CI
    silent: !process.env.CI,

    // For all available options, see:
    // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

    // Upload a larger set of source maps for prettier stack traces (increases build time)
    widenClientFileUpload: true,

    // Uncomment to route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
    // This can increase your server load as well as your hosting bill.
    // Note: Check that the configured route will not match with your Next.js middleware, otherwise reporting of client-
    // side errors will fail.
    // tunnelRoute: "/monitoring",

    // Automatically tree-shake Sentry logger statements to reduce bundle size
    disableLogger: true,

    // Enables automatic instrumentation of Vercel Cron Monitors. (Does not yet work with App Router route handlers.)
    // See the following for more information:
    // https://docs.sentry.io/product/crons/
    // https://vercel.com/docs/cron-jobs
    automaticVercelMonitors: true,
  }
);
