# Unbound — Design System

A role-based editorial design system for reading-first products, built
entirely from openly licensed fonts served by Google Fonts and a semantic
light/dark color token set. Every font is SIL OFL or Apache 2.0 — safe to
self-host, fork, and ship commercially.

---

## 1. Roles, not families

The system is role-based. Components bind to roles; families fill roles. Swap
a family and every component follows, without touching component code.

| Role | Token | Use |
|---|---|---|
| UI sans | `--font-ui` | Navigation, buttons, bylines, metadata, article titles (700), section headings (500–700) |
| Body serif | `--font-body` | Long-form body text — paragraphs and list items at ~20px/400 |
| Code | `--font-code` | Code blocks and inline code, with system monospace fallback |
| Display | `--font-display` | Marketing heroes, promo cards, editorial statement headings |
| Brand display | `--font-brand` | Wordmark-adjacent brand moments, high-drama editorial headlines |
| Alternate serif | `--font-alt-serif` | Opt-in long-form serif variant for reader preferences |
| Drop cap | `--font-dropcap` | Decorative first letter at article openings (`::first-letter`) |
| Accessible | `--font-accessible` | Opt-in reading-proficiency face (dyslexia-friendly) |

The last four roles are optional layers. The core product runs on the first
four; the optional layers power reader preferences, decorative features, and
brand surfaces without touching the core.

## 2. Families

| Family | Role | License | Character |
|---|---|---|---|
| **Inter** | UI sans | OFL | Neo-grotesque built for interfaces: tall x-height, tabular figures, crisp at small sizes |
| **Source Serif 4** | Body serif | OFL | Transitional serif engineered for continuous on-screen reading; optical-size axis |
| **Source Code Pro** | Code | OFL | Compact monospace with clear glyph disambiguation (0/O, 1/l/I) |
| **Fraunces** | Display | OFL | High-contrast old-style with ball terminals and 70s editorial warmth; optical-size axis |
| **Playfair Display** | Brand display | OFL | Dramatic hairline contrast and vertical stress for statement headlines |
| **Spectral** | Alternate serif | OFL | Screen-first workhorse serif, comfortable over long reads |
| **IM Fell Double Pica** | Drop cap | OFL | Digitized 17th-century Fell types — the larger, more ornate cut; worn, warm, scholarly. Display use only |
| **Lexend** | Accessible | OFL | Designed around reading-proficiency research: wide forms, generous spacing, reduced crowding |

### Weight and style coverage

| Family | Weights | Styles | Notes |
|---|---|---|---|
| Inter | 300, 400, 500, 700 | normal + italic | variable on Google Fonts; instances listed are the shipped set |
| Source Serif 4 | 400, 700 | normal + italic | optical-size axis 8–60 |
| Source Code Pro | 400, 700 | normal + italic | |
| Fraunces | 400 | normal + italic | optical-size axis 9–144; raise `opsz` at display sizes |
| Playfair Display | 500, 700 | normal + italic (500) | 500 is the primary brand voice weight |
| Spectral | 400, 700 | normal + italic | |
| IM Fell Double Pica | 400 | normal + italic | drop caps and short display only |
| Lexend | 400 | normal | no true italics on Google Fonts |

## 3. Color

Semantic color tokens with first-class light/dark support. Components never
reference raw hex values — they bind to a semantic slot (`bg`, `fg`, `border`,
`chart`), and the token resolves per the user's color scheme.

### Naming

```
--color-{layer}-{hue-group}-{prominence}[-{state}]
```

- **layer**: `bg` · `fg` · `border` · `chart` · `shadow`
- **hue-group**: `neutral` · `brand` · `accent` · `error` · `utility-*` · `status-*` · `social-*`
- **prominence**: `primary` → `quaternary` (primary = strongest)
- **state**: `hover` (optional)

### Mechanism

```css
:root {
  color-scheme: light dark;
}
```

`color-scheme: light dark` opts the document into both schemes so native
form controls, scrollbars, and UA styling follow the user's OS preference.
Every token is declared twice: first a plain fallback (light value) for
browsers without `light-dark()` support, then the `light-dark()` override.
The later declaration wins where supported; older engines ignore it and keep
the light value.

