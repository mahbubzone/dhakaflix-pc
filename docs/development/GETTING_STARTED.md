# Getting Started

## Prerequisites

- **Node.js** 20.x or later
- **npm** 10.x or later
- **Git**
- **Windows 10 1903+** or **Windows 11**

Optional for testing:
- VLC Media Player
- PotPlayer

## Setup

### 1. Clone Repository

```bash
git clone https://github.com/your-org/dhakaflix-pc.git
cd dhakaflix-pc
```

### 2. Install Dependencies

```bash
npm install
```

This also triggers `electron-rebuild` to compile native modules (better-sqlite3).

### 3. Run Development Server

```bash
npm run dev
```

This starts:
- Vite dev server with HMR for renderer
- Electron main process with auto-reload

### 4. Build for Production

```bash
npm run build
```

Output: `dist/` folder with packaged application.

### 5. Create Installer

```bash
npm run dist
```

Output: `release/DhakaFlix-Setup-x.x.x.exe`

## Project Structure

```
dhakaflix-pc/
├── src/
│   ├── main/           # Electron main process
│   ├── preload/        # Context bridge
│   └── renderer/       # React application
├── docs/               # Documentation
├── migrations/         # SQL migrations
├── test/               # Test files
└── build/              # Installer resources
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development mode |
| `npm run build` | Build production bundle |
| `npm run dist` | Create Windows installer |
| `npm test` | Run unit tests |
| `npm run test:e2e` | Run E2E tests |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | Run TypeScript check |

## Environment Variables

Create `.env` for local development (optional):

```env
# Enable verbose logging
DEBUG=dhakaflix:*

# Skip update check in dev
SKIP_UPDATE_CHECK=true
```

## Database Location

Development database stored at:
```
%APPDATA%/DhakaFlix/library.db
```

To reset database, delete this file and restart app.

## Debugging

### Main Process

VS Code launch configuration included. Press F5 to debug main process.

### Renderer Process

Open DevTools: `Ctrl+Shift+I` or View → Toggle Developer Tools

### Logs

Logs written to:
```
%APPDATA%/DhakaFlix/logs/app.log
```

## Common Issues

### native module build fails

```bash
npm rebuild better-sqlite3
```

Or delete `node_modules` and reinstall.

### Permission denied on Windows

Run terminal as Administrator for first install.

### VLC not detected

Ensure VLC is installed in default location:
- `C:\Program Files\VideoLAN\VLC\`
- `C:\Program Files (x86)\VideoLAN\VLC\`

## Next Steps

1. Read [Architecture Overview](../architecture/ARCHITECTURE_OVERVIEW.md)
2. Review [IPC API](../architecture/IPC_API.md)
3. Check [Coding Standards](CODING_STANDARDS.md)
