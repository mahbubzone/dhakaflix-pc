# DhakaFlix — Phase 1 Visual Design Audit & Proposal

**Date:** 28 November 2026  
**Status:** Approved 28 November 2026 · Phase 2 and Phase 3 implemented on `preview/phase1-design-proposal` · final QA in progress  
**Branch:** `preview/phase1-design-proposal`  
**Source:** user-supplied *Detailed Visual Design System & UI/UX Specification*, 28 November 2026  
**Baseline:** `v0.4.6` (clean pre-0.5 codebase)

---

## 0. Purpose and constraints

This document is the Phase 1 design proposal. It defines the visual system only.

- **No application files may change during this stage.**
- Existing functionality, navigation rules, data sources and IPC contracts are preserved.
- Apple TV is a quality benchmark, not a UI to copy.
- The finished app must feel like one premium product, not a typical dark dashboard.

### Explicit non-goals

- No in-app video player. Playback stays external (VLC primary, PotPlayer fallback).
- No fabricated metadata, ranking, popularity or personalisation.
- No mobile target.
- No new icon dependency.

### Known regression to prevent

The discarded 0.5.x design-system attempt stored `1px solid rgba(...)` inside colour tokens such as `--divider`. Components then used those tokens as colours (`border: 1px solid var(--divider)`), producing invalid declarations. Chromium dropped 54 borders. In this proposal:

- **Colour tokens contain colours only.**
- Width and style are separate tokens.
- Borders are composed at the point of use: `border: var(--border-width-1) var(--border-style-solid) var(--color-divider);`
- Review must grep colour tokens for `solid`, `px` and `rgba`-as-shorthand misuse before merge.

---

## 1. Final colour palette and tokens

### 1.1 Surfaces, text, accent, semantics

| Token | Value | Usage |
|---|---|---|
| `--color-bg` | `#101318` | Application background; never pure black for chrome |
| `--color-elevated` | `#141920` | Nav, window chrome, first raised layer |
| `--color-surface-1` | `#191F27` | Cards and standard panels |
| `--color-surface-2` | `#202833` | Raised panels, inputs, controls |
| `--color-surface-3` | `#29323E` | Hover and selected surfaces |
| `--color-glass` | `rgba(22,28,36,0.76)` | Approved glass surfaces only; `background-color` only |
| `--color-text-primary` | `#F3F5F8` | Headings, primary copy |
| `--color-text-secondary` | `#B0B8C4` | Descriptions, metadata |
| `--color-text-tertiary` | `#818B99` | Deprioritised information |
| `--color-text-disabled` | `#596372` | Disabled controls only |
| `--color-divider` | `rgba(255,255,255,0.08)` | Hairlines; colour only |
| `--color-accent` | `#FE3047` | Primary Play, important selection, progress, important status |
| `--color-accent-hover` | `#FF5969` | Primary button hover |
| `--color-accent-pressed` | `#D9273D` | Primary button pressed |
| `--color-accent-subtle` | `rgba(254,48,71,0.12)` | Accent-tinted background, sparingly |
| `--color-accent-border` | `rgba(254,48,71,0.28)` | Important selected-state border colour |
| `--color-success` | `#43C995` | Success feedback only |
| `--color-warning` | `#E9B85C` | Warning feedback only |
| `--color-error` | `#F05A64` | Errors and destructive confirmation |
| `--color-info` | `#66AFFF` | Informational feedback |
| `--color-focus` | `#9CC4FF` | Keyboard focus ring |
| `--color-rating` | `#F5C518` | IMDb rating glyph; retained from current app |
| `--color-playback` | `#000000` | Video area only, never application chrome |

Red is reserved for: primary Play/Resume, important selected states, progress indicators and important status. It must not become the default colour for active nav items, icons, borders, badges or secondary buttons.

### 1.2 Shape, border, spacing, elevation

