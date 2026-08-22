// Path prefix Catalyst Web Client Hosting mounts this app under, e.g. "/app"
// when served at <domain>/app/ instead of the domain root. Only relevant to
// the legacy static-export deploy path (see git history / next.config.mjs
// prior to 2026-08-22) - Slate serves at the domain root, so this is unset
// (empty) for Slate builds. Must match src/lib/basePath.ts (same env var).
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

/** @type {import('next').NextConfig} */
const nextConfig = {
  // No `output: "export"` - this repo now deploys to Catalyst Slate, which
  // runs the app via OpenNext (real Next.js server: SSR, image optimization,
  // middleware functions - confirmed in a live Slate build log, 2026-08-22).
  // `output: "export"` was fighting OpenNext's route manifest and broke every
  // nested dynamic route (e.g. /cases/[caseType]/district-wise 404'd, both on
  // direct load and client-side nav) - removing it fixed it. Only re-add this
  // if deploying to Web Client Hosting (static-only) again.
  ...(basePath ? { basePath, assetPrefix: basePath } : {}),
};

export default nextConfig;
