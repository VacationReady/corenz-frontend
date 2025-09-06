/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Most important: disables static export
  output: "standalone",
  eslint: {
    ignoreDuringBuilds: true,
  },
};

module.exports = nextConfig;
