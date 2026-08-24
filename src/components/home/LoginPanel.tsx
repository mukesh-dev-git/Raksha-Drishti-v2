"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Eye, EyeOff, User, Lock, ShieldCheck, ArrowRight } from "lucide-react";
import { AUTH_ON, LOGIN_URL } from "@/lib/auth";
import { BASE_PATH } from "@/lib/basePath";

// -----------------------------------------------------------------------------
// Persistent login sidebar on the Home page. The fields are real (controlled
// inputs), but this app has no real credential-checking backend of its own -
// only Catalyst Authentication (AuthGate.tsx), which is off by default and,
// when on, works by redirecting to Catalyst's own hosted login page, not by
// accepting a username/password POST here.
//
// So: with auth off (the default), submitting does NOT pretend to sign
// anyone in - it's a real dead end that says so plainly, with a clear,
// honest way past it (continue to the dashboard unauthenticated, same as
// every other page today). With auth on, submitting sends the officer to
// the real Catalyst login flow (same LOGIN_URL AuthGate.tsx uses) instead
// of silently accepting whatever was typed - a username/password field
// that LOOKS functional but actually accepts anything would be a real
// problem for a police portal.
// -----------------------------------------------------------------------------
export default function LoginPanel() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showNotConfigured, setShowNotConfigured] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (AUTH_ON) {
      window.location.href = LOGIN_URL;
      return;
    }
    setShowNotConfigured(true);
  }

  return (
    <aside className="relative flex w-full shrink-0 flex-col items-center overflow-y-auto overflow-x-hidden bg-navy px-8 py-12 text-center lg:sticky lg:top-0 lg:h-screen lg:w-[400px]">
      {/* Decorative monuments skyline, bottom-anchored */}
      <img
        src={`${BASE_PATH}/india-skyline.jpeg`}
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 w-full select-none opacity-25"
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

        <div className="mt-8 w-full rounded-xl bg-white p-6 text-left shadow-lg">
          <h2 className="text-lg font-semibold text-ink">Welcome Back</h2>
          <p className="text-sm text-muted">Login to access the portal</p>

          {showNotConfigured ? (
            <div className="mt-5 rounded-lg border border-line bg-surface-2 p-4 text-sm text-ink">
              <p className="font-medium">Officer sign-in isn&apos;t configured yet</p>
              <p className="mt-1.5 text-muted">
                This deployment doesn&apos;t have Catalyst Authentication turned on, so there&apos;s no real account
                to sign in to yet — see <code className="text-xs">catalyst/README.md</code> §4. You can still
                explore every page.
              </p>
              <Link
                href="/dashboard"
                className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-navy hover:underline"
              >
                Continue to Dashboard <ArrowRight size={14} aria-hidden="true" />
              </Link>
            </div>
          ) : (
            <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
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
