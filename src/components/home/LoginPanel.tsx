"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Eye, EyeOff, User, Lock, ShieldCheck, ArrowRight, Landmark } from "lucide-react";
import { AUTH_ON, LOGIN_URL } from "@/lib/auth";
import { BASE_PATH } from "@/lib/basePath";

// Same photo HomeHero.tsx uses (verified a real, resolving Unsplash photo via
// curl - see that file's comment on why that matters) - a full backdrop
// behind the whole panel instead of the previous bottom-anchored skyline
// strip, per a follow-up request.
const LOGIN_BG_IMG =
  "https://images.unsplash.com/photo-1453873531674-2151bcd01707?auto=format&fit=crop&w=900&q=80";

// -----------------------------------------------------------------------------
// Persistent login sidebar on the Home page - `lg:fixed` (not `sticky`) so it
// stays anchored to the viewport regardless of how tall the left column's
// content is; HomePage reserves the matching width with a spacer so the
// fixed panel doesn't overlap the main content. Below `lg` it's a normal
// in-flow block (stacks under the main content on narrow screens).
//
// Two actions here, kept visually separate on purpose:
//
//  1. "Continue to Dashboard" - the real primary action. It just navigates;
//     there is nothing to configure first. This used to be a "Viewing Scope"
//     picker (SCRB vs. a district) that wrote an rd-view-scope cookie, but
//     district is a drill-down FILTER on the dashboard now, not a login role
//     - see dashboard/page.tsx and DistrictFilter.tsx for why.
//
//  2. Officer sign-in (username/password/SSO) - honestly NOT functional.
//     This app has no real credential-checking backend of its own - only
//     Catalyst Authentication (AuthGate.tsx), off by default, which works
//     by redirecting to Catalyst's own hosted login page, not by accepting
//     a POST here. With auth off (the default), submitting doesn't pretend
//     to sign anyone in - a password field that LOOKS functional but
//     actually accepts anything would be a real problem for a police
//     portal. With auth on, it redirects to the real Catalyst flow instead.
// -----------------------------------------------------------------------------
export default function LoginPanel() {
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showNotConfigured, setShowNotConfigured] = useState(false);

  function continueToDashboard() {
    router.push("/dashboard");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (AUTH_ON) {
      window.location.href = LOGIN_URL;
      return;
    }
    setShowNotConfigured(true);
  }

  return (
    <aside
      id="officer-sign-in"
      className="scrollbar-hide relative flex w-full shrink-0 scroll-mt-4 flex-col items-center overflow-y-auto overflow-x-hidden bg-navy px-8 py-12 text-center lg:fixed lg:right-0 lg:top-0 lg:h-screen lg:w-[400px]"
    >
      {/* Full backdrop photo behind the whole panel, dark navy wash for
          text legibility (same treatment as the Home hero). */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${LOGIN_BG_IMG})` }}
      />
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{ background: "linear-gradient(180deg, rgba(11,32,66,0.92) 0%, rgba(11,32,66,0.88) 100%)" }}
      />

      <div className="relative z-10 flex w-full max-w-[300px] flex-1 flex-col items-center">
        <Image
          src={`${BASE_PATH}/karnataka-state-police.png`}
          alt="Karnataka State Police emblem"
          width={72}
          height={72}
          className="h-[72px] w-[72px] object-contain"
        />
        <h1 className="mt-4 text-xl font-semibold text-white">Raksha-Drishti</h1>
        <p className="mt-1 text-sm text-white/70">Crime Analytics &amp; Investigation Portal</p>
        <p className="text-sm text-white/70">Karnataka State Police</p>

        {/* 1. Continue - the real primary action */}
        <div className="mt-8 w-full rounded-xl bg-white p-6 text-left shadow-lg">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-ink">
            <Landmark size={18} className="text-dash-blue" aria-hidden="true" /> State Crime Records Bureau
          </h2>
          <p className="mt-1 text-sm text-muted">
            Statewide crime intelligence across all districts and police stations.
          </p>

          <button
            type="button"
            onClick={continueToDashboard}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-dash-blue py-2.5 text-sm font-semibold text-white hover:opacity-90"
          >
            Continue to Dashboard <ArrowRight size={14} aria-hidden="true" />
          </button>
          <p className="mt-2 text-[11px] leading-relaxed text-muted">
            Opens the statewide view. Drill down to any single district from the Dashboard itself.
          </p>
        </div>

        {/* 2. Officer sign-in - honestly not functional yet */}
        <div className="mt-4 w-full rounded-xl bg-white p-6 text-left shadow-lg">
          <h2 className="text-base font-semibold text-ink">Officer Sign-In</h2>
          <p className="text-sm text-muted">Authentication not enabled yet — for easier navigation during testing</p>

          {showNotConfigured ? (
            <div className="mt-4 rounded-lg border border-line bg-surface-2 p-4 text-sm text-ink">
              <p className="font-medium">Officer sign-in isn&apos;t configured yet</p>
              <p className="mt-1.5 text-muted">
                This deployment doesn&apos;t have Catalyst Authentication turned on, so there&apos;s no real account
                to sign in to yet — see <code className="text-xs">catalyst/README.md</code> §4. Use
                &ldquo;Continue to Dashboard&rdquo; above.
              </p>
            </div>
          ) : (
            <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
              <div>
                <label htmlFor="login-username" className="mb-1.5 block text-xs font-medium text-ink">
                  Username / Employee ID
                </label>
                <div className="relative">
                  <User size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" aria-hidden="true" />
                  <input
                    id="login-username"
                    type="text"
                    autoComplete="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter your employee ID"
                    className="w-full rounded-lg border border-line bg-surface py-2.5 pl-10 pr-3 text-sm text-ink placeholder:text-muted focus-visible:border-navy"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="login-password" className="mb-1.5 block text-xs font-medium text-ink">
                  Password
                </label>
                <div className="relative">
                  <Lock size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" aria-hidden="true" />
                  <input
                    id="login-password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full rounded-lg border border-line bg-surface py-2.5 pl-10 pr-10 text-sm text-ink placeholder:text-muted focus-visible:border-navy"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink"
                  >
                    {showPassword ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
                  </button>
                </div>
              </div>

              <div className="text-right">
                <span className="text-xs text-muted">Forgot Password?</span>
              </div>

              <button
                type="submit"
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-navy py-2.5 text-sm font-semibold text-white hover:bg-navy-hover"
              >
                <Lock size={14} aria-hidden="true" /> Sign In
              </button>

              <div className="flex items-center gap-3 text-xs text-muted">
                <span className="h-px flex-1 bg-line" /> or continue with <span className="h-px flex-1 bg-line" />
              </div>

              <button
                type="button"
                onClick={() => (AUTH_ON ? (window.location.href = LOGIN_URL) : setShowNotConfigured(true))}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-line py-2.5 text-sm font-medium text-ink hover:bg-surface-2"
              >
                <Image
                  src={`${BASE_PATH}/karnataka-state-police.png`}
                  alt=""
                  width={16}
                  height={16}
                  className="h-4 w-4 object-contain"
                />
                Login with Karnataka SSO
              </button>
            </form>
          )}
        </div>

        <p className="mt-5 flex items-start gap-2 text-left text-xs text-white/60">
          <ShieldCheck size={26} className="shrink-0 text-white/70" aria-hidden="true" />
          <span>
            <span className="font-medium text-white/80">Secure &amp; Protected.</span> Sign-in for this demo
            deployment is not yet backed by a real account system — see the note above.
          </span>
        </p>
      </div>
    </aside>
  );
}
