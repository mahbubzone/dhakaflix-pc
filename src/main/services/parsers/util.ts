/**
 * Parser Helpers
 *
 * Shared logic for directory listing parsers.
 *
 * h5ai emits absolute paths ("/DHAKA-FLIX-7/Movies/%281995%29/"),
 * nginx and Apache emit relative ones ("sub/", "file.mkv"). All three are
 * resolved against the URL that was actually fetched, so entries always come
 * back as absolute URLs and only direct children of the page are returned.
 */

/** Decode a URL path, tolerating malformed percent-escapes. */
export function decodePath(path: string): string {
  try {
    return decodeURIComponent(path);
  } catch {
    return path;
  }
}

/** Remove HTML tags and decode the few entities that appear in listings. */
export function cleanText(value: string): string {
  return value
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .trim();
}

/**
 * Parse a human-readable size into bytes.
 * Handles "996028 KB", "78 KB", "1.2 GB", "1234", and "-".
 */
export function parseSize(raw: string): number {
  const text = cleanText(raw);
  if (!text || text === '-') return 0;

  const match = text.match(/([\d.,]+)\s*(B|KB|MB|GB|TB|K|M|G|T)?/i);
  if (!match) return 0;

  const value = parseFloat(match[1].replace(/,/g, ''));
  if (!isFinite(value)) return 0;

  const unit = (match[2] || '').toUpperCase();
  const multipliers: Record<string, number> = {
    '': 1,
    B: 1,
    K: 1024,
    KB: 1024,
    M: 1024 ** 2,
    MB: 1024 ** 2,
    G: 1024 ** 3,
    GB: 1024 ** 3,
    T: 1024 ** 4,
    TB: 1024 ** 4,
  };

  return Math.floor(value * (multipliers[unit] ?? 1));
}

const MONTHS: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
};

/**
 * Parse the date formats the three listings emit.
 * "2022-05-26 23:11", "26-May-2022 23:11", "2022-05-26".
 * Returns epoch milliseconds, or 0 when unparseable.
 */
export function parseListingDate(raw: string): number {
  const text = cleanText(raw);
  if (!text || text === '-') return 0;

  // ISO-like: 2022-05-26 23:11
  const iso = text.match(/(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}))?/);
  if (iso) {
    const [, y, mo, d, h, mi] = iso;
    const date = new Date(
      Number(y), Number(mo) - 1, Number(d),
      Number(h ?? 0), Number(mi ?? 0)
    );
    return isNaN(date.getTime()) ? 0 : date.getTime();
  }

  // Day-first: 26-May-2022 23:11
  const dayFirst = text.match(/(\d{1,2})-([A-Za-z]{3})-(\d{4})(?:\s+(\d{2}):(\d{2}))?/);
  if (dayFirst) {
    const [, d, mon, y, h, mi] = dayFirst;
    const month = MONTHS[mon.toLowerCase()];
    if (month === undefined) return 0;
    const date = new Date(
      Number(y), month, Number(d),
      Number(h ?? 0), Number(mi ?? 0)
    );
    return isNaN(date.getTime()) ? 0 : date.getTime();
  }

  return 0;
}

export interface ResolvedEntry {
  href: string;
  name: string;
  isDirectory: boolean;
}

/**
 * Resolve a raw listing href against the page URL and decide whether it is a
 * direct child of that page.
 *
 * Returns null for parent links, nested descendants, and off-site links.
 */
export function resolveEntry(
  pageUrl: string,
  rawHref: string,
  label: string
): ResolvedEntry | null {
  if (!rawHref) return null;

  const href = rawHref.trim();
  if (href === '..' || href === '../' || href === '.' || href === './') return null;
  if (/^(mailto:|javascript:|#)/i.test(href)) return null;

  let page: URL;
  let target: URL;
  try {
    page = new URL(pageUrl);
    target = new URL(href, page);
  } catch {
    return null;
  }

  if (target.protocol !== 'http:' && target.protocol !== 'https:') return null;
  if (target.host !== page.host) return null;

  // Compare decoded paths so percent-encoding differences do not matter.
  const basePath = decodePath(page.pathname);
  const targetPath = decodePath(target.pathname);

  // A directory listing URL without a trailing slash must still match children.
  const baseWithSlash = basePath.endsWith('/') ? basePath : `${basePath}/`;

  if (!targetPath.startsWith(baseWithSlash)) return null;

  const relative = targetPath.slice(baseWithSlash.length);
  if (!relative) return null;

  const isDirectory = targetPath.endsWith('/');
  const trimmed = isDirectory ? relative.slice(0, -1) : relative;

  // Anything with a separator left is a deeper descendant, not a child.
  if (trimmed.includes('/')) return null;

  // nginx and Apache print directory anchors as "name/", so drop the slash.
  let text = cleanText(label);
  if (isDirectory && text.endsWith('/')) {
    text = text.slice(0, -1).trim();
  }

  const name = text || trimmed;

  return {
    href: target.href,
    name,
    isDirectory,
  };
}
