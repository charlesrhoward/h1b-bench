import Image, { type StaticImageData } from "next/image";

/**
 * Engraved figure behind a page header, with a separate dark-mode drawing. A person does not
 * survive the `ink-art` inversion (the face turns into a photo negative), so dark mode uses a
 * white-line version with a transparent background instead. The parent must be `relative`.
 * Decorative: empty alt text, hidden on phones so the data comes first. No `priority`: the default
 * lazy loading fetches only the variant that is displayed, so phones and the hidden scheme load nothing.
 */
export default function HeaderFigure({
  light,
  dark,
  sizes,
  className = "",
}: {
  light: StaticImageData;
  dark: StaticImageData;
  /** The `sizes` attribute for the rendered width, for example "(min-width: 1024px) 15rem, 11rem". */
  sizes: string;
  className?: string;
}) {
  const base = `pointer-events-none absolute -z-10 hidden h-auto select-none ${className}`;
  return (
    <>
      <Image src={light} alt="" sizes={sizes} className={`${base} sm:block sm:dark:hidden`} />
      <Image src={dark} alt="" sizes={sizes} className={`${base} sm:dark:block`} />
    </>
  );
}
