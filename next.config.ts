import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'standalone',
  experimental: {
    mcpServer: true,
  },
}

export default nextConfig
