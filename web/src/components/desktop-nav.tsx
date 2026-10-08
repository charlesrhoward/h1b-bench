"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { isNavGroup, type NavGroup, type NavItem } from "@/lib/site";

const LINK_CLASS = "text-neutral-secondary hover:text-neutral-primary-hover";

/** Header navigation for lg screens and up; groups open a dropdown panel. */
export default function DesktopNav({ items }: { items: NavItem[] }) {
  return (
    <nav aria-label="Main" className="order-3 hidden items-center gap-x-6 whitespace-nowrap text-sm lg:flex">
      {items.map((item) =>
        isNavGroup(item) ? (
          <NavDropdown key={item.label} group={item} />
        ) : (
          <Link key={item.href} href={item.href} prefetch={item.href === "/explore" ? false : undefined} className={LINK_CLASS}>
            {item.label}
          </Link>
        ),
      )}
    </nav>
  );
}

/** A button that opens the group's links. Escape, an outside click, or a choice closes it. */
function NavDropdown({ group }: { group: NavGroup }) {
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

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((o) => !o)}
        className={`inline-flex items-center gap-1 ${open ? "text-neutral-primary" : LINK_CLASS}`}
      >
        {group.label}
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
          className={`transition-transform ${open ? "rotate-180" : ""}`}>
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      <div
        id={panelId}
        hidden={!open}
        className="shadow-elevated absolute top-full left-1/2 z-50 mt-3 w-72 -translate-x-1/2 rounded-lg border border-neutral-tertiary bg-neutral-elevated p-1.5 whitespace-normal"
      >
        <ul>
          {group.links.map((link) => (
            <li key={link.href}>
              <Link href={link.href} prefetch={link.href === "/explore" ? false : undefined} onClick={() => setOpen(false)} className="block rounded-md px-3 py-2.5 hover:bg-neutral-secondary">
                <span className="block font-medium text-neutral-primary">{link.label}</span>
                {link.description ? <span className="mt-0.5 block text-[13px] leading-snug text-neutral-secondary">{link.description}</span> : null}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
