import { simpleBackView } from '../renderer/utils/navigation';

describe('simpleBackView', () => {
  it('keeps views that need no extra state', () => {
    expect(simpleBackView('home')).toBe('home');
    expect(simpleBackView('search')).toBe('search');
  });

  it('never returns an empty detail or category view', () => {
    expect(simpleBackView('detail')).toBe('home');
    expect(simpleBackView('category')).toBe('home');
    expect(simpleBackView(undefined)).toBe('home');
  });
});
