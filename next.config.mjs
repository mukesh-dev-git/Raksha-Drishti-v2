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

  // Slate applies X-Frame-Options: DENY to every response by default
  // (confirmed via curl -i on a public/ static file, 2026-08-24) - blocks
  // MapEmbed.tsx's own same-origin iframe of public/crime-map/*.html.
  // Override to SAMEORIGIN for just those two files so our own embed works,
  // without weakening the DENY default anywhere else.
  async headers() {
    return [
      {
        source: "/crime-map/:path*",
        headers: [{ key: "X-Frame-Options", value: "SAMEORIGIN" }],
      },
    ];
  },

  // P2.2 - the old [caseType]/[district]-scoped route tree was retired in
  // the P2 restructure (Next.js can't let it coexist with /cases/[caseId] -
  // two differently-named dynamic segments at the same path level is a hard
  // build error, not a style choice). These 301s exist so nothing already
  // bookmarked or demoed against the old URLs just 404s.
  //
  // None of the old fake ids survive the redirect (case-files/[caseId] used
  // placeholder ids like "FIR-1001" that never mapped to a real case, and
  // district-wise's crime-type segment has no real 1:1 destination now that
  // crime type is a filter, not a route) - every old URL lands on the
  // closest still-real equivalent: the district-scoped case list for
  // anything that named a district, /cases (the FIR Index) otherwise.
  async redirects() {
    return [
      {
        source: "/cases/:caseType/:district/investigation-workspace",
        destination: "/districts/:district",
        permanent: true,
      },
      {
        source: "/cases/:caseType/:district/case-files",
        destination: "/districts/:district",
        permanent: true,
      },
      {
        source: "/cases/:caseType/:district/case-files/:caseId",
        destination: "/districts/:district",
        permanent: true,
      },
      {
        source: "/cases/:caseType/district-wise",
        destination: "/cases",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
