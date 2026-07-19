import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Required for Docker / Cloud Run (node server.js)
  output: "standalone",
  // Allow reading data/ at runtime in Node
  serverExternalPackages: [],
};

export default nextConfig;
