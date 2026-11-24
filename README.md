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
| `npm test` | Run unit tests |
| `npm run lint` | Run ESLint |

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
