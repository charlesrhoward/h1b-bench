import Image, { type StaticImageData } from "next/image";

/**
 * Engraved vignette behind a page header, in the style of the home page's Capitol dome.
 * The parent must be `relative`. The art sits under the text, so a wrapped line can run over it.
 * It is decorative, so it has empty alt text, and it hides on phones so the data comes first.
 */
export default function HeaderArt({ src, className = "" }: { src: StaticImageData; className?: string }) {
  return (
    <Image
      src={src}
      alt=""
      sizes="(min-width: 1024px) 26rem, 18rem"
      className={`ink-art pointer-events-none absolute -z-10 hidden h-auto select-none sm:block ${className}`}
    />
  );
}
