# DhakaFlix UI/UX Redesign — Phase 1: Design Audit & Proposal

**Date:** 28 November 2026  
**Status:** Ready for Approval  
**Scope:** Design audit, visual direction, design system foundation, screen redesign plan.

---

## Executive Summary

DhakaFlix is transitioning from a functional Netflix-inspired media catalogue to a **premium entertainment destination**. This redesign maintains existing functionality and architecture while delivering:

- **Elegant navigation:** Horizontal top nav with integrated search and settings.
- **Cinematic home experience:** Hero → Continue Watching → Trending → Recent → Personalized → Editorial collections.
- **Premium visual language:** Charcoal surfaces, selective glassmorphism, restrained accent, generous spacing.
- **Consistency enforced:** One button style, one card style, one notification—everywhere.
- **Performance & accessibility:** Smooth animations, keyboard navigation, responsive layouts, WCAG AA compliance.

This document is **design-only**. No implementation or file modifications occur during this phase.

---

## 1. Existing UI Audit

### 1.1 Current State

| Aspect | Current | Notes |
|--------|---------|-------|
| **Framework** | Electron, React 18, TypeScript, Vite | Mature, established. |
| **Styling** | Global CSS tokens + component CSS modules | Design tokens in `globals.css`; prevents hardcoded values. |
| **Navigation** | Top nav (72px fixed) | Home, Movies, Series, Docs (optional), Awards (optional), Watchlist. Search icon (opens modal). Settings avatar. |
| **Home View** | Hero carousel + horizontal rows | Continue Watching, Just Added, Trending, Top Rated, Categories. |
| **Components** | Poster cards (2:3), Continue cards (16:9), modals | Hero carousel, detail modal, search modal. |
| **Responsiveness** | Breakpoints at 600px, 960px, 1024px, 1360px, 1700px | Grid adapts: 2 cols (mobile) → 6 cols (wide). |
| **Accessibility** | Keyboard shortcuts, focus management, ARIA labels | Escape closes modals, Tab navigates, focus-visible outline. |

### 1.2 Design Tokens (Current)

```css
Surfaces (darkest to lightest):
  --bg: #101216
  --bg-2: #14161b
  --panel: #191c22
  --panel-2: #1f232a
  --surface-3: #262b33

Text:
  --text: #e6e8ec (primary)
  --muted: #a2a9b4 (secondary)
  --text-3: #7a818c (tertiary)

Accent:
  --accent: #fe3047 (red)
  --accent-2: #ff4d61
  --accent-soft: rgba(254, 48, 71, 0.14)

Semantic:
  --success: #3fb950, --warning: #d6a13c, --error: #f2555f, --info: #5aa9ff

Spacing: 4/8/12/16/24/32/48px
Radius: 8px (sm), 12px (default), 16px (lg)
Motion: 180ms ease
```

### 1.3 Screen Inventory

1. **Home** — Hero carousel + Continue Watching + Trending Now + Recently Added + Picked for You + Editorial Collections.
2. **Movies** — Grid browse.
3. **Series** — Grid browse.
4. **Documentary** — Category browse (optional).
5. **Awards** — Category browse (optional).
6. **Watchlist** — Saved titles.
7. **Detail Modal** — Backdrop hero, metadata, actions (Play, Resume, Watchlist, Favorite, Watched, Trailer).
8. **Search Modal** — Search field, results grid.
9. **Settings** — Tabbed UI (Sources, Updates, About).
10. **Playback** — Full-screen video + controls.
11. **Dialogs** — Confirmations, errors, loading.

### 1.4 Strengths ✓

- Dark surfaces layer coherently; no pure black everywhere.
- Design tokens prevent color hardcoding.
- Keyboard navigation solid; focus management consistent.
- Responsive layout works across breakpoints.
- Component architecture separates concerns.
- Existing navigation structure proven.

### 1.5 Gaps & Issues ✗

- **Accent overuse:** Red appears on many elements, reducing premium restraint.
- **Glass effects:** None implemented; all surfaces solid.
- **Typography hierarchy:** Limited variation; most text is 14px Inter.
- **Navigation:** Search opens modal overlay, not integrated with top nav.
- **Hero treatment:** Cinematic potential under-realized.
- **Spacing:** Adequate but not generous enough for premium feel.
- **Consistency:** Some components styled differently on different pages.
- **Empty/Error states:** Generic messages; some lack actionability.
- **Motion:** Only hover transform; playback transitions absent.

