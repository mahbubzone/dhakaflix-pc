import { buildHomeTabs, getFeaturedCategoryOrder } from '../renderer/utils/homeTabs';

describe('buildHomeTabs', () => {
  it('puts Home, Movies and Series first', () => {
    const tabs = buildHomeTabs([]);

    expect(tabs.slice(0, 3)).toEqual([
      { kind: 'view', id: 'home', label: 'Home' },
      { kind: 'view', id: 'movies', label: 'Movies' },
      { kind: 'view', id: 'series', label: 'Series' },
    ]);
  });

  it('uses real categories and prioritises the screenshot order', () => {
    const tabs = buildHomeTabs([
      { category: 'Documentary', count: 9 },
      { category: 'English 1080p', count: 8 },
      { category: 'Korean', count: 7 },
      { category: 'Anime & Cartoon', count: 6 },
      { category: 'Movies', count: 100 },
    ]);

    expect(tabs.map((tab) => tab.label)).toEqual([
      'Home',
      'Movies',
      'Series',
      'Anime & Cartoon',
      'Korean',
      'English 1080p',
      'Documentary',
    ]);
    expect(tabs[3]).toEqual({ kind: 'category', id: 'Anime & Cartoon', label: 'Anime & Cartoon' });
  });

  it('returns one featured-first category order for tabs and rows', () => {
    const categories = [
      { category: 'Documentary', count: 9 },
      { category: 'English 1080p', count: 8 },
      { category: 'Korean', count: 7 },
      { category: 'Anime & Cartoon', count: 6 },
      { category: 'Movies', count: 100 },
    ];

    expect(getFeaturedCategoryOrder(categories)).toEqual([
      'Anime & Cartoon',
      'Korean',
      'English 1080p',
      'Documentary',
    ]);
    expect(buildHomeTabs(categories).slice(3).map((tab) => tab.label))
      .toEqual(getFeaturedCategoryOrder(categories).slice(0, 4));
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
