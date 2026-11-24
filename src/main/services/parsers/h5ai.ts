/**
 * h5ai Directory Listing Parser
 *
 * Parses h5ai's no-JavaScript fallback table format.
 *
 * Real markup:
 * <tr><td class="fb-i"><img .../></td>
 *     <td class="fb-n"><a href="/DHAKA-FLIX-7/Movies/%281995%29/">(1995)</a></td>
 *     <td class="fb-d">2022-05-26 23:11</td>
 *     <td class="fb-s">996028 KB</td></tr>
 *
 * Directories have an empty fb-s cell; files carry a unit suffix.
 */

import { DirectoryEntry } from '../../../shared/types';
import { resolveEntry, parseSize, parseListingDate } from './util';

const H5AI_ROW_RE =
  /<td class="fb-n"><a href="([^"]+)"[^>]*>([\s\S]*?)<\/a><\/td>\s*<td class="fb-d">([\s\S]*?)<\/td>\s*<td class="fb-s">([\s\S]*?)<\/td>/g;

/**
 * Parse an h5ai directory listing.
 * @param pageUrl URL that produced this HTML
 * @param html Raw HTML response
 */
export function parseH5ai(pageUrl: string, html: string): DirectoryEntry[] {
  const entries: DirectoryEntry[] = [];

  for (const match of html.matchAll(H5AI_ROW_RE)) {
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
