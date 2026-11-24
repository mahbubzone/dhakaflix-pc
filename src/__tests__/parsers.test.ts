/**
 * DhakaFlix Parser Unit Tests
 *
 * These import the real parsers. Earlier revisions reimplemented the regexes
 * inline, so the suite passed while the shipped parsers were broken.
 *
 * Run: npx jest src/__tests__/parsers.test.ts
 */

import * as fs from 'fs';
import * as path from 'path';

import { parseH5ai } from '../main/services/parsers/h5ai';
import { parseNginx } from '../main/services/parsers/nginx';
import { parseApache } from '../main/services/parsers/apache';
import { parseSize, parseListingDate, resolveEntry } from '../main/services/parsers/util';
import { parseTitle, parseEpisode, isGroupingFolder } from '../main/services/parsers/title';

const H5AI_HOST = 'http://172.16.50.7';
const H5AI_SERIES_HOST = 'http://172.16.50.12';

function loadFixture(name: string): string {
  return fs.readFileSync(path.join(__dirname, '../../test/fixtures', name), 'utf-8');
}

// ============================================================================
// h5ai
// ============================================================================

describe('h5ai Parser', () => {
  describe('movie listing', () => {
    const pageUrl = `${H5AI_HOST}/DHAKA-FLIX-7/English%20Movies/(2026)/`;
    let entries: ReturnType<typeof parseH5ai>;

    beforeAll(() => {
      entries = parseH5ai(pageUrl, loadFixture('h5ai-movie-listing.html'));
    });

    it('extracts every direct child folder', () => {
      expect(entries).toHaveLength(5);
      expect(entries.every((e) => e.isDirectory)).toBe(true);
    });

    it('resolves hrefs to absolute URLs on the same host', () => {
      for (const entry of entries) {
        expect(entry.href.startsWith(H5AI_HOST + '/')).toBe(true);
        expect(() => new URL(entry.href)).not.toThrow();
      }
    });

    it('decodes percent-encoded folder names', () => {
      expect(entries.map((e) => e.name)).toEqual([
        '72 Hours (2026) 720p NF [Dual Audio]',
        'The Matrix 5 (2026) 1080p',
        '001. The Shawshank Redemption Remastered (2026) 2160p',
        "Don't Look Up 2 (2026) 1080p [Dual Audio]",
        'Mission Impossible \u2013 Final Reckoning (2026) 1080p',
      ]);
    });

    it('excludes the parent directory link', () => {
      expect(entries.some((e) => e.name === '..')).toBe(false);
      expect(entries.some((e) => e.href.endsWith('/English%20Movies/'))).toBe(false);
    });

    it('parses modification time', () => {
      const entry = entries.find((e) => e.name.startsWith('72 Hours'))!;
      expect(entry.mtime).toBeGreaterThan(0);
      expect(new Date(entry.mtime).getFullYear()).toBe(2026);
    });
  });

  describe('series listing', () => {
    it('extracts series folders', () => {
      const entries = parseH5ai(
        `${H5AI_SERIES_HOST}/DHAKA-FLIX-12/TV-WEB-Series/`,
        loadFixture('h5ai-series-listing.html')
      );

      expect(entries).toHaveLength(5);
      expect(entries.some((e) => e.name.includes('Discovery of Witches'))).toBe(true);
      expect(entries.some((e) => e.name.includes('Breaking Bad'))).toBe(true);
      expect(entries.every((e) => e.isDirectory)).toBe(true);
    });

    it('extracts season folders', () => {
      const entries = parseH5ai(
        `${H5AI_SERIES_HOST}/DHAKA-FLIX-12/TV-WEB-Series/Breaking%20Bad%20(TV%20Series%202008%E2%80%932013)%201080p/`,
        loadFixture('h5ai-series-seasons.html')
      );

      expect(entries.filter((e) => e.name.startsWith('Season'))).toHaveLength(5);
      expect(entries.filter((e) => e.isDirectory)).toHaveLength(5);
    });

    it('extracts episode files', () => {
      const entries = parseH5ai(
        `${H5AI_SERIES_HOST}/DHAKA-FLIX-12/TV-WEB-Series/Breaking%20Bad/Season%201/`,
        loadFixture('h5ai-season-episodes.html')
      );

      const episodes = entries.filter((e) => e.name.endsWith('.mkv'));
      expect(episodes).toHaveLength(7);
      expect(episodes.every((e) => !e.isDirectory)).toBe(true);
      expect(episodes[0].name).toBe('Breaking.Bad.S01E01.Pilot.1080p.BluRay.x264.mkv');
    });
  });

  describe('movie folder contents', () => {
    const pageUrl =
      `${H5AI_HOST}/DHAKA-FLIX-7/English%20Movies/(2026)/` +
      '72%20Hours%20(2026)%20720p%20NF%20%5BDual%20Audio%5D/';

    it('returns files as non-directories with sizes', () => {
      const entries = parseH5ai(pageUrl, loadFixture('h5ai-movie-folder.html'));
      const videos = entries.filter((e) => e.name.endsWith('.mkv'));

      expect(videos).toHaveLength(2);
      expect(videos.every((e) => !e.isDirectory)).toBe(true);
      expect(videos.every((e) => e.size > 0)).toBe(true);

      const largest = videos.reduce((a, b) => (a.size > b.size ? a : b));
      expect(largest.name).not.toContain('sample');
    });

    it('exposes the poster image', () => {
      const entries = parseH5ai(pageUrl, loadFixture('h5ai-movie-folder.html'));
      expect(entries.some((e) => e.name === 'poster_AL_.jpg')).toBe(true);
    });
  });

  describe('category root', () => {
    it('keeps year buckets and named collections as children', () => {
      const entries = parseH5ai(
        `${H5AI_HOST}/DHAKA-FLIX-7/English%20Movies/`,
        loadFixture('h5ai-category-root.html')
      );

      expect(entries.map((e) => e.name)).toEqual([
        '(2026)',
        '(2025)',
        '(2024)',
        '(1995) & Before',
        'DC Extended Universe Collection (2008-2019)',
        'Alfred Hitchcock-Complete Filmography (1925-1934)',
        'IMDb Top 250',
      ]);
    });
  });
});

