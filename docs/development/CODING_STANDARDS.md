# Coding Standards

## TypeScript

### General

- Strict mode enabled (`"strict": true`)
- No `any` — use `unknown` with type guards
- Explicit return types on exported functions
- Prefer `interface` over `type` for object shapes

### Naming

| Item | Convention | Example |
|------|------------|---------|
| Files (components) | PascalCase | `MovieCard.tsx` |
| Files (utilities) | camelCase | `parseTitle.ts` |
| Classes/Interfaces | PascalCase | `CrawlerService` |
| Functions/Variables | camelCase | `getMovies` |
| Constants | UPPER_SNAKE | `MAX_CONCURRENT` |
| Types | PascalCase | `Movie`, `ScanStatus` |
| IPC channels | namespace:action | `db:getMovies` |

### Imports

Order:
1. Node built-ins
2. External packages
3. Internal modules (absolute)
4. Relative imports

```typescript
import path from 'path';
import { app } from 'electron';
import Database from 'better-sqlite3';

import { Movie } from '@shared/types';
import { logger } from '@main/utils/logger';

import { parseTitle } from './parsers';
```

## React

### Components

- Functional components only
- Props interface named `{Component}Props`
- Destructure props in signature

```typescript
interface MovieCardProps {
  movie: Movie;
  onSelect: (id: number) => void;
}

export function MovieCard({ movie, onSelect }: MovieCardProps) {
  // ...
}
```

### Hooks

- Custom hooks start with `use`
- Return cleanup functions from effects
- Specify all dependencies

```typescript
export function useMovies(category: string) {
  const [movies, setMovies] = useState<Movie[]>([]);
  
  useEffect(() => {
    let cancelled = false;
    
    window.api.db.getMovies({ category, limit: 50, offset: 0 })
      .then(result => {
        if (!cancelled) setMovies(result.movies);
      });
    
    return () => { cancelled = true; };
  }, [category]);
  
  return movies;
}
```

### Event Handlers

- Prefix with `handle`
- Use `useCallback` for passed handlers

```typescript
const handleClick = useCallback(() => {
  onSelect(movie.id);
}, [movie.id, onSelect]);
```

## IPC

### Channel Naming

```
namespace:action
```

Examples:
- `db:getMovies`
- `crawler:start`
- `player:launch`

### Handler Pattern

```typescript
// main/ipc.ts
ipcMain.handle('db:getMovies', async (_, options: GetMoviesOptions) => {
  // Validate input
  if (typeof options.limit !== 'number' || options.limit < 1) {
    throw new AppError('Invalid limit', 'INVALID_INPUT');
  }
  
  return databaseService.getMovies(options);
});
```

### Preload Pattern

```typescript
// preload/index.ts
contextBridge.exposeInMainWorld('api', {
  db: {
    getMovies: (opts: GetMoviesOptions) => 
      ipcRenderer.invoke('db:getMovies', opts),
  },
});
```

## SQL

### Queries

- Use prepared statements
- Never concatenate user input
- Explicit column lists (no `SELECT *`)

```typescript
// Good
const stmt = db.prepare(`
  SELECT id, title, year, category
  FROM movies
  WHERE category = ?
  ORDER BY added DESC
  LIMIT ? OFFSET ?
`);
const movies = stmt.all(category, limit, offset);

// Bad
db.exec(`SELECT * FROM movies WHERE title = '${title}'`);
```

### Migrations

- Numbered sequentially: `001_`, `002_`
- Descriptive names: `001_initial.sql`, `002_add_runtime.sql`
- Include both up and rollback comments

```sql
-- Migration: 002_add_runtime
-- Up
ALTER TABLE movies ADD COLUMN runtime INTEGER;

-- Down (manual)
-- ALTER TABLE movies DROP COLUMN runtime;
```

## Error Handling

### AppError Class

```typescript
class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public recoverable = true
  ) {
    super(message);
    this.name = 'AppError';
  }
}
```

### Main Process

```typescript
try {
  await riskyOperation();
} catch (error) {
  logger.error('Operation failed', { error });
  throw new AppError(
    'Could not complete operation',
    'OPERATION_FAILED',
    true
  );
}
```

### Renderer

```typescript
try {
  await window.api.db.getMovies(options);
} catch (error) {
  if (error.code === 'NETWORK_ERROR') {
    showToast('Network error. Please check connection.');
  } else {
    showToast('An error occurred.');
  }
}
```

## Testing

### File Naming

- Unit tests: `*.test.ts`
- E2E tests: `*.spec.ts`

### Test Structure

```typescript
describe('CrawlerService', () => {
  describe('parseH5ai', () => {
    it('should extract movie entries', () => {
      const html = loadFixture('h5ai-sample.html');
      const entries = parseH5ai(html);
      
      expect(entries).toHaveLength(5);
      expect(entries[0].name).toBe('Movie Title (2024)');
    });
    
    it('should handle empty listing', () => {
      const entries = parseH5ai('<html></html>');
      expect(entries).toHaveLength(0);
    });
  });
});
```

## Git

### Commit Messages

Format: `type(scope): description`

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `refactor`: Code change without feature/fix
- `test`: Adding tests
- `chore`: Maintenance

Examples:
```
feat(crawler): add nginx parser
fix(player): handle missing VLC path
docs(readme): update installation steps
```

### Branches

- `main`: Production-ready
- `develop`: Integration branch
- `feature/xxx`: Feature branches
- `fix/xxx`: Bug fix branches