```css
--color-fg-accent-primary: #1a8917;                        /* fallback: light */
--color-fg-accent-primary: light-dark(#1a8917, #6ab668);   /* progressive enhancement */
```

Two behavior hooks travel with the tokens:

- `--invert-in-dark-mode: 0|1` — components that must flip imagery (icons,
  wordmarks) read this flag.
- `--blend-in-dark-mode: normal|<blend-mode>` — images that need a composite
  mode to sit correctly on dark surfaces.

### Palette

The accent hue is a forest green (`#1a8917` light / `#6ab668` dark); utility
hues cover yellow and blue; neutrals run from `#ffffff` to `#000000` with a
tight grey ramp. Brand surfaces invert between modes: near-black in light,
white in dark.

Key pairs (light → dark):

| Token | Light | Dark |
|---|---|---|
| bg neutral primary | `#ffffff` | `#171717` |
| bg neutral secondary | `#f2f2f2` | `#242424` |
| bg neutral elevated | `#ffffff` | `#1c1c1c` |
| bg brand primary | `#191919` | `#ffffff` |
| bg accent secondary | `#bbdbba` | `#156d12` |
| fg neutral primary | `#242424` | `#e5e5e5` |
| fg neutral secondary | `#6b6b6b` | `#b3b3b3` |
| fg accent primary | `#1a8917` | `#6ab668` |
| fg error primary | `#c94a4a` | `#ce5a5a` |
| border neutral primary | `#f2f2f2` | `#3f3f3f` |
| chart utility yellow primary | `#fea010` | `#fea010` |
| chart utility blue primary | `#437aff` | `#3c9fff` |
| bg scrim | `#484848` | `#000000` |

### Full token set

