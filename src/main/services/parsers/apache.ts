/**
 * Apache autoindex Directory Listing Parser
 *
 * Parses Apache's mod_autoindex HTML table format:
 * <tr><td><img ...></td><td><a href="name/">name/</a></td>
 *     <td>2024-11-01 12:30</td><td>-</td>...</tr>
 */

import { DirectoryEntry } from '../../../shared/types';
import { resolveEntry, parseSize, parseListingDate } from './util';

const APACHE_ROW_RE =
  /<tr>\s*<td[^>]*>[\s\S]*?<\/td>\s*<td[^>]*>\s*<a href="([^"]+)"[^>]*>([\s\S]*?)<\/a>\s*<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>/gi;

/**
 * Parse an Apache autoindex directory listing.
 * @param pageUrl URL that produced this HTML
 * @param html Raw HTML response
 */
export function parseApache(pageUrl: string, html: string): DirectoryEntry[] {
  const entries: DirectoryEntry[] = [];

  for (const match of html.matchAll(APACHE_ROW_RE)) {
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
