"use client";

import { useEffect, useState } from "react";

// -----------------------------------------------------------------------------
// AuthGate — officer sign-in gate backed by Catalyst Authentication.
//
// Controlled by NEXT_PUBLIC_RD_AUTH:
//   • unset / "off"  → renders children immediately (default — site always works,
//                      hosts without Auth configured; used for the fallback demo)
//   • "on"           → uses the Catalyst web SDK (window.catalyst.auth) to require
//                      an authenticated officer; unauthenticated users are sent to
//                      the Catalyst hosted login page.
//
// Enabling it: turn on Authentication in the Catalyst console, ensure the
// Catalyst web SDK is served with the client, then set NEXT_PUBLIC_RD_AUTH=on
// at build time.
// -----------------------------------------------------------------------------

const AUTH_ON = process.env.NEXT_PUBLIC_RD_AUTH === "on";
const LOGIN_URL = "/__catalyst/auth/login";

declare global {
  interface Window {
    // Catalyst web SDK, injected when the client is served from Catalyst.
    catalyst?: {
      auth?: { isUserAuthenticated?: () => Promise<unknown> };
    };
  }
}

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<"allow" | "checking">(
    AUTH_ON ? "checking" : "allow"
  );

  useEffect(() => {
    if (!AUTH_ON) return;
    let active = true;
    const sdk = typeof window !== "undefined" ? window.catalyst : undefined;

    if (!sdk?.auth?.isUserAuthenticated) {
      // SDK not available (e.g. not served from Catalyst) → hosted login.
      window.location.href = LOGIN_URL;
      return;
    }
    sdk.auth
      .isUserAuthenticated()
      .then(() => active && setStatus("allow"))
      .catch(() => {
        window.location.href = LOGIN_URL;
      });
    return () => {
      active = false;
    };
  }, []);

  if (status === "checking") {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-sm text-muted">
        Verifying officer sign-in…
      </div>
    );
  }
  return <>{children}</>;
}