// ============================================================================
// nginx
// ============================================================================

describe('nginx autoindex Parser', () => {
  const pageUrl = 'http://172.16.50.9/movies/English/(2026)/';
  let entries: ReturnType<typeof parseNginx>;

  beforeAll(() => {
    entries = parseNginx(pageUrl, loadFixture('nginx-autoindex.html'));
  });

  it('extracts folders and files as direct children', () => {
    expect(entries).toHaveLength(4);
    expect(entries.filter((e) => e.isDirectory)).toHaveLength(3);
    expect(entries.filter((e) => !e.isDirectory)).toHaveLength(1);
  });

  it('resolves relative hrefs against the page URL', () => {
    expect(entries[0].href).toBe(
      'http://172.16.50.9/movies/English/(2026)/72%20Hours%20(2026)%20720p/'
    );
    expect(entries[0].name).toBe('72 Hours (2026) 720p');
  });

  it('excludes the parent directory', () => {
    expect(entries.some((e) => e.name === '..')).toBe(false);
  });
});

// ============================================================================
// apache
// ============================================================================

describe('apache autoindex Parser', () => {
  const pageUrl = 'http://172.16.50.9/media/movies/2026/';
  let entries: ReturnType<typeof parseApache>;

  beforeAll(() => {
    entries = parseApache(pageUrl, loadFixture('apache-autoindex.html'));
  });

  it('extracts folder rows only', () => {
    expect(entries).toHaveLength(3);
    expect(entries.every((e) => e.isDirectory)).toBe(true);
  });

  it('resolves absolute and relative hrefs', () => {
    expect(entries[0].href).toBe(
      'http://172.16.50.9/media/movies/2026/72%20Hours%20(2026)%20720p/'
    );
    expect(entries[0].name).toBe('72 Hours (2026) 720p');
  });

  it('excludes the parent directory row', () => {
    expect(entries.some((e) => e.name === 'Parent Directory')).toBe(false);
    expect(entries.some((e) => e.href === 'http://172.16.50.9/media/movies/')).toBe(false);
  });
});

// ============================================================================
// util
// ============================================================================

describe('parser helpers', () => {
  it('parses bare and unit sizes', () => {
    expect(parseSize('4500000')).toBe(4500000);
    expect(parseSize('996028 KB')).toBe(996028 * 1024);
    expect(parseSize('1.5 GB')).toBe(Math.floor(1.5 * 1024 ** 3));
    expect(parseSize('78 MB')).toBe(78 * 1024 ** 2);
    expect(parseSize('-')).toBe(0);
    expect(parseSize('')).toBe(0);
  });

  it('parses both date formats', () => {
    expect(parseListingDate('2022-05-26 23:11')).toBe(
      new Date(2022, 4, 26, 23, 11).getTime()
    );
    expect(parseListingDate('26-May-2022 23:11')).toBe(
      new Date(2022, 4, 26, 23, 11).getTime()
    );
    expect(parseListingDate('-')).toBe(0);
  });

  it('rejects parents, descendants, and off-site links', () => {
    const page = 'http://172.16.50.7/A/B/';

    expect(resolveEntry(page, '..', '..')).toBeNull();
    expect(resolveEntry(page, '/A/B/C/D/', 'D')).toBeNull();
    expect(resolveEntry(page, 'http://evil.test/A/B/C/', 'C')).toBeNull();

    expect(resolveEntry(page, '/A/B/C/', 'C')).toEqual({
      href: 'http://172.16.50.7/A/B/C/',
      name: 'C',
      isDirectory: true,
    });
  });
});

