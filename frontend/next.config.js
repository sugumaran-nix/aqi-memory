/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  transpilePackages: [
    "@tremor/react",
    "framer-motion",
  ],

  async rewrites() {
    // Proxy /api/backend/* → Render backend server-side.
    // Browser never makes a cross-origin request → CORS eliminated entirely.
    const backend =
      process.env.NEXT_PUBLIC_API_URL || "https://aqi-memory.onrender.com";
    return [
      {
        source: "/api/backend/:path*",
        destination: `${backend}/:path*`,
      },
    ];
  },

  webpack(config) {
    config.resolve.alias = {
      ...config.resolve.alias,
    };
    return config;
  },
};

module.exports = nextConfig;
