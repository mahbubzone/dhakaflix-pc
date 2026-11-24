/**
 * Media Asset Resolver
 *
 * A scan indexes folder names only. The playable file and the poster image
 * live one level deeper, inside the title folder:
 *
 *   Title (1995) 720p/
 *     Title.1995.720p.mkv
 *     a11.jpg
 *
 * Resolving lazily (on demand) avoids ~38k extra requests during a scan.
 * Results are cached in the movies/episodes tables, so each folder is fetched
 * once per install.
 */

import { getDatabase } from './database';
import { fetchText, Semaphore } from '../utils/http';
import { detectFormat, parseDirectory } from './parsers';
import { parseEpisode } from './parsers/title';
import { logger } from '../utils/logger';

/** ISP servers are rate limited; share the same ceiling as the crawler. */
const limiter = new Semaphore(4);

const VIDEO_EXTENSIONS = [
  '.mkv', '.mp4', '.avi', '.webm', '.m4v', '.mov',
  '.mpg', '.mpeg', '.wmv', '.flv', '.ts', '.m2ts',
];

const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.bmp'];

const MAX_SEASONS = 40;

export interface ResolvedAssets {
  movieId: number;
  video: string | null;
  poster: string | null;
  episodes: number;
  cached: boolean;
}

interface MovieRow {
  id: number;
  href: string;
  kind: number;
  video: string | null;
  poster: string | null;
}

interface ListingFile {
  href: string;
  name: string;
  size: number;
}

interface Listing {
  files: ListingFile[];
  directories: ListingFile[];
}

function hasExtension(name: string, extensions: string[]): boolean {
  const lower = name.toLowerCase();
  return extensions.some((ext) => lower.endsWith(ext));
}

function assertHttpUrl(href: string): void {
  const parsed = new URL(href);
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error(`Unsupported protocol: ${parsed.protocol}`);
  }
}

async function listDirectory(href: string): Promise<Listing> {
  assertHttpUrl(href);

  const html = await limiter.withPermit(() => fetchText(href, { timeout: 20000 }));
  const format = detectFormat(html);
  const entries = parseDirectory(href, html, format);

  return {
    files: entries
      .filter((e) => !e.isDirectory)
      .map((e) => ({ href: e.href, name: e.name, size: e.size })),
    directories: entries
      .filter((e) => e.isDirectory)
      .map((e) => ({ href: e.href, name: e.name, size: e.size })),
  };
}

/** Largest video wins: release folders sometimes hold samples or extras. */
function pickVideo(files: ListingFile[]): ListingFile | null {
  const videos = files.filter((f) => hasExtension(f.name, VIDEO_EXTENSIONS));
  if (videos.length === 0) return null;
  return videos.reduce((best, next) => (next.size > best.size ? next : best));
}

/**
 * Prefer a file named like a poster, otherwise the largest image.
 * Many releases ship "poster.jpg" or "folder.jpg"; others use random names.
 */
function pickPoster(files: ListingFile[]): ListingFile | null {
  const images = files.filter((f) => hasExtension(f.name, IMAGE_EXTENSIONS));
  if (images.length === 0) return null;

  const named = images.find((f) => /(poster|folder|cover|thumb|front)/i.test(f.name));
  if (named) return named;

  return images.reduce((best, next) => (next.size > best.size ? next : best));
}

/**
 * Resolve the playable file and poster for one title, caching the result.
 * For series, also walks season folders and stores episodes.
 */