| Token | Value | Usage |
|---|---|---|
| `--border-width-1` | `1px` | Hairlines, card edges, dividers |
| `--border-width-2` | `2px` | Emphasis border where used instead of outline |
| `--border-style-solid` | `solid` | Shared style token |
| `--outline-focus-width` | `2px` | `:focus-visible` outline |
| `--outline-focus-offset` | `2px` | Focus ring offset |
| `--radius-badge` | `5px` | Badges and micro chips |
| `--radius-control` | `9px` | Buttons and inputs |
| `--radius-card` | `12px` | Posters and continue tiles |
| `--radius-panel` | `16px` | Panels and popovers |
| `--radius-dialog` | `18px` | Modal dialogs |
| `--radius-floating` | `14px` | Floating controls and toasts |
| `--space-1` … `--space-8` | `4, 8, 12, 16, 24, 32, 48, 64px` | 4px grid; add `--space-8` |
| `--shadow-1` | `0 2px 8px rgba(0,0,0,0.36)` | Cards at rest |
| `--shadow-2` | `0 12px 32px rgba(0,0,0,0.44)` | Hover and raised panels |
| `--shadow-3` | `0 24px 56px rgba(0,0,0,0.52)` | Dialogs only |
| `--shadow-glass` | `0 8px 24px rgba(0,0,0,0.28)` | Glass surfaces |
| `--blur-subtle` | `8px` | Nav, dialogs, toasts |
| `--blur-medium` | `12px` | Detail backdrop, popovers |
| `--blur-strong` | `16px` | Search overlay only; hard cap |

### 1.3 Motion and icon size tokens

| Token | Value | Usage |
|---|---|---|
| `--motion-hover` | `140ms` | Buttons and cards (120–160ms) |
| `--motion-nav` | `190ms` | Navigation (160–220ms) |
| `--motion-popover` | `180ms` | Popovers (160–200ms) |
| `--motion-dialog` | `210ms` | Dialog enter/exit (180–240ms) |
| `--motion-hero` | `500ms` | Hero transition (400–600ms) |
| `--ease-standard` | `cubic-bezier(0.2, 0, 0, 1)` | All UI motion |
| `--hero-rotate` | `10s` | Hero rotation (8–12s) |
| `--icon-nav` | `20px` | Navigation items (19–21px) |
| `--icon-button` | `18px` | Buttons and card actions (18–20px) |
| `--icon-inline` | `14px` | Inline icons (14–16px) |
| `--icon-empty` | `36px` | Empty and placeholder states (32–40px) |
| `--icon-playback` | `24px` | Playback controls (22–26px) |
| `--icon-stroke` | `1.75px` | Default; `2px` for playback/system |

---

## 2. Typography system

Font stack: `Inter, "Segoe UI", system-ui, sans-serif`. Use installed fonts only; no font download.

| Role | Size | Weight | Tracking | Leading | Colour |
|---|---:|---:|---:|---:|---|
| Hero title | 40–56px | 700 | −0.020em | 1.05 | primary |
| Page title | 30–36px | 650–700 | −0.015em | 1.15 | primary |
| Section heading | 21–24px | 600 | −0.010em | 1.25 | primary |
| Card title | 14–16px | 550–600 | 0 | 1.35 | primary |
| Body | 14–15px | 400 | 0 | 1.5 | secondary |
| Description | 13–14px | 400 | 0 | 1.5 | secondary |
| Metadata | 11–12px | 400–500 | 0 | 1.35 | tertiary |
| Small labels | 10–11px | 500 | 0.01em | 1.3 | tertiary |

Rules:

- Remove `--font-display: 'Arial Black', Impact, ...`. No Arial Black, no Impact.
- Negative tracking only at 21px and above. Badges use sentence case.
- Maximum weight 700. If static Inter is used, map 550/650 to 600/700 rather than relying on synthetic weight.
- Hero description clamps to two lines. Card titles truncate with ellipsis. Metadata never wraps to a third line.
- One alignment grid: captions and metadata align with the card edge.

