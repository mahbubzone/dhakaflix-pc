# DhakaFlix UI/UX Redesign — Phase 3: Screen Redesign Architecture

**Date:** 28 November 2026  
**Status:** Architecture & Planning Only (No Implementation)  
**Purpose:** Define technical approach, component dependencies, and testing strategy for Phase 3 screen redesigns.

---

## Executive Summary

Phase 3 systematically redesigns each screen to apply the design system (Phase 2 output) while minimizing regression risk. This document defines:

- **Component dependency map:** Which components each screen depends on, shared components, and update strategy.
- **Screen-by-screen implementation checklist:** Specific changes needed for each screen.
- **Testing strategy:** Visual, keyboard, responsive, and performance verification for each screen.
- **Motion/animation plan:** Animation timing, easing, and accessibility considerations.
- **Risk register and mitigations:** Identified risks and responses.
- **File organization approach:** Where component CSS lives and how to avoid duplication.

**Success criteria:** All screens redesigned and tested with no functionality loss, improved consistency, and smooth user experience.

---

## 1. Component Dependency Map

### 1.1 Shared Components (Used by Multiple Screens)

| Component | Location | Purpose | Redesign Needed? | Dependency Path |
|-----------|----------|---------|-----------------|-----------------|
| **Button (Primary)** | `common/` or `styles/components/` | Play, Resume, Continue, Actions | ✓ CSS tokens | Home, Detail, Search, Playback, Dialogs |
| **Button (Secondary)** | `common/` or `styles/components/` | More Info, Watchlist, Filters | ✓ CSS tokens | All screens |
| **Button (Icon)** | `common/` or `styles/components/` | Close, Favorite, Settings, Bookmark | ✓ CSS tokens | All screens with actions |
| **PosterCard** | `media/PosterCard.tsx` | Browse movies/series, grids | ✓ CSS + hover | Home (rows), Movies, Series, Search, Category |
| **ContinueCard** | `media/ContinueCard.tsx` | Resume playback with progress | ✓ CSS + progress bar | Home (Continue Watching), Detail modal |
| **SearchBar** | `common/SearchBar.tsx` | Search input field | ✓ CSS + integration | TopNav (integrated), Search view, Settings |
| **Badge** | `styles/components/badge.css` | IMDb rating, New, Progress % | ✓ CSS tokens | Home (cards), Movies (cards), Detail |
| **Divider** | `styles/components/divider.css` | Section separator | ✓ CSS token | All section-based views |
| **Loading Skeleton** | `common/LoadingSpinner.tsx` or CSS | Placeholder cards, rows | ✓ CSS animation | All paginated/async screens |
| **Toast Notification** | `styles/components/toast.css` | Alerts, confirmations | ✓ CSS + animation | All screens (IPC messages) |
| **Dialog/Modal** | `styles/components/dialog.css` | Backdrop, shadow, close | ✓ CSS + backdrop blur | Detail, Search, Trailer, Dialogs |

### 1.2 Screen-Specific Components

#### Home Screen
**Location:** `src/renderer/views/Home.tsx` + `Home.css`

**Components:**
- HeroCarousel (carousel rotation, slide management)
- PosterRow (horizontal scrolling container for cards)
- SectionHeader (title + subtitle)
- ContinueCard (resume cards in first row)
- PosterCard (all other rows)
- Empty state (message, icon, link to Settings)

**CSS files:**
- `Home.css` — Home view layout, hero height, section spacing.
- `components/HeroCarousel.css` — Hero backdrop, gradient overlay, title positioning.
- `components/PosterRow.css` — Card spacing, scroll behavior, margins.

---

#### Movies / Series / Category Screens
**Location:** `src/renderer/views/Category.tsx` + `Category.css`

**Components:**
- FilterBar (optional; minimal)
- PosterGrid (2D grid layout)
- PosterCard (all items)
- Pagination (or infinite scroll)
- Empty state (no results)

**CSS files:**
- `Category.css` — Grid layout, padding, breakpoints.
- `components/PosterGrid.css` — Grid spacing, responsive columns.
- `components/FilterBar.css` — Filter styling (if kept).

---

#### Detail Modal
**Location:** `src/renderer/views/Detail.tsx` + `Detail.css`

**Components:**
- Modal backdrop (blur, dim overlay)
- Backdrop image (45–50vh cinematic)
- Gradient overlay (bottom-left to transparent)
- TitleLogo (positioned lower-left)
- Metadata row (year, genres, IMDb rating)
- Description (truncated 2 lines)
- Action buttons (Play, Resume, Watchlist, Favorite, Watched, Trailer)
- TrailerModal (optional; nested modal)
- Tabs or sections (cast, crew, IMDb details if space)

**CSS files:**
- `Detail.css` — Modal layout, backdrop sizing, gradient positioning.
- `components/DetailBackdrop.css` — Backdrop image, overlay styling.

---

#### Search View
**Location:** `src/renderer/views/Search.tsx` + `Search.css`

**Components:**
- SearchBar (integrated or modal)
- Results grid (uses PosterGrid + PosterCard)
- Filter section (minimal)
- Loading state (skeleton grid)
- Empty state (no results, suggest browsing)
- Recent searches (optional; local storage)

**CSS files:**
- `Search.css` — Search view layout, results grid.
- `components/SearchBar.css` — Input styling, focus, placeholder.

---

#### Settings View
**Location:** `src/renderer/views/Settings.tsx` + `Settings.css`

**Components:**
- TabBar (Sources, Updates, About)
- Form sections (folder paths, update frequency, app info)
- Form inputs (text, file picker, toggle)
- Section headers (unified with other screens)
- Buttons (Apply, Reset, Check Updates)

**CSS files:**
- `Settings.css` — Tab layout, form spacing, section structure.
- `components/TabBar.css` — Tab styling, active state, underline.
- `components/Form.css` — Input styling, label alignment, section spacing.

---

#### Playback Screen (Full-Screen Video)
**Location:** `src/main.tsx` or dedicated player component

**Components:**
- Video player (native `<video>` element)
- Control bar (play, pause, seek, volume, fullscreen)
- Window chrome (minimize, maximize, close if visible)
- Focus management (video takes focus; Escape exits fullscreen)
- Keyboard shortcuts (Space = play/pause, Arrow keys = seek, etc.)

**CSS files:**
- `components/PlayerControls.css` — Control styling, positioning, animations.
- `components/VideoPlayer.css` — Full-screen layout, focus management.

---

#### Dialogs & Popovers (Supporting)
**Locations:** Various (confirmations, errors, loading)

