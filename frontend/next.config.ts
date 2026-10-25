import type { NextConfig } from "next";

// The API is proxied through this app's own origin in production so the
// session cookie stays first-party. Set BACKEND_URL on the deployment to the
// backend's origin (for example, https://calendar-api.vercel.app).
const backendUrl = process.env.BACKEND_URL?.replace(/\/+$/, "");

const nextConfig: NextConfig = {
  /* config options here */
  allowedDevOrigins: ["192.168.0.179"],
  cacheComponents: true,
  partialPrefetching: true,
  experimental: {
    agentUpgrade: "security",
  },
  async rewrites() {
    if (!backendUrl) return [];

    return [
      {
        source: "/api/:path*",
        destination: `${backendUrl}/:path*`,
      },
    ];
  },
  turbopack: {
    root: process.cwd(),
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