---

## 3. Icon family and mapping

**Decision:** one Lucide-geometry icon family, delivered as a small inline SVG subset. No package install.

Evidence: `package.json` has no icon library. The renderer mixes hand-written `fill="currentColor"` and `stroke="currentColor"` SVG across multiple files, plus emoji glyphs (`🎬`, `📺`, `🔍`, `🤷`) and text glyphs (`✕`, `★`, `✓`, `☆`). All of these migrate in one pass.

Shared wrapper: `viewBox="0 0 24 24"`, `fill="none"`, `stroke="currentColor"`, `stroke-width: var(--icon-stroke)`, rounded caps and joins, `aria-hidden="true"`, `focusable="false"`. The parent supplies the accessible name.

| Destination / action | Lucide name | Context | Size |
|---|---|---|---:|
| Home | `House` | Nav | 20 |
| Movies | `Clapperboard` | Nav | 20 |
| Series | `Tv` | Nav | 20 |
| Documentaries | `FileVideo` | Nav, secondary | 20 |
| Awards | `Trophy` | Nav, secondary | 20 |
| Watchlist | `Bookmark` | Nav | 20 |
| Search | `Search` | Nav, modal | 20 |
| Settings | `Settings` | Nav icon button | 20 |
| Play | `Play` | Primary button | 18 |
| Resume | `CirclePlay` | Cards, empty states | 18–36 |
| Pause | `Pause` | Hero rotation control | 18 |
| More information | `Info` | Detail, toasts | 18 |
| More actions | `Ellipsis` | Card menus | 18 |
| Favourite | `Heart` | Detail action | 18 |
| Watchlist add/remove | `BookmarkPlus` / `BookmarkMinus` | Cards, detail | 18 |
| Watched | `CircleCheck` | Detail, toasts | 18 |
| Back | `ArrowLeft` | Detail, dialogs | 18 |
| Close / remove | `X` | Dialogs, card removal | 18 |
| Forward / previous | `SkipForward` / `SkipBack` | Playback controls* | 24 |
| Volume | `Volume2` | Playback controls* | 24 |
| Subtitles | `Captions` | Playback controls* | 24 |
| Audio | `AudioLines` | Playback controls* | 24 |
| Fullscreen | `Maximize` / `Minimize` | Playback controls* | 24 |
| Filter | `ListFilter` | Browse grids | 18 |
| Sort | `ArrowUpDown` | Browse grids | 18 |
| Refresh | `RefreshCw` | Empty/error actions | 18 |
| Loading | `LoaderCircle` | Spinners | 18 |
| Missing artwork | `Clapperboard` | Placeholder | 36 |

\* Playback glyphs are specified for future use; there is no in-app playback surface today.

Window controls keep their existing 16px system glyphs as one documented exception. If a real icon library is adopted later, all icons migrate together. Two families never run in parallel.

---

## 4. Navigation layout and states

```
┌──────────────────────────────────────────────────────────────────────┐
│ DhakaFlix  ⌂ Home  ▣ Movies  ▤ Series  ▥ Docs  ♦ Awards  ▤ Watchlist │
│                                        [  Search…  ]  [ ⚙ ]          │
└──────────────────────────────────────────────────────────────────────┘
```

Schematic only; final icons come from Section 3.

- Height 72px. Preserve frameless drag regions and double-click maximise.
- Left: logo, then Home, Movies, Series, Documentaries, Awards, Watchlist. Icon + label with 8px gap, 24px between items.
- Primary items: 14px / 500 / secondary text. Documentaries and Awards: 13px / 500 / tertiary text; secondary by weight and colour only.
- Right: a permanently visible compact search control (~220×36px, `--radius-control`, `--color-surface-2`) and a 36×36 settings icon button.
- Search behaviour: the compact control opens the existing search modal on click or keyboard activation. It is not a separate page. Typing starts in the modal input.
- Active state: primary text plus a neutral 2px underline or surface highlight. No red active underline. `aria-current="page"`.
- No separators between items. One bottom hairline on the bar.
- Focus: 2px `--color-focus` ring, 2px offset.