**Components:**
- Modal backdrop (blur, dim)
- Dialog box (surface-2 background, shadow-lg)
- Title (optional)
- Message / content
- Action buttons (OK, Cancel, etc.)
- Close button (top-right, X icon)

**CSS files:**
- `styles/components/dialog.css` — Shared modal styling.

---

### 1.3 Dependency Graph (Simplified)

```
Phase 2: Design System Foundation
├── globals.css (tokens updated)
├── components/button.css
├── components/card.css
├── components/badge.css
├── components/divider.css
├── components/dialog.css
├── components/toast.css
└── components/motion.css

Phase 3: Screen Redesigns (Order)
├── 1. Home
│   ├── depends: PosterCard, ContinueCard, PosterRow, SectionHeader, HeroCarousel
│   ├── updates: Home.css, HeroCarousel.css, PosterRow.css
│   └── uses shared: button, badge, divider
│
├── 2. Movies / Series / Category
│   ├── depends: PosterGrid, PosterCard, FilterBar (optional)
│   ├── updates: Category.css, PosterGrid.css
│   └── uses shared: button, badge, divider
│
├── 3. Detail Modal
│   ├── depends: Modal backdrop, TitleLogo, action buttons
│   ├── updates: Detail.css, components/DetailBackdrop.css
│   └── uses shared: button, badge, dialog, motion
│
├── 4. Search View
│   ├── depends: SearchBar, PosterGrid, PosterCard
│   ├── updates: Search.css, SearchBar.css
│   └── uses shared: button, badge, divider, loading skeleton
│
├── 5. Settings View
│   ├── depends: TabBar, Form components
│   ├── updates: Settings.css, TabBar.css, Form.css
│   └── uses shared: button, divider
│
└── 6. Playback & Dialogs
    ├── depends: Video player, PlayerControls
    ├── updates: PlayerControls.css, VideoPlayer.css
    └── uses shared: button, dialog, motion
```

---

## 2. Component Update Strategy

### 2.1 CSS-Only Updates vs. Structural Refactoring

**CSS-Only (Safe):**
- Button styling (colors, hover, focus) → Update `styles/components/button.css`
- Card hover effects (scale, shadow) → Update `styles/components/card.css`
- Section spacing (margins, padding) → Update screen-specific CSS
- Badge styling → Update `styles/components/badge.css`
- Modal backdrop blur → Update `styles/components/dialog.css`
- Animation timing → Add to `styles/components/motion.css`

**Likely Structural Changes (Requires Code Review):**
- DetailModal backdrop positioning (may need flexbox/grid changes in React)
- SearchBar integration into TopNav (may require TopNav restructuring)
- PosterGrid responsive columns (CSS Grid, no code changes)
- TabBar styling (CSS only)

**No Changes Needed:**
- Component logic (filtering, sorting, event handling)
- IPC contracts (data shape)
- State management (useState, useEffect)
- Hook signatures

### 2.2 Shared Base Component Strategy

**Approach:** Define reusable base classes in `src/renderer/styles/components/` for common patterns. Each screen-specific CSS imports and extends these.

**Base Classes to Create/Update:**

```css
/* Button system */
.btn { /* base: padding, radius, focus, transition */ }
.btn--primary { /* accent bg, primary text */ }
.btn--secondary { /* surface-2 bg, text color */ }
.btn--icon { /* 40×40px, transparent, hover effect */ }

/* Card system */
.card { /* radius, shadow, focus outline */ }
.card--hover { /* scale 1.02, shadow grows */ }

/* Badge system */
.badge { /* small font, padding, surface-3 bg */ }

/* Divider */
.divider { /* 1px solid, --divider token */ }

/* Dialog/Modal */
.modal-backdrop { /* blur, dim overlay */ }
.modal-box { /* surface-2 bg, shadow-lg, padding */ }

/* Text hierarchy */
.text-heading { /* 24px, weight 700 */ }
.text-subtitle { /* 14px, weight 400, --muted */ }
.text-meta { /* 12px, weight 400, --text-3 */ }

/* Motion */
.transition-fast { /* 120ms ease-out */ }
.transition-normal { /* 200ms ease-out */ }
.transition-slow { /* 300ms ease-out */ }
```

**Usage in Views:**

```tsx
// Home.tsx
<div className="card card--hover">
  <img src="..." alt="..." />
</div>

<button className="btn btn--primary">Play</button>
<button className="btn btn--secondary">More Info</button>
<button className="btn btn--icon" aria-label="Close"><X /></button>

<h2 className="text-heading">Continue Watching</h2>
<p className="text-subtitle">Pick up where you left off</p>
```

### 2.3 Incremental Update Plan

**Goal:** Minimize regression by updating one component type at a time, testing thoroughly.

1. **Week 1:** Base components (button, card, badge, divider, dialog, motion) in `styles/components/`.
2. **Week 2:** Home screen (uses all base components).
3. **Week 3:** Movies/Series/Category (reuses card, button, badge, divider).
4. **Week 4:** Detail Modal (uses card, button, badge, dialog, motion).
5. **Week 5:** Search (reuses all previous components).
6. **Week 6:** Settings, Playback, Dialogs.

**Testing after each phase:**
- Visual audit (consistency with Phase 2 baseline).
- Keyboard navigation (Tab, focus visible, Escape).
- Responsive testing (3–4 breakpoints).
- Performance (no jank, smooth animations).

---

## 3. Screen-by-Screen Implementation Approach

### 3.1 Home Screen

**Current State:**
- Hero carousel (rotates, shows backdrop + title + metadata).
- Continue Watching row (progress cards).
- Trending, Recently Added, Picked for You, Editorial rows.
- Empty state (generic message).

**Proposed Changes:**

| Aspect | Current | Proposed | Effort |
|--------|---------|----------|--------|
| **Hero Height** | `clamp(320px, 46vh, 520px)` | Increase to `clamp(360px, 50vh, 580px)` (more cinematic) | CSS only |
| **Title Logo** | Positioned mid-screen | Repositioned lower-left with better contrast | CSS positioning |
| **Row Spacing** | 24px between cards, ~40px between sections | Increase to 24px cards, 48px sections (more premium) | CSS only |
| **Continue Cards** | Standard cards | Elevated styling: more shadow, hover effect 1.04 scale (emphasis) | CSS only |
| **Section Headers** | 18px title, small subtitle | Upgrade to 24px weight 700 title, 14px weight 400 subtitle (consistent) | CSS + text hierarchy |
| **Empty State** | Generic "Start by adding a folder" | Friendly onboarding: icon + "No titles yet" + "Add a source in Settings" link | CSS + link styling |
| **Hover Effects** | Cards scale 1.02 | Normalize to 1.02 across all cards (consistent) | CSS |
| **Background** | Solid `--bg` | Add subtle noise texture overlay (already in CSS) | No change |