---

## 2. Approved Design Direction

### 2.1 Core Philosophy

**DhakaFlix should feel like a premium entertainment destination that users want to return to, not a static movie catalogue.**

Combine:
- Apple TV-inspired elegance and simplicity.
- Editorial-style content presentation.
- Discovery-oriented recommendations.
- Personal viewing experiences (Continue Watching, progress persistence).

### 2.2 Visual Personality

| Dimension | Approach |
|-----------|----------|
| **Surfaces** | Premium dark charcoal, not pure black. Soft tonal gradients. Layered depth. |
| **Typography** | Modern, clean hierarchy. Inter throughout. Clear weight/size differentiation. |
| **Spacing** | Generous but controlled. 8px grid foundation, 24–48px gaps between sections. |
| **Accent** | DhakaFlix red, used restrained. Primary actions only. Secondary elements use surfaces/text. |
| **Glassmorphism** | Selective use: top nav, floating popovers, detail modal overlays. Never sacrifice readability. |
| **Icons** | Minimal, single-family. Consistent stroke, size, alignment. |
| **Artwork** | Cinematic backdrops, elegant gradient overlays, poster quality. Missing artwork: soft placeholder. |
| **Motion** | Smooth, subtle, purposeful. Hover emphasis, dialog elegance. Never distracting. |

### 2.3 Content Availability Rule

**Only show titles available on ISP servers.**

- Cinemeta enriches locally available titles with metadata and artwork.
- Trending and popularity data based on real supported information.
- Do not display unavailable external titles or upcoming releases.
- If a section has insufficient eligible content, hide or show empty state.

---

## 3. Main Navigation (Final Specification)

### 3.1 Layout

```
┌─────────────────────────────────────────────────────────────────┐
│ DhakaFlix   Home Movies Series Documentaries Awards Watchlist   Search...  ⚙️  │
└─────────────────────────────────────────────────────────────────┘
```

**Left side:**
1. Brand logo (DhakaFlix)
2. Navigation links: Home, Movies, Series, Documentaries, Awards, Watchlist
   - Home, Movies, Series: **prominent** (larger, bolder)
   - Documentaries, Awards: **secondary** (smaller, muted)
   - Watchlist: **prominent** (balanced with primary nav)

**Right side:**
1. **Integrated Search bar** (permanently visible, not modal-only)
   - Placeholder: "Search movies and series..."
   - Keyboard shortcut: Ctrl+K
   - Clicking expands to full search experience or opens modal (TBD based on implementation)
2. **Settings icon button** (40×40px, minimal)

### 3.2 Styling

- Height: 72px (fixed)
- Background: Glass effect or solid surface-2 (charcoal, translucent 75%)
- Subtle backdrop blur (4px) if supported, fallback to solid.
- Soft border-bottom (1px, `rgba(255,255,255,0.08)`).
- Brand: 22px, weight 800, letter-spacing tight.
- Nav links: 14px, weight 500. Active: underline accent color. Hover: surface-3 background.
- Search bar: 36px height, surface-2 background, focus: outline. Width ~220px or flexible.
- Settings button: 40×40px, circular or square, hover: surface-3, focus: outline.

### 3.3 Behavior

- Persistent on every page.
- Drag region (macOS/Linux) on empty nav areas.
- Double-click maximizes window.
- Active page indicated by underline or highlight.
- Search: Ctrl+K toggles search experience (modal or inline—implementation detail).
- Settings: Opens settings modal/page.

---

## 4. Home Page Hierarchy (Mandatory Order)

### 4.1 Content Sections (In Order)