| State | Treatment |
|---|---|
| Default | Secondary text, transparent fill |
| Hover | Primary text, `--color-surface-3` fill, `--motion-nav` |
| Selected | Primary text, neutral indicator, `aria-current="page"` |
| Focused | Focus ring; never fill alone |
| Item with no eligible titles | Render secondary; tooltip explains why; no misleading empty page |

---

## 5. Glass specification

| Surface | Glass | Alpha | Blur | Border | Shadow | Fallback |
|---|---|---:|---|---|---|---|
| Top navigation | Subtle | 0.76 | 8px | divider | none | solid `--color-elevated` |
| Search overlay | Stronger | 0.88 | 16px | divider | `--shadow-3` | solid `--color-surface-2` |
| Detail modal backdrop | Subtle | 0.84 | 12px | — | — | dim only |
| Detail modal content | **None** | 1.0 | 0 | divider | `--shadow-3` | unchanged |
| Dialogs / popovers | Subtle | 0.80 | 8–10px | divider | `--shadow-2` | solid `--color-surface-2` |
| Floating playback controls* | Subtle | 0.80 | 10px | divider | `--shadow-glass` | solid `--color-elevated` |
| Toasts | Subtle | 0.76 | 8px | divider | `--shadow-1` | solid `--color-surface-2` |
| Posters, cards, settings forms, placeholders | **None** | 1.0 | 0 | divider | `--shadow-1` | unchanged |

\* Deferred until an in-app playback surface exists.

Fallback:

```css
@supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
  .glass { background-color: var(--color-elevated); backdrop-filter: none; }
}
```

Rules: one blurred layer per screen region; disable nav blur while an overlay is open; never nest `backdrop-filter`; no blur on posters, cards, settings forms or small chips; blur radius never above 16px. Provide `data-glass="off"` kill switch for low-end hardware. Validate on Intel integrated graphics at 1366×768 with nav, hero and dialog visible together.

---

## 6. Component interaction states

### Buttons

| Variant | Default | Hover | Pressed | Focus | Disabled |
|---|---|---|---|---|---|
| Primary | `--color-accent`, label per decision D4 | `--color-accent-hover` | `--color-accent-pressed` | focus ring | surface bg, disabled text, no pointer |
| Secondary | `--color-surface-2`, primary text | `--color-surface-3` | surface-3, 0.98 scale | focus ring | as above |
| Ghost | transparent, secondary text | `--color-surface-3` | surface-3 | focus ring | disabled text |
| Icon | 36×36, transparent | `--color-surface-3` | pressed fill | focus ring + tooltip | 50% opacity |
| Loading | spinner replaces label, fixed width | — | — | focus retained | `aria-busy="true"` |

### Cards

| State | Treatment |
|---|---|
| Default | `--color-surface-1` art background, hairline border, `--shadow-1`, radius 12 |
| Hover | `scale(1.02)` maximum 1.025, `--shadow-2`, one play affordance; transform only, no layout shift |
| Selected | accent-border colour plus a non-colour marker such as a check icon; never a red fill |
| Focused | 2px `--color-focus` outline, 2px offset, on the art container |
| Pressed | `scale(0.99)`, no shadow change |
| Disabled / loading | flat placeholder, no hover transform |

### Navigation, inputs and dialogs

- Nav: default / hover / selected / focused as Section 4.
- Inputs: default surface-2 + divider; hover brightens border; focus adds border emphasis and focus ring but no glow; invalid uses `--color-error` plus icon and message; disabled uses disabled text and no pointer.
- Dialogs: radius 18, backdrop per Section 5, `--shadow-3`, 24px padding, X close button with tooltip, Escape closes, focus moves into dialog and returns to trigger, focus is trapped, background scroll locked. Applies to Search, Detail, Trailer, ShortcutSheet and confirmations.