**Implementation Checklist:**

- [ ] Update `Home.css`: Hero height, section spacing (48px), row margins.
- [ ] Update `components/HeroCarousel.css`: Title logo positioning, contrast, shadow.
- [ ] Update `components/ContinueCard.css`: Hover scale 1.04, shadow enhancement.
- [ ] Update `components/PosterRow.css`: Card spacing 24px, margin-bottom 48px.
- [ ] Create `components/SectionHeader.css`: 24px/14px text hierarchy, margin rules.
- [ ] Update empty state HTML/CSS: Icon + heading + link styling.
- [ ] Test on 5 breakpoints: 600px, 960px, 1024px, 1360px, 1700px.
- [ ] Verify Continue Watching always visible and elevated.
- [ ] No regression on hero carousel rotation, card click handlers.

---

### 3.2 Movies / Series / Category Screens

**Current State:**
- PosterGrid (responsive columns: 2–6 depending on breakpoint).
- FilterBar (optional; minimal use in current app).
- PosterCard (2:3 aspect, hover effect, metadata overlay).
- Pagination (or infinite scroll).
- Empty state (no results).

**Proposed Changes:**

| Aspect | Current | Proposed | Effort |
|--------|---------|----------|--------|
| **Grid Spacing** | Varies; not fully consistent | Normalize to 16px gap between cards, 24px sides | CSS only |
| **Card Hover** | Scale 1.02 + shadow | Ensure consistency across all cards (baseline) | CSS |
| **Responsive Columns** | 2 (mobile), 3 (600px), 4 (960px), 5 (1360px), 6 (1700px) | Keep existing; verify at all breakpoints | No change |
| **FilterBar** | Present but underused | Minimal styling; ensure consistent with design system | CSS only |
| **Pagination** | Basic buttons | Style to match button system (primary/secondary) | CSS only |
| **Empty State** | "No titles found" | Friendly message + icon + link to browse other categories | CSS + link |
| **Loading State** | Generic spinner | Skeleton grid (matches Home) + pulse animation | CSS animation |

**Implementation Checklist:**

- [ ] Update `Category.css`: Grid gap 16px, side padding 24px, breakpoint verification.
- [ ] Update `components/PosterGrid.css`: Normalize gap, margin rules.
- [ ] Update `components/PosterCard.css`: Hover consistency (1.02 scale, shadow).
- [ ] Update pagination buttons: Use `.btn--secondary` class.
- [ ] Update empty state: Icon + heading + link to other categories.
- [ ] Update loading state: Skeleton grid with pulse animation.
- [ ] Test on 5 breakpoints.
- [ ] Verify filtering, sorting, pagination logic unchanged.
- [ ] No regression on card click handlers, metadata display.

---

### 3.3 Detail Modal

**Current State:**
- Backdrop image (38vh).
- Gradient overlay (bottom-left).
- Title logo, metadata, description.
- Action buttons (Play, Resume, More, Watchlist, Favorite, Watched, Trailer).
- Trailer modal (nested).

**Proposed Changes:**

| Aspect | Current | Proposed | Effort |
|--------|---------|----------|--------|
| **Backdrop Height** | 38vh | Increase to 45–50vh (more cinematic, larger hero) | CSS only |
| **Backdrop Blur** | None (solid overlay) | Add backdrop blur if supported (4–8px); solid fallback | CSS |
| **Gradient Overlay** | Bottom-left to transparent | Refine gradient angle, opacity for better title readability | CSS |
| **Title Logo** | Positioned mid-backdrop | Reposition lower-left with better spacing from edges | CSS positioning |
| **Metadata Layout** | Single row (year, genres, rating) | Keep single row; ensure consistent with Home cards | CSS |
| **Description** | 2 lines max, truncated | Ensure truncation, hover expand (optional) | CSS/JS |
| **Action Buttons** | Various styles | Normalize to button system: primary (Play/Resume), secondary (others) | CSS + HTML |
| **Close Button** | Top-right X | Ensure visible, 40×40px, focus outline | CSS |
| **Modal Backdrop** | Dim overlay | Add blur if supported, shadow on modal box | CSS |
| **Scroll Behavior** | Modal scrolls if content > viewport | Ensure scroll works smoothly; test on small screens | No change |

**Implementation Checklist:**

- [ ] Update `Detail.css`: Modal backdrop height 45–50vh, padding, layout.
- [ ] Create/update `components/DetailBackdrop.css`: Backdrop blur, gradient positioning, title logo placement.
- [ ] Update action buttons: Classify as primary (Play/Resume) or secondary (others); use `.btn--primary` / `.btn--secondary`.
- [ ] Update close button: Ensure 40×40px, focus outline, hover effect.
- [ ] Test backdrop blur on mid-range GPU; verify solid fallback works.
- [ ] Test metadata layout consistency with Home cards.
- [ ] Test on 3 breakpoints (mobile, tablet, desktop); ensure scrolling works.
- [ ] Verify Escape closes modal; Enter triggers primary action.
- [ ] No regression on button handlers (Play, Watchlist, Favorite, Watched, Trailer).

---

### 3.4 Search View

**Current State:**
- SearchBar (input, placeholder, focus handling).
- Results grid (uses PosterGrid + PosterCard).
- Loading state (skeleton grid).
- Empty state (no results).

**Proposed Changes:**

| Aspect | Current | Proposed | Effort |
|--------|---------|----------|--------|
| **SearchBar Integration** | Modal overlay, Ctrl+K to open | Integrated into TopNav (or modal on mobile); consistent with top nav search | Medium (TopNav refactor?) |
| **Results Grid** | Responsive grid | Reuse PosterGrid component; ensure consistency | CSS only |
| **Results Cards** | PosterCard (2:3) | Same as Movies/Series; use consistent styling | CSS only |
| **Filter Section** | Present but minimal | Optional; if kept, style to match design system | CSS only |
| **Loading State** | Generic spinner | Skeleton grid + pulse animation (matches Home) | CSS animation |
| **Empty State** | "No results for X" | Friendly message + "Try a different search" + link to categories | CSS + link |
| **Recent Searches** | Not implemented | Optional; if added, use small badges or list items | Low priority |

**Implementation Checklist:**

