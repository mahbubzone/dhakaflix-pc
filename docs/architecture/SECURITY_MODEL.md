# DhakaFlix PC — Security Model

## Threat Model

### Assets

| Asset | Sensitivity | Notes |
|-------|-------------|-------|
| SQLite database | Low | Movie URLs, progress — no credentials |
| Settings | Low | Server URLs, preferences |
| Update signing key | N/A | Not used (no code signing) |

### Actors

1. **Local user** — Full trust, owns the machine
2. **ISP server** — Semi-trusted, provides content listings
3. **Cinemeta** — Semi-trusted, provides metadata
4. **Network attacker** — Possible MitM on LAN

### Threat Analysis

| Threat | Likelihood | Impact | Mitigation |
|--------|------------|--------|------------|
| XSS → RCE via nodeIntegration | High if misconfigured | Critical | `nodeIntegration: false` enforced |
| Prototype pollution | High if misconfigured | Critical | `contextIsolation: true` enforced |
| Malicious directory listing | Low | Medium | Regex parsing, no innerHTML |
| URL injection to player | Medium | High | Validate protocol + host |
| SQL injection | Medium | Medium | Parameterized queries only |
| MitM on HTTP | Medium | Low | Accepted — no credentials |
| Malicious update | Low | Critical | Accepted — no signing for now |
| Path traversal | Low | Medium | Validate paths to %APPDATA% |

## Security Controls

### Electron Configuration

**Required in BrowserWindow creation:**

```typescript
new BrowserWindow({
  webPreferences: {
    nodeIntegration: false,          // CRITICAL
    contextIsolation: true,          // CRITICAL
    sandbox: true,                   // RECOMMENDED
    webSecurity: true,               // Keep default
    allowRunningInsecureContent: false,
    preload: path.join(__dirname, 'preload.js')
  }
});
```

### Content Security Policy

```
default-src 'self';
script-src 'self';
style-src 'self' 'unsafe-inline';
img-src 'self' data: https://images.metahub.space http://172.16.*;
connect-src 'self' https://v3-cinemeta.strem.io http://172.16.*;
frame-src 'none';
object-src 'none';
```

### IPC Security

1. **Allowlist channels** — Only defined channels exposed via contextBridge
2. **No raw ipcRenderer** — Never expose `ipcRenderer.send` directly
3. **Input validation** — All IPC arguments validated in main process
4. **Type safety** — TypeScript interfaces for all IPC

```typescript
// NEVER do this
contextBridge.exposeInMainWorld('ipc', ipcRenderer);

// ALWAYS do this
contextBridge.exposeInMainWorld('api', {
  db: {
    getMovies: (opts) => ipcRenderer.invoke('db:getMovies', opts),
  }
});
```

### URL Validation

Before launching external player or fetching:

```typescript
function validateMediaUrl(url: string): void {
  const parsed = new URL(url);
  
  // Protocol whitelist
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error(`Blocked protocol: ${parsed.protocol}`);
  }
  
  // Host validation (ISP range or configured source)
  const isISP = /^172\.16\.\d{1,3}\.\d{1,3}$/.test(parsed.hostname);
  const isConfigured = sources.some(s => new URL(s.baseUrl).hostname === parsed.hostname);
  
  if (!isISP && !isConfigured) {
    throw new Error(`Blocked host: ${parsed.hostname}`);
  }
}
```

### SQL Injection Prevention

**Always use parameterized queries:**

```typescript
// NEVER
db.exec(`SELECT * FROM movies WHERE title = '${userInput}'`);

// ALWAYS
db.prepare('SELECT * FROM movies WHERE title = ?').get(userInput);
```

### Path Validation

Ensure all file operations stay within app data:

```typescript
function validatePath(filePath: string): string {
  const appData = app.getPath('userData');
  const resolved = path.resolve(appData, filePath);
  
  if (!resolved.startsWith(appData)) {
    throw new Error('Path traversal attempt blocked');
  }
  
  return resolved;
}
```

### HTML Parsing

**Never use innerHTML with ISP content:**

```typescript
// NEVER
element.innerHTML = ispResponse;

// ALWAYS use regex extraction
const ROW_RE = /<td class="fb-n"><a href="([^"]+)">([^<]*)<\/a>/g;
for (const match of html.matchAll(ROW_RE)) {
  const [, href, name] = match;
  // Safe: extracted strings, not DOM
}
```

## Accepted Risks

### HTTP Cleartext to ISP

- **Risk**: MitM can modify responses
- **Impact**: Incorrect movie listings, malformed posters
- **Justification**: ISP does not support HTTPS; no credentials transmitted
- **Mitigation**: None required — low impact

### No Code Signing

- **Risk**: Windows SmartScreen warning; users may not trust installer
- **Impact**: Friction during install
- **Justification**: Budget constraint
- **Mitigation**: Document in README; sign when budget allows

### External Player Trust

- **Risk**: VLC/PotPlayer vulnerabilities affect playback
- **Impact**: Depends on player vulnerability
- **Justification**: Users already have these installed; we don't control them
- **Mitigation**: Only pass validated URLs; users update their own players

## Security Checklist

### Code Review

- [ ] No `nodeIntegration: true`
- [ ] No `contextIsolation: false`
- [ ] No `eval()`, `new Function()`, `innerHTML` with external data
- [ ] No `shell.openExternal` with unvalidated URLs
- [ ] All SQL uses parameterized queries
- [ ] All file paths validated to %APPDATA%
- [ ] IPC channels use allowlist pattern

### Pre-Release

- [ ] CSP header configured
- [ ] All webPreferences security flags verified
- [ ] No sensitive data in logs
- [ ] Update URLs use HTTPS (when signed)
