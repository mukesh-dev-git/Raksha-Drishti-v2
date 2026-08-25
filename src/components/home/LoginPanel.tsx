"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Eye, EyeOff, User, Lock, ShieldCheck, ArrowRight, Landmark } from "lucide-react";
import { AUTH_ON, LOGIN_URL } from "@/lib/auth";
import { BASE_PATH } from "@/lib/basePath";
import { districts } from "@/lib/data";
import { VIEW_SCOPE_COOKIE, parseViewScope } from "@/lib/viewScope";

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
// Two genuinely different things happen on this screen now, and they're
// kept visually separate on purpose:
//
//  1. "Viewing Scope" (State/CID vs. a real district) - REAL and functional.
//     This used to live only in the Dashboard topbar's ViewScopeSwitcher;
//     moved here as the primary action too, since an officer choosing their
//     scope belongs at sign-in time, not something they stumble on later.
//     "Continue to Dashboard" sets the same rd-view-scope cookie that
//     switcher writes and navigates - the topbar switcher still works
//     afterward for changing scope mid-session.
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

  // Uncontrolled select, read via ref at the moment of action - not React
  // state kept in sync with onChange. Confirmed the state-tracking version
  // has a real gotcha: some ways of setting a <select>'s value (browser
  // automation included, but not only that) update the DOM element without
  // going through React's onChange, leaving a `useState` mirror silently
  // stale - "Continue to Dashboard" would apply whatever scope was selected
  // when the component first mounted, not what's actually showing on
  // screen. Reading scopeRef.current.value at click time always reflects
  // the real DOM value, so this class of bug can't happen.
  const scopeRef = useRef<HTMLSelectElement>(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showNotConfigured, setShowNotConfigured] = useState(false);

  // Default the picker to whatever scope is already active (e.g. an officer
  // who set it from the Dashboard topbar earlier), not always back to state.
  useEffect(() => {
    const match = /(?:^|;\s*)rd-view-scope=([^;]+)/.exec(document.cookie);
    const scope = parseViewScope(match?.[1] ? decodeURIComponent(match[1]) : null);
    if (scopeRef.current) {
      scopeRef.current.value = scope.role === "state" ? "state" : `district:${scope.districtId}`;
    }
  }, []);

  function applyScope() {
    const value = scopeRef.current?.value ?? "state";
    document.cookie = `${VIEW_SCOPE_COOKIE}=${value}; path=/; max-age=${60 * 60 * 24 * 30}`;
  }

  function continueToDashboard() {
    applyScope();
    router.push("/dashboard");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    applyScope();
    if (AUTH_ON) {
      window.location.href = LOGIN_URL;
      return;
    }
    setShowNotConfigured(true);
  }

  return (
    <aside className="scrollbar-hide relative flex w-full shrink-0 flex-col items-center overflow-y-auto overflow-x-hidden bg-navy px-8 py-12 text-center lg:fixed lg:right-0 lg:top-0 lg:h-screen lg:w-[400px]">
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

        {/* 1. Viewing Scope - real, functional, the primary action here */}
        <div className="mt-8 w-full rounded-xl bg-white p-6 text-left shadow-lg">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-ink">
            <Landmark size={18} className="text-dash-blue" aria-hidden="true" /> Viewing Scope
          </h2>
          <p className="text-sm text-muted">Choose what you&apos;ll see on the Dashboard</p>

          <label className="mt-4 block text-xs font-medium text-ink" htmlFor="scope-select">
            I am signing in as
          </label>
          <select
            id="scope-select"
            ref={scopeRef}
            defaultValue="state"
            className="mt-1.5 w-full rounded-lg border border-line bg-surface py-2.5 px-3 text-sm text-ink focus-visible:border-navy"
          >
            <option value="state">State / CID Officer — Statewide</option>
            {districts.map((d) => (
              <option key={d.dbId} value={`district:${d.dbId}`}>
                District Officer — {d.name}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={continueToDashboard}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-dash-blue py-2.5 text-sm font-semibold text-white hover:opacity-90"
          >
            Continue to Dashboard <ArrowRight size={14} aria-hidden="true" />
          </button>
          <p className="mt-2 text-[11px] leading-relaxed text-muted">
            This sets what the Dashboard shows you — real numbers and cases scoped to your choice. It is not a
            security boundary; anyone can change it from the Dashboard later. See below for officer sign-in.
          </p>
        </div>

        {/* 2. Officer sign-in - honestly not functional yet */}
        <div className="mt-4 w-full rounded-xl bg-white p-6 text-left shadow-lg">
          <h2 className="text-base font-semibold text-ink">Officer Sign-In</h2>
          <p className="text-sm text-muted">Optional — verifies who you are</p>

          {showNotConfigured ? (
            <div className="mt-4 rounded-lg border border-line bg-surface-2 p-4 text-sm text-ink">
              <p className="font-medium">Officer sign-in isn&apos;t configured yet</p>
              <p className="mt-1.5 text-muted">
                This deployment doesn&apos;t have Catalyst Authentication turned on, so there&apos;s no real account
                to sign in to yet — see <code className="text-xs">catalyst/README.md</code> §4. Your viewing scope
                above still applies.
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