- [ ] Decide: SearchBar integrated into TopNav or modal-only? (Architecture decision needed.)
- [ ] If integrated: Update `TopNav.css` to accommodate search bar width, focus state.
- [ ] Update `Search.css`: Results grid layout, margin, padding.
- [ ] Update `SearchBar.css`: Input styling, focus outline, placeholder color.
- [ ] Reuse `PosterGrid.css` and `PosterCard.css` from Movies/Series redesign.
- [ ] Update loading state: Skeleton grid with pulse animation.
- [ ] Update empty state: Icon + heading + "Try a different search" link.
- [ ] Test keyboard navigation: Tab through results, Enter to select, Escape to close (if modal).
- [ ] Test responsive: Ensure search bar visible and usable on mobile.
- [ ] No regression on search query handling, result sorting, filtering.

---

### 3.5 Settings View

**Current State:**
- Tabbed interface (Sources, Updates, About).
- Form inputs (folder paths, update frequency).
- Action buttons (Apply, Reset, Check Updates).
- Section headers (sources, updates, about).

**Proposed Changes:**

| Aspect | Current | Proposed | Effort |
|--------|---------|----------|--------|
| **Tab Styling** | Basic button tabs | Upgrade to design system tabs: active underline accent, hover surface-3 bg | CSS only |
| **Tab Content Layout** | Flex layout | Ensure consistent with design system: 24px section headers, 16px form spacing | CSS |
| **Form Inputs** | Standard input elements | Update to design system: surface-2 bg, focus outline, label alignment | CSS only |
| **Form Spacing** | Varies | Normalize to 16px between fields, 24px between sections (multiples of 4px) | CSS only |
| **Action Buttons** | Basic buttons | Classify: primary (Apply, Check Updates), secondary (Reset); use button system | CSS |
| **Section Headers** | 18px bold | Upgrade to 24px weight 700 (consistent with Home) | CSS |
| **Empty/Error States** | Generic text | Friendly messages with icons, clear call-to-action | CSS + icons |

**Implementation Checklist:**

- [ ] Update `Settings.css`: Tab layout, content margin, padding.
- [ ] Create `components/TabBar.css`: Tab styling, active state underline, hover effect.
- [ ] Update form inputs: Surface-2 bg, focus outline, padding 12px.
- [ ] Update form layout: 16px field spacing, 24px section spacing.
- [ ] Update action buttons: Classify and style using button system (primary/secondary).
- [ ] Update section headers: 24px weight 700 font size.
- [ ] Update error/empty messages: Icon + heading + link.
- [ ] Test keyboard navigation: Tab through tabs and form fields; Enter to submit.
- [ ] Test responsive: Ensure form fields stack on mobile; tabs wrap or scroll if needed.
- [ ] No regression on form submission, settings persistence, validation.

---

### 3.6 Playback Screen (Full-Screen Video)

**Current State:**
- Video player (`<video>` element).
- Control bar (play, pause, seek, volume, fullscreen).
- Window chrome (minimize, maximize, close).

**Proposed Changes:**

| Aspect | Current | Proposed | Effort |
|--------|---------|----------|--------|
| **Control Bar Styling** | Basic player controls | Update to design system: accent play button, secondary pause/volume, focus outlines | CSS only |
| **Control Icons** | Generic icons | Use consistent icon family (match Home, Settings, etc.) | No change (asset-only) |
| **Control Hover** | Visible hover effect | Ensure hover effect 1.02 scale or surface-3 highlight | CSS |
| **Focus Management** | Video takes focus | Escape exits fullscreen; Tab shows/hides controls; focus visible on controls | No change needed |
| **Keyboard Shortcuts** | Space = play/pause, arrows = seek | Ensure shortcuts work; display help if needed | No change |
| **Window Chrome** | Minimize, maximize, close buttons | Ensure visible and clickable in fullscreen; consistent styling | CSS |

**Implementation Checklist:**

- [ ] Create/update `components/PlayerControls.css`: Button styling (primary play, secondary controls), padding, spacing.
- [ ] Update control icons: Ensure consistent with app icon family.
- [ ] Update window control buttons: Hover effect, focus outline.
- [ ] Test focus management: Escape exits; Tab cycles through controls.
- [ ] Test keyboard shortcuts: Space, arrows, etc. work correctly.
- [ ] Verify fullscreen behavior on Windows (window controls visible or hidden?).
- [ ] Test on typical media files (MP4, MKV, WebM).
- [ ] No regression on playback progress persistence, resume behavior.

---

### 3.7 Dialogs & Popovers (Supporting)

**Current State:**
- Generic modal backdrop + dialog box.
- Close button (X icon).
- OK/Cancel buttons.
- Error/success messages.

**Proposed Changes:**

| Aspect | Current | Proposed | Effort |
|--------|---------|----------|--------|
| **Modal Backdrop** | Dim overlay | Add blur if supported (4–8px); solid fallback | CSS |
| **Dialog Box** | Basic surface-2 bg | Add shadow-lg, ensure padding consistent (16–24px) | CSS |
| **Close Button** | X icon, top-right | Ensure 40×40px, focus outline, accessible | CSS |
| **Dialog Title** | Optional | 24px weight 700 (consistent with section headers) | CSS |
| **Dialog Message** | 14px text | Ensure text hierarchy: 14px primary, 12px secondary | CSS |
| **Action Buttons** | Basic buttons | Classify: primary (OK, Confirm), secondary (Cancel); use button system | CSS |
| **Animation** | None | Fade in 200ms (uses `--motion-normal` token) | CSS animation |

**Implementation Checklist:**

- [ ] Update `styles/components/dialog.css`: Backdrop blur, box shadow, padding, animation.
- [ ] Update dialog title styling: 24px weight 700.
- [ ] Update close button: 40×40px, focus outline, hover effect.
- [ ] Update action buttons: Classify and style (primary/secondary).
- [ ] Add fade-in animation: 200ms ease-out (respects `prefers-reduced-motion`).
- [ ] Test keyboard navigation: Tab through buttons, Enter to trigger, Escape to close.
- [ ] Test on all screen sizes (mobile, tablet, desktop).
- [ ] No regression on dialog trigger logic, button handlers.

---

## 4. Testing Strategy for Phase 3

### 4.1 Testing Framework

**Tools:**
- **Visual Inspection:** Manual walkthrough on 5 breakpoints (600px, 960px, 1024px, 1360px, 1700px).
- **Keyboard Navigation:** Tab order, focus visible, Escape behavior, keyboard shortcuts.
- **Responsive:** Browser DevTools (Chrome, Firefox) or physical devices.
- **Performance:** Chrome DevTools Lighthouse, Profiler for animation frame rate.
- **Accessibility:** axe DevTools, WAVE, manual WCAG AA check.

