"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Search, Bell, Mail, UserCircle, FolderKanban, User, MapPin } from "lucide-react";
import AccessibilityControls from "@/components/layout/AccessibilityControls";
import type { SearchItem } from "@/lib/searchIndex";

// -----------------------------------------------------------------------------
// Dashboard top bar - greeting, real search (P2.1d - was a fully decorative
// <input> with zero state or routing until now), and notification/mail/
// profile chrome. No fabricated officer name or photo: auth is off by
// default (AuthGate) so there's no real signed-in identity to show, and
// inventing one would misrepresent a real person. alertCount is real - the
// same Alerts & Leads count shown lower on the page.
//
// `searchIndex` used to be built once, server-side, in ShellLayout and
// passed down as a plain prop - correct back when it read the 19-case
// bundled snapshot, but wrong once P10 Phase 4 made it live-backed: it
// walks the full 12,000-case worklist, and ShellLayout wraps every page,
// so every navigation paid that cost with no way to show a skeleton for
// it (a layout's own await sits outside any child route's loading.tsx
// boundary).
//
// Loading-skeleton pass (2026-09-03): fetched lazily instead, client-side,
// from GET /api/search-index, on first real interaction with the search
// box (focus) rather than on every page's initial render. Cached in this
// component's own state for the tab's lifetime once loaded, so opening
// search a second time on another page doesn't refetch. A brief
// "Loading…" row covers the one real fetch; everything before that first
// focus is instant, matching every other page's shell.
const KIND_LABEL: Record<SearchItem["kind"], string> = { case: "Cases", person: "Persons", district: "Districts" };
const KIND_ICON: Record<SearchItem["kind"], typeof FolderKanban> = { case: FolderKanban, person: User, district: MapPin };
const MAX_PER_GROUP = 4;

export default function DashboardTopbar({ alertCount }: { alertCount: number }) {
  const hour = new Date().getHours();
  const timeGreeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [searchIndex, setSearchIndex] = useState<SearchItem[] | null>(null);
  const [loadState, setLoadState] = useState<"idle" | "loading" | "loaded" | "error">("idle");
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  function ensureSearchIndexLoaded() {
    if (loadState !== "idle") return;
    setLoadState("loading");
    fetch("/api/search-index")
      .then((r) => {
        if (!r.ok) throw new Error(`search-index ${r.status}`);
        return r.json();
      })
      .then((data: SearchItem[]) => {
        setSearchIndex(data);
        setLoadState("loaded");
      })
      .catch(() => setLoadState("error"));
  }

  const grouped = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q || !searchIndex) return [];
    const hits = searchIndex.filter((item) => item.keywords.includes(q));
    const byKind: Record<SearchItem["kind"], SearchItem[]> = { case: [], person: [], district: [] };
    for (const h of hits) byKind[h.kind].push(h);
    return (["case", "person", "district"] as const)
      .map((kind) => ({ kind, items: byKind[kind].slice(0, MAX_PER_GROUP) }))
      .filter((g) => g.items.length > 0);
  }, [query, searchIndex]);

  return (
    <header className="flex items-center gap-4 border-b border-line bg-surface px-6 py-3.5">
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-[17px] font-semibold text-ink">{timeGreeting}, Officer</h1>
        <p className="truncate text-xs text-muted">Here&apos;s what&apos;s happening across Karnataka</p>
      </div>

      <div ref={wrapRef} className="relative hidden w-full max-w-sm sm:block">
        <label className="relative block">
          <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
              ensureSearchIndexLoaded();
            }}
            onFocus={() => {
              ensureSearchIndexLoaded();
              if (query) setOpen(true);
            }}
            placeholder="Search cases, persons, districts…"
            className="w-full rounded-lg border border-line bg-surface-2/50 py-2.5 pl-10 pr-4 text-sm text-ink placeholder:text-muted focus-visible:border-dash-blue"
            aria-label="Search cases, persons, districts"
          />
        </label>

        {open && query.trim() && (
          <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-20 overflow-hidden rounded-lg border border-line bg-surface shadow-md">
            {loadState === "loading" || loadState === "idle" ? (
              <p className="px-4 py-3 text-[12.5px] text-muted">Searching…</p>
            ) : loadState === "error" ? (
              <p className="px-4 py-3 text-[12.5px] text-muted">Search is unavailable right now.</p>
            ) : grouped.length === 0 ? (
              <p className="px-4 py-3 text-[12.5px] text-muted">No matches for &ldquo;{query}&rdquo;.</p>
            ) : (
              grouped.map((g) => (
                <div key={g.kind} className="border-b border-line last:border-0">
                  <p className="px-4 pb-1 pt-2.5 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-muted">
                    {KIND_LABEL[g.kind]}
                  </p>
                  {g.items.map((item) => {
                    const Icon = KIND_ICON[item.kind];
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => {
                          setQuery("");
                          setOpen(false);
                        }}
                        className="flex items-center gap-2.5 px-4 py-2 text-[13px] hover:bg-surface-2"
                      >
                        <Icon size={14} className="shrink-0 text-muted" aria-hidden="true" />
                        <span className="min-w-0 flex-1 truncate text-ink">{item.label}</span>
                        <span className="shrink-0 text-[11px] text-muted">{item.sublabel}</span>
                      </Link>
                    );
                  })}
                </div>
              ))
            )}
          </div>
        )}
      </div>

      <div className="hidden shrink-0 border-r border-line pr-4 lg:block">
        <AccessibilityControls variant="light" />
      </div>

      <div className="flex shrink-0 items-center gap-1.5">
        <button
          type="button"
          className="relative flex h-9 w-9 items-center justify-center rounded-full text-muted hover:bg-surface-2"
          aria-label={`${alertCount} alerts`}
        >
          <Bell size={18} aria-hidden="true" />
          {alertCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-semibold text-white">
              {alertCount}
            </span>
          )}
        </button>
        <button type="button" className="flex h-9 w-9 items-center justify-center rounded-full text-muted hover:bg-surface-2" aria-label="Messages">
          <Mail size={18} aria-hidden="true" />
        </button>
        <div className="ml-1.5 flex items-center gap-2 border-l border-line pl-3">
          <UserCircle size={30} className="text-muted" aria-hidden="true" />
          <span className="hidden leading-tight md:block">
            <span className="block text-[13px] font-medium text-ink">Duty Officer</span>
            <span className="block text-[11px] text-muted">Karnataka State Police</span>
          </span>
        </div>
      </div>
    </header>
  );
}