---

## 7. Card and artwork specifications

| Card | Aspect | Width | Radius | Overlay | Actions |
|---|---:|---:|---:|---|---|
| Poster | exact `2 / 3` | 120 / 160 / 196 | 12 | one play circle on hover/focus | watchlist as sibling control |
| Continue Watching | exact `16 / 9` | 280 (230 below 960px) | 12 | bottom scrim, title, episode line, 4px accent progress | remove X with two-step confirm |
| Placeholder | matches card aspect | same | same | flat `--color-surface-1`, 36px `Clapperboard` at 0.3 opacity | none |

Rules:

- `object-fit: cover` inside a fixed-aspect container. No stretching.
- One card style across every screen. No cards inside cards.
- Badges: radius 5, 11px / 500, surface-3 background, secondary text, sentence case. No red-filled NEW badge.
- Hover overlays use one play affordance. The only gradient is the functional bottom scrim.
- Replace all emoji and gradient placeholders with the neutral SVG icon.
- Grid gap 24px; section gap 48px.

---

## 8. Home page layout

Mandatory order:

| # | Section | Data source | Rules |
|---:|---|---|---|
| 1 | Hero | real trending matches, cached | 40–56/700 title, two-line description, metadata, Play/Resume + More Info, rotate 10s, dots and arrows, pause on hover/focus/reduced motion, height ≤60vh |
| 2 | Continue Watching | local progress DB | immediately below hero; 16:9; progress, title, episode, remove; never demoted |
| 3 | Trending | real popularity, local titles only | one rail; hide without real data; no invented ranks |
| 4 | Recently Added | real catalogue scan | rename from "Just added"; sort by real add order |
| 5 | Picked for You | viewing-history evidence only | hide until a real threshold is met; never relabel Top Rated as personalised |
| 6 | Editorial Collections | eligible real sets | Awards, Documentaries, Top Rated, Hidden Gems; only with meaningful eligibility |

Cross-cutting rules:

- Deduplicate by title id with priority Hero → Continue → Trending → Recent → Editorial.
- Stable ordering from real ids and add dates. No random reshuffle on launch.
- Hide a section when it has no eligible content.
- Empty home shows onboarding with a Settings action.
- Hero must not consume so much height that discovery rows are hidden.

---

## 9. Screen-by-screen consistency plan

| Screen | Current implementation | Shared system | Note |
|---|---|---|---|
| Home | `Home.tsx`, Hero, PosterRow | Hero, Continue, Poster, SectionHeader, Empty, Skeleton | reorder per Section 8, dedupe rails |
| Movies / Series | `Category.tsx` sentinel categories | PosterGrid, FilterBar, PageTitle | same cards as Home |
| Documentaries / Awards | `Category.tsx` real categories | PosterGrid, PageTitle | secondary nav weight only; content identical |
| Watchlist | `MyList.tsx` | PosterGrid, Empty | same cards, Browse CTA |
| Detail (movie/series) | `Detail` + `DetailModal.css` | Dialog, Button variants, Badge, Metadata row | solid content, glass backdrop, remove grain |
| Seasons / episodes | episode list in Detail | EpisodeRow, progress, play icon | match Continue progress treatment |
| Search | modal (`App.tsx`) | Dialog, SearchInput, PosterGrid | keep modal, stronger glass |
| Settings | `Settings.tsx` tabs | Tabs, FormField, Input states, SectionTitle | no glass on forms |
| Playback | external VLC/PotPlayer | not in app | floating controls deferred |
| Dialogs / popovers | ShortcutSheet, Trailer, confirmations | Dialog spec in Section 6 | one radius, close, Escape, focus trap |
| Toasts | not unified | semantic Toast variants | subtle glass, icon + message, 4s dismiss |
| Empty / loading / error | mixed emoji and generic copy | EmptyState, Skeleton, ErrorState | one icon family, actionable copy |

