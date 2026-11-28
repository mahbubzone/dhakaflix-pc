/**
 * CSS declaration validator.
 *
 * Loads the built renderer stylesheet in a hidden Chromium window (Electron),
 * substitutes custom properties, and re-parses every declaration that uses
 * var(). A declaration Chromium rejects is silently dropped in production,
 * which is exactly the bug that made v0.5.0 / v0.5.1 lose every border.
 *
 * Why the stylesheet text is parsed instead of the CSSOM: the CSSOM expands
 * shorthands (`border` -> `border-*-width/style/color`) and keeps `var()`
 * inside the longhands. `border: 1px solid var(--divider)` therefore looks
 * valid per longhand, while at computed-value time Chromium invalidates the
 * whole shorthand and renders border-width: 0. Only the original declaration
 * text shows the problem.
 *
 * Usage:
 *   npx electron scripts/validate-css.js [path-to.css]
 * Exit code 1 when any declaration is rejected.
 */

const { app, BrowserWindow } = require('electron');
const fs = require('fs');
const os = require('os');
const path = require('path');

const assetsDir = path.join(__dirname, '..', 'dist', 'renderer', 'assets');
const cssArg = process.argv.slice(2).find((a) => a.endsWith('.css'));
const cssFile = cssArg
  ? path.resolve(cssArg)
  : fs
      .readdirSync(assetsDir)
      .filter((f) => f.endsWith('.css'))
      .map((f) => path.join(assetsDir, f))[0];

if (!cssFile || !fs.existsSync(cssFile)) {
  console.error('No built CSS found in dist/renderer/assets');
  process.exit(1);
}

const tmpHtml = path.join(os.tmpdir(), `dhakaflix-css-check-${process.pid}.html`);
fs.writeFileSync(
  tmpHtml,
  `<!doctype html><html><head><link rel="stylesheet" href="file:///${cssFile.replace(/\\/g, '/')}"></head><body></body></html>`
);

const CHECK = `
(async () => {
  const sheet = [...document.styleSheets].find(s => s.href && s.href.endsWith('.css'));
  if (!sheet) return { error: 'stylesheet not loaded' };

  const text = await fetch(sheet.href).then(r => r.text());

  // Custom property values, so var() can be substituted before validation.
  const custom = {};
  const collect = (rules) => {
    for (const rule of rules) {
      if (rule.style && rule.selectorText && rule.selectorText.includes(':root')) {
        for (const prop of rule.style) {
          if (prop.startsWith('--')) custom[prop] = rule.style.getPropertyValue(prop).trim();
        }
      }
      if (rule.cssRules) collect(rule.cssRules);
    }
  };
  collect(sheet.cssRules);

  const resolve = (value, depth) => {
    if (depth > 12) return null;
    let unresolved = false;
    const out = value.replace(/var\\(\\s*(--[a-zA-Z0-9-]+)\\s*(?:,\\s*([^()]*))?\\)/g, (m, name, fallback) => {
      if (custom[name] !== undefined) {
        const sub = resolve(custom[name], depth + 1);
        if (sub === null) { unresolved = true; return m; }
        return sub;
      }
      if (fallback !== undefined) return fallback.trim();
      unresolved = true;
      return m;
    });
    return unresolved ? null : out;
  };

  // Textual walk: collect declaration blocks between { } while tracking depth.
  const declarations = [];
  let depth = 0;
  let buf = '';
  let selector = '';
  for (const ch of text) {
    if (ch === '{') {
      if (depth === 0) selector = buf.trim().slice(-60);
      depth++;
      buf = '';
    } else if (ch === '}') {
      depth--;
      if (depth === 0) buf = '';
    } else if (ch === ';' && depth > 0) {
      const decl = buf.trim();
      if (decl.includes(':')) declarations.push({ selector, decl });
      buf = '';
    } else {
      buf += ch;
    }
  }

  const scratch = new CSSStyleSheet();
  const dropped = [];
  const deadPrefix = [];
  let progressiveCount = 0;
  // Valid CSS this Chromium build does not implement yet, or implements only
  // behind a prefix. Harmless because a supported fallback sits next to it.
  const PROGRESSIVE = new Set(['scrollbar-width', 'scrollbar-color', 'text-wrap', 'field-sizing', 'anchor-name']);
  let checked = 0;
  for (const { selector, decl } of declarations) {
    const idx = decl.indexOf(':');
    const prop = decl.slice(0, idx).trim();
    const raw = decl.slice(idx + 1).trim();
    if (!/^-{0,2}[a-zA-Z][a-zA-Z0-9-]*$/.test(prop)) continue;
    if (prop.startsWith('--')) continue; // custom properties accept any token stream
    const resolved = resolve(raw, 0);
    if (resolved === null) continue; // unresolved token, cannot judge
    checked++;
    const test = prop + ':' + resolved;
    try {
      scratch.replaceSync('.t{' + test + '}');
      if (!scratch.cssRules[0] || scratch.cssRules[0].style.length === 0) {
        if (/^-(webkit|moz|ms|o)-/.test(prop)) deadPrefix.push(test);
        else if (PROGRESSIVE.has(prop)) progressiveCount++;
        else dropped.push({ selector, decl: test });
      }
    } catch (e) {
      dropped.push({ selector, decl: test });
    }
  }

  return {
    checked,
    dropped,
    droppedCount: dropped.length,
    deadPrefixCount: deadPrefix.length,
    progressiveCount
  };
})()
`;

app.whenReady().then(async () => {
  const win = new BrowserWindow({ show: false });
  await win.loadFile(tmpHtml);
  const result = await win.webContents.executeJavaScript(CHECK);
  if (result.error) {
    console.error(result.error);
    app.exit(1);
    return;
  }
  console.log(`CSS declarations checked: ${result.checked}`);
  console.log(`Dropped (invalid) declarations: ${result.droppedCount}`);
  for (const d of result.dropped) {
    console.log(`  [${d.selector}] ${d.decl}`);
  }
  if (result.deadPrefixCount) {
    console.log(`Ignored vendor-prefixed declarations: ${result.deadPrefixCount}`);
  }
  if (result.progressiveCount) {
    console.log(`Ignored not-yet-supported properties: ${result.progressiveCount}`);
  }
  fs.unlinkSync(tmpHtml);
  app.exit(result.droppedCount === 0 ? 0 : 1);
});
