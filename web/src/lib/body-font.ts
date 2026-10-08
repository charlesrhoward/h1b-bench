import localFont from "next/font/local";

/** Apply this role on pages with authored serif text, so other pages do not preload it. */
export const bodyFont = localFont({
  src: "../assets/fonts/source-serif-latin-400-700-opsz.woff2",
  variable: "--font-body",
  weight: "400 700",
  display: "swap",
  adjustFontFallback: "Times New Roman",
});
