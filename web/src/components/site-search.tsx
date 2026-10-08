"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type EmployerHit = {
  id: number;
  href: string;
  ticker: string | null;
  parent_ticker: string | null;
  parent_name: string | null;
  parent_is_self: boolean;
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

type SearchResponse = { employers: EmployerHit[]; occupations: OccupationHit[] };

type RowHandlers = {
  active: number;
  onHover: (i: number) => void;
  onGo: (href: string) => void;
};

const ARROW_STEP: Record<string, number> = { ArrowDown: 1, ArrowUp: -1 };

function toItems(data: SearchResponse): Item[] {
  return [
    ...data.employers.map(
      (hit): Item => ({ kind: "employer", href: hit.href, hit }),
    ),
    ...data.occupations.map(
      (hit): Item => ({
        kind: "occupation",
        href: `/jobs?q=${encodeURIComponent(hit.soc_title ?? hit.soc_code)}`,
        hit,
      }),
    ),
  ];
}

function viewAllHref(query: string): string | null {
  const term = query.trim();
  return term ? `/employers?q=${encodeURIComponent(term)}` : null;
}

function itemKey(item: Item): string {
  return item.kind === "employer" ? `e-${item.hit.id}` : `o-${item.hit.soc_code}`;
}

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
        const data = (await res.json()) as SearchResponse;
        setItems(toItems(data));
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
    const step = ARROW_STEP[e.key];
    if (step !== undefined) {
      e.preventDefault();
      // items.length = "view all" row
      setActive((i) => Math.min(Math.max(i + step, 0), items.length));
      return;
    }
    if (e.key !== "Enter") return;
    e.preventDefault();
    const href = active < items.length ? items[active].href : viewAllHref(query);
    if (href) go(href);
  };

  useEffect(() => {
    listRef.current
      ?.querySelector(`[data-index="${active}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [active]);

  const showDropdown = open && query.trim().length >= 2;

  return (
    <div ref={rootRef} className="relative w-full">
      <div className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-neutral-secondary">
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
        placeholder="Search employers, tickers, jobs…"
        role="combobox"
        aria-expanded={showDropdown}
        aria-controls="site-search-results"
        aria-activedescendant={showDropdown ? `search-hit-${active}` : undefined}
        className="w-full rounded-full border border-transparent bg-neutral-secondary py-2 pl-10 pr-3 text-sm text-neutral-primary placeholder-neutral-secondary outline-none focus:border-neutral-tertiary focus:bg-neutral-primary sm:pr-14 lg:pr-3 xl:pr-14"
      />
      <kbd className="pointer-events-none absolute inset-y-0 right-3 my-auto hidden h-5 items-center rounded border border-neutral-tertiary px-1.5 font-code text-[10px] text-neutral-secondary sm:flex lg:hidden xl:flex">
        ⌘K
      </kbd>

      {showDropdown && (
        <div
          id="site-search-results"
          role="listbox"
          ref={listRef}
          className="absolute left-0 right-0 top-full z-50 mt-2 max-h-[26rem] overflow-y-auto rounded-xl border border-neutral-tertiary bg-neutral-elevated py-1 shadow-elevated"
        >
          <ResultsBody
            query={query}
            items={items}
            loading={loading}
            employerCount={counts.employers}
            handlers={{ active, onHover: setActive, onGo: go }}
          />
        </div>
      )}
    </div>
  );
}

function ResultsBody({
  query,
  items,
  loading,
  employerCount,
  handlers,
}: {
  query: string;
  items: Item[];
  loading: boolean;
  employerCount: number;
  handlers: RowHandlers;
}) {
  if (items.length === 0) {
    return (
      <p className="px-4 py-6 text-center text-sm text-neutral-secondary">
        {loading ? "Searching…" : `No matches for “${query.trim()}”`}
      </p>
    );
  }
  const viewAllIndex = items.length;
  const { active, onHover, onGo } = handlers;
  return (
    <>
      {employerCount > 0 && <SectionLabel className="pt-3">Employers</SectionLabel>}
      {items.map((item, i) => (
        <ResultRow
          key={itemKey(item)}
          item={item}
          index={i}
          startsOccupations={item.kind === "occupation" && i === employerCount}
          handlers={handlers}
        />
      ))}
      <button
        data-index={viewAllIndex}
        onMouseEnter={() => onHover(viewAllIndex)}
        onClick={() => onGo(`/employers?q=${encodeURIComponent(query.trim())}`)}
        className={`w-full border-t border-neutral-primary px-4 py-2.5 text-left text-sm ${
          active === viewAllIndex ? "bg-neutral-secondary text-accent-primary-hover" : "text-accent-primary"
        }`}
      >
        View all employers matching “{query.trim()}” →
      </button>
    </>
  );
}

function SectionLabel({ className, children }: { className: string; children: React.ReactNode }) {
  return (
    <p className={`px-4 pb-1 text-[11px] font-medium uppercase tracking-wider text-neutral-secondary ${className}`}>
      {children}
    </p>
  );
}

function ResultRow({
  item,
  index,
  startsOccupations,
  handlers,
}: {
  item: Item;
  index: number;
  startsOccupations: boolean;
  handlers: RowHandlers;
}) {
  const rowProps = {
    index,
    active: handlers.active === index,
    onHover: handlers.onHover,
    onGo: handlers.onGo,
  };
  if (item.kind === "employer") return <EmployerRow item={item} {...rowProps} />;
  if (!startsOccupations) return <OccupationRow item={item} {...rowProps} />;
  return (
    <div>
      <SectionLabel className="pt-2">Occupations</SectionLabel>
      <OccupationRow item={item} {...rowProps} />
    </div>
  );
}

/** Own ticker, or the parent's ticker marked as a subsidiary. */
function TickerTag({ hit }: { hit: EmployerHit }) {
  const own = hit.ticker ?? (hit.parent_is_self ? hit.parent_ticker : null);
  if (own) return <span className="ml-2 font-code text-xs text-neutral-secondary">{own}</span>;
  if (!hit.parent_ticker) return null;
  return (
    <span className="ml-2 text-xs text-neutral-secondary" title={`Subsidiary of ${hit.parent_name ?? hit.parent_ticker}`}>
      <span className="font-code">{hit.parent_ticker}</span> subsidiary
    </span>
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
        active ? "bg-neutral-secondary" : ""
      }`}
    >
      <span className="min-w-0">
        <span className={`block truncate text-sm ${active ? "text-neutral-primary-hover" : "text-neutral-primary"}`}>
          {hit.name}
          <TickerTag hit={hit} />
        </span>
        <span className="block text-xs text-neutral-secondary">
          {[hit.city, hit.state].filter(Boolean).join(", ") || "—"}
        </span>
      </span>
      <span className="shrink-0 text-xs tabular-nums text-neutral-secondary">
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
        active ? "bg-neutral-secondary" : ""
      }`}
    >
      <span className="min-w-0">
        <span className={`block truncate text-sm ${active ? "text-neutral-primary-hover" : "text-neutral-primary"}`}>
          {hit.soc_title ?? hit.soc_code}
        </span>
        <span className="block font-code text-xs text-neutral-secondary">{hit.soc_code}</span>
      </span>
      <span className="shrink-0 text-xs tabular-nums text-neutral-secondary">
        {hit.median_wage_annual ? `$${money.format(hit.median_wage_annual)} median` : "—"}
      </span>
    </button>
  );
}
