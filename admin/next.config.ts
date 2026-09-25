import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.join(process.cwd()),
  env: {
    NEXT_PUBLIC_MAPBOX_TOKEN:
      process.env.NEXT_PUBLIC_MAPBOX_TOKEN || process.env.EXPO_PUBLIC_MAPBOX_TOKEN || "",
  },
};

export default nextConfig;
