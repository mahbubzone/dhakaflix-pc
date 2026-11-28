# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
