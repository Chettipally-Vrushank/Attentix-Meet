import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  webpack: (config) => {
    // Required for MediaPipe WASM in Webpack
    config.resolve.fallback = { fs: false, path: false };
    return config;
  },
  turbopack: {},
};

export default nextConfig;
