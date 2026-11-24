/**
 * nginx autoindex Directory Listing Parser
 *
 * Parses nginx's default autoindex format:
 * <a href="name/">name/</a>                       01-Nov-2024 12:30       -
 * <a href="file.mkv">file.mkv</a>                 01-Nov-2024 12:30    1234567
 */

import { DirectoryEntry } from '../../../shared/types';
import { resolveEntry, parseSize, parseListingDate } from './util';

const NGINX_LINE_RE =
  /<a href="([^"]+)"[^>]*>([^<]*)<\/a>\s+(\d{1,2}-\w{3}-\d{4}\s+\d{2}:\d{2})\s+([\d.]+\s*[KMGT]?|-)/g;

/**
 * Parse an nginx autoindex directory listing.
 * @param pageUrl URL that produced this HTML
 * @param html Raw HTML response
 */
export function parseNginx(pageUrl: string, html: string): DirectoryEntry[] {
  const entries: DirectoryEntry[] = [];

  for (const match of html.matchAll(NGINX_LINE_RE)) {
    const [, rawHref, rawName, dateStr, sizeRaw] = match;

    const resolved = resolveEntry(pageUrl, rawHref, rawName);
    if (!resolved) continue;

    entries.push({
      href: resolved.href,
      name: resolved.name,
      isDirectory: resolved.isDirectory,
      size: parseSize(sizeRaw),
      mtime: parseListingDate(dateStr),
    });
  }

  return entries;
}
