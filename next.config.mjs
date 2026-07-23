/** @type {import('next').NextConfig} */
const nextConfig = {
  // Static export → deploys to Catalyst Web Client Hosting (a pure static CDN).
  output: "export",
  // next/image can't run its optimizer in a static export — serve images as-is.
  images: { unoptimized: true },
  // Emit /route/index.html so a static host resolves clean URLs like /cases/.
  trailingSlash: true,
};

export default nextConfig;
