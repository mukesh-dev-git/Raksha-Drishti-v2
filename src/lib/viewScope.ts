// -----------------------------------------------------------------------------
// "Viewing as" scope - District Officer (scoped to one real district) vs
// State/CID Officer (statewide, including cross-district cases) - see the
// "Viewing as" switcher in DashboardTopbar.tsx.
//
// This is a UI/demo scoping preference, NOT real access control. There is no
// signed-in identity backing it (Catalyst Authentication is off by default -
// see LoginPanel.tsx/AuthGate.tsx) - anyone can switch scope freely. It's
// stored in a plain, client-writable cookie (not httpOnly, no server-side
// verification) so Server Components can read it and actually filter what
// they render, which a localStorage-only preference couldn't do. Real
// backend-enforced RBAC (a signed-in officer's role/district determining
// what they're ALLOWED to see, not just what's shown by default) would need
// Catalyst Authentication configured with real roles - not built yet.
//
// Client-safe on purpose - no `next/headers` import here. A Client
// Component (ViewScopeSwitcher.tsx) needs VIEW_SCOPE_COOKIE/ViewScope from
// this file, and even a type-only import of a module that also imports
// `next/headers` pulls that import into the client bundle (confirmed: this
// used to live in one file with getViewScope() and broke the build with
// "You're importing a component that needs next/headers" from a client
// component several imports away). The one Server Component that needs to
// actually read the cookie ((site)/layout.tsx) calls next/headers directly.
// -----------------------------------------------------------------------------

export const VIEW_SCOPE_COOKIE = "rd-view-scope";

export type ViewScope =
  | { role: "state" }
  | { role: "district"; districtId: number };

export const DEFAULT_SCOPE: ViewScope = { role: "state" };

export function parseViewScope(raw: string | undefined | null): ViewScope {
  if (!raw) return DEFAULT_SCOPE;
  if (raw === "state") return { role: "state" };
  const m = /^district:(\d+)$/.exec(raw);
  if (m) return { role: "district", districtId: Number(m[1]) };
  return DEFAULT_SCOPE;
}

export function serializeViewScope(scope: ViewScope): string {
  return scope.role === "state" ? "state" : `district:${scope.districtId}`;
}
