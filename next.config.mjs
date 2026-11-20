/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingIncludes: {
    "/*": ["./db/db.json"],
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
