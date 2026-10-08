Fonts for the Open Graph images (`src/app/employers/[slug]/opengraph-image.tsx`).
Satori needs TTF/OTF, so these are static TTFs from Google Fonts. All are licensed under the
SIL Open Font License 1.1: Inter, Fraunces, Playfair Display.


The page body and display faces are Latin WOFF2 subsets of the same Google Fonts
families. They retain their full optical-size (`opsz`) axes. FontTools instancing
removes unused weights; this does not change glyphs at the weights the app uses:

- `fraunces-latin-400-opsz.woff2`: weight 400 (all display roles), 34,796 bytes.
- `source-serif-latin-400-700-opsz.woff2`: weights 400–700, 83,148 bytes.

Sources are the Google Fonts CSS API Latin normal faces, obtained by `next/font`
on 2026-10-08. Original SHA-256 hashes:

- Fraunces: `48282a415ec22e31beaf0a0666e6fae0c8cbddcd0b1f6e729f27c3ade8a64e43`
- Source Serif 4: `2a24bad466f09b88b8e9cbc488bf774117c912e66374c57bf4716855849143f8`
- IM Fell Double Pica: `f372890bb9da19673dae9c6fe8b8311a9ce621e7f9fb7cabe9d58a7b6d0e63bf`

Licenses are included alongside the WOFF2 files.
Reproduce with FontTools `varLib.instancer`, keeping the original timestamps:

```sh
fonttools varLib.instancer fraunces-latin-original.woff2 wght=400 --no-recalc-timestamp -o fraunces-latin-400-opsz.woff2
fonttools varLib.instancer source-serif-latin-original.woff2 wght=400:700 --no-recalc-timestamp -o source-serif-latin-400-700-opsz.woff2
```

Inter remains variable. The code face uses 400 and the wordmark uses 500.
The app has no italic text. Add the appropriate font file if a new style needs
italics, a weight outside these ranges, or characters outside the Latin subset.

`im-fell-dropcap-latin.woff2` keeps uppercase A–Z, space, and quotation marks
from IM Fell Double Pica. Only `.dropcap::first-letter` uses this face; every
current paragraph starts with a capital Latin letter. Its license is included.
Generated with `pyftsubset --unicodes=U+0041-005A,U+2018-201F,U+0020-0022,U+0027
--flavor=woff2`. Expand this subset before using other drop-cap characters.

`h1b-bench-wordmark.woff2` is a 1,508-byte subset of Playfair Display Medium for
the text `H1B Bench`. It preserves the original glyph outlines, advances, and
kerning. Its internal name is `H1B Bench Wordmark` because the original family
has a reserved font name. The original license is in `Playfair-OFL.txt`.
Use this file only for the wordmark; expand it before changing that text.

The source is the Latin normal weight-500 WOFF2 that `next/font/google` downloaded
on 2026-10-08, SHA-256
`e299ff10d0630a4b18fc890eef6ccc5181846c38f78440db8c3e01758827dab5`.
To reproduce, subset with FontTools using `populate(text="H1B Bench")`, preserve
the timestamp, then set name IDs 1, 4, and 16 to `H1B Bench Wordmark`, IDs 2 and
17 to `Medium`, and IDs 3 and 6 to `H1BBenchWordmark-Medium`. Save as WOFF2.

Only Inter, the wordmark, and the code face belong to the root layout. The body,
display, and drop-cap modules in `src/lib/*-font.ts` bind directly to their role
variables on each page container. This keeps unused fonts out of that page's
preloads and preserves the same role-based typography. The code face loads on use.