// ============================================================================
// title
// ============================================================================

describe('Title Parser', () => {
  describe('movies', () => {
    it('parses a standard folder', () => {
      expect(parseTitle('72 Hours (2026) 720p NF [Dual Audio]')).toEqual({
        title: '72 Hours',
        year: 2026,
        quality: '720p',
        dualAudio: true,
        kind: 'movie',
      });
    });

    it('strips a ranked prefix', () => {
      expect(parseTitle('001. The Shawshank Redemption (1994) 1080p')).toEqual({
        title: 'The Shawshank Redemption',
        year: 1994,
        quality: '1080p',
        dualAudio: false,
        kind: 'movie',
      });
    });

    it('parses a title starting with a number', () => {
      expect(parseTitle('2.0 (2018) 720p')?.title).toBe('2.0');
    });

    it('parses a title with an apostrophe', () => {
      expect(parseTitle("Don't Look Up (2021) 2160p")?.title).toBe("Don't Look Up");
    });

    it('parses a title with a colon and en dash', () => {
      expect(parseTitle('Mission: Impossible \u2013 Dead Reckoning (2023) 1080p')?.title)
        .toBe('Mission: Impossible \u2013 Dead Reckoning');
    });

    it('returns null quality when no quality tag exists', () => {
      const result = parseTitle('The Godfather (1972)');
      expect(result).toEqual({
        title: 'The Godfather',
        year: 1972,
        quality: null,
        dualAudio: false,
        kind: 'movie',
      });
    });

    it('detects Multi Audio', () => {
      expect(parseTitle('Avatar (2009) 1080p [Multi Audio]')?.dualAudio).toBe(true);
    });

    it('falls back to a year without parentheses', () => {
      expect(parseTitle('Out of Sight 1998 720p')).toEqual({
        title: 'Out of Sight',
        year: 1998,
        quality: '720p',
        dualAudio: false,
        kind: 'movie',
      });
    });
  });

  describe('series', () => {
    it('parses TV Series with an en-dash year range', () => {
      expect(parseTitle('A Discovery of Witches (TV Series 2018\u20132022) 1080p')).toEqual({
        title: 'A Discovery of Witches',
        year: 2018,
        quality: '1080p',
        dualAudio: false,
        kind: 'series',
      });
    });

    it('parses TV Series with a hyphen year range', () => {
      expect(parseTitle('The Office (TV Series 2005-2013)')?.kind).toBe('series');
    });

    it('parses Web Series with an open-ended year', () => {
      expect(parseTitle('Wednesday (Web Series 2022-) 720p')).toEqual({
        title: 'Wednesday',
        year: 2022,
        quality: '720p',
        dualAudio: false,
        kind: 'series',
      });
    });

    it('strips a ranked prefix', () => {
      expect(parseTitle('001. Game of Thrones (TV Series 2011-2019) 1080p')?.title)
        .toBe('Game of Thrones');
    });

    it('parses a Mini Series marker', () => {
      expect(parseTitle('A Man in Full (TV Mini Series 2024) 720p [Dual Audio]')?.kind)
        .toBe('series');
    });

    it('parses Serial and Reality-Show markers', () => {
      expect(parseTitle('Lois & Clark (TV Serial 1993-1997) 720p')?.kind).toBe('series');
      expect(parseTitle('Impractical Jokers (TV Reality-Show 2011- ) 720p')?.kind).toBe('series');
    });

    it('parses Cartoon markers', () => {
      expect(parseTitle('A Certain Magical Index (TV Cartoon 2008-2019) 1080p [Dual Audio]')?.kind)
        .toBe('series');
    });

    it('keeps a foreign title in parentheses', () => {
      expect(parseTitle('Caliphate (Kalifat) (TV Series 2020) 1080p')?.title)
        .toBe('Caliphate (Kalifat)');
    });

    it('treats documentaries as single titles, not series', () => {
      expect(parseTitle('13th (TV Documentary 2016) 720p WEBRip')).toEqual({
        title: '13th',
        year: 2016,
        quality: '720p',
        dualAudio: false,
        kind: 'movie',
      });
    });
  });

  describe('events', () => {
    it('parses a DD-MM-YYYY date', () => {
      expect(parseTitle('AEW All In London (25-08-2024) 720p')).toEqual({
        title: 'AEW All In London',
        year: 2024,
        quality: '720p',
        dualAudio: false,
        kind: 'event',
      });
    });

    it('parses a WWE event', () => {
      expect(parseTitle('WWE WrestleMania 40 (06-04-2024) 1080p')?.title)
        .toBe('WWE WrestleMania 40');
    });
  });

  describe('groups return null', () => {
    it('year bucket', () => {
      expect(parseTitle('(2026)')).toBeNull();
    });

    it('year bucket with qualifier', () => {
      expect(parseTitle('(1995) & Before')).toBeNull();
    });

    it('named collection with a year range', () => {
      expect(parseTitle('DC Extended Universe Collection (2008-2019)')).toBeNull();
      expect(parseTitle('Alfred Hitchcock-Complete Filmography (1925-1934)')).toBeNull();
    });

    it('alphabetical bucket', () => {
      expect(parseTitle('TV Series \u2605  A  \u2014  L')).toBeNull();
      expect(parseTitle('TV Series \u2665  0  \u2014  9')).toBeNull();
    });
  });

  describe('edge cases', () => {
    it('handles a number inside the title', () => {
      expect(parseTitle('Se7en (1995) 1080p')?.title).toBe('Se7en');
    });

    it('handles non-ASCII titles', () => {
      expect(parseTitle('Am\u00e9lie (2001) 720p')?.title).toBe('Am\u00e9lie');
    });

    it('handles a long title', () => {
      const result = parseTitle(
        'The Incredibly Strange Creatures Who Stopped Living and Became Mixed-Up Zombies (1964) 480p'
      );
      expect(result?.title)
        .toBe('The Incredibly Strange Creatures Who Stopped Living and Became Mixed-Up Zombies');
      expect(result?.year).toBe(1964);
    });
  });
});

