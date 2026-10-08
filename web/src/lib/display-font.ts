import localFont from "next/font/local";

/** Apply this role on pages that use display headings or headline numbers. */
export const displayFont = localFont({
  src: "../assets/fonts/fraunces-latin-400-opsz.woff2",
  variable: "--font-display",
  weight: "400",
  display: "swap",
  adjustFontFallback: "Times New Roman",
});
