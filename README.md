# DhakaFlix PC

A Windows desktop application for browsing and streaming media from ISP-provided servers (BDIX/DhakaFlix).

## Features

- 🎬 Browse movies and TV series from ISP media servers
- 🔍 Full-text search across your library
- ▶️ One-click playback via VLC or PotPlayer
- 📊 Track watch progress and resume playback
- 🔄 Automatic library scanning and updates
- 🎨 Modern, Netflix-style dark interface

## Requirements

- Windows 10 (1903+) or Windows 11
- VLC Media Player or PotPlayer installed
- Connection to ISP network (172.16.x.x range)

## Installation

1. Download the latest release from [Releases](../../releases)
2. Run `DhakaFlix-Setup-x.x.x.exe`
3. Follow the installation wizard

**Note:** Windows SmartScreen may show a warning because the app is not code-signed. Click "More info" → "Run anyway" to proceed.

## Development

### Prerequisites

- Node.js 20+
- npm 10+

### Setup

```bash
# Clone repository
git clone https://github.com/your-org/dhakaflix-pc.git
cd dhakaflix-pc

# Install dependencies
npm install

# Start development mode
npm run dev
```

### Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development mode |
| `npm run build` | Build production bundle |
| `npm run dist` | Create Windows installer |
| `npm run publish:win` | Build and upload the installer to GitHub Releases |
| `npm test` | Run unit tests |
| `npm run lint` | Run ESLint |
| `npm run icon` | Regenerate `build/icon.ico` from code |
| `npm run check-version -- v0.1.0` | Verify a tag matches `package.json` |

### Releasing

Releases are built on GitHub Actions and published straight to GitHub
Releases, which is also the update feed the app reads.

1. Bump `version` in `package.json`.
2. Commit the change and push it to `main`.
3. Tag the commit and push the tag:

   ```bash
   git tag v0.1.0
   git push origin v0.1.0
   ```

`.github/workflows/release.yml` then runs the unit tests, builds the app, and
uploads `DhakaFlix Setup <version>.exe`, `latest.yml`, and the block map to the
release. `scripts/check-version.js` fails the build when the tag and
`package.json` disagree, because electron-updater compares those versions.

The workflow uses the built-in `GITHUB_TOKEN`, so no secret has to be
configured. Manual publishing from a workstation needs a token with `repo`
scope in `GH_TOKEN`:

```bash
$env:GH_TOKEN = "ghp_..."
npm run publish:win
```

### Project Structure

```
dhakaflix-pc/
├── src/
│   ├── main/           # Electron main process
│   ├── preload/        # Context bridge
│   ├── renderer/       # React application
│   └── shared/         # Shared types
├── docs/               # Documentation
├── migrations/         # SQL migrations
└── test/               # Test files
```

## Documentation

- [Architecture Overview](docs/architecture/ARCHITECTURE_OVERVIEW.md)
- [Getting Started](docs/development/GETTING_STARTED.md)
- [IPC API Reference](docs/architecture/IPC_API.md)

## License

MIT
