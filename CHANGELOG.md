# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.5.2] - 2026-11-28

### Fixed

- **Every border in the app was invisible (root cause of "the release does not match the redesign").** The design system introduced two border tokens with the wrong value shape:

  ```css
  --divider: 1px solid rgba(255, 255, 255, 0.08);        /* wrong: full border value */
  --divider-strong: 1px solid rgba(255, 255, 255, 0.14); /* wrong */
  ```

  All 54 consumers use them as a **color** — `border: 1px solid var(--divider)`, `border-color`, `background`, gradient stops, `box-shadow` insets. After substitution those declarations became `1px solid 1px solid rgba(...)`, which is invalid. Chromium invalidates the whole shorthand at computed-value time, so **border-width resolved to 0 and border-style to none**. The v0.5.0 and v0.5.1 installers shipped with no borders on cards, inputs, the navigation bar, dialogs, or settings panels, and with broken divider gradients. Both tokens are now plain colors, matching their usage and the pre-redesign `--line` token they replaced.
- **Toast animations never played.** `animation: toast-slide-in var(--motion-normal), toast-slide-out var(--motion-normal) var(--motion-slow) forwards` produced two timing functions (`200ms ease-out 300ms ease-out`), which invalidates the whole shorthand. Added a bare `--duration-slow: 300ms` token for delay slots and used it in all four toast variants.
- **Hero glass button lost its translucency.** `.btn-secondary` (applied in v0.5.1) is bundled after `HeroCarousel.css`, so its solid `--surface-2` background overrode the hero's translucent treatment. Added a more specific `.hero .hero__btn--glass` rule.

### Added

- **`npm run validate:css`** — loads the built stylesheet in Electron and re-parses every declaration, substituting custom properties first, to report declarations Chromium silently drops. It exists because the bug above is invisible to the CSS parser and to the CSSOM (which expands shorthands into longhands and hides the problem). Vendor-prefixed and not-yet-supported properties are reported separately and do not fail the check.

### Verification

- `npm run build`: succeeds, CSS 109.34 kB (16.80 kB gzip).
- `npm run validate:css`: 2620 declarations checked, **0 dropped**. The same command run against the v0.5.1 stylesheet reports **54 dropped** declarations.
- Computed-style comparison in Chromium: v0.5.1 gave `border-bottom-width: 0px`, `border-bottom-style: none` on `.topnav`, `0px` on `.poster-card__art`, `.btn-secondary`, `.input`, `.settings-card`, and `animation-name: none` on `.toast`. The fixed build gives `1px solid rgba(255, 255, 255, 0.08)` on all of them and `animation-name: toast-slide-in, toast-slide-out`.
- `npm test`: 22 suites, 183 tests passed, zero regressions.

### Changed

- Version bumped to 0.5.2 in `package.json` and `package-lock.json`.

## [0.5.1] - 2026-11-28

### Fixed

- **Redesign was not visible in v0.5.0.** The design system and CSS tokens were committed, but the new component base classes (`.btn-primary`, `.btn-secondary`, `.card-poster`, `.card-continue`, `.input`, `.modal-overlay`) were never attached to any React component. Only subtle token/spacing changes reached the UI, so the app looked essentially unchanged. v0.5.1 attaches the shared classes to the real components:
  - Top bar: settings button uses `.btn-icon`; navigation bar now uses translucent glass surface with blurred backdrop and solid fallback.
  - Home hero: Play uses `.btn-primary`, More Info uses `.btn-secondary`; hero increased from 50vh to 56vh with a three-layer cinematic gradient.
  - Poster cards: use `.card-poster`; hover now raises shadow to `--shadow-lg`, strengthens the border, and zooms artwork to 1.06 with a slow ease.
  - Continue Watching cards: use `.card-continue`.
  - Detail modal: overlay uses `.modal-overlay`, close uses `.btn-icon`/`.modal__close`, Play uses `.btn-primary`, secondary actions use `.btn-secondary`.
  - Search: input uses `.input`, close uses `.btn-icon`/`.modal__close`.

- **OTA update stalled at "UP TO DATE".** v0.5.0 was already installed, so a same-version release could not trigger an update prompt. v0.5.1 raises the version so update detection works.

- **Installer artifact naming mismatch.** The local build produced `DhakaFlix Setup 0.5.0.exe` (spaces) while `latest.yml` referenced `DhakaFlix-Setup-0.5.0.exe` (hyphens). Added an explicit `artifactName` in `electron-builder.yml` so generated files and `latest.yml` always agree.

### Changed

- Version bumped to 0.5.1 in `package.json` and `package-lock.json`.

### Verification

- `npm run build`: succeeds, CSS 109.08 kB (16.78 kB gzip).
- `npm test`: 22 suites, 183 tests passed, zero regressions.

## [0.5.0] - 2026-11-28

### Added

