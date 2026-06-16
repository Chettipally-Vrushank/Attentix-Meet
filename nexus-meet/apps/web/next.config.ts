import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  output: "standalone",
  webpack: (config) => {
    // Required for MediaPipe WASM in Webpack
    config.resolve.fallback = { fs: false, path: false };
    return config;
  },
  turbopack: {
    root: path.resolve(process.cwd(), "../../"),
  },
};

export default nextConfig;