**Baseline:** Home page post-Phase 2 as the reference design.

### 4.2 Visual Consistency Audit

After each screen redesign, verify:

| Check | Criteria | Pass/Fail |
|-------|----------|-----------|
| **Button Consistency** | All buttons match Home design (same sizes, colors, hover effects) | ✓ |
| **Card Consistency** | All cards match Home design (same radius, shadow, hover 1.02 scale) | ✓ |
| **Text Hierarchy** | Titles 24px/700, subtitles 14px/400, meta 12px/400 | ✓ |
| **Spacing** | All gaps 4px multiples; sections 48px apart; cards 24px apart | ✓ |
| **Colors** | Accent used only on primary actions; surfaces layer correctly | ✓ |
| **Focus Indicators** | All interactive elements show 2px outline on Tab | ✓ |
| **Modals** | All modals have backdrop blur, shadow-lg, close button | ✓ |
| **Badges** | IMDb, New, % watched badges consistent | ✓ |
| **Icons** | All icons from same family; stroke/size consistent | ✓ |
| **Dividers** | All section separators use `--divider` token | ✓ |

---

### 4.3 Keyboard Navigation Checklist

For each screen, verify:

| Action | Expected Behavior | Pass/Fail |
|--------|-------------------|-----------|
| **Tab** | Logical order: left-to-right, top-to-bottom; focus visible on all interactive elements | ✓ |
| **Shift+Tab** | Reverse order | ✓ |
| **Enter** | Triggers button actions (Play, Watchlist, Apply, etc.) | ✓ |
| **Space** | Toggles button state (Favorite, Watchlist) or plays video | ✓ |
| **Escape** | Closes modals, overlays, fullscreen; never traps focus | ✓ |
| **Arrow Keys** | Carousel/grid navigation (Left/Right for hero, Up/Down for grids if supported) | ✓ |
| **Ctrl+K** | Opens search | ✓ |
| **Ctrl+M** | Opens settings (if used) | ✓ |
| **Alt+F4** | Closes app (Windows default; not overridden) | ✓ |

---

### 4.4 Responsive Testing Checklist

Test on each breakpoint:

| Breakpoint | Context | Verifications |
|------------|---------|---------------|
| **600px** | Mobile (small phone) | Cards visible (2 columns); hero height adjusts; search bar accessible; buttons touchable (40×40px) |
| **960px** | Tablet portrait | Cards visible (3–4 columns); hero height increases; spacing proportional |
| **1024px** | Tablet landscape / small desktop | Cards visible (4–5 columns); full layout visible; no overflow |
| **1360px** | Desktop (typical) | Cards visible (5–6 columns); hero full height; spacing generous; focus management works |
| **1700px** | Ultra-wide (gaming monitor) | Cards visible (6 columns); no content stretches oddly; spacing remains proportional |

**Edge Cases:**
- Very small windows (500px): Ensure no layout break; horizontal scroll acceptable.
- Very large windows (2560px+): Ensure content doesn't stretch excessively.
- Window resize: Verify layout adapts smoothly (no flash/reflow).

---

### 4.5 Performance Testing

For each screen, verify:

| Metric | Target | Method |
|--------|--------|--------|
| **First Contentful Paint (FCP)** | <2s on mid-range GPU (Intel i5) | Lighthouse audit |
| **Animation Frame Rate** | 60fps (no jank) | Chrome DevTools Profiler; hover on cards, carousel rotation |
| **Scroll Performance** | Smooth; no stuttering | Manual scroll through Home rows; monitor frame drops |
| **Image Load Time** | Posters lazy-load; placeholder shows <100ms | Network throttle to 3G; verify skeleton shows immediately |
| **Modal Open/Close** | Smooth fade-in/out 200ms | Manual timing; use Profiler to verify no frame drops |
| **Blur Performance** | Smooth; no stutter | Glass blur on modal backdrop; verify no GPU overload on mid-range hardware |

---

### 4.6 Accessibility Checks

For each screen, verify:

| Check | Criteria | Pass/Fail |
|-------|----------|-----------|
| **Color Contrast** | WCAG AA (4.5:1 for normal text, 3:1 for large text) | axe DevTools |
| **Focus Visible** | All interactive elements have clear focus indicator | Manual Tab through screen |
| **ARIA Labels** | Buttons, icons, landmarks labeled correctly | axe DevTools, screen reader test |
| **Keyboard Accessible** | All functionality reachable via keyboard alone | Tab through every feature; no mouse required |
| **Screen Reader** | Content announced correctly (headings, links, buttons, form labels) | NVDA or JAWS test |
| **Motion** | Animations respect `prefers-reduced-motion` media query | Manual test: DevTools > Rendering > Emulate CSS media feature |

---

### 4.7 Content Availability Verification (Home Only)

After Home redesign, verify:

| Check | Criteria | Pass/Fail |
|-------|----------|-----------|
| **ISP Titles Only** | Only titles from discovered servers appear in all rows | Manual inspection; check database |
| **Trending Reflects Reality** | Trending row shows real trending data (Cinemeta or backend) | Manual inspection; compare with Cinemeta API |
| **Recently Added Accurate** | Recently Added reflects actual ISP catalogue changes | Manual inspection; re-scan and verify updates |
| **Picked for You Personalized** | Appears only if viewing history exists; disappears on new install | Test on fresh install and after watching titles |
| **Editorial Collections Conditional** | Hidden if insufficient content; shown when meaningful | Test with limited ISP library vs. full library |
| **Empty Home Friendly** | Onboarding message clear; link to Settings works | Test on fresh install |

---

## 5. Motion & Animation Plan

### 5.1 Motion Tokens

**Defined in Phase 2 `globals.css`:**

```css
--motion-fast: 120ms ease-out     /* Quick interactions: hover, state changes */
--motion-normal: 200ms ease-out   /* Standard: modal open/close, fade-in */
--motion-slow: 300ms ease-out     /* Entrance: hero carousel slide, row scroll */
```

### 5.2 Animation Guidelines

**Respect `prefers-reduced-motion`:**

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

**Use CSS transforms and opacity only** (best performance):

```css
/* Good: transform and opacity */
.card--hover:hover {
  transform: scale(1.02);
  opacity: 1;
  transition: transform var(--motion-fast), opacity var(--motion-fast);
}

/* Bad: width, height, left, top (causes reflows) */
.card--hover:hover {
  width: 110%;  /* ❌ Expensive */
  left: -5%;
}
```

### 5.3 Animation Specifications

#### Home Screen

