"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BASE_PATH } from "@/lib/basePath";

// -----------------------------------------------------------------------------
// not-found — recovers from Catalyst Web Client Hosting's lack of directory-
// index resolution. Catalyst only serves exact file paths (confirmed:
// /app/dashboard/index.html -> 200, but /app/dashboard/ and /app/dashboard ->
// 404), so any hard refresh, direct visit, or shared link to a nested route
// gets this page served as Catalyst's 404 fallback — with the ORIGINAL
// intended URL still sitting in window.location.
//
// On mount, compute that route's real exported file (.../index.html) and hard
// -redirect the browser straight to it — no dependency on Next's client
// router or RSC payloads, just a plain browser navigation to a file we've
// confirmed exists. A sessionStorage guard stops a genuinely bad URL (typo,
// deleted case) from looping: it retries once, then shows a real "not found".
// -----------------------------------------------------------------------------

const RECOVERY_KEY = "rd-404-recovery";

export default function NotFound() {
  const [gaveUp, setGaveUp] = useState(false);

  useEffect(() => {
    const { pathname, search, hash } = window.location;
    const withoutBase =
      BASE_PATH && pathname.startsWith(BASE_PATH)
        ? pathname.slice(BASE_PATH.length)
        : pathname;

    // Already pointing at a real file, or the bare root — nothing to recover.
    if (!withoutBase || withoutBase === "/" || /\.[a-z0-9]+$/i.test(withoutBase)) {
      setGaveUp(true);
      return;
    }

    // Avoid a redirect loop: if we already tried recovering this exact path
    // and landed back on this 404 page, the route genuinely doesn't exist.
    let alreadyTried = false;
    try {
      alreadyTried = sessionStorage.getItem(RECOVERY_KEY) === pathname;
      sessionStorage.removeItem(RECOVERY_KEY);
    } catch {
      // sessionStorage unavailable (privacy mode etc.) — fall through, try once.
    }
    if (alreadyTried) {
      setGaveUp(true);
      return;
    }

    try {
      sessionStorage.setItem(RECOVERY_KEY, pathname);
    } catch {
      // ignore — worst case we retry once more than intended
    }

    const dirPath = withoutBase.endsWith("/") ? withoutBase : `${withoutBase}/`;
    window.location.replace(`${BASE_PATH}${dirPath}index.html${search}${hash}`);
  }, []);

  if (!gaveUp) {
    return (
      <main className="flex min-h-[60vh] items-center justify-center px-4">
        <p className="text-sm text-muted">Loading…</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-content px-4 py-20 text-center">
      <p className="text-sm font-semibold uppercase tracking-wide text-muted">404</p>
      <h1 className="mt-2 text-2xl font-semibold text-navy">Page not found</h1>
      <p className="mx-auto mt-3 max-w-md text-muted">
        The page you&rsquo;re looking for doesn&rsquo;t exist or may have been moved.
      </p>
      <Link
        href="/"
        className="mt-6 inline-flex items-center gap-2 rounded-sm bg-navy px-5 py-2.5 font-medium text-white hover:bg-navy-hover"
      >
        Go to home
      </Link>
    </main>
  );
}
