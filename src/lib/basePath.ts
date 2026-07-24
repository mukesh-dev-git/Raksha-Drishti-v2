// -----------------------------------------------------------------------------
// The path prefix this static export is served under, e.g. "/app" when
// Catalyst Web Client Hosting mounts the site at <domain>/app/ instead of the
// domain root. `next/link` and `next/image` apply this automatically via
// next.config's basePath; anything else that builds a root-absolute URL by
// hand (iframe src, a raw <img>) must prefix it manually with this constant.
// Empty string when served from the domain root.
// -----------------------------------------------------------------------------
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || "";
