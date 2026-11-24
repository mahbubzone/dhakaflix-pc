/**
 * Parser Index
 * 
 * Re-exports all directory listing parsers.
 */

export { parseH5ai } from './h5ai';
export { parseNginx } from './nginx';
export { parseApache } from './apache';
export { parseTitle, parseEpisode } from './title';
export type { ParsedTitle } from './title';

import { parseH5ai } from './h5ai';
import { parseNginx } from './nginx';
import { parseApache } from './apache';
import type { DirectoryEntry } from '../../../shared/types';

export type DirectoryFormat = 'h5ai' | 'nginx' | 'apache' | 'unknown';

/**
 * Detect directory listing format from HTML content
 */
export function detectFormat(html: string): DirectoryFormat {
  if (html.includes('_h5ai') && html.includes('fb-n')) {
    return 'h5ai';
  }
  if (html.includes('Index of') && html.includes('<pre>')) {
    return 'nginx';
  }
  if (html.includes('Index of') && html.includes('<table>')) {
    return 'apache';
  }
  return 'unknown';
}

/**
 * Parse directory listing with auto-detected format
 */
export function parseDirectory(
  basePath: string,
  html: string,
  format?: DirectoryFormat
): DirectoryEntry[] {
  const detectedFormat = format || detectFormat(html);

  switch (detectedFormat) {
    case 'h5ai':
      return parseH5ai(basePath, html);
    case 'nginx':
      return parseNginx(basePath, html);
    case 'apache':
      return parseApache(basePath, html);
    default:
      return [];
  }
}
