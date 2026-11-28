# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Phase 1 design proposal defining the premium dark visual system, icon family, navigation, glass rules, interaction states, Home layout, and accessibility requirements.
- Colour-only design tokens for the layered charcoal palette, typography scale, spacing, radii, motion, elevation and icon sizes.
- Shared button, input, card, badge, dialog, toast and skeleton base classes, plus one inline Lucide-style icon set with no new dependency.
- Unit tests for shared Home rail deduplication.

### Changed

- Applied the new palette and shared classes across navigation, Home, catalogue grids, detail, search, settings, dialogs and notifications.
- Reordered Home rails to Hero → Continue Watching → Trending → Recently Added → Editorial, merging real trending data into one rail and removing repeated titles.
- Used a neutral active navigation indicator and neutral badges; reserved red for primary actions, important selection, progress and status.

### Fixed

- Removed emoji and text glyph icons from the renderer in favour of one outline icon family.
- Prevented invalid border shorthand tokens: colour tokens hold colours only, with width and style composed at use sites.
- Corrected search input padding after shared-class wiring and restored component-specific card and icon-button geometry.

## [0.4.6] - 2026-11-28

### Changed

- Restored the application to the `v0.4.5` codebase after the 0.5.x redesign.
- Bumped the version to `0.4.6` so GitHub Releases serves this build as the latest OTA feed.