```
1. MAIN HERO
   ├─ Cinematic backdrop (full-width, 45vh)
   ├─ Dark gradient overlay (bottom-left to transparent)
   ├─ Title logo (large, positioned lower-left)
   ├─ Metadata row (year, genres, IMDb rating)
   ├─ Description (2 lines max, truncated)
   ├─ Actions: Play / Resume (primary), More Info (secondary)
   └─ Smooth rotation or manual navigation between featured titles

2. CONTINUE WATCHING ⭐ ESSENTIAL
   ├─ Title: "Continue Watching"
   ├─ Subtitle: "Pick up where you left off"
   ├─ Horizontal scroll: Continue cards (16:9, with progress bar + metadata overlay)
   └─ Remove option on each card

3. TRENDING NOW
   ├─ Title: "Trending Now"
   ├─ Subtitle: "Popular in your library"
   ├─ Horizontal scroll: Poster cards (2:3)
   └─ Show only if real trending data available

4. RECENTLY ADDED
   ├─ Title: "Recently Added"
   ├─ Subtitle: "Fresh on your library"
   ├─ Horizontal scroll: Poster cards (2:3)
   └─ Based on actual ISP catalogue additions

5. PICKED FOR YOU
   ├─ Title: "Picked for You"
   ├─ Subtitle: "Based on your viewing history"
   ├─ Horizontal scroll: Poster cards (2:3)
   └─ Personalized; show only if sufficient viewing data exists

6. EDITORIAL COLLECTIONS
   ├─ Documentary Picks
   ├─ Award Winners
   ├─ Popular Series
   ├─ Hidden Gems
   └─ Conditional display; show only when meaningful content exists
```

### 4.2 Design Principles

- Hero: Rotates smoothly (carousel). Content-focused; chrome minimal.
- Continue Watching: **Never hidden or moved below discovery.** Always immediately after hero.
- Rows: 24px gap between cards, 48px margin between sections.
- Section titles: 24px, weight 700. Subtitles: 14px, secondary color, weight 400.
- Cards: Hover effect (subtle scale + shadow), focus outline.
- Empty state (no content): Centered icon + heading + subtext + link to Settings.
- Loading state: Skeleton rows, pulse animation (400ms).

### 4.3 Content Availability

- Home shows **only titles available on ISP servers**.
- Each section appears **only if eligible content exists**.
- Trending: Use real trending data from Cinemeta or backend, not arbitrary picks.
- Recently Added: Based on ISP catalogue scan results.
- Picked for You: Based on viewing history (progress data).
- Empty home (no library): Display friendly onboarding message.

---

## 5. Design System Foundation

### 5.1 Color Tokens (Updated)

```css
:root {
  /* Surfaces — darkest to lightest, premium charcoal */
  --bg: #0a0e12 (deep)
  --bg-2: #101619 (app chrome)
  --surface-1: #141922 (card base)
  --surface-2: #1a1f27 (raised, inputs, nav)
  --surface-3: #21293a (hover, selected)
  --surface-glass: rgba(16, 22, 25, 0.75) (translucent)

  /* Text hierarchy */
  --text-primary: #f0f2f5 (sharp white, primary)
  --text-secondary: #b4bcc7 (secondary)
  --text-tertiary: #8a92a0 (tertiary)
  --text-muted: #5a626e (very dim)

  /* Accent & semantic */
  --accent: #ff3d4f (DhakaFlix red, primary actions only)
  --accent-hover: #ff5a6b (hover state)
  --accent-soft: rgba(255, 61, 79, 0.15) (soft background)
  --success: #48d99e
  --warning: #ffc93c
  --error: #ff5a5f
  --info: #5eb3ff

  /* Elevation & glass */
  --shadow-sm: 0 2px 8px rgba(0, 0, 0, 0.5)
  --shadow-md: 0 8px 24px rgba(0, 0, 0, 0.6)
  --shadow-lg: 0 20px 48px rgba(0, 0, 0, 0.7)
  --blur-sm: 4px
  --blur-md: 8px

  /* Shape */
  --radius-xs: 4px
  --radius-sm: 8px
  --radius-md: 12px
  --radius-lg: 16px

  /* Spacing grid (multiples of 4px) */
  --space-1: 4px; --space-2: 8px; --space-3: 12px; --space-4: 16px;
  --space-5: 24px; --space-6: 32px; --space-7: 48px; --space-8: 64px;

  /* Typography */
  --font-sans: Inter, Segoe UI, system-ui, -apple-system, sans-serif
  --font-mono: Menlo, Monaco, monospace

  /* Motion */
  --motion-fast: 120ms ease-out
  --motion-normal: 200ms ease-out
  --motion-slow: 300ms ease-out

  /* Dividers */
  --divider: 1px solid rgba(255, 255, 255, 0.08)
}
```

### 5.2 Reusable Components (Spec)