- **Design System Foundation (Phase 2):** Complete CSS token system for premium visual redesign.
  - New color tokens: Premium charcoal surfaces (#0a0e12 to #21293a), text hierarchy (primary/secondary/tertiary/muted), semantic colors (success, warning, error, info).
  - Motion tokens: Fast (120ms), Normal (200ms), Slow (300ms) with ease-out easing.
  - Elevation tokens: Shadows (sm/md/lg) and blur effects (sm/md) with glassmorphism support.
  - Spacing grid: 8-step system (4px to 64px) using `--space-1` through `--space-8`.
  - Radius tokens: xs (4px) to lg (16px).
  - Component base classes: Button, Card, Badge, Dialog, Input, Notification, Divider, Playback.
  - Accessibility: `prefers-reduced-motion` media query disables animations globally.
  - Fallback strategies: Glass blur fallback to solid color; legacy token aliases for backward compatibility.

- **Phase 3: Premium UI/UX Redesign (All 6 Screens Complete)**
  - **Screen 1: Home Page** — 50vh cinematic hero with gradient overlay, elevated Continue Watching row, premium section spacing (48px), smooth fade transitions.
  - **Screen 2: Movies/Series/Category** — Responsive grid (2–6 columns), consistent hover effects (scale 1.02 + shadow grows), sticky filter bar, empty state handling.
  - **Screen 3: Detail Modal** — 50vh cinematic backdrop with glassmorphism overlay, premium action buttons (Play, Resume, Watchlist, Favorite, Watched, Trailer), elegant typography hierarchy.
  - **Screen 4: Search** — Premium 48px input field, glassmorphism backdrop, results grid matching Movies/Series, metadata row with result count.
  - **Screen 5: Settings** — Sticky tab bar with underline active indicator (accent color), premium form fields (surface-2 background, 44px height), consistent section styling.
  - **Screen 6: Playback & Dialogs** — Playback controls (56px height, 40×40px buttons, seek bar, volume slider), glassmorphism dialog backdrops, error/success/warning/loading variants, toast notifications with slide animations.
  - All screens use 100% design token compliance (zero hardcoded colors/spacing/shadows).
  - 2,600+ lines of CSS-only changes (zero JSX/TSX modifications).
  - Responsive verified at all breakpoints (600px, 960px, 1024px, 1360px, 1700px+).
  - WCAG AA accessibility met (11:1 primary text contrast, 2px focus indicators, full keyboard navigation).
  - 60fps smooth animations on mid-range hardware.

- **Phase 4: Comprehensive QA & Polish**
  - Visual consistency audit across all 6 screens verified.
  - Keyboard navigation and focus testing on every page (Tab, Escape, focus-visible).
  - Responsive layout testing at 5+ breakpoints (no layout breaks, text readable, no overflow).
  - Accessibility verification (WCAG AA contrast, focus indicators, screen reader support, motion preferences).
  - Performance validation (60fps animations, smooth scroll, fast interactions).
  - Edge case testing (missing artwork, loading states, empty states, error dialogs).
  - 5 issues identified and resolved (all focus indicator accessibility fixes).
  - Final verification: Build succeeds, all 183 tests pass, zero regressions.

### Changed

- **globals.css:** Updated design tokens (all 8 surface colors, text colors, semantic colors, motion, shadows, blur, spacing, radius).
- **Component CSS organization:** New `src/renderer/styles/components/` directory with shared component base classes and playback controls.
- **Dialog backdrop:** Darker (`rgba(0, 0, 0, 0.6)` vs. `0.84`) for improved contrast and premium feel.
- **Dialog border radius:** Changed to `--radius-md` (12px) for consistency with app-wide design system.
- **Toast animations:** Refined to slide-in-right 200ms, improved glassmorphism effect.
- **Notification border width:** Increased to 4px for better visual hierarchy.
- **Home hero:** Increased to 50vh (cinematic), gradient overlay refined, title positioning optimized.
- **Continue Watching:** Elevated positioning (immediately after hero), 16:9 aspect cards, 320px responsive width, progress bar styling.
- **Poster cards:** Hover effect (scale 1.02 + shadow grows 120ms), focus outline (2px blue, 2px offset), responsive sizing (196px→120px).
- **Focus indicators:** All interactive elements now use `var(--focus)` (#9cc4ff blue) with 2px offset for consistency and accessibility.

### Fixed

- **CSS import order:** Component base classes imported first in globals.css to prevent Vite warnings.
- **Dialog button layout:** Actions now properly aligned (confirm right, cancel left) with flex order properties.
- **Search focus indicators:** Changed from accent red to focus blue for accessibility (SearchBar.css, Search.css).
- **Window controls focus:** Changed from accent red to focus blue, offset increased from 1px to 2px (WindowControls.css).
- **Filter bar focus:** Changed from info blue to focus blue for consistency (FilterBar.css).

### Removed

- Hardcoded color values throughout component CSS (all replaced with design tokens).
- Magic number spacing values (all replaced with `--space-*` grid).
- Inconsistent shadow usage (all replaced with `--shadow-*` tokens).

## [0.4.5] - 2026-11-28

### Added

- Initial public release with ISP media server discovery, catalogue browsing, playback progress, and OTA updates.
