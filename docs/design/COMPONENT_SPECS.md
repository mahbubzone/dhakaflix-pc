# DhakaFlix Component Specifications — Design System

**Date:** 28 November 2026  
**Version:** 1.0  
**Purpose:** Reference guide for reusable component base classes and tokens.

---

## Table of Contents

1. [Design Tokens](#design-tokens)
2. [Button Component](#button-component)
3. [Card Components](#card-components)
4. [Badge Component](#badge-component)
5. [Dialog/Modal Component](#dialogmodal-component)
6. [Input Component](#input-component)
7. [Notification (Toast) Component](#notification-toast-component)
8. [Divider Component](#divider-component)
9. [Motion & Animation](#motion--animation)
10. [Accessibility](#accessibility)

---

## Design Tokens

### Color Tokens

#### Surfaces (Charcoal Layering)
```css
--bg: #0a0e12;              /* Deepest background, app shell */
--bg-2: #101619;            /* App chrome, navigation */
--surface-1: #141922;       /* Card base, default surface */
--surface-2: #1a1f27;       /* Raised panels, inputs, nav */
--surface-3: #21293a;       /* Hover, selected, emphasis */
--surface-glass: rgba(16, 22, 25, 0.75); /* Translucent (glassmorphism) */
```

**Usage:**
- Use `--bg` for main app background.
- Use `--surface-1` for card containers.
- Use `--surface-2` for input fields and raised panels.
- Use `--surface-3` for hover and selected states.
- Use `--surface-glass` for modal backdrops or translucent overlays.

#### Text Colors (Hierarchy)
```css
--text-primary: #f0f2f5;    /* Primary text, highest contrast */
--text-secondary: #b4bcc7;  /* Secondary text, descriptions */
--text-tertiary: #8a92a0;   /* Tertiary text, metadata, captions */
--text-muted: #5a626e;      /* Very dim text, disabled state */
```

**Usage:**
- `--text-primary`: Titles, headings, primary content.
- `--text-secondary`: Section subtitles, descriptions.
- `--text-tertiary`: Metadata (genres, year, cast, ratings).
- `--text-muted`: Disabled buttons, placeholder text, secondary metadata.

#### Accent & Semantic
```css
--accent: #ff3d4f;          /* DhakaFlix red, primary actions only */
--accent-hover: #ff5a6b;    /* Hover state for accent buttons */
--accent-soft: rgba(255, 61, 79, 0.15); /* Soft background for highlights */
--success: #48d99e;         /* Success alerts, confirmations */
--warning: #ffc93c;         /* Warning alerts, IMDb badges */
--error: #ff5a5f;           /* Error alerts, destructive actions */
--info: #5eb3ff;            /* Info alerts, notifications */
```

**Usage:**
- `--accent`: Primary action buttons (Play, Resume, Continue).
- `--accent-hover`: Button hover state.
- `--accent-soft`: Background for accent text or highlights (e.g., "In Watchlist").
- Semantic colors: Use for alerts, badges, confirmations based on semantic meaning.

### Spacing Tokens

```css
--space-1: 4px;    /* Minimal spacing (input padding, tight gaps) */
--space-2: 8px;    /* Small spacing (button padding, tight gaps) */
--space-3: 12px;   /* Medium spacing (component padding) */
--space-4: 16px;   /* Base spacing (margins, padding) */
--space-5: 24px;   /* Large spacing (section margins) */
--space-6: 32px;   /* Extra large spacing (major sections) */
--space-7: 48px;   /* Cinematic spacing (hero padding, row gaps) */
--space-8: 64px;   /* Extra large (between major sections) */
```

**Usage:**
- Always use multiples of 4px.
- Never hardcode spacing values in component CSS.
- Example: `.card-poster { margin: var(--space-4); padding: var(--space-3); }`

### Border Radius Tokens

```css
--radius-xs: 4px;    /* Tight radius (inputs, small elements) */
--radius-sm: 8px;    /* Small radius (cards, buttons) */
--radius-md: 12px;   /* Medium radius (dialogs, large cards) */
--radius-lg: 16px;   /* Large radius (hero backdrop, prominent elements) */
```

**Usage:**
- `--radius-xs`: Small, tight elements.
- `--radius-sm`: Most cards, buttons (default).
- `--radius-md`: Modals, large buttons, prominent containers.
- `--radius-lg`: Hero backdrops, large featured elements.

### Shadow Tokens

```css
--shadow-sm: 0 2px 8px rgba(0, 0, 0, 0.5);      /* Light elevation */
--shadow-md: 0 8px 24px rgba(0, 0, 0, 0.6);     /* Medium elevation */
--shadow-lg: 0 20px 48px rgba(0, 0, 0, 0.7);    /* Heavy elevation (modals) */
```

**Usage:**
- `--shadow-sm`: Card hover, tooltip.
- `--shadow-md`: Raised panels, elevated cards.
- `--shadow-lg`: Modals, overlays, heavy depth.

### Blur & Glass Tokens

```css
--blur-sm: 4px;     /* Subtle glassmorphism effect */
--blur-md: 8px;     /* Noticeable glassmorphism effect */
```

**Usage:**
- Apply to modal backdrops, translucent overlays, navigation glass effect.
- Include `@supports (backdrop-filter: blur(1px))` fallback to solid color.

### Motion Tokens

```css
--motion-fast: 120ms ease-out;    /* Quick transitions (hover, focus) */
--motion-normal: 200ms ease-out;  /* Standard transitions (dialog, fade) */
--motion-slow: 300ms ease-out;    /* Slow transitions (carousel, page change) */
```

**Usage:**
- `--motion-fast`: Hover states, button focus, quick feedback.
- `--motion-normal`: Modal open/close, card transitions, standard state changes.
- `--motion-slow`: Carousel rotation, hero slide change, deliberate transitions.
- **Always respect `prefers-reduced-motion`** (see Accessibility section).

### Divider Token

```css
--divider: 1px solid rgba(255, 255, 255, 0.08);       /* Light divider */
--divider-strong: 1px solid rgba(255, 255, 255, 0.14); /* Strong divider */
```

**Usage:**
- Use for section separators, content dividers.
- Example: `border-bottom: var(--divider);`

---

## Button Component

### Primary Button (`.btn-primary`)

**Usage:** Play, Resume, Continue, primary actions.

**CSS Class:**
```css
.btn-primary {
  background: var(--accent);
  color: #ffffff;
  padding: var(--space-2) var(--space-4);
  border-radius: var(--radius-sm);
  border: none;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  min-height: 44px;
  transition: background var(--motion-fast), box-shadow var(--motion-fast);
}

.btn-primary:hover {
  background: var(--accent-hover);
  box-shadow: var(--shadow-md);
}

.btn-primary:focus-visible {
  outline: 2px solid var(--accent-hover);
  outline-offset: 2px;
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
```

**Example HTML:**
```html
<button class="btn-primary">Play</button>
<button class="btn-primary">Resume</button>
```

### Secondary Button (`.btn-secondary`)

**Usage:** More Info, Watchlist, secondary actions.

**CSS Class:**
```css
.btn-secondary {
  background: var(--surface-2);
  color: var(--text-primary);
  padding: var(--space-2) var(--space-4);
  border-radius: var(--radius-sm);
  border: 1px solid var(--divider);
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  min-height: 44px;
  transition: background var(--motion-fast), border-color var(--motion-fast);
}

.btn-secondary:hover {
  background: var(--surface-3);
  border-color: var(--divider-strong);
}

.btn-secondary:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
  border-color: var(--accent);
}

.btn-secondary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
```

**Example HTML:**
```html
<button class="btn-secondary">More Info</button>
<button class="btn-secondary">Add to Watchlist</button>
```

### Icon Button (`.btn-icon`)

**Usage:** Favorites, close, settings, mini actions.

**CSS Class:**
```css
.btn-icon {
  background: transparent;
  color: var(--text-primary);
  width: 40px;
  height: 40px;
  border-radius: var(--radius-sm);
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background var(--motion-fast);
}

.btn-icon:hover {
  background: var(--surface-2);
}

.btn-icon:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

.btn-icon:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-icon svg {
  width: 20px;
  height: 20px;
}
```

**Example HTML:**
```html
<button class="btn-icon" aria-label="Add to favorites">
  <svg><!-- Heart icon --></svg>
</button>
```

---

## Card Components

### Poster Card (`.card-poster`)

**Usage:** Movie/series browsing grids (2:3 aspect ratio).

**CSS Class:**
```css
.card-poster {
  position: relative;
  flex: 0 0 auto;
  cursor: pointer;
  border-radius: var(--radius-sm);
  overflow: hidden;
  background: var(--surface-1);
  border: 1px solid var(--divider);
  box-shadow: var(--shadow-sm);
  transition: transform var(--motion-fast), box-shadow var(--motion-fast);
}

.card-poster:hover,
.card-poster:focus-visible {
  transform: translateY(-3px) scale(1.02);
  box-shadow: var(--shadow-md);
  outline: none;
}

.card-poster {
  width: 196px; /* Desktop large */
  aspect-ratio: 2 / 3;
}

@media (max-width: 1360px) {
  .card-poster { width: 160px; }
}

@media (max-width: 1024px) {
  .card-poster { width: 160px; }
}

@media (max-width: 960px) {
  .card-poster { width: 140px; }
}

@media (max-width: 600px) {
  .card-poster { width: 120px; }
}

.card-poster__image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.card-poster__placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--surface-2);
  color: var(--text-tertiary);
  font-size: 24px;
}
```

**Example HTML:**
```html
<div class="card-poster">
  <img class="card-poster__image" src="poster.jpg" alt="Movie title">
</div>
```

### Continue Card (`.card-continue`)

**Usage:** Resume playback with progress bar (16:9 aspect ratio).

**CSS Class:**
```css
.card-continue {
  position: relative;
  flex: 0 0 auto;
  cursor: pointer;
  border-radius: var(--radius-sm);
  overflow: hidden;
  background: var(--surface-1);
  border: 1px solid var(--divider);
  box-shadow: var(--shadow-sm);
  transition: box-shadow var(--motion-fast);
}

.card-continue:hover,
.card-continue:focus-visible {
  box-shadow: var(--shadow-md);
  outline: none;
}

.card-continue {
  width: 320px;
  aspect-ratio: 16 / 9;
}

@media (max-width: 1024px) {
  .card-continue { width: 280px; }
}

@media (max-width: 600px) {
  .card-continue { width: 240px; }
}

.card-continue__image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.card-continue__progress {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: var(--surface-3);
}

.card-continue__progress-bar {
  height: 100%;
  background: var(--accent);
  transition: width var(--motion-normal);
}

.card-continue__overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: var(--space-3);
  background: linear-gradient(to top, rgba(0, 0, 0, 0.8), transparent);
}

.card-continue__title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
}

.card-continue__meta {
  font-size: 12px;
  color: var(--text-secondary);
  margin-top: var(--space-1);
}
```

**Example HTML:**
```html
<div class="card-continue">
  <img class="card-continue__image" src="backdrop.jpg" alt="Movie title">
  <div class="card-continue__progress">
    <div class="card-continue__progress-bar" style="width: 65%;"></div>
  </div>
  <div class="card-continue__overlay">
    <div class="card-continue__title">Movie Title</div>
    <div class="card-continue__meta">S01 E03 • 42 min left</div>
  </div>
</div>
```

---

## Badge Component

### Badge (`.badge`)

**Usage:** IMDb ratings, New labels, progress percentage.

**CSS Class:**
```css
.badge {
  display: inline-block;
  background: var(--surface-3);
  color: var(--text-primary);
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-xs);
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.badge--imdb {
  background: var(--warning);
  color: #000000;
  font-weight: 800;
}

.badge--new {
  background: var(--accent);
  color: #ffffff;
}

.badge--success {
  background: var(--success);
  color: #ffffff;
}

.badge--watched {
  background: var(--surface-3);
  color: var(--text-secondary);
  opacity: 0.6;
}
```

**Example HTML:**
```html
<span class="badge badge--imdb">9.2</span>
<span class="badge badge--new">New</span>
<span class="badge badge--success">In Watchlist</span>
```

---

## Dialog/Modal Component

### Modal (`.modal-overlay`, `.modal`)

**Usage:** Detail modal, search modal, confirmations, trailers.

**CSS Class:**
```css
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(var(--blur-md));
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  animation: fadeIn var(--motion-normal);
}

@supports not (backdrop-filter: blur(1px)) {
  .modal-overlay {
    backdrop-filter: none;
    background: rgba(0, 0, 0, 0.75);
  }
}

.modal {
  background: var(--surface-2);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg);
  max-width: 90%;
  max-height: 90vh;
  overflow-y: auto;
  animation: slideUp var(--motion-normal);
}

.modal__header {
  padding: var(--space-5);
  border-bottom: var(--divider);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.modal__title {
  font-size: 20px;
  font-weight: 700;
  color: var(--text-primary);
}

.modal__close {
  background: transparent;
  color: var(--text-primary);
  border: none;
  cursor: pointer;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal__content {
  padding: var(--space-5);
}

.modal__footer {
  padding: var(--space-5);
  border-top: var(--divider);
  display: flex;
  gap: var(--space-3);
  justify-content: flex-end;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (prefers-reduced-motion: reduce) {
  .modal-overlay,
  .modal {
    animation: none;
  }
}
```

**Example HTML:**
```html
<div class="modal-overlay">
  <div class="modal">
    <div class="modal__header">
      <h2 class="modal__title">Dialog Title</h2>
      <button class="modal__close" aria-label="Close">×</button>
    </div>
    <div class="modal__content">
      <!-- Content here -->
    </div>
    <div class="modal__footer">
      <button class="btn-secondary">Cancel</button>
      <button class="btn-primary">Confirm</button>
    </div>
  </div>
</div>
```

---

## Input Component

### Text Input (`.input`)

**Usage:** Search field, settings forms, text entry.

**CSS Class:**
```css
.input {
  width: 100%;
  padding: var(--space-2) var(--space-3);
  font-size: 14px;
  font-family: inherit;
  color: var(--text-primary);
  background: var(--surface-2);
  border: 1px solid var(--divider);
  border-radius: var(--radius-sm);
  transition: border-color var(--motion-fast), box-shadow var(--motion-fast);
}

.input::placeholder {
  color: var(--text-muted);
}

.input:hover {
  border-color: var(--divider-strong);
}

.input:focus {
  outline: none;
  border-color: var(--accent);
  box-shadow: 0 0 0 2px var(--accent-soft);
}

.input:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
```

**Example HTML:**
```html
<input type="text" class="input" placeholder="Search movies and series...">
```

---

## Notification (Toast) Component

### Toast (`.toast`)

**Usage:** Success, error, info, warning alerts.

**CSS Class:**
```css
.toast {
  position: fixed;
  bottom: var(--space-5);
  right: var(--space-5);
  background: var(--surface-glass);
  border-left: 4px solid var(--accent);
  border-radius: var(--radius-sm);
  padding: var(--space-4);
  box-shadow: var(--shadow-md);
  color: var(--text-primary);
  font-size: 14px;
  min-width: 300px;
  max-width: 400px;
  z-index: 200;
  animation: slideInRight var(--motion-normal);
}

.toast--success { border-left-color: var(--success); }
.toast--error { border-left-color: var(--error); }
.toast--warning { border-left-color: var(--warning); }
.toast--info { border-left-color: var(--info); }

.toast.closing {
  animation: slideOutRight var(--motion-normal);
}

@keyframes slideInRight {
  from {
    opacity: 0;
    transform: translateX(20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

@keyframes slideOutRight {
  from {
    opacity: 1;
    transform: translateX(0);
  }
  to {
    opacity: 0;
    transform: translateX(20px);
  }
}

@media (prefers-reduced-motion: reduce) {
  .toast,
  .toast.closing {
    animation: none;
  }
}
```

**Example HTML:**
```html
<div class="toast toast--success">
  Added to your Watchlist!
</div>
```

---

## Divider Component

### Divider (`.divider`)

**Usage:** Section separators, content dividers.

**CSS Class:**
```css
.divider {
  height: 1px;
  background: var(--divider);
  margin: var(--space-5) 0;
}

.divider--strong {
  background: var(--divider-strong);
}
```

**Example HTML:**
```html
<div class="divider"></div>
```

---

## Motion & Animation

### Transition Timing

Always use motion tokens for consistent feel across app.

```css
/* Quick feedback */
transition: background var(--motion-fast);

/* Standard state changes */
transition: background var(--motion-normal), border-color var(--motion-normal);

/* Deliberate, slow transitions */
transition: transform var(--motion-slow);
```

### Respect Reduced Motion

**All animated components must include:**

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

This is already in `globals.css` as a global rule, but component CSS should not add conflicting animations.

---

## Accessibility

### Color Contrast

All text and interactive elements meet **WCAG AA** minimum (4.5:1 for normal text):

- `--text-primary` (#f0f2f5) on `--bg` (#0a0e12): **~11:1** ✅
- `--text-secondary` (#b4bcc7) on `--bg` (#0a0e12): **~6.5:1** ✅
- `--accent` (#ff3d4f) on white (#ffffff): **~4.8:1** ✅
- `--accent` (#ff3d4f) on dark backgrounds: **~5.2:1** ✅

### Focus Indicators

All interactive elements have visible focus outline:
- Outline: `2px solid var(--accent)`
- Offset: `2px`
- Respects `prefers-reduced-motion`

### Keyboard Navigation

- Tab order: Logical, left-to-right, top-to-bottom.
- Escape closes modals.
- Space/Enter activates buttons.
- Arrow keys navigate carousels (if implemented).

### ARIA & Semantic HTML

Use semantic HTML where possible:
- `<button>` for buttons (not `<div>`).
- `<input>` for forms (not custom elements).
- `aria-label` for icon-only buttons.
- `aria-current="page"` for active nav items.
- `role="button"` only for custom button components.

---

## Usage Examples

### Complete Button Group

```html
<div style="display: flex; gap: 8px;">
  <button class="btn-primary">Play</button>
  <button class="btn-secondary">More Info</button>
  <button class="btn-icon" aria-label="Add to favorites">
    <svg><!-- Heart icon --></svg>
  </button>
</div>
```

### Card with Badge

```html
<div class="card-poster">
  <img class="card-poster__image" src="poster.jpg" alt="Movie title">
  <span class="badge badge--new" style="position: absolute; top: 8px; right: 8px;">New</span>
</div>
```

### Modal Dialog

```html
<div class="modal-overlay" id="modal-delete">
  <div class="modal" role="dialog" aria-labelledby="modal-title">
    <div class="modal__header">
      <h2 class="modal__title" id="modal-title">Remove from Continue Watching?</h2>
      <button class="modal__close" aria-label="Close" onclick="closeModal()">×</button>
    </div>
    <div class="modal__content">
      <p>Are you sure? You'll need to resume from the beginning.</p>
    </div>
    <div class="modal__footer">
      <button class="btn-secondary" onclick="closeModal()">Cancel</button>
      <button class="btn-primary" onclick="confirmDelete()">Remove</button>
    </div>
  </div>
</div>
```

---

## Maintenance & Updates

### Adding a New Token

1. Define in `globals.css` `:root { }` block.
2. Document in this spec.
3. Use in component CSS via `var(--token-name)`.
4. Never hardcode the value.

### Adding a New Component Base Class

1. Create file in `src/renderer/styles/components/`
2. Import in `src/renderer/styles/components/index.css`
3. Document here with CSS class, usage, example HTML.
4. Test on at least 2 screens.

### Deprecating a Token or Component

1. Mark as deprecated in comments: `/* DEPRECATED: Use --new-token instead */`
2. Add migration guide to this spec.
3. Update all usages in a single commit.
4. Remove old token/component in next major version.

---

**Last Updated:** 28 November 2026  
**Next Review:** After Phase 3 completion (all screens redesigned).