| Component | Usage | Spec |
|-----------|-------|------|
| **Button (Primary)** | Play, Resume, Continue | Accent bg, white text, 12px padding, 8px radius. Hover: lighter accent. Focus: outline. |
| **Button (Secondary)** | Watchlist, More Info | Surface-2 bg, text color, 8px padding, 8px radius. Hover: surface-3. Focus: outline. |
| **Button (Icon)** | Favorites, Close, Settings | 40×40px, transparent bg, hover: surface-2, focus: outline. |
| **Poster Card** | Browse movies/series | 2:3 aspect, surface-1 border, 8px radius. Hover: scale 1.02 + shadow grows. Focus: outline. |
| **Continue Card** | Resume playback | 16:9 aspect, progress bar 3px (accent color), metadata overlay. Hover: shadow grows. |
| **Search Input** | Search field | Surface-2 bg, 36px height, 12px padding, 8px radius. Focus: outline + light border. |
| **Badge** | IMDb, New, % watched | Surface-3 bg, 11px font, 4px padding, 4px radius. Text: secondary color. |
| **Text (Title)** | Section headers | 24px, weight 700, letter-spacing -0.015em, text-primary. |
| **Text (Subtitle)** | Rail descriptions | 14px, weight 400, text-secondary. |
| **Text (Meta)** | Genres, cast, year | 12px, weight 400, text-tertiary. |
| **Dialog (Modal)** | Detail, search, confirm | Backdrop blur (8px) + dim, surface-2 bg, shadow-lg, close button. Escape closes. |
| **Toast (Notification)** | Success, error, info | Surface-glass bg, border-left accent, 400px wide, fade in/out 200ms. |
| **Divider** | Section separator | `--divider` token. |
| **Loading (Skeleton)** | Placeholder | Surface-2 placeholder, pulse animation 400ms. |

### 5.3 Consistency Rules

1. **Every button looks the same.** No inline buttons styled differently on different pages.
2. **Every card uses the same radius, shadow, and hover effect.**
3. **Every text element uses the correct hierarchy (size, weight, color).**
4. **Every spacing decision uses multiples of 4px. No magic numbers.**
5. **Every modal has backdrop blur, shadow, and close affordance.**
6. **Every interactive element has visible focus indicator.**
7. **Every icon comes from one coherent family.**
8. **Every animation respects `prefers-reduced-motion`.**

---

## 6. Screen-by-Screen Redesign Plan

### 6.1 High-Priority Screens

| Screen | Current State | Proposed Changes | Effort |
|--------|---------------|------------------|--------|
| **Home** | Hero carousel + rows | Hero redesign, Continue Watching elevated, section spacing increased, empty state improved | **High** |
| **Top Nav** | Functional but basic | Glass effect, integrated search, visual refinement | **High** |
| **Detail Modal** | Backdrop 38vh | Larger backdrop (45–50vh), title logo repositioned, metadata layout refined, action buttons consistent | **High** |
| **Search** | Modal overlay | Input + results grid, filters minimal, results use card components | **Medium** |

### 6.2 Medium-Priority Screens

| Screen | Current State | Proposed Changes | Effort |
|--------|---------------|------------------|--------|
| **Movies / Series** | Grid browse | Card hover consistency, filter bar minimal, pagination clean | **Medium** |
| **Settings** | Tabbed UI | Tab styling refined, form spacing consistent, section headings unified | **Medium** |
| **Playback** | Full-screen video | Control styling updated, focus on content, window controls visible | **Medium** |

### 6.3 Lower-Priority (Supporting)

| Screen | Proposed Changes |
|--------|------------------|
| **Dialogs/Popovers** | Consistent shadow, blur, padding, close affordance. |
| **Empty/Error States** | Clear messaging, consistent icons, obvious call-to-action. |
| **Loading States** | Skeleton screens refined, spinner animation smooth. |
| **Notifications** | Toast styling: surface-glass, border-left accent, fade animation. |
| **Watchlist** | Card grid consistent with Movies/Series. |

---

## 7. Implementation Roadmap

### 7.1 Phase 2: Design System Foundation

**Deliverables:**
1. Update `globals.css` with new token values.
2. Create shared base classes (button, card, dialog).
3. Build reusable component styles (Button, Card, Badge, Toast).
4. Establish motion tokens and animation library.
5. Test foundation on Home page.

**Success Criteria:**
- All existing functionality preserved.
- New tokens used consistently.
- No regressions on other pages.
- Responsive breakpoints verified.

### 7.2 Phase 3: Screen Redesign

