# DhakaFlix PC — Architecture Overview

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              DhakaFlix PC                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                       MAIN PROCESS (Node.js)                         │   │
│  │                                                                       │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐ │   │
│  │  │  Crawler    │  │  Database   │  │  Metadata   │  │  Updater    │ │   │
│  │  │  Service    │  │  Service    │  │  Service    │  │  Service    │ │   │
│  │  │             │  │             │  │             │  │             │ │   │
│  │  │ • h5ai      │  │ • SQLite    │  │ • Cinemeta  │  │ • electron- │ │   │
│  │  │ • nginx     │  │ • better-   │  │ • Cache     │  │   updater   │ │   │
│  │  │ • Apache    │  │   sqlite3   │  │             │  │ • GitHub    │ │   │
│  │  │ • Semaphore │  │ • WAL+FTS5  │  │             │  │             │ │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘ │   │
│  │                                                                       │   │
│  │  ┌─────────────┐  ┌─────────────┐                                    │   │
│  │  │  Player     │  │  Config     │                                    │   │
│  │  │  Service    │  │  Service    │                                    │   │
│  │  │             │  │             │                                    │   │
│  │  │ • VLC       │  │ • Settings  │                                    │   │
│  │  │ • PotPlayer │  │ • Sources   │                                    │   │
│  │  │ • Detection │  │             │                                    │   │
│  │  └─────────────┘  └─────────────┘                                    │   │
│  │                                                                       │   │
│  │  ┌───────────────────────────────────────────────────────────────┐  │   │
│  │  │                    IPC Handler Layer                           │  │   │
│  │  │              ipcMain.handle() — typed channels                 │  │   │
│  │  └───────────────────────────────────────────────────────────────┘  │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ══════════════════════ CONTEXT ISOLATION BOUNDARY ═════════════════════   │
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                        PRELOAD SCRIPT                                 │   │
│  │         contextBridge.exposeInMainWorld('api', { ... })               │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                   RENDERER PROCESS (Chromium)                         │   │
│  │                                                                       │   │
│  │  ┌─────────────────────────────────────────────────────────────────┐ │   │
│  │  │                      React Application                           │ │   │
│  │  │                                                                   │ │   │
│  │  │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐            │ │   │
│  │  │  │  Home   │  │ Browse  │  │ Detail  │  │Settings │            │ │   │
│  │  │  │  View   │  │  View   │  │  View   │  │  View   │            │ │   │
│  │  │  └─────────┘  └─────────┘  └─────────┘  └─────────┘            │ │   │
│  │  │                                                                   │ │   │
│  │  │  ┌─────────────────────────────────────────────────────────┐    │ │   │
│  │  │  │                   Zustand Store                          │    │ │   │
│  │  │  │              (movies, progress, settings)                │    │ │   │
│  │  │  └─────────────────────────────────────────────────────────┘    │ │   │
│  │  └─────────────────────────────────────────────────────────────────┘ │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
         │                    │                    │
         ▼                    ▼                    ▼
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│   ISP Servers    │  │   Cinemeta API   │  │  External Player │
│   172.16.x.x     │  │   (HTTPS)        │  │  VLC / PotPlayer │
│   HTTP           │  │                  │  │                  │
└──────────────────┘  └──────────────────┘  └──────────────────┘
```

## Process Responsibilities

| Process | Responsibilities |
|---------|------------------|
| **Main** | Database, crawler, config, player launch, updates, IPC handling |
| **Preload** | Expose typed API via contextBridge only |
| **Renderer** | React UI, user interaction, state management via Zustand |

## Data Flow

### Crawl Flow
```
User adds server → Main validates URL → Crawler fetches listings
→ Parser extracts entries → Database stores movies → Renderer notified
```

### Browse Flow
```
User opens category → Renderer requests via IPC → Main queries SQLite
→ Returns paginated results → Renderer displays grid
```

### Playback Flow
```
User clicks Play → Renderer sends play request → Main detects VLC/PotPlayer
→ Spawns player with URL + position → User watches externally
→ User returns, marks watched → Main updates progress table
```

### Metadata Flow
```
Poster visible → Renderer requests metadata → Main checks cache
→ Cache miss: fetch Cinemeta → Store in database → Return to renderer
```

## Key Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| No internal player | VLC/PotPlayer external | Full codec support, simpler codebase |
| SQLite sync API | better-sqlite3 | Simpler than async, WAL handles concurrency |
| State management | Zustand | Lightweight, sufficient for desktop app |
| IPC pattern | invoke/handle | Request-response, typed, error handling |
| Parser strategy | Regex-based | Fast, no DOM parsing overhead |

## Security Boundaries

1. **Main ↔ Renderer**: Context isolation enforced, only typed API exposed
2. **Network**: HTTP to ISP (required), HTTPS to Cinemeta
3. **File system**: Only %APPDATA%/DhakaFlix accessible
4. **External process**: Only VLC/PotPlayer at known paths
