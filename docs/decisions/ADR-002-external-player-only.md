# ADR-002: External Player Only (VLC/PotPlayer)

## Status

Accepted

## Date

2026-11-22

## Context

The application needs to play video files from ISP servers. Files include:
- Containers: MKV, MP4, AVI
- Video codecs: H.264, HEVC/H.265
- Audio codecs: AAC, AC3, DTS
- Subtitles: SRT, ASS/SSA embedded in MKV

Chromium (Electron's renderer) has limited codec support:
- ✅ H.264 + AAC
- ❌ HEVC (requires paid Windows extension)
- ❌ DTS, AC3 (licensing)
- ❌ ASS subtitles

## Decision

**No internal video playback.** All media opens in external players:
1. **Primary**: VLC (if installed)
2. **Fallback**: PotPlayer (if VLC not found)
3. **Neither**: Prompt user to install VLC or PotPlayer

## Rationale

### Simplicity

- No codec probing logic
- No video.js or player UI complexity
- No subtitle extraction/conversion
- Smaller bundle (no media dependencies)

### Full Compatibility

VLC and PotPlayer support:
- All containers (MKV, MP4, AVI, etc.)
- All video codecs (H.264, HEVC, VP9, AV1)
- All audio codecs (AAC, AC3, DTS, FLAC)
- All subtitle formats (SRT, ASS, PGS)
- Hardware acceleration

### User Expectation

Target users in Bangladesh likely already have VLC or PotPlayer installed for local media playback.

## Implementation

### Player Detection

```typescript
const VLC_PATHS = [
  'C:\\Program Files\\VideoLAN\\VLC\\vlc.exe',
  'C:\\Program Files (x86)\\VideoLAN\\VLC\\vlc.exe'
];

const POTPLAYER_PATHS = [
  'C:\\Program Files\\DAUM\\PotPlayer\\PotPlayerMini64.exe',
  'C:\\Program Files (x86)\\DAUM\\PotPlayer\\PotPlayerMini.exe'
];
```

### Launch with Position

```typescript
// VLC
spawn(vlcPath, [url, `--start-time=${seconds}`]);

// PotPlayer
spawn(potPath, [url, `/seek=${seconds * 1000}`]);
```

### Download Links

- VLC: https://www.videolan.org/vlc/
- PotPlayer: https://potplayer.daum.net/

## Consequences

### Positive

- All codecs supported without effort
- Simpler, smaller application
- Users control their preferred player settings
- No licensing concerns

### Negative

- Progress tracking requires manual "Mark as Watched"
- No in-app seek bar or controls
- User must return to app to continue browsing
- Dependency on third-party software

### Trade-off: Progress Sync

Without internal player, we cannot auto-track progress. Solutions:
1. **Manual**: User clicks "Mark as Watched" (chosen for MVP)
2. **VLC HTTP interface**: Poll VLC's status (complex, optional future)
3. **Estimate**: Mark watched if user was gone >80% of duration (unreliable)

## Alternatives Rejected

| Option | Reason |
|--------|--------|
| Internal Chromium only | Missing HEVC, DTS, AC3, ASS |
| Embed mpv.js | +30MB, native build complexity |
| Hybrid (try internal, fall back) | Complexity for marginal benefit |
| FFmpeg transcoding | CPU intensive, defeats streaming purpose |