**Order:**
1. Home page (hero, rows, Continue Watching, sections).
2. Movies / Series / Category grids (card consistency).
3. Detail modal (backdrop, layout, actions).
4. Search modal (input, results, filters).
5. Settings (tabs, forms, layout).
6. Playback and dialogs.

**Success Criteria:**
- Each screen uses design system tokens and components.
- Visual consistency enforced across all screens.
- Keyboard navigation works.
- Responsive layout adapts correctly.

### 7.3 Phase 4: Quality Assurance & Polish

**Testing:**
- Visual audit: Consistency, typography, spacing, colors, shadows.
- Keyboard: Tab order, focus visible, Escape behavior.
- Responsive: 600px, 960px, 1024px, 1360px, 1700px + edge cases.
- Performance: Animation smoothness, render performance, artwork load time.
- Accessibility: WCAG AA contrast, ARIA labels, focus indicators.

**Success Criteria:**
- All screens look premium and cohesive.
- No visual regressions.
- Keyboard navigation perfect.
- Performance acceptable on mid-range GPUs.

---

## 8. Technical Considerations

### 8.1 Implementation Constraints

| Constraint | Mitigation |
|-----------|-----------|
| **Glass blur performance** | Use subtle blur (4–8px). Test on mid-range GPUs. Fallback to solid color if unavailable. |
| **Typography load** | Use system fonts (Inter, Segoe UI). No custom font downloads. |
| **Responsive breakpoints** | Test at 600px, 960px, 1024px, 1360px, 1700px + edge cases. |
| **Animation jank** | Use CSS transforms and opacity only. Avoid expensive repaints. Respect `prefers-reduced-motion`. |
| **Artwork load time** | Lazy-load posters. Show placeholder (surface color + icon) while loading. |
| **IPC contract changes** | No backend changes required. Styling only. |
| **Electron security** | No new IPC vectors. No renderer privilege escalation. Styling is CSS only. |

### 8.2 Fallback Strategy

- **Blur unavailable:** Use solid surface color + subtle shadow instead.
- **Missing artwork:** Show surface-1 background with centered icon.
- **Slow network:** Show skeleton screen. Lazy-load images below the fold.
- **Reduced motion:** Disable animations, show instant state changes.
- **Low contrast (accessibility):** Increase text brightness; ensure WCAG AA ratios.

---

## 9. Quality Assurance Checklist

### 9.1 Visual Consistency

- [ ] All buttons (primary, secondary, icon) look identical across all pages.
- [ ] All cards (poster, continue, detail) use the same radius, shadow, hover effect.
- [ ] All text uses correct hierarchy (size, weight, color).
- [ ] All spacing is multiples of 4px; no magic numbers.
- [ ] All modals have backdrop blur, shadow, close affordance.
- [ ] All focus indicators are visible and consistent.
- [ ] All dividers use `--divider` token.
- [ ] All badges use the same styling.
- [ ] All icons come from one family.
- [ ] All surfaces layer correctly (darkest to lightest).

### 9.2 Keyboard & Accessibility

- [ ] Tab order is logical on every screen.
- [ ] Focus visible on all interactive elements (2px outline).
- [ ] Escape closes modals and overlays.
- [ ] No focus traps (except ShortcutSheet).
- [ ] Screen reader hints present (aria-label, aria-current).
- [ ] Color not the only differentiator for state.
- [ ] Text contrast meets WCAG AA (4.5:1 for normal text).
- [ ] Buttons are at least 40×40px (touch target).

### 9.3 Responsive & Performance

- [ ] Home: Hero adjusts height on small screens.
- [ ] Cards scale gracefully (mobile: 120px wide, desktop: 196px).
- [ ] Search bar remains accessible on mobile.
- [ ] Detail modal scrolls on small windows.
- [ ] Animation smooth on mid-range (Intel i5, integrated GPU).
- [ ] No jank on scroll or interaction.
- [ ] Artwork loads in <500ms; placeholder shows while loading.
- [ ] No console errors or warnings.

### 9.4 Content Availability

- [ ] Only titles from ISP servers appear on Home.
- [ ] Trending sections hide if no real trending data.
- [ ] Recently Added reflects actual ISP additions.
- [ ] Picked for You appears only with sufficient viewing history.
- [ ] Empty home shows friendly onboarding message.

---

## 10. Risks & Unknowns

