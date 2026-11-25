import { getFeaturedCategoryOrder, FEATURED_CATEGORIES } from '../main/services/home';

describe('getFeaturedCategoryOrder', () => {
  it('puts featured categories first in the fixed order', () => {
    const names = ['Awards & TV Shows', 'Zulu', 'Documentary', 'English Movies'];
    expect(getFeaturedCategoryOrder(names)).toEqual([
      'English Movies',
      'Documentary',
      'Awards & TV Shows',
      'Zulu',
    ]);
  });

  it('ignores featured categories that are absent and deduplicates', () => {
    const names = ['Hindi Movies', 'English Movies', 'Hindi Movies'];
    expect(getFeaturedCategoryOrder(names)).toEqual(['English Movies', 'Hindi Movies']);
  });

  it('keeps the full featured list available', () => {
    expect(FEATURED_CATEGORIES).toEqual([
      'English Movies',
      'English Movies (1080p)',
      'Cartoon TV Series',
      'Korean TV & Web Series',
      'Documentary',
      'Awards & TV Shows',
    ]);
  });
});
