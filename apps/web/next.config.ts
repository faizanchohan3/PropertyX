import type { NextConfig } from "next";
import path from "node:path";
import { existsSync } from "node:fs";

// single source of configuration: the monorepo root .env
const rootEnv = path.join(__dirname, "../../.env");
if (existsSync(rootEnv)) process.loadEnvFile(rootEnv);

const config: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  transpilePackages: ["@propertyx/shared", "@propertyx/database", "@propertyx/auth", "@propertyx/search", "@propertyx/ai", "@propertyx/payments", "@propertyx/notifications", "@propertyx/core", "@propertyx/ui"],
  serverExternalPackages: ["sharp", "postgres", "bcryptjs"],
  outputFileTracingRoot: path.join(__dirname, "../.."),
  images: {
    loader: "custom",
    loaderFile: "./src/lib/image-loader.ts",
    remotePatterns: [{ protocol: "https", hostname: "images.unsplash.com" }],
  },
  experimental: { serverActions: { bodySizeLimit: "15mb" } },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(self), geolocation=(self)" },
        ],
      },
    ];
  },
};
export default config;
