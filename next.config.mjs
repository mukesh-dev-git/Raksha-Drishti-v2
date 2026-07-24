// Path prefix Catalyst Web Client Hosting mounts this app under, e.g. "/app"
// when served at <domain>/app/ instead of the domain root. Leave unset (empty)
// if/when the app is mapped to the root of its own domain. Must match
// src/lib/basePath.ts (same env var) for the manual iframe/img src prefixes.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Static export → deploys to Catalyst Web Client Hosting (a pure static CDN).
  output: "export",
  // next/image can't run its optimizer in a static export — serve images as-is.
  images: { unoptimized: true },
  // Emit /route/index.html so a static host resolves clean URLs like /cases/.
  trailingSlash: true,
  ...(basePath ? { basePath, assetPrefix: basePath } : {}),
};

export default nextConfig;
