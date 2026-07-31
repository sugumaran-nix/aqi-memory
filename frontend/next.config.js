/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Tremor and framer-motion ship ESM — Next.js 14 needs to transpile them
  transpilePackages: [
    "@tremor/react",
    "framer-motion",
  ],

  // Allow NEXT_PUBLIC_API_URL to be set at build time; no rewrite needed
  async rewrites() {
    return [];
  },

  // Silence harmless Recharts/Tremor "defaultProps" warnings in Next.js 14
  webpack(config) {
    config.resolve.alias = {
      ...config.resolve.alias,
    };
    return config;
  },
};

module.exports = nextConfig;