| Element | Trigger | Animation | Duration | Easing |
|---------|---------|-----------|----------|--------|
| **Hero Carousel** | Load or manual next | Fade-in slide transition | 300ms | ease-out |
| **Poster Cards** | Hover | Scale 1.02 + shadow grows | 120ms | ease-out |
| **Continue Cards** | Hover | Scale 1.04 + shadow grows | 120ms | ease-out |
| **Section Headers** | Load (staggered) | Fade-in from top (optional) | 200ms | ease-out |
| **Row Scroll** | User scrolls | Smooth; no animation | — | — |

#### Movies/Series/Category

| Element | Trigger | Animation | Duration | Easing |
|---------|---------|-----------|----------|--------|
| **Poster Cards** | Hover | Scale 1.02 + shadow | 120ms | ease-out |
| **Grid Load** | Initial render | Staggered fade-in (optional) | 200ms | ease-out |
| **Pagination** | Click next/prev | Fade-out grid, fade-in new grid | 200ms | ease-out |
| **Filter Change** | Apply filter | Fade-out, re-sort, fade-in | 200ms | ease-out |

#### Detail Modal

| Element | Trigger | Animation | Duration | Easing |
|---------|---------|-----------|----------|--------|
| **Modal Backdrop** | Open | Fade-in (blur animation) | 200ms | ease-out |
| **Modal Box** | Open | Fade-in scale (0.95 to 1) | 200ms | ease-out |
| **Close Button** | Hover | Scale 1.1 or background highlight | 120ms | ease-out |
| **Action Buttons** | Hover | Scale 1.02 or color shift | 120ms | ease-out |

#### Search

| Element | Trigger | Animation | Duration | Easing |
|---------|---------|-----------|----------|--------|
| **SearchBar** | Focus | Border color shift + glow (optional) | 120ms | ease-out |
| **Results Grid** | Load | Staggered fade-in (optional) | 200ms | ease-out |
| **Clear Button** | Appear | Fade-in | 120ms | ease-out |

#### Settings

| Element | Trigger | Animation | Duration | Easing |
|---------|---------|-----------|----------|--------|
| **Tab Content** | Switch tabs | Fade-out old, fade-in new | 200ms | ease-out |
| **Form Inputs** | Focus | Border highlight (no animation; instant) | — | — |
| **Success Message** | Submit form | Fade-in toast | 200ms | ease-out |

#### Playback

| Element | Trigger | Animation | Duration | Easing |
|---------|---------|-----------|----------|--------|
| **Control Bar** | Hover over video | Fade-in controls | 200ms | ease-out |
| **Control Buttons** | Hover | Scale 1.1 or highlight | 120ms | ease-out |
| **Play/Pause Icon** | Click | Icon swap (instant) + button feedback | 120ms | ease-out |

#### Dialogs

| Element | Trigger | Animation | Duration | Easing |
|---------|---------|-----------|----------|--------|
| **Dialog Box** | Open | Fade-in scale (0.95 to 1) | 200ms | ease-out |
| **Close on Confirm** | Click OK | Fade-out | 200ms | ease-out |

### 5.4 No Animation Scenarios

- Form submissions (instant visual feedback).
- Text color changes (use instant transitions).
- Artworks missing (placeholder appears instantly).
- Low-network scenarios (disable animations for fast load).

---

## 6. Risk Register & Mitigations

### 6.1 Identified Risks

| Risk | Severity | Impact | Mitigation |
|------|----------|--------|-----------|
| **Glass blur performance** | Medium | Animation stutter on low-end GPUs | Use subtle blur (4–8px); test on Intel i5 integrated GPU; provide solid color fallback |
| **Responsive layout breakage** | Medium | UI broken on untested screen sizes | Test on 5 breakpoints (600px–1700px); use CSS Grid/Flexbox carefully; edge-case testing (500px, 2560px) |
| **Focus management regression** | Low | Keyboard navigation broken; accessibility loss | Verify Tab order logical on every screen; test Escape closes modals; no focus traps |
| **Component dependency conflicts** | Medium | Reused components styled differently on different screens | Use consistent base classes; central `styles/components/` files; avoid screen-specific overrides that conflict |
| **Animation jank** | Low | Frame drops on scroll, hover, modal open | Use CSS transforms + opacity only; avoid width/height/left changes; test on mid-range GPU |
| **Artwork load delay** | Low | Skeleton screen persists too long; images not cached | Lazy-load below fold; show placeholder <100ms; verify cache headers on ISP servers |
| **Detail Modal truncation** | Low | Metadata/description overflow on small screens | Test scrolling on 600px viewport; ensure content readable |
| **SearchBar integration scope creep** | Medium | TopNav refactoring takes longer than planned | Decide now: Integrated into TopNav CSS or modal-only? Document decision; plan TopNav refactor if needed |
| **Fallback strategy not tested** | Medium | Blur unavailable; app falls back to solid color; not verified | Test blur fallback explicitly; provide solid surface-2 fallback; verify rendering identical |
| **Cinemeta/trending unavailable** | Low | Trending sections empty on Home | Show empty state gracefully; Continue Watching always works (local data); no "not yet" loader that never completes |

### 6.2 Mitigation Strategies

| Mitigation | Action | Timeline |
|-----------|--------|----------|
| **Hardware testing** | Test animations on Intel i5 GPU; profile frame rate | End of Phase 3 (before QA) |
| **Responsive matrix** | Create test matrix (5 breakpoints × 6 screens); tick off each | After each screen redesign |
| **Keyboard testing workflow** | Establish checklist (Tab, Shift+Tab, Enter, Space, Escape); verify before marking screen done | After each screen redesign |
| **Component base classes** | Centralize reusable CSS; prevent screen-specific conflicts | Before Home redesign (Phase 2 output) |
| **Fallback testing** | Explicitly disable CSS blur; verify solid fallback works | End of Phase 3 |
| **Empty state standards** | Define friendly, actionable empty/error messages; template for all screens | Before Home redesign |
| **SearchBar decision** | Architect to decide: integrated or modal-only? | Now (before Phase 3 starts) |
| **Trending failure mode** | Define behavior: show Continue Watching + other rows; empty Trending row hidden | Before Home redesign |

---

## 7. File Organization Approach

### 7.1 Proposed Directory Structure

