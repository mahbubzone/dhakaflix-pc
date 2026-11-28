import { takeUnique } from '../renderer/utils/dedupe';
import type { Movie } from '../renderer/types';

const movie = (id: number): Movie => ({
  id,
  title: `Title ${id}`,
  href: `/movie/${id}.mkv`,
} as Movie);

describe('Home rail dedupe', () => {
  it('keeps the first occurrence and records seen ids', () => {
    const seen = new Set<number>();
    const result = takeUnique([movie(1), movie(2), movie(1)], seen);

    expect(result.map((item) => item.id)).toEqual([1, 2]);
    expect([...seen]).toEqual([1, 2]);
  });

  it('drops titles already shown in a higher-priority rail', () => {
    const seen = new Set<number>([1, 2]);
    const result = takeUnique([movie(1), movie(2), movie(3)], seen);

    expect(result.map((item) => item.id)).toEqual([3]);
  });

  it('handles empty input without mutating the seen set', () => {
    const seen = new Set<number>([7]);
    expect(takeUnique([], seen)).toEqual([]);
    expect([...seen]).toEqual([7]);
  });
});
