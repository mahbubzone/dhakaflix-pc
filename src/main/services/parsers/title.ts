/**
 * Title Parser
 * 
 * Extracts movie/series metadata from folder names.
 * Patterns based on DhakaFlix naming conventions.
 */

export interface ParsedTitle {
  title: string;
  year: number;
  quality: string | null;
  dualAudio: boolean;
  kind: 'movie' | 'series' | 'event';
}

/**
 * Movie pattern: "Title (2024) 1080p [Dual Audio]"
 * Also handles ranked: "001. Title (2024) 720p"
 */
const MOVIE_RE = /^(?:\d{3}\.\s+)?([^(].*?)\s*\((\d{4})\)(.*)$/;

/**
 * Loose pattern for folders that omit the parentheses: "Out of Sight 1998 720p"
 */
const LOOSE_MOVIE_RE = /^([^()]+?)\s+((?:19|20)\d{2})\b(.*)$/;

/**
 * Kind marker pattern. These sites tag a folder with the media type and a
 * year, and the type word varies a lot:
 *   "Title (TV Series 2018-2022) 1080p"
 *   "Title (Web Series 2020- )"
 *   "Title (TV Mini Series 2024)"
 *   "Caliphate (Kalifat) (TV Series 2020) 1080p"
 *   "Lois & Clark (TV Serial 1993-1997) 720p"
 *   "Impractical Jokers (TV Reality-Show 2011- ) 720p"
 *   "A Certain Magical Index (TV Cartoon 2008-2019) 1080p"
 *   "13th (TV Documentary 2016) 720p WEBRip"
 *
 * The title may itself contain parentheses (foreign or alternate titles), so
 * the leading group is lazy and the marker must start with TV/Web/Mini.
 */
const MARKER_RE =
  /^(?:\d{3}\.\s+)?(.+?)\s*\(\s*(?:TV|Web|Mini)\s+[^)]*?((?:19|20)\d{2})[^)]*\)(.*)$/i;

/**
 * Type words that mean the folder holds multiple episodes. Everything else
 * with a kind marker (Documentary, Special, ...) is a single title.
 */
const SERIES_WORD_RE = /\b(Series|Serial|Show|Cartoon|Anime)\b/i;

/**
 * Event pattern: "Event Name (25-08-2024) 720p"
 * Date in DD-MM-YYYY format
 */
const EVENT_RE = /^([^(].*?)\s*\(\d{2}-\d{2}-(\d{4})\)(.*)$/;

/**
 * Collection pattern: "Title Collection (2008-2019)"
 * Year range indicates a group, not a single title
 */
const COLLECTION_RE = /\(\d{4}[-–]\d{4}\)/;

/**
 * Quality pattern: 2160p, 1080p, 720p, 480p, 4K
 */
const QUALITY_RE = /\b(2160p|1080p|720p|480p|4K)\b/i;

/**
 * Dual audio pattern
 */
const DUAL_RE = /\b(Dual|Multi)\s*Audio\b/i;

/**
 * True for grouping folders that only bucket titles, e.g.
 * "(1995)", "(2024)", "(1960-1994)", "(1995) & Before",
 * "(1996) 1080p", "(1995) 1080p & Before",
 * or alphabetical buckets such as "TV Series A - L" and "TV Series 0 - 9".
 *
 * These are navigation aids, not categories, so the UI must not show one row
 * per year. Named collections ("... Collection (2008-2019)") are not buckets
 * and keep their own name.
 */
export function isGroupingFolder(name: string): boolean {
  // Bucket names carry quality, audio, and edition tokens after the year, so
  // strip those before testing. "(1996) 1080p" must still read as a bucket.
  const trimmed = name
    .trim()
    .replace(/\[[^\]]*\]/g, ' ')
    .replace(/\b(2160p|1080p|720p|480p|4K|UHD|WEB-?DL|WEBRip|BluRay|BRRip|HDRip|HDTV|NF|AMZN|DSNP|HQ|HEVC|x264|x265)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // Year or year range, optionally with a trailing qualifier.
  if (/^\(?\d{4}(\s*[-–]\s*\d{4})?\)?(\s*&.*)?$/.test(trimmed)) {
    return true;
  }

  // Alphabetical or numeric bucket: "... A - L", "... 0 - 9".
  // Buckets use hyphen, en dash, or em dash, and often a decorative glyph.
  if (/[0-9A-Z]\s*[-–—]\s*[0-9A-Z]\s*$/i.test(trimmed) && !/\(\d{4}\)/.test(trimmed)) {
    return true;
  }

  return false;
}

/**
 * Parse folder name to extract title metadata
 * @param name Folder name
 * @returns Parsed metadata or null if it's a group folder (not a title)
 */
export function parseTitle(name: string): ParsedTitle | null {
  // Skip collections (year ranges)
  if (COLLECTION_RE.test(name)) {
    return null;
  }
  
  // Skip year-only groups like "(2024)" or "(1995) & Before"
  if (/^\(\d{4}\)/.test(name) || /^\d{4}$/.test(name.trim())) {
    return null;
  }
  
  let match: RegExpMatchArray | null;
  let kind: 'movie' | 'series' | 'event' = 'movie';
  
  // Try the kind marker first (more specific than a bare year).
  match = name.match(MARKER_RE);
  if (match) {
    kind = SERIES_WORD_RE.test(match[0]) ? 'series' : 'movie';
  }
  
  // Try event pattern
  if (!match) {
    match = name.match(EVENT_RE);
    if (match) {
      kind = 'event';
    }
  }
  
  // Try movie pattern
  if (!match) {
    match = name.match(MOVIE_RE);
    if (match) {
      kind = 'movie';
    }
  }

  // Last resort: year without parentheses, e.g. "Out of Sight 1998 720p"
  if (!match) {
    match = name.match(LOOSE_MOVIE_RE);
    if (match) {
      kind = 'movie';
    }
  }
  
  if (!match) {
    return null;
  }
  
  const [, rawTitle, yearStr, suffix] = match;

  const title = rawTitle.trim();
  const parsedYear = parseInt(yearStr, 10);
  const year = Number.isFinite(parsedYear) ? parsedYear : 0;
  
  // Extract quality from suffix
  const qualityMatch = suffix.match(QUALITY_RE);
  const quality = qualityMatch ? qualityMatch[1].toLowerCase() : null;
  
  // Check for dual audio
  const dualAudio = DUAL_RE.test(suffix);
  
  return {
    title,
    year,
    quality,
    dualAudio,
    kind,
  };
}

/**
 * Parse episode filename to extract season and episode numbers
 * Pattern: S01E05, S1E5, Season 1 Episode 5
 */
export function parseEpisode(filename: string): { season: number; episode: number } | null {
  // Standard pattern: S01E05
  const standardMatch = filename.match(/S(\d{1,2})\s*E(\d{1,3})/i);
  if (standardMatch) {
    return {
      season: parseInt(standardMatch[1], 10),
      episode: parseInt(standardMatch[2], 10),
    };
  }
  
  // Verbose pattern: Season 1 Episode 5
  const verboseMatch = filename.match(/Season\s*(\d+)\s*Episode\s*(\d+)/i);
  if (verboseMatch) {
    return {
      season: parseInt(verboseMatch[1], 10),
      episode: parseInt(verboseMatch[2], 10),
    };
  }
  
  // Episode only: E05, Ep05, Episode 5
  const episodeMatch = filename.match(/(?:E|Ep|Episode)\s*(\d{1,3})\b/i);
  if (episodeMatch) {
    return {
      season: 1,
      episode: parseInt(episodeMatch[1], 10),
    };
  }
  
  return null;
}
