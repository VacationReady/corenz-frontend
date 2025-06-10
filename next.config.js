/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverActions: true,
  },
  // Most important: disables static export
  output: "standalone",
};

module.exports = nextConfig;
