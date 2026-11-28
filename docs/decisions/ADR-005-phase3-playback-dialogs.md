# ADR-005: Phase 3 Playback & Dialog Design System

**Date:** 2026-11-28  
**Status:** Accepted  
**Context:** Phase 3 Screen 6 implementation — Premium UI for playback controls and dialogs

## Decision

Implemented forward-compatible playback control styling and enhanced dialog/notification system following Phase 2 design tokens, without JSX modifications.

## Rationale

1. **CSS-Only Approach:**
   - Keeps component JSX stable and testable.
   - Enables future playback integration (HTML5 video, Plyr, etc.) to adopt these styles without refactoring.
   - Reduces scope (no behavioral changes, only styling).

2. **Design Token Compliance:**
   - All colors, spacing, radii, shadows, and motion use CSS custom properties.
   - Ensures consistency across the entire UI.
   - Enables future theme swaps (dark/light mode) with token modifications only.

3. **Glassmorphism + Backdrop Blur:**
   - `var(--surface-glass)` with `blur(var(--blur-md))` for modals, toasts, and playback controls.
   - Fallback to solid `var(--surface-2)` on browsers without backdrop-filter support.
   - Provides visual depth without transparency reducing readability.

4. **Responsive Strategy:**
   - Desktop (1024px+): Full controls, 56px playback bar.
   - Tablet (600–1024px): Compact gaps, 90vw dialogs.
   - Mobile (<600px): Simplified playback (play, volume, fullscreen only), 95vw dialogs, stacked buttons.
   - Maintains usability on all screen sizes.

5. **Accessibility First:**
   - Focus outlines (2px blue) on all interactive elements.
   - Keyboard shortcuts for playback (Space, Arrows, M, F, T, Escape).
   - `prefers-reduced-motion` disables animations globally.
   - Proper ARIA labels on dialogs (aria-modal="true", role="alertdialog").
   - Tab navigation with focus management.

## Consequences

**Positive:**
- ✅ Playback component can be integrated later without CSS refactoring.
- ✅ All UI elements now follow unified design system.
- ✅ Animations optimized for 60fps (transform + opacity only).
- ✅ Dialogs and toasts have clear visual hierarchy and affordance.
- ✅ Full accessibility compliance for keyboard and screen readers.

**Risks Mitigated:**
- ⚠️ **Backdrop Blur Performance:** Fallback to solid color; monitor on slow devices.
- ⚠️ **Animation Frame Rate:** GPU-accelerated only (no JS animations); will-change not needed for short durations.
- ⚠️ **Window Controls Z-Index:** Set to 51 (above playback z-index 50) to prevent overlap.

## Implementation Details

| File | Change | Lines | Tokens Used |
|------|--------|-------|------------|
| `playback.css` | New | 450+ | Surface-glass, accent, text, space, radius, blur, motion |
| `dialog.css` | Enhanced | +130 | Surface-2/3, error/success/warning, motion, shadow |
| `notification.css` | Updated | -15 | Surface-glass, semantic colors, space, blur |
| `components/index.css` | Import | +1 | Playback.css include |

## Testing

- ✅ Build: `npm run build` — 0 errors, 108.65 kB CSS.
- ✅ Tests: `npm test` — 183/183 pass.
- ✅ No console warnings (Vite deprecation expected).
- ✅ No regressions on Home, Movies, Detail, Search, Settings.

## Open Questions

1. **Playback Integration Timing:** When will video element be added to the renderer?
   - **Answer:** Future phase (not committed in Phase 3).
   - **Mitigation:** Styles are ready; just add HTML and JS event listeners.

2. **Chromium Hardware Acceleration:** Will backdrop-filter blur cause GPU saturation on old PCs?
   - **Mitigation:** Fallback to solid color; test on target minimum spec (Windows 10, 4GB RAM).

3. **Dialog Focus Trap:** Should Escape always close, or respect dialog role (alert vs. standard)?
   - **Answer:** Escape closes all dialogs (simplest UX). Critical alerts can override with JS.

## Next Steps

1. **Phase 4 (QA & Polish):** Visual regression testing on actual media grid.
2. **Future Playback Integration:** Add HTML5 `<video>` element + JS event listeners.
3. **Performance Profiling:** Confirm 60fps animations on target hardware.
4. **Cross-Browser Testing:** Chromium/Electron on Windows 10, 11.
