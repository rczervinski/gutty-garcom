/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  images: {
    unoptimized: true,
    domains: ['localhost'],
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Confina o tracing ao próprio app (há vários package.json irmãos sob gutty/).
  outputFileTracingRoot: __dirname,
}

module.exports = nextConfig
