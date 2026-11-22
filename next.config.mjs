/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [{ source: "/formulario/:path*", headers: [
      { key: "Cache-Control", value: "private, no-store" },
      { key: "Referrer-Policy", value: "no-referrer" },
      { key: "X-Robots-Tag", value: "noindex, nofollow" },
    ] }];
  },
  outputFileTracingIncludes: {
    "/*": ["./db/db.json"],
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