// ============================================================================
// grouping folders
// ============================================================================

describe('isGroupingFolder', () => {
  it('detects year buckets', () => {
    for (const name of ['(2026)', '(1995) & Before', '(1960-1994)', '1995', '(1995-2026)']) {
      expect(isGroupingFolder(name)).toBe(true);
    }
  });

  it('detects year buckets with quality tokens', () => {
    for (const name of [
      '(1996) 1080p',
      '(1995) 1080p & Before',
      '(2019) 720p [Dual Audio]',
      '(2013) 1080p WEB-DL',
    ]) {
      expect(isGroupingFolder(name)).toBe(true);
    }
  });

  it('detects alphabetical and numeric buckets', () => {
    for (const name of [
      'TV Series A - L',
      'TV Series \u2665  A  \u2014  L',
      'Anime-TV Series \u2605  0  \u2014  9',
      'Movies M - R',
    ]) {
      expect(isGroupingFolder(name)).toBe(true);
    }
  });

  it('keeps named collections and real categories', () => {
    for (const name of [
      'English Movies',
      'DC Extended Universe-DCEU Collection (2008-2019)',
      'Charlie Chaplin-Complete Filmography (1914-1967)',
      '007 James Bond Films Collection (1962-2015) 1080p [Dual Audio]',
      'IMDb Top-250 Movies',
      'AEW Wrestling',
      'Korean Language',
    ]) {
      expect(isGroupingFolder(name)).toBe(false);
    }
  });
});

// ============================================================================
// episodes
// ============================================================================

describe('Episode Parser', () => {
  it('parses S01E01', () => {
    expect(parseEpisode('Breaking.Bad.S01E01.Pilot.1080p.BluRay.x264.mkv'))
      .toEqual({ season: 1, episode: 1 });
  });

  it('parses an apostrophe in the filename', () => {
    expect(parseEpisode("Breaking.Bad.S01E02.Cat's.in.the.Bag.1080p.mkv"))
      .toEqual({ season: 1, episode: 2 });
  });

  it('parses double-digit episodes', () => {
    expect(parseEpisode('Show.S02E15.Episode.Title.mkv')).toEqual({ season: 2, episode: 15 });
  });

  it('parses triple-digit episodes', () => {
    expect(parseEpisode('One.Piece.S01E150.Title.mkv')).toEqual({ season: 1, episode: 150 });
  });

  it('ignores case', () => {
    expect(parseEpisode('show.s01e01.mkv')).toEqual({ season: 1, episode: 1 });
    expect(parseEpisode('SHOW.S01E01.MKV')).toEqual({ season: 1, episode: 1 });
  });

  it('parses verbose Season N Episode N', () => {
    expect(parseEpisode('Show Season 3 Episode 7.mkv')).toEqual({ season: 3, episode: 7 });
  });

  it('returns null when no episode marker exists', () => {
    expect(parseEpisode('72.Hours.2026.720p.mkv')).toBeNull();
  });
});