Shared variants replace per-screen one-off styles. A component must look and behave the same wherever it appears.

---

## 10. Accessibility and performance plan

### Accessibility

- Text contrast ≥4.5:1, large text ≥3:1, UI borders ≥3:1 against adjacent colours.
- Estimated ratios: primary on background ≈17:1 pass; secondary ≈9:1 pass; tertiary ≈5.4:1 pass; disabled ≈3.1:1 exempt.
- **Known conflict:** `#F3F5F8` on `#FE3047` ≈3.4:1 fails. See decision D4.
- `:focus-visible` 2px focus ring on every interactive element. No outline suppression without replacement.
- Tab order matches visual order. Escape closes dialogs. Focus is trapped and restored.
- Every icon-only control has `aria-label` and tooltip; decorative icons are `aria-hidden`.
- `aria-current` on active nav; carousel dots keep their labels; `aria-invalid` and message on invalid inputs.
- State never communicated by colour alone: selection adds a check, errors add icon + text.
- `prefers-reduced-motion` preserves the existing global override; hero rotation pauses.

### Performance

- One blurred layer per region; `data-glass="off"` kill switch.
- Animate only opacity and transform. Never animate blur radius.
- Lazy-load posters below the fold; keep placeholders; avoid layout shift on image swap.
- Avoid expensive shadows, excessive blur and unnecessary re-rendering.
- Test at 600, 960, 1024, 1360 and 1700px, plus 1366×768 on Intel integrated graphics.

---

## 11. Decisions required before implementation

Resolved by the supplied specification: compact nav search opens the existing modal (not a page); settings becomes a gear icon button; nav labels are Documentaries/Awards mapped to the real `Documentary` and `Awards & TV Shows` categories; active state is neutral, not red; inputs and buttons use `--radius-control`; hover scale 1.02; emoji and gradient placeholders replaced by one SVG set; hero title capped at 56px and height at 60vh; chip blur removed; `--font-display` removed; red NEW badge becomes neutral; detail grain overlay removed; no fabricated Picked for You row.

Remaining decisions:

| ID | Decision | Recommendation |
|---|---|---|
| D1 | Show Documentaries/Awards always as secondary, or hide when no eligible titles? | Show always as secondary; tooltip explains absence |
| D2 | Merge Movies/Series Trending into one rail, and move Top Rated into Editorial? | Yes; prevents duplicate rows and fake personalisation |
| D3 | Hero Play currently opens the same detail modal as More Info. Define the split. | Play/Resume launches playback; More Info opens detail — requires functional-change approval |
| D4 | Primary button label colour: white fails AA on `#FE3047`; dark background colour passes | Use dark `--color-bg` label on red; record exception to the "white text" preference |
| D5 | Floating playback controls specified but no in-app player exists | Defer; do not build a player surface |
| D6 | Static Inter weights 550/650 are not available | Map to 600/700 unless variable Inter is approved |
| D7 | Keep IMDb `#F5C518` rating glyph? | Yes; semantic rating colour, not decorative |

D4 is the only item that changes an explicit value from the supplied specification. It needs user approval.

---

## 12. Approval gate

This proposal is **not approved for implementation**. Implementation starts only after explicit approval of:

1. The token tables in Section 1, including the colour-only token rule.
2. The icon decision in Section 3.
3. The navigation behaviour in Section 4.
4. The glass and state rules in Sections 5–6.
5. The Home order in Section 8.
6. Decisions D1–D7, especially D4.

After approval, Phase 2 creates tokens and shared components, Phase 3 applies them screen by screen, and Phase 4 runs visual, keyboard, responsive and performance verification. No release is published from this branch without a separate explicit approval.

**Current status:** Proposal approved with dark Play label and no Play/More Info behaviour change. Phase 2 tokens and Phase 3 screen wiring implemented on the preview branch. No release published from this branch.
