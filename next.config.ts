import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  // Socket.io server runs separately; Next handles only HTTP pages/API
  webpack: (config) => {
    config.externals = [...(config.externals ?? []), { bufferutil: "bufferutil", "utf-8-validate": "utf-8-validate" }]
    return config
  },
}

export default nextConfig
