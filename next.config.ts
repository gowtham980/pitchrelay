import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Allow reading data/ at runtime in Node
  serverExternalPackages: [],
};

export default nextConfig;
