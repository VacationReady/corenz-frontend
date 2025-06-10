/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverActions: true, // Enables future features like form actions
  },
  images: {
    domains: ["res.cloudinary.com"], // optional: if you use images from external sources
  },
  typescript: {
    // Optional: only for development — allows builds to continue despite TS errors
    ignoreBuildErrors: false,
  },
};

module.exports = nextConfig;