```
src/renderer/
├── styles/
│   ├── globals.css                    ← Design tokens (Phase 2 output)
│   └── components/                    ← Reusable component styles
│       ├── button.css                 ← .btn, .btn--primary, .btn--secondary, .btn--icon
│       ├── card.css                   ← .card, .card--hover
│       ├── badge.css                  ← .badge
│       ├── divider.css                ← .divider
│       ├── dialog.css                 ← .modal-backdrop, .modal-box
│       ├── toast.css                  ← .toast, .toast--success, .toast--error
│       ├── motion.css                 ← Animation classes and @media prefers-reduced-motion
│       ├── text.css                   ← .text-heading, .text-subtitle, .text-meta
│       ├── HeroCarousel.css           ← Hero-specific styles
│       ├── PosterRow.css              ← Row container spacing
│       ├── PosterGrid.css             ← Grid layout (responsive columns)
│       ├── DetailBackdrop.css         ← Detail modal backdrop positioning
│       ├── TabBar.css                 ← Tab styling
│       ├── Form.css                   ← Form input styling
│       ├── PlayerControls.css         ← Playback control bar
│       └── SectionHeader.css          ← Section title + subtitle
│
├── components/
│   ├── common/
│   │   ├── Button.tsx                 ← Reusable button component (uses .btn--primary, etc.)
│   │   ├── Badge.tsx
│   │   ├── Divider.tsx
│   │   ├── SearchBar.tsx              ← Uses .searchbar class
│   │   ├── LoadingSpinner.tsx
│   │   └── Toast.tsx
│   │
│   ├── layout/
│   │   ├── TopNav.tsx                 ← Uses .topnav, .btn--icon
│   │   ├── TopNav.css                 ← TopNav layout only; reuses component classes
│   │   ├── WindowChrome.tsx
│   │   ├── WindowControls.tsx
│   │   └── ...
│   │
│   └── media/
│       ├── HeroCarousel.tsx           ← Uses HeroCarousel.css
│       ├── HeroCarousel.css           ← (no longer here; moved to styles/components/)
│       ├── PosterCard.tsx             ← Uses .card, .card--hover
│       ├── PosterCard.css             ← (no longer here; moved to styles/components/)
│       ├── ContinueCard.tsx           ← Uses .card--continue (extends .card)
│       ├── PosterRow.tsx              ← Uses PosterRow.css
│       ├── PosterGrid.tsx             ← Uses PosterGrid.css
│       ├── DetailModal.tsx            ← Uses .modal-backdrop, .modal-box
│       ├── DetailModal.css            ← (no longer here; moved to styles/components/)
│       ├── TitleLogo.tsx
│       ├── TrailerModal.tsx
│       └── ...
│
└── views/
    ├── Home.tsx                       ← Home view (uses all components)
    ├── Home.css                       ← Home layout only; reuses component classes
    ├── Category.tsx                   ← Movies/Series/Category view
    ├── Category.css                   ← Category layout; reuses component classes
    ├── Detail.tsx                     ← Detail modal
    ├── Detail.css                     ← Detail layout; reuses component classes
    ├── Search.tsx                     ← Search view
    ├── Search.css                     ← Search layout; reuses component classes
    ├── Settings.tsx                   ← Settings tabs/forms
    ├── Settings.css                   ← Settings layout; reuses component/tab classes
    ├── MyList.tsx                     ← Watchlist (similar to Movies/Series)
    ├── MyList.css
    └── ...
```

### 7.2 CSS Import Hierarchy

**Global Tokens (Phase 2):**
```css
/* globals.css: Available everywhere */
@root {
  --bg: ...
  --accent: ...
  --motion-normal: ...
  ...
}
```

**Component Base Classes:**
```css
/* styles/components/button.css: Imported by views/*/
@import '../styles/components/button.css';
@import '../styles/components/card.css';
@import '../styles/components/motion.css';

/* Then view-specific CSS */
.home {
  display: flex;
  flex-direction: column;
}

.home__section {
  margin-bottom: var(--space-7);  /* 48px */
}
```

**Component-Level CSS:**
```css
/* components/media/HeroCarousel.tsx */
import './HeroCarousel.css';

/* HeroCarousel.css */
.hero-carousel {
  height: clamp(360px, 50vh, 580px);
}
```

### 7.3 Key Principles

1. **No duplication:** If styling is used by multiple screens, move it to `styles/components/`.
2. **Avoid screen-specific overrides:** Prefer extending base classes over creating new ones.
3. **Naming consistency:** Use BEM or similar convention: `.component__element--modifier`.
4. **Token usage:** Every color, spacing, shadow uses a CSS variable; no hardcoding.
5. **Responsive queries:** Use CSS Grid/Flexbox; media queries only for significant layout changes.
6. **Performance:** Minimize CSS bundle size; lazy-load component CSS if needed (but typically all CSS loaded globally).

---

## 8. Architectural Decisions

### 8.1 Decision: SearchBar Integrated or Modal-Only?

**Current State:** Search opens a modal overlay.

**Options:**

1. **Integrated into TopNav** (Proposed in Phase 1)
   - SearchBar always visible in top nav.
   - Clicking expands or opens modal.
   - Pro: More discoverable; aligns with Apple TV.
   - Con: TopNav becomes crowded; requires refactor.

2. **Modal-Only** (Current)
   - SearchBar remains modal overlay (Ctrl+K to open).
   - Pro: TopNav remains clean; minimal refactoring.
   - Con: Less discoverable; not aligned with Phase 1 proposal.

**Decision Required:** Tech Lead / Product to confirm before Phase 3 starts.

**Recommendation:** Keep modal-only for Phase 3 (simpler scope); revisit TopNav integration as Phase 4 enhancement if prioritized.

---

### 8.2 Decision: Responsive Breakpoints for Phase 3 Testing

**Current Breakpoints:** 600px, 960px, 1024px, 1360px, 1700px (from Phase 1 audit).

**Proposed:** Use all 5 for comprehensive testing.

**Rationale:** DhakaFlix targets Windows desktops, but Windows Subsystem for Linux (WSL), virtual machines, and remote desktops may use different viewport sizes. Comprehensive testing ensures robustness.

---

### 8.3 Decision: Animation Performance vs. Visual Polish

**Question:** Should we optimize animations for performance (60fps guarantee) or visual polish (might drop to 50fps on low-end hardware)?

**Recommendation:** Prioritize 60fps on mid-range hardware (Intel i5, integrated GPU); animations are secondary to functionality. Use `prefers-reduced-motion` to disable animations for accessibility/performance-sensitive users.

---

### 8.4 Decision: Fallback for Glass Blur

**Question:** If CSS backdrop-filter not supported, what fallback?

**Recommendation:** Solid surface-2 color (semi-transparent); ensure modal remains readable. Test explicitly.

---

## 9. Success Criteria for Phase 3

### 9.1 Definition of Done (Per Screen)

Before marking a screen complete:

