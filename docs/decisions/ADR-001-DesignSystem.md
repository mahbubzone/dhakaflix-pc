# ADR-001: Design System Architecture — Premium Visual Redesign Foundation

**Date:** 28 November 2026  
**Status:** Accepted  
**Decision Maker:** Tech Lead (DhakaFlix UI/UX Redesign)

---

## Context

DhakaFlix is transitioning from a functional Netflix-inspired media catalogue to a **premium entertainment destination**. This requires a cohesive, maintainable design system that:

1. Enforces visual consistency across all screens.
2. Prevents design drift and color/spacing hardcoding.
3. Supports future iterations without CSS duplication.
4. Maintains performance and accessibility standards.
5. Enables independent screen redesigns without regressions.

**Problem:** Current design tokens are scattered and minimal. Component styling is inconsistent across screens. No centralized component base classes or reusable patterns.

---

## Decision

Implement a **three-tier CSS architecture:**

### Tier 1: Global Design Tokens (`globals.css`)
Central repository of design decisions. All colors, spacing, motion, elevation, and shapes defined as CSS custom properties.

**Tokens included:**
- **Surfaces:** 8-step charcoal layering (#0a0e12 → #21293a).
- **Text:** Primary, secondary, tertiary, muted hierarchy.
- **Accent & Semantic:** DhakaFlix red, success, warning, error, info.
- **Motion:** 3 motion tokens (fast 120ms, normal 200ms, slow 300ms, all ease-out).
- **Elevation:** Shadow and blur tokens for depth and glassmorphism.
- **Spacing:** 8-step grid (4–64px multiples of 4px).
- **Shape:** Border radius from xs (4px) to lg (16px).

### Tier 2: Component Base Classes (`src/renderer/styles/components/`)
Reusable component styles that can be applied directly to HTML or extended by component-specific CSS.

**Components:**
- `button.css` — Primary (accent), secondary (surface), icon (40×40px).
- `card.css` — Poster (2:3 aspect), Continue (16:9 aspect).
- `badge.css` — IMDb, New, semantic variants.
- `dialog.css` — Modal overlay, backdrop blur, fade-in animation.
- `input.css` — Text field, focus states, hover.
- `notification.css` — Toast/alert styling.
- `divider.css` — Section separator.
- `index.css` — Import aggregator.

### Tier 3: Screen-Specific Styling (component CSS modules)
View-level CSS files in `src/renderer/views/` and component-specific CSS in `src/renderer/components/` apply component base classes and override for screen-specific needs.

**Examples:**
- `Home.css` — Uses `.card-poster`, `.card-continue`, hero sizing.
- `Category.css` — Uses `.card-poster`, grid layout.
- `Detail.css` — Uses `.modal`, `.btn-primary`, `.btn-secondary`.

---

## Rationale

### Why Three Tiers?

1. **Separation of Concerns:** Tokens define *what* (colors, spacing); components define *how* (button appearance); screens apply (button on a specific page).
2. **DRY Principle:** No button styling duplicated across Home, Movies, Detail, Search, Settings, etc.
3. **Maintainability:** Change accent color once in tokens; every component updates automatically.
4. **Scalability:** New screens or components can reuse existing base classes without reimplementing styles.
5. **Consistency:** Shared components guarantee uniform look and feel.

### Why CSS Custom Properties?

- No build step required (native CSS support).
- Dynamic token swapping (future light mode, theme variants).
- Simple debugging (inspect element shows token name).
- No dependency on CSS preprocessor.

### Why Component Base Classes?

- Avoids duplicating `.btn-primary` styling across 10 screens.
- Makes design system discoverable (`.card-poster` class name is self-documenting).
- Enables progressive enhancement (add base class, then override specific properties if needed).

### Why Not BEM / Utility-First?

- **BEM alone:** Would require manual naming consistency across screens; no central token reference.
- **Utility-first (Tailwind):** Would introduce new dependency; existing project uses CSS modules; would require refactoring all components.
- **Chosen hybrid:** Tokens + component base classes + BEM naming where needed = minimum friction, maximum consistency.

---

## Alternatives Considered

### Alternative 1: Keep Current Approach (No Design System)
- **Pros:** No refactoring; immediate ship.
- **Cons:** Inconsistency persists; duplication grows; future changes painful.
- **Rejected:** Does not meet redesign objective.

### Alternative 2: Utility-First CSS (Tailwind)
- **Pros:** Powerful; popular; built-in tokens and responsive utilities.
- **Cons:** New dependency; requires refactoring all components; learning curve; Vite integration complexity.
- **Rejected:** Too much scope; existing CSS modules approach is working.

### Alternative 3: CSS-in-JS (Styled Components / Emotion)
- **Pros:** Fully typed; dynamic; scoped.
- **Cons:** New dependency; runtime overhead; Electron security concerns (dynamic CSS generation).
- **Rejected:** Introduces unnecessary complexity; CSS modules adequate.

### Alternative 4: Tokens Only (No Component Base Classes)
- **Pros:** Minimal changes; components define their own styling.
- **Cons:** Still duplicates `.btn-primary` across screens; inconsistency risk; no shared reference.
- **Rejected:** Does not fully solve consistency problem.

---

## Consequences

### Positive

✅ **Consistency enforced:** One button, card, dialog style everywhere.  
✅ **Maintainability:** Change tokens; all components update automatically.  
✅ **Scalability:** New screens reuse existing components.  
✅ **Performance:** CSS is small; no runtime overhead.  
✅ **Accessibility:** Motion tokens respect `prefers-reduced-motion`; fallback strategies for glass blur.  
✅ **Future-proof:** Tokens support light mode, theme variants without code changes.

### Negative

⚠️ **Requires discipline:** Developers must use tokens, not hardcode colors.  
⚠️ **Slight CSS size increase:** Component base classes add ~2–3 KB (gzip ~500 B).  
⚠️ **Learning curve:** New component base classes; must document naming conventions.

### Mitigations

- **Document naming conventions** in `docs/design/COMPONENT_SPECS.md`.
- **ESLint rule (future):** Warn on hardcoded colors (e.g., `#ff3047` outside of globals.css).
- **Team guidelines:** Code review checklist ensures tokens are used.

---

## Implementation Timeline

| Phase | Work | Timeline |
|-------|------|----------|
| **Phase 2** | Design system foundation (tokens, component base classes) | Complete |
| **Phase 3** | Screen redesigns (apply components to Home, Movies, Detail, Search, Settings, Playback) | In progress |
| **Phase 4** | QA, polish, documentation | Next |

---

## Validation & Measurement

### Success Criteria

✅ All screens use design tokens (no hardcoded colors).  
✅ Shared component styles applied across all pages.  
✅ No visual regressions from Phase 1 baseline.  
✅ Build succeeds; no console errors.  
✅ Keyboard navigation unchanged; focus visible.  
✅ Responsive layout works at all breakpoints (600px, 960px, 1024px, 1360px, 1700px).  
✅ Performance: Animation smooth (60fps); artwork load <500ms.

### Measurements (Phase 4 QA)

- Visual consistency audit (all buttons, cards, text match design system).
- CSS size: `globals.css` + components ≤ 15 KB (gzip ≤ 3 KB).
- No unused tokens or components.
- All tokens documented in `COMPONENT_SPECS.md`.

---

## References

- **Phase 1 Design Audit:** `docs/design/PHASE_1_DESIGN_AUDIT_PROPOSAL.md`
- **Phase 3 Architecture:** `docs/design/PHASE_3_SCREEN_REDESIGN_ARCHITECTURE.md`
- **Component Specs (TBD):** `docs/design/COMPONENT_SPECS.md`
- **Design System Tokens:** `src/renderer/styles/globals.css`
- **Component Base Classes:** `src/renderer/styles/components/`

---

## Related Decisions

- ADR-002: Screen Redesign Execution Plan (Phase 3, to follow).
- ADR-003: Glassmorphism Implementation & Fallback Strategy (Phase 3, as needed).

---

**Decision Approved:** ✅ Proceed with Phase 3 (screen redesigns) using this design system architecture.