| Risk | Impact | Mitigation |
|------|--------|-----------|
| **Glass blur performance** | Animation stutter on low-end GPUs | Use subtle blur; test on mid-range hardware. Provide solid fallback. |
| **Artwork quality** | Low-res images from ISP servers | Fallback placeholder acceptable. Lazy-load strategy ensures responsiveness. |
| **Trending data availability** | Cinemeta downtime or limited data | Show empty state gracefully. Continue Watching always works (local data). |
| **Scroll performance** | Many rows on Home = frame drops | Consider virtual scrolling if needed. Monitor performance during QA. |
| **Existing playback logic** | Window controls must remain visible | Verify fullscreen behavior doesn't hide chrome. Test before release. |
| **Settings complexity** | Settings may expand; layout breaks | Design with flexibility. Use consistent tabs and form layouts. |

---

## 11. File Structure & Deliverables

### 11.1 Project Structure

```
docs/
├── design/
│   ├── PHASE_1_DESIGN_AUDIT_PROPOSAL.md ← You are here
│   ├── DESIGN_SYSTEM.md (Phase 2 output)
│   ├── COMPONENT_SPECS.md (Phase 2 output)
│   └── SCREENS/ (mockups/screenshots, TBD)
├── architecture/
└── decisions/

src/renderer/
├── styles/
│   ├── globals.css (updated tokens)
│   ├── components/ (component base classes)
│   │   ├── button.css
│   │   ├── card.css
│   │   ├── dialog.css
│   │   └── ...
├── components/
│   ├── common/
│   ├── layout/
│   └── media/
└── ...
```

### 11.2 Deliverables Summary

**Phase 1 (This Document):**
✅ Existing UI audit.  
✅ Visual direction (Apple TV-inspired, premium, editorial).  
✅ Main navigation specification (horizontal, integrated search).  
✅ Home page hierarchy (mandatory order: Hero → Continue → Trending → Recent → Picked → Editorial).  
✅ Design system foundation (tokens, components, consistency rules).  
✅ Screen redesign plan (priority matrix, effort estimates).  
✅ Implementation roadmap (3 phases, success criteria).  
✅ Technical considerations and fallback strategy.  
✅ QA checklist (visual, keyboard, responsive, content).  
✅ Risks and unknowns.

---

## 12. Approval Gate

### 12.1 Final Decisions Incorporated

✅ **Navigation:** Single horizontal top nav with integrated search and settings.  
✅ **Home hierarchy:** Mandatory order (Hero → Continue Watching → Trending → Recent → Picked → Editorial).  
✅ **Continue Watching:** Always immediately after hero; never hidden or moved.  
✅ **Content rule:** Only ISP-available titles; Cinemeta enriches; no external titles.  
✅ **Visual quality:** Premium charcoal, selective glassmorphism, restrained accent, generous spacing, consistent components.  
✅ **Experience objective:** Premium entertainment destination, not static catalogue.

### 12.2 Questions for Final Approval

1. ✅ **Visual direction** — Does the proposed aesthetic match your vision?
2. ✅ **Design tokens** — Are color, spacing, typography values appropriate?
3. ✅ **Reusable components** — Do component specs cover all UI patterns?
4. ✅ **Home page hierarchy** — Is the content order and emphasis correct?
5. ✅ **Redesign plan scope** — Are prioritized screens and milestones acceptable?
6. ✅ **Navigation design** — Does the integrated top nav meet your vision?
7. ✅ **Continue Watching** — Confirmed as essential and always visible?

### 12.3 Ready for Implementation?

**Prerequisites for Phase 2 start:**
1. Your explicit approval of this proposal.
2. No unresolved blockers or unknowns.
3. Agreement on design system tokens and component specs.
4. Confirmation of Home page hierarchy and navigation design.

---

## 13. Next Steps

**Upon your approval:**

1. **Phase 2 begins** — Design system implementation.
   - Update `globals.css` with new tokens.
   - Create component base classes and shared styles.
   - Build reusable component library.
   - Test on Home page.

2. **Tech Lead coordinates specialist team:**
   - Senior Engineer: CSS implementation.
   - Code Reviewer: Quality checks.
   - QA Engineer: Testing and validation.
   - Architect: Component architecture decisions.

3. **Regular checkpoints** — Each screen redesign phase reviewed before moving to the next.

4. **Final QA & Polish** — Comprehensive visual audit, keyboard testing, responsive validation, performance review.

---

**Awaiting your approval to proceed.** 🎬

