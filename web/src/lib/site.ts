export const REPO_URL = "https://github.com/charlesrhoward/h1b-bench";

export type NavLink = { href: string; label: string; external?: boolean };

/** Site navigation, shared by the desktop nav and the mobile menu. */
export const NAV_LINKS: NavLink[] = [
  { href: "/employers", label: "Employers" },
  { href: "/jobs", label: "Occupations" },
  { href: "/labor-pool", label: "Labor pool" },
  { href: "/cheap-labor", label: "Cheap labor?" },
  { href: "https://www.dol.gov/agencies/eta/foreign-labor/performance", label: "Source: DOL OFLC", external: true },
];