- [ ] All component dependencies identified and updated.
- [ ] CSS updated for consistency (button, card, text, spacing).
- [ ] Visual audit passed: Consistency with Home baseline, correct spacing/colors.
- [ ] Keyboard navigation verified: Tab order logical, focus visible, Escape works.
- [ ] Responsive testing passed: 600px, 960px, 1024px, 1360px, 1700px.
- [ ] Performance verified: Smooth animations (60fps), <2s FCP, no jank.
- [ ] Accessibility checked: WCAG AA contrast, ARIA labels, screen reader.
- [ ] Functionality regression tested: All existing features still work.
- [ ] Code review approved: PR merged.
- [ ] QA sign-off: Independent testing passed.

### 9.2 Phase 3 Completion Criteria

- [ ] All 6 screens redesigned and tested.
- [ ] No visual or functional regressions across any screen.
- [ ] Design system (tokens, components, motion) applied consistently everywhere.
- [ ] Keyboard navigation perfect across all screens.
- [ ] Responsive layout works on all 5 breakpoints.
- [ ] Performance acceptable on mid-range hardware (60fps, <2s FCP).
- [ ] Accessibility compliant (WCAG AA).
- [ ] Component CSS centralized in `styles/components/`; duplication eliminated.
- [ ] Fallback strategies tested and working (blur, missing artwork, slow network).
- [ ] Documentation updated (ADRs, component specs, testing results).

---

## 10. Deliverables

### 10.1 Artifacts from Phase 3

1. **Updated CSS Files:**
   - `src/renderer/styles/components/button.css` (and others)
   - Screen-specific CSS in `src/renderer/views/`

2. **Updated Component Files:**
   - Minimal changes; mostly CSS imports and class references.

3. **Testing Report:**
   - Visual audit checklist (all screens).
   - Keyboard navigation checklist (all screens).
   - Responsive testing matrix (5 breakpoints × 6 screens).
   - Performance profiling (animation FPS, load time, accessibility scores).

4. **Architecture Decision Records (ADRs):**
   - `docs/decisions/ADR-SearchBar-Integration.md` (Integrated vs. modal-only decision)
   - `docs/decisions/ADR-Component-CSS-Organization.md` (Centralized vs. distributed CSS)
   - `docs/decisions/ADR-Animation-Strategy.md` (Performance vs. polish trade-off)

5. **Updated Documentation:**
   - `docs/design/COMPONENT_SPECS.md` (Button, Card, Badge, Dialog, etc.)
   - `docs/design/MOTION_GUIDE.md` (Animation timing, easing, usage examples)
   - `docs/testing/PHASE_3_QA_CHECKLIST.md` (Testing matrix and results)

---

## 11. Next Steps

### Immediate (Before Phase 3 Starts)

1. **Architect reviews this document** and confirms:
   - Component dependency map is complete.
   - File organization approach is acceptable.
   - Architectural decisions (SearchBar, breakpoints, animation strategy) are approved.

2. **Tech Lead decides:**
   - SearchBar integrated or modal-only? (Recommend: modal-only for Phase 3)
   - Any additional architectural constraints or dependencies?

3. **Senior Engineer prepares:**
   - Workspace ready; Git branch created for Phase 3.
   - Base component CSS files created (`styles/components/button.css`, etc.).
   - Home screen identified as first target (after Phase 2 approval).

### During Phase 3

1. **Senior Engineer executes** each screen redesign in order (Home → Movies/Series → Detail → Search → Settings → Playback/Dialogs).
2. **Code Reviewer** verifies CSS consistency and no regressions.
3. **QA Engineer** performs visual audit, keyboard testing, responsive testing, performance profiling after each screen.
4. **Tech Lead** coordinates and gates phase completion.

### After Phase 3

1. **Comprehensive QA:** Visual consistency audit across all screens, keyboard navigation stress test, performance profiling on typical hardware.
2. **Documentation update:** ADRs finalized, testing results consolidated.
3. **User acceptance testing:** Product approval before moving to Phase 4 (polish and release).

---

## 12. Risks & Open Questions

### 12.1 Open Questions

1. **SearchBar integration:** Integrated into TopNav or modal-only? (Needs decision.)
2. **Cinemeta trending availability:** How to handle empty Trending section? (Needs product decision.)
3. **Detail modal scroll behavior on mobile:** Should modal scroll internally or allow background scroll? (Needs UX review.)
4. **Playback fullscreen window chrome visibility:** Should window minimize/maximize/close be visible in fullscreen? (Needs testing on Windows.)

### 12.2 Assumptions

- Phase 2 (Design System Foundation) is completed and approved before Phase 3 starts.
- Existing functionality (playback, filtering, search query handling) remains unchanged.
- No backend changes required; CSS only.
- Mid-range GPU (Intel i5 integrated) is performance baseline.
- 60fps animations on typical hardware are acceptable; <2s FCP is target.

---

## 13. Appendix: Component Import Template

For Senior Engineer to use when updating component files:

```tsx
// Example: Home.tsx (Phase 3)
import React from 'react';
import HeroCarousel from '../components/media/HeroCarousel';
import PosterRow from '../components/media/PosterRow';
import ContinueCard from '../components/media/ContinueCard';

// Import shared component styles
import '../styles/components/button.css';     // Reusable button styles
import '../styles/components/card.css';       // Reusable card styles
import '../styles/components/badge.css';      // Reusable badge styles
import '../styles/components/divider.css';    // Reusable divider
import '../styles/components/motion.css';     // Motion tokens and animations

// Import screen-specific styles
import './Home.css';

export default function Home(props: HomeProps) {
  return (
    <div className="home">
      {/* Uses .btn--primary, .btn--secondary from button.css */}
      {/* Uses .card, .card--hover from card.css */}
      {/* Uses .badge from badge.css */}
      {/* Uses .text-heading, .text-subtitle from text.css (if created) */}
      {/* Uses .transition-normal from motion.css for animations */}
    </div>
  );
}
```

---

**End of Document**

---

**Appendix: Key Contact Points for Implementation**

| Role | Decision | Approval Gate |
|------|----------|---------------|
| **Architect** | Component dependencies, file organization, CSS strategy | Approve this document |
| **Tech Lead** | SearchBar integration decision, phase sequencing | Before Phase 3 starts |
| **Senior Engineer** | Implementation feasibility, CSS performance | Pre-flight check |
| **Code Reviewer** | CSS consistency, no regressions | After each screen |
| **QA Engineer** | Testing matrix, performance targets | After each screen |
| **Product** | Cinemeta/trending empty state behavior | Before Home redesign |

---

**Document Status:** Ready for Architect & Tech Lead Review
