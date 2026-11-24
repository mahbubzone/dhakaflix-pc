import { buildHomeTabs, getFeaturedCategoryOrder, getCategoryLabel } from '../renderer/utils/homeTabs';

const LIBRARY = [
  { category: 'Awards & TV Shows', count: 3 },
  { category: 'English Movies', count: 100 },
  { category: 'TV & Web Series', count: 20 },
  { category: 'Cartoon TV Series', count: 12 },
  { category: 'Documentary', count: 9 },
  { category: 'Korean TV & Web Series', count: 7 },
  { category: 'English Movies (1080p)', count: 50 },
  { category: 'Movies', count: 1000 },
];

describe('buildHomeTabs', () => {
  it('puts Home, Movies and Series first', () => {
    const tabs = buildHomeTabs([]);

    expect(tabs.slice(0, 3)).toEqual([
      { kind: 'view', id: 'home', label: 'Home' },
      { kind: 'view', id: 'movies', label: 'Movies' },
      { kind: 'view', id: 'series', label: 'Series' },
    ]);
  });

  it('maps real library categories to screenshot labels', () => {
    const tabs = buildHomeTabs(LIBRARY);

    expect(tabs.map((tab) => tab.label)).toEqual([
      'Home',
      'Movies',
      'Series',
      'English',
      'English 1080p',
      'Anime & Cartoon',
      'Korean',
    ]);
    expect(tabs[3]).toEqual({ kind: 'category', id: 'English Movies', label: 'English' });
  });

  it('skips the TV & Web Series category because Series is already a tab', () => {
    const tabs = buildHomeTabs(LIBRARY);

    expect(tabs.filter((tab) => tab.label === 'Series')).toHaveLength(1);
    expect(getFeaturedCategoryOrder(LIBRARY)).not.toContain('TV & Web Series');
  });

  it('deduplicates categories and uses one order for tabs and rows', () => {
    const categories = [...LIBRARY, { category: 'English Movies', count: 100 }];
    const order = getFeaturedCategoryOrder(categories);

    expect(new Set(order).size).toBe(order.length);
    expect(buildHomeTabs(categories).slice(3).map((tab) => tab.label))
      .toEqual(order.slice(0, 4).map(getCategoryLabel));
  });

  it('respects the tab limit', () => {
    const tabs = buildHomeTabs(
      ['A', 'B', 'C', 'D', 'E'].map((category) => ({ category, count: 1 })),
      5
    );

    expect(tabs).toHaveLength(5);
    expect(tabs.map((tab) => tab.label)).toEqual(['Home', 'Movies', 'Series', 'A', 'B']);
  });
});
