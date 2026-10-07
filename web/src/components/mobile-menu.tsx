"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import type { NavLink } from "@/lib/site";

/** Menu button and drop-down panel for phones and tablets; the lg header shows the full nav instead. */
export default function MobileMenu({ links }: { links: NavLink[] }) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpen(false);
      buttonRef.current?.focus();
    };
    // Pointer or focus anywhere outside the menu (e.g. the search box) closes it.
    const onOutside = (e: Event) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onOutside);
    document.addEventListener("focusin", onOutside);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onOutside);
      document.removeEventListener("focusin", onOutside);
    };
  }, [open]);

  const close = () => setOpen(false);

  return (
    <div ref={rootRef} className="order-2 ml-auto sm:order-3 sm:ml-0 lg:hidden">
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={open ? "Close menu" : "Open menu"}
        onClick={() => setOpen((o) => !o)}
        className="-mr-2 flex size-10 items-center justify-center rounded-md text-zinc-300 hover:bg-zinc-900 hover:text-zinc-100"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          {open ? (
            <path d="M6 6l12 12M18 6L6 18" />
          ) : (
            <path d="M4 7h16M4 12h16M4 17h16" />
          )}
        </svg>
      </button>
      {open ? (
        <div aria-hidden="true" onClick={close} className="absolute inset-x-0 top-full h-dvh bg-black/60" />
      ) : null}
      <nav
        id={panelId}
        aria-label="Main"
        hidden={!open}
        className="absolute inset-x-0 top-full z-50 border-b border-zinc-800 bg-zinc-950 px-4 pb-4 sm:px-6 shadow-2xl shadow-black/60"
      >
        <ul className="divide-y divide-zinc-800/70">
          {links.map((l) => (
            <li key={l.href}>
              {l.external ? (
                <a href={l.href} target="_blank" rel="noreferrer" onClick={close} className="block py-3.5 text-base text-zinc-300 hover:text-zinc-100">
                  {l.label}
                </a>
              ) : (
                <Link href={l.href} onClick={close} className="block py-3.5 text-base text-zinc-200 hover:text-zinc-100">
                  {l.label}
                </Link>
              )}
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
