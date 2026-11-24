# Test Strategy

## Overview

| Level | Tool | Coverage Target | Run Frequency |
|-------|------|-----------------|---------------|
| Unit | Jest | >70% | Every commit |
| Integration | Jest + SQLite | >50% | Every commit |
| E2E | Playwright | Critical paths | Pre-release |
| Manual | Documented | Real ISP, codecs | Pre-release |

## Unit Tests

### What to Test

- Directory listing parsers (h5ai, nginx, Apache)
- Title extraction regex
- URL validation
- Data transformations
- Utility functions

### Location

```
src/__tests__/
├── parsers.test.ts
├── titleParser.test.ts
├── validators.test.ts
└── utils.test.ts
```

### Example

```typescript
describe('parseTitle', () => {
  it('extracts movie title and year', () => {
    const result = parseTitle('The Matrix (1999) 1080p BluRay');
    expect(result).toEqual({
      title: 'The Matrix',
      year: 1999,
      quality: '1080p'
    });
  });
  
  it('handles ranked format', () => {
    const result = parseTitle('001. Inception (2010) 720p');
    expect(result.title).toBe('Inception');
  });
  
  it('returns null for year ranges (collections)', () => {
    const result = parseTitle('MCU Collection (2008-2019)');
    expect(result).toBeNull();
  });
});
```

## Integration Tests

### What to Test

- Database CRUD operations
- Migration execution
- FTS search accuracy
- IPC round-trips

### Setup

```typescript
// test/setup.ts
import Database from 'better-sqlite3';

let db: Database.Database;

beforeEach(() => {
  db = new Database(':memory:');
  runMigrations(db);
});

afterEach(() => {
  db.close();
});
```

### Example

```typescript
describe('DatabaseService', () => {
  it('inserts and retrieves movies', () => {
    const movie = {
      href: 'http://example.com/movie',
      title: 'Test Movie',
      year: 2024,
      category: 'English'
    };
    
    db.insertMovie(movie);
    const result = db.getMovie(1);
    
    expect(result.title).toBe('Test Movie');
  });
  
  it('searches with FTS', () => {
    db.insertMovie({ title: 'The Matrix', ... });
    db.insertMovie({ title: 'Matrix Reloaded', ... });
    db.insertMovie({ title: 'Inception', ... });
    
    const results = db.search('matrix');
    
    expect(results).toHaveLength(2);
  });
});
```

## E2E Tests

### What to Test

- App launch and window display
- Navigation between views
- Search interaction
- Settings persistence
- Scan initiation

### Tool

Playwright with Electron support.

### Example

```typescript
// test/e2e/browse.spec.ts
import { test, expect, _electron } from '@playwright/test';

test('can search for movies', async () => {
  const app = await _electron.launch({ args: ['.'] });
  const window = await app.firstWindow();
  
  // Open search
  await window.keyboard.press('Control+k');
  
  // Type query
  await window.fill('[data-testid="search-input"]', 'matrix');
  
  // Wait for results
  await expect(window.locator('[data-testid="search-results"]'))
    .toContainText('The Matrix');
  
  await app.close();
});
```

## Manual Tests

### When Required

- Real ISP server access
- VLC/PotPlayer launch
- Codec playback verification
- OTA update installation
- Clean PC installation

### Procedures

Documented in [MANUAL_PROCEDURES.md](MANUAL_PROCEDURES.md).

## Performance Benchmarks

| Metric | Target | Measurement |
|--------|--------|-------------|
| Cold startup | <3s | `console.time` in main |
| Search (38K) | <200ms | Jest timer |
| Scan (1000) | <30s | Integration test |
| Memory idle | <300MB | Task Manager |
| Memory browse | <500MB | After scrolling grid |

## CI Pipeline

```yaml
# .github/workflows/test.yml
name: Test

on: [push, pull_request]

jobs:
  test:
    runs-on: windows-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck
      - run: npm test -- --coverage
      - run: npm run test:e2e
```

## Test Fixtures

```
test/fixtures/
├── h5ai-sample.html
├── h5ai-empty.html
├── nginx-sample.html
├── nginx-unicode.html
├── apache-sample.html
├── movies.json          # Sample movie data
└── series.json          # Sample series with episodes
```

## Coverage Requirements

| Module | Minimum |
|--------|---------|
| Parsers | 90% |
| Database | 80% |
| Validators | 90% |
| UI Components | 60% |
| Overall | 70% |

## Regression Checklist

Before each release:

- [ ] App launches without error
- [ ] Can add/remove server source
- [ ] Scan completes without crash
- [ ] Search returns results
- [ ] Movie detail displays
- [ ] Play launches VLC/PotPlayer
- [ ] Settings persist after restart
- [ ] Update check works
- [ ] Installer works on clean Windows
