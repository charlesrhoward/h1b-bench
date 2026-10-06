"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type EmployerHit = {
  id: number;
  name: string;
  city: string | null;
  state: string | null;
  filings: number;
};

type OccupationHit = {
  soc_code: string;
  soc_title: string | null;
  filings: number;
  median_wage_annual: number | null;
};

type Item =
  | { kind: "employer"; href: string; hit: EmployerHit }
  | { kind: "occupation"; href: string; hit: OccupationHit };

const compact = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 });
const money = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 0 });

export default function SiteSearch() {
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<Item[]>([]);
  const [counts, setCounts] = useState({ employers: 0, occupations: 0 });
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  useEffect(() => {
    const term = query.trim();
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      if (term.length < 2) {
        setItems([]);
        setCounts({ employers: 0, occupations: 0 });
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(term)}`, {
          signal: controller.signal,
        });
        if (!res.ok) return;
        const data = (await res.json()) as {
          employers: EmployerHit[];
          occupations: OccupationHit[];
        };
        const next: Item[] = [
          ...data.employers.map(
            (hit): Item => ({ kind: "employer", href: `/employers/${hit.id}`, hit }),
          ),
          ...data.occupations.map(
            (hit): Item => ({
              kind: "occupation",
              href: `/jobs?q=${encodeURIComponent(hit.soc_title ?? hit.soc_code)}`,
              hit,
            }),
          ),
        ];
        setItems(next);
        setCounts({ employers: data.employers.length, occupations: data.occupations.length });
        setActive(0);
        setOpen(true);
      } catch {
        // aborted or offline — keep previous state
      } finally {
        setLoading(false);
      }
    }, 180);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  const go = useCallback(
    (href: string) => {
      setOpen(false);
      router.push(href);
    },
    [router],
  );

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setOpen(false);
      inputRef.current?.blur();
      return;
    }
    if (!open) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, items.length)); // items.length = "view all" row
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (active < items.length) go(items[active].href);
      else if (query.trim()) go(`/employers?q=${encodeURIComponent(query.trim())}`);
    }
  };

  useEffect(() => {
    listRef.current
      ?.querySelector(`[data-index="${active}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [active]);

  const showDropdown = open && query.trim().length >= 2;
  const viewAllIndex = items.length;

  return (
    <div ref={rootRef} className="relative w-full sm:w-80 lg:w-96">
      <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-zinc-500">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
      </div>
      <input
        ref={inputRef}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => query.trim().length >= 2 && setOpen(true)}
        onKeyDown={onKeyDown}
        placeholder="Search employers, occupations…"
        role="combobox"
        aria-expanded={showDropdown}
        aria-controls="site-search-results"
        aria-activedescendant={showDropdown ? `search-hit-${active}` : undefined}
        className="w-full rounded-md border border-zinc-800 bg-zinc-900/70 py-1.5 pl-9 pr-14 text-sm text-zinc-100 placeholder-zinc-500 outline-none focus:border-emerald-500/60 focus:bg-zinc-900"
      />
      <kbd className="pointer-events-none absolute inset-y-0 right-2.5 hidden items-center rounded border border-zinc-700 px-1.5 font-mono text-[10px] text-zinc-500 sm:flex my-auto h-5">
        ⌘K
      </kbd>

      {showDropdown && (
        <div
          id="site-search-results"
          role="listbox"
          ref={listRef}
          className="absolute left-0 right-0 top-full z-50 mt-2 max-h-[26rem] overflow-y-auto rounded-lg border border-zinc-800 bg-zinc-900 shadow-2xl shadow-black/60"
        >
          {loading && items.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-zinc-500">Searching…</p>
          ) : items.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-zinc-500">
              No matches for “{query.trim()}”
            </p>
          ) : (
            <>
              {counts.employers > 0 && (
                <p className="px-4 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                  Employers
                </p>
              )}
              {items.map((item, i) =>
                item.kind === "occupation" && i === counts.employers ? (
                  <div key="occ-section">
                    <p className="px-4 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                      Occupations
                    </p>
                    <OccupationRow item={item} index={i} active={active === i} onHover={setActive} onGo={go} />
                  </div>
                ) : item.kind === "employer" ? (
                  <EmployerRow key={`e-${item.hit.id}`} item={item} index={i} active={active === i} onHover={setActive} onGo={go} />
                ) : (
                  <OccupationRow key={`o-${item.hit.soc_code}`} item={item} index={i} active={active === i} onHover={setActive} onGo={go} />
                ),
              )}
              <button
                data-index={viewAllIndex}
                onMouseEnter={() => setActive(viewAllIndex)}
                onClick={() => go(`/employers?q=${encodeURIComponent(query.trim())}`)}
                className={`w-full border-t border-zinc-800 px-4 py-2.5 text-left text-sm ${
                  active === viewAllIndex ? "bg-emerald-500/10 text-emerald-400" : "text-zinc-400"
                }`}
              >
                View all employers matching “{query.trim()}” →
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function EmployerRow({
  item,
  index,
  active,
  onHover,
  onGo,
}: {
  item: Extract<Item, { kind: "employer" }>;
  index: number;
  active: boolean;
  onHover: (i: number) => void;
  onGo: (href: string) => void;
}) {
  const { hit } = item;
  return (
    <button
      id={`search-hit-${index}`}
      data-index={index}
      role="option"
      aria-selected={active}
      onMouseEnter={() => onHover(index)}
      onClick={() => onGo(item.href)}
      className={`flex w-full items-baseline justify-between gap-3 px-4 py-2 text-left ${
        active ? "bg-emerald-500/10" : ""
      }`}
    >
      <span className="min-w-0">
        <span className={`block truncate text-sm ${active ? "text-emerald-300" : "text-zinc-100"}`}>
          {hit.name}
        </span>
        <span className="block text-xs text-zinc-500">
          {[hit.city, hit.state].filter(Boolean).join(", ") || "—"}
        </span>
      </span>
      <span className="shrink-0 font-mono text-xs text-zinc-500">
        {compact.format(hit.filings)} filings
      </span>
    </button>
  );
}

function OccupationRow({
  item,
  index,
  active,
  onHover,
  onGo,
}: {
  item: Extract<Item, { kind: "occupation" }>;
  index: number;
  active: boolean;
  onHover: (i: number) => void;
  onGo: (href: string) => void;
}) {
  const { hit } = item;
  return (
    <button
      id={`search-hit-${index}`}
      data-index={index}
      role="option"
      aria-selected={active}
      onMouseEnter={() => onHover(index)}
      onClick={() => onGo(item.href)}
      className={`flex w-full items-baseline justify-between gap-3 px-4 py-2 text-left ${
        active ? "bg-emerald-500/10" : ""
      }`}
    >
      <span className="min-w-0">
        <span className={`block truncate text-sm ${active ? "text-emerald-300" : "text-zinc-100"}`}>
          {hit.soc_title ?? hit.soc_code}
        </span>
        <span className="block font-mono text-xs text-zinc-500">{hit.soc_code}</span>
      </span>
      <span className="shrink-0 font-mono text-xs text-zinc-500">
        {hit.median_wage_annual ? `$${money.format(hit.median_wage_annual)} median` : "—"}
      </span>
    </button>
  );
}
