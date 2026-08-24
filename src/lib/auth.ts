// -----------------------------------------------------------------------------
// Shared source of truth for the officer-auth feature flag, used by both
// AuthGate.tsx (the whole-app gate) and the Home page's LoginPanel - so
// there's exactly one place that decides whether real Catalyst
// Authentication is configured, not two copies that could drift.
//
// AUTH_ON off (default): no Catalyst Authentication is configured for this
// deployment. LoginPanel must NOT pretend a username/password form here
// authenticates anything in that state - see LoginPanel.tsx.
// -----------------------------------------------------------------------------
export const AUTH_ON = process.env.NEXT_PUBLIC_RD_AUTH === "on";
export const LOGIN_URL = "/__catalyst/auth/login";
