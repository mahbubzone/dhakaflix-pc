/**
 * Default DhakaFlix Sources
 * 
 * Pre-configured ISP media server categories.
 * These are embedded as defaults for first-run setup.
 */

export interface DefaultSource {
  name: string;
  baseUrl: string;
  category: 'movies' | 'series' | 'other';
  isSeries: boolean;
}

export const DHAKAFLIX_SOURCES: DefaultSource[] = [
  // ============================================================
  // Movies
  // ============================================================
  {
    name: 'English Movies',
    baseUrl: 'http://172.16.50.7/DHAKA-FLIX-7/English%20Movies/',
    category: 'movies',
    isSeries: false,
  },
  {
    name: 'English Movies (1080p)',
    baseUrl: 'http://172.16.50.14/DHAKA-FLIX-14/English%20Movies%20%281080p%29/',
    category: 'movies',
    isSeries: false,
  },
  {
    name: 'Hindi Movies',
    baseUrl: 'http://172.16.50.14/DHAKA-FLIX-14/Hindi%20Movies/',
    category: 'movies',
    isSeries: false,
  },
  {
    name: 'South Indian Movies',
    baseUrl: 'http://172.16.50.14/DHAKA-FLIX-14/SOUTH%20INDIAN%20MOVIES/South%20Movies/',
    category: 'movies',
    isSeries: false,
  },
  {
    name: 'South Movies (Hindi Dubbed)',
    baseUrl: 'http://172.16.50.14/DHAKA-FLIX-14/SOUTH%20INDIAN%20MOVIES/Hindi%20Dubbed/',
    category: 'movies',
    isSeries: false,
  },
  {
    name: 'Kolkata Bangla Movies',
    baseUrl: 'http://172.16.50.7/DHAKA-FLIX-7/Kolkata%20Bangla%20Movies/',
    category: 'movies',
    isSeries: false,
  },
  {
    name: 'Animation Movies',
    baseUrl: 'http://172.16.50.14/DHAKA-FLIX-14/Animation%20Movies/',
    category: 'movies',
    isSeries: false,
  },
  {
    name: 'Animation Movies (1080p)',
    baseUrl: 'http://172.16.50.14/DHAKA-FLIX-14/Animation%20Movies%20%281080p%29/',
    category: 'movies',
    isSeries: false,
  },
  {
    name: 'Foreign Language Movies',
    baseUrl: 'http://172.16.50.7/DHAKA-FLIX-7/Foreign%20Language%20Movies/',
    category: 'movies',
    isSeries: false,
  },
  {
    name: 'IMDb Top-250 Movies',
    baseUrl: 'http://172.16.50.14/DHAKA-FLIX-14/IMDb%20Top-250%20Movies/',
    category: 'movies',
    isSeries: false,
  },

  // ============================================================
  // TV & Web Series
  // ============================================================
  {
    name: 'TV & Web Series',
    baseUrl: 'http://172.16.50.12/DHAKA-FLIX-12/TV-WEB-Series/',
    category: 'series',
    isSeries: true,
  },
  {
    name: 'Korean TV & Web Series',
    baseUrl: 'http://172.16.50.14/DHAKA-FLIX-14/KOREAN%20TV%20%26%20WEB%20Series/',
    category: 'series',
    isSeries: true,
  },
  {
    name: 'Cartoon TV Series',
    baseUrl: 'http://172.16.50.10/DHAKA-FLIX-10/Anime%20%26%20Cartoon%20TV%20Series/',
    category: 'series',
    isSeries: true,
  },

  // ============================================================
  // Other
  // ============================================================
  {
    name: 'Documentary',
    baseUrl: 'http://172.16.50.10/DHAKA-FLIX-10/Documentary/',
    category: 'other',
    isSeries: false,
  },
  {
    name: 'WWE & AEW Wrestling',
    baseUrl: 'http://172.16.50.10/DHAKA-FLIX-10/WWE%20%26%20AEW%20Wrestling/',
    category: 'other',
    isSeries: false,
  },
  {
    name: 'Awards & TV Shows',
    baseUrl: 'http://172.16.50.10/DHAKA-FLIX-10/Awards%20%26%20TV%20Shows/',
    category: 'other',
    isSeries: false,
  },
];

/**
 * Group sources by category for UI display
 */
export function getSourcesByCategory(): Record<string, DefaultSource[]> {
  return {
    movies: DHAKAFLIX_SOURCES.filter(s => s.category === 'movies'),
    series: DHAKAFLIX_SOURCES.filter(s => s.category === 'series'),
    other: DHAKAFLIX_SOURCES.filter(s => s.category === 'other'),
  };
}

/**
 * Get all server hosts (for network validation)
 */
export function getDhakaFlixHosts(): string[] {
  const hosts = new Set<string>();
  for (const source of DHAKAFLIX_SOURCES) {
    try {
      const url = new URL(source.baseUrl);
      hosts.add(url.hostname);
    } catch {
      // Invalid URL, skip
    }
  }
  return Array.from(hosts);
}

// Extracted hosts: 172.16.50.7, 172.16.50.10, 172.16.50.12, 172.16.50.14
