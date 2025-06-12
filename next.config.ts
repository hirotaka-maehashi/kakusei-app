import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    domains: ["img.youtube.com"], // ✅ ← これを追加
  },
};

export default nextConfig;
