import localFont from "next/font/local";

/** Apply this role only on pages with a decorative first letter. */
export const dropcapFont = localFont({
  src: "../assets/fonts/im-fell-dropcap-latin.woff2",
  variable: "--font-dropcap",
  weight: "400",
  display: "swap",
  adjustFontFallback: "Times New Roman",
});