```css
:root {
  color-scheme: light dark;
  --invert-in-dark-mode: 0;
  --blend-in-dark-mode: normal;

  /* background — neutral */
  --color-bg-neutral-primary: #ffffff;
  --color-bg-neutral-primary: light-dark(#ffffff, #171717);
  --color-bg-neutral-secondary: #f2f2f2;
  --color-bg-neutral-secondary: light-dark(#f2f2f2, #242424);
  --color-bg-neutral-tertiary: #f9f9f9;
  --color-bg-neutral-tertiary: light-dark(#f9f9f9, #1f1f1f);
  --color-bg-neutral-quaternary: #242424;
  --color-bg-neutral-quaternary: light-dark(#242424, #d2d2d2);
  --color-bg-neutral-elevated: #ffffff;
  --color-bg-neutral-elevated: light-dark(#ffffff, #1c1c1c);
  --color-bg-neutral-elevated-stacked: #ffffff;
  --color-bg-neutral-elevated-stacked: light-dark(#ffffff, #2b2b2b);
  --color-bg-neutral-elevated-inverted: #242424;
  --color-bg-neutral-elevated-inverted: light-dark(#242424, #1c1c1c);

  /* background — brand & accent */
  --color-bg-brand-primary: #191919;
  --color-bg-brand-primary: light-dark(#191919, #ffffff);
  --color-bg-brand-primary-hover: #080808;
  --color-bg-brand-primary-hover: light-dark(#080808, #f2f2f2);
  --color-bg-accent-secondary: #bbdbba;
  --color-bg-accent-secondary: light-dark(#bbdbba, #156d12);
  --color-bg-accent-secondary-hover: #9fcc9e;
  --color-bg-accent-secondary-hover: light-dark(#9fcc9e, #10530e);
  --color-bg-accent-tertiary: #d2e7d1;
  --color-bg-accent-tertiary: light-dark(#d2e7d1, #10530e);
  --color-bg-accent-quaternary: #e8f3e8;
  --color-bg-accent-quaternary: light-dark(#e8f3e8, #0c3d0a);

  /* background — error & utility */
  --color-bg-error-primary: #c94a4a;
  --color-bg-error-primary: light-dark(#c94a4a, #762323);
  --color-bg-error-primary-hover: #b63636;
  --color-bg-error-primary-hover: light-dark(#b63636, #451717);
  --color-bg-utility-yellow-primary: #fffae1;
  --color-bg-utility-yellow-primary: light-dark(#fffae1, #461f01);
  --color-bg-utility-blue-primary: #e5f2ff;
  --color-bg-utility-blue-primary: light-dark(#e5f2ff, #22214f);

  /* verified creator intro */
  --color-bg-verified-creator-intro: #e5f2ff;
  --color-bg-verified-creator-intro: light-dark(#e5f2ff, #171717);
  --color-border-verified-creator-intro: transparent;
  --color-border-verified-creator-intro: light-dark(transparent, #2b2b2b);
  --verified-creator-intro-illustration-scale: 1;

  /* foreground — neutral */
  --color-fg-neutral-primary: #242424;
  --color-fg-neutral-primary: light-dark(#242424, #e5e5e5);
  --color-fg-neutral-primary-hover: #000000;
  --color-fg-neutral-primary-hover: light-dark(#000000, #ffffff);
  --color-fg-neutral-secondary: #6b6b6b;
  --color-fg-neutral-secondary: light-dark(#6b6b6b, #b3b3b3);
  --color-fg-neutral-secondary-hover: #3f3f3f;
  --color-fg-neutral-secondary-hover: light-dark(#3f3f3f, #d2d2d2);
  --color-fg-neutral-tertiary: #ffffff;
  --color-fg-neutral-tertiary: light-dark(#ffffff, #121212);

  /* foreground — accent, error, utility, social */
  --color-fg-accent-primary: #1a8917;
  --color-fg-accent-primary: light-dark(#1a8917, #6ab668);
  --color-fg-accent-primary-hover: #156d12;
  --color-fg-accent-primary-hover: light-dark(#156d12, #40993d);
  --color-fg-error-primary: #c94a4a;
  --color-fg-error-primary: light-dark(#c94a4a, #ce5a5a);
  --color-fg-error-primary-hover: #b63636;
  --color-fg-error-primary-hover: light-dark(#b63636, #c94a4a);
  --color-fg-utility-blue-primary: #437aff;
  --color-fg-utility-blue-primary: light-dark(#437aff, #3c9fff);
  --color-fg-social-linkedin: #0a66c2;
  --color-fg-social-linkedin: light-dark(#0a66c2, #e5e5e5);

  /* border — neutral & brand */
  --color-border-neutral-primary: #f2f2f2;
  --color-border-neutral-primary: light-dark(#f2f2f2, #3f3f3f);
  --color-border-neutral-primary-hover: #e5e5e5;
  --color-border-neutral-primary-hover: light-dark(#e5e5e5, #2b2b2b);
  --color-border-neutral-secondary: #242424;
  --color-border-neutral-secondary: light-dark(#242424, #d2d2d2);
  --color-border-neutral-secondary-hover: #000000;
  --color-border-neutral-secondary-hover: light-dark(#000000, #f9f9f9);
  --color-border-neutral-tertiary: #e5e5e5;
  --color-border-neutral-tertiary: light-dark(#e5e5e5, #3f3f3f);
  --color-border-neutral-tertiary-hover: #d2d2d2;
  --color-border-neutral-tertiary-hover: light-dark(#d2d2d2, #3f3f3f);
  --color-border-brand-primary: #191919;
  --color-border-brand-primary: light-dark(#191919, #ffffff);

  /* border — accent & error */
  --color-border-accent-primary: #1a8917;
  --color-border-accent-primary: light-dark(#1a8917, #6ab668);
  --color-border-accent-primary-hover: #156d12;
  --color-border-accent-primary-hover: light-dark(#156d12, #40993d);
  --color-border-error-primary: #c94a4a;
  --color-border-error-primary: light-dark(#c94a4a, #762323);
  --color-border-error-primary-hover: #b63636;
  --color-border-error-primary-hover: light-dark(#b63636, #451717);

  /* chart */
  --color-chart-accent-primary: #1a8917;
  --color-chart-accent-primary: light-dark(#1a8917, #84c082);
  --color-chart-accent-secondary: #9fcc9e;
  --color-chart-accent-secondary: light-dark(#9fcc9e, #1a8917);
  --color-chart-accent-tertiary: #bbdbba;
  --color-chart-accent-tertiary: light-dark(#bbdbba, #156d12);
  --color-chart-accent-quaternary: #e8f3e8;
  --color-chart-accent-quaternary: light-dark(#e8f3e8, #10530e);
  --color-chart-utility-yellow-primary: #fea010;
  --color-chart-utility-yellow-primary: light-dark(#fea010, #fea010);
  --color-chart-utility-yellow-secondary: #ffc017;
  --color-chart-utility-yellow-secondary: light-dark(#ffc017, #be5b04);
  --color-chart-utility-yellow-tertiary: #fffae1;
  --color-chart-utility-yellow-tertiary: light-dark(#fffae1, #be5b04);
  --color-chart-utility-blue-primary: #437aff;
  --color-chart-utility-blue-primary: light-dark(#437aff, #3c9fff);
  --color-chart-neutral-primary: #b3b3b3;
  --color-chart-neutral-primary: light-dark(#b3b3b3, #d2d2d2);
  --color-chart-neutral-secondary: #b3b3b3;
  --color-chart-neutral-secondary: light-dark(#b3b3b3, #d2d2d2);
  --color-chart-neutral-tertiary: #e5e5e5;
  --color-chart-neutral-tertiary: light-dark(#e5e5e5, #6b6b6b);

  /* elevation & scrim */
  --color-shadow-elevated: #242424;
  --color-shadow-elevated: light-dark(#242424, transparent);
  --color-bg-scrim: #484848;
  --color-bg-scrim: light-dark(#484848, #000000);

  /* status */
  --color-status-in-review-background: #e5f2ff;
  --color-status-in-review-background: light-dark(#e5f2ff, #22214f);
  --color-status-in-review-text: #437aff;
  --color-status-in-review-text: light-dark(#437aff, #6ab7ff);
  --color-status-edits-requested-background: #fffae1;
  --color-status-edits-requested-background: light-dark(#fffae1, #461f01);
  --color-status-edits-requested-text: #be5b04;
  --color-status-edits-requested-text: light-dark(#be5b04, #fea010);

  /* article footer */
  --color-article-footer-bg-subtle: #f7f4ed;
  --color-article-footer-bg-subtle: light-dark(#f7f4ed, #242424);
  --color-article-footer-bg-contrast: #242424;
  --color-article-footer-bg-contrast: light-dark(#242424, #dacfbe);
  --color-article-footer-fg-subtle: #242424;
  --color-article-footer-fg-subtle: light-dark(#242424, #d2d2d2);
  --color-article-footer-fg-contrast: #ffffff;
  --color-article-footer-fg-contrast: light-dark(#ffffff, #121212);
  --color-article-footer-placeholder-light-grey: #d2d2d2;
  --color-article-footer-placeholder-light-grey: light-dark(#d2d2d2, #242424);
  --color-article-footer-placeholder-dark-grey: #6b6b6b;
  /* dark variant for placeholder-dark-grey pending */
}
```