export async function resolveAssets(movieId: number): Promise<ResolvedAssets> {
  const db = getDatabase();
  const movie = db
    .prepare('SELECT id, href, kind, video, poster FROM movies WHERE id = ?')
    .get(movieId) as MovieRow | undefined;

  if (!movie) {
    throw new Error(`Movie ${movieId} not found`);
  }

  const isSeries = movie.kind === 1;
  const existingEpisodes = isSeries
    ? (db.prepare('SELECT COUNT(*) AS c FROM episodes WHERE movie_id = ?').get(movieId) as { c: number }).c
    : 0;

  // Serve from cache when everything is already known.
  if (movie.video && (movie.poster || isSeries) && (!isSeries || existingEpisodes > 0)) {
    return {
      movieId,
      video: movie.video,
      poster: movie.poster,
      episodes: existingEpisodes,
      cached: true,
    };
  }

  const listing = await listDirectory(movie.href);

  const poster = movie.poster ?? pickPoster(listing.files)?.href ?? null;

  let video = movie.video;
  let episodeCount = existingEpisodes;

  if (!isSeries) {
    video = video ?? pickVideo(listing.files)?.href ?? null;
  } else if (existingEpisodes === 0) {
    const collected = await collectEpisodes(db, movie.id, movie.href, listing);
    episodeCount = collected.count;
    // Play the first episode when the user hits Play on a series card.
    video = video ?? collected.firstHref;
  }

  db.prepare('UPDATE movies SET video = ?, poster = ? WHERE id = ?')
    .run(video, poster, movie.id);

  logger.debug('Resolved assets', {
    movieId,
    hasVideo: Boolean(video),
    hasPoster: Boolean(poster),
    episodes: episodeCount,
  });

  return {
    movieId,
    video,
    poster,
    episodes: episodeCount,
    cached: false,
  };
}

/**
 * Series folders hold either season folders ("Season 1") or episode files
 * directly. Handle both, and stop after MAX_SEASONS to bound network use.
 */
async function collectEpisodes(
  db: ReturnType<typeof getDatabase>,
  movieId: number,
  movieHref: string,
  rootListing: Listing
): Promise<{ count: number; firstHref: string | null }> {
  const seasons = rootListing.directories
    .filter((d) => /season|s\d{1,2}\b/i.test(d.name))
    .slice(0, MAX_SEASONS);

  const insert = db.prepare(`
    INSERT INTO episodes (movie_id, href, season, episode, title, size)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(href) DO UPDATE SET
      season = excluded.season,
      episode = excluded.episode,
      title = excluded.title,
      size = excluded.size
  `);

  const rows: Array<{ href: string; season: number; episode: number; title: string; size: number }> = [];

  const addFromListing = (files: ListingFile[], fallbackSeason: number) => {
    const videos = files
      .filter((f) => hasExtension(f.name, VIDEO_EXTENSIONS))
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));

    videos.forEach((file, index) => {
      const parsed = parseEpisode(file.name);
      rows.push({
        href: file.href,
        season: parsed?.season ?? fallbackSeason,
        episode: parsed?.episode ?? index + 1,
        title: file.name.replace(/\.[^.]+$/, ''),
        size: file.size,
      });
    });
  };

  if (seasons.length === 0) {
    // Flat layout: episodes sit in the title folder itself.
    addFromListing(rootListing.files, 1);
  } else {
    for (let i = 0; i < seasons.length; i++) {
      const season = seasons[i];
      const seasonNumber = Number(season.name.match(/(\d{1,2})/)?.[1] ?? i + 1);

      let listing: Listing;
      try {
        listing = await listDirectory(season.href);
      } catch (error) {
        logger.warn('Season fetch failed', {
          href: season.href,
          error: (error as Error).message,
        });
        continue;
      }

      addFromListing(listing.files, seasonNumber);
    }
  }

  if (rows.length === 0) {
    // Nothing resolvable — leave the folder URL so the UI can still show it.
    return { count: 0, firstHref: movieHref };
  }

  const insertAll = db.transaction(
    (items: typeof rows) => {
      for (const item of items) {
        insert.run(movieId, item.href, item.season, item.episode, item.title, item.size);
      }
    }
  );
  insertAll(rows);

  // Sort by season then episode so "Play" starts at the first episode.
  rows.sort((a, b) => (a.season - b.season) || (a.episode - b.episode));

  return { count: rows.length, firstHref: rows[0].href };
}