### Color usage rules

- **Brand inverts, accents persist.** Brand primary surfaces flip between
  near-black (light) and white (dark). The accent green stays in the green
  family in both modes, lightening for contrast (`#1a8917` → `#6ab668`).
- **Elevated surfaces need no shadow in dark mode** — `--color-shadow-elevated`
  resolves to `transparent`; elevation reads from surface lightness instead.
- **Chart colors are a separate layer.** Never pull `chart` tokens into UI
  chrome or vice versa; chart dark values are tuned for data-legibility, not
  interface contrast. Chart blue uses the utility blue values (`fg utility blue
  primary`), so a chart has a third hue beside accent green and yellow.
- **Status pairs travel together** (`*-background` + `*-text`) — mixing a
  background from one status with text from another breaks contrast in dark
  mode.
- **Hover states always darken in light mode and lighten in dark mode** — the
  token pairs already encode this; don't add opacity hacks on top.

## 4. Typography CSS

### Stylesheet link

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:ital,wght@0,300;0,400;0,500;0,700;1,300;1,400;1,500;1,700&family=Source+Serif+4:ital,opsz,wght@0,8..60,400;0,8..60,700;1,8..60,400;1,8..60,700&family=Source+Code+Pro:ital,wght@0,400;0,700;1,400;1,700&family=Fraunces:ital,opsz,wght@0,9..144,400;1,9..144,400&family=Playfair+Display:ital,wght@0,500;0,700;1,500&family=Spectral:ital,wght@0,400;0,700;1,400;1,700&family=IM+Fell+Double+Pica:ital@0;1&family=Lexend:wght@400&display=swap">
```

### Font role tokens

```css
:root {
  --font-ui: 'Inter', 'Helvetica Neue', Helvetica, Arial, sans-serif;
  --font-body: 'Source Serif 4', Georgia, Cambria, 'Times New Roman', Times, serif;
  --font-alt-serif: 'Spectral', Georgia, Cambria, 'Times New Roman', Times, serif;
  --font-code: 'Source Code Pro', Menlo, Monaco, 'Courier New', Courier, monospace;
  --font-display: 'Fraunces', Georgia, Cambria, 'Times New Roman', Times, serif;
  --font-brand: 'Playfair Display', Georgia, Cambria, 'Times New Roman', Times, serif;
  --font-dropcap: 'IM Fell Double Pica', Georgia, serif;
  --font-accessible: 'Lexend', Arial, sans-serif;
}
```

Fallback stacks use metric-compatible system families so layout shift is
minimal while webfonts load: Georgia/Cambria/Times for serifs, Helvetica
Neue/Arial for sans, Menlo/Monaco for code.

## 5. Typography usage rules

| Element | Role | Size / weight |
|---|---|---|
| Article title (`h1`) | UI sans | 42px / 700 |
| Body paragraph, list item | Body serif | 20px / 400, line-height ≈ 1.58 |
| Section heading (`h2`) | UI sans | 24px / 600 |
| Code block (`pre`) | Code | 16px / 400 |
| Marketing hero | Display | up to 70px / 400, letter-spacing −0.05em |
| Promo/newsletter heading | Display | 18px / 400 |
| UI chrome (nav, buttons, bylines) | UI sans | 13–14px / 400–500 |
| Drop cap | Drop cap | `::first-letter`, ~4.6em, floated left |
| Brand statement headline | Brand display | display sizes / 500 |

Guidelines:

- **Never set body copy in the display, brand, or drop-cap families.** They are
  tuned for large sizes and fall apart at text sizes.
- **UI sans carries all interactive and navigational text.** Serif body is
  reserved for authored content, keeping the reading voice distinct from the
  product voice.
- **Italics are for emphasis and citations only** — not for headings.
- **Raise the optical size** (`font-variation-settings: 'opsz'`) on Fraunces
  and Source Serif 4 at large sizes; leave it low at text sizes.
- **The accessible role is always opt-in** (reader preference), never a
  default.

## 6. Self-hosting fonts

Google Fonts' CSS API serves subsetted `woff2` on the fly. For full control:

1. Download the families from the Google Fonts GitHub repos or
   [google-webfonts-helper](https://gwfh.mranftl.com/fonts).
2. Subset with `pyftsubset` and emit your own `@font-face` blocks with
   `unicode-range` splits (e.g. latin / rest) so browsers only fetch the
   subsets a page actually uses.
3. Ship each license file alongside its fonts (OFL / Apache 2.0 requirement).
4. Keep `font-display: swap` and the system fallback stacks above to avoid
   invisible text during load.

## 7. Files

- `unbound-oss-glyph-preview.html` — glyph visual of the full type stack, one
  section per family with complete Latin glyph sets and specimens. Open in a
  browser (needs internet for the font CDN).
- `design.md` — this document.
