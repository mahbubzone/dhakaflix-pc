import { resumePositionFor } from '../renderer/utils/playbackProgress';

describe('resumePositionFor', () => {
  const episode = { position: 900, duration: 1200, watched: 0 };

  it('uses the progress read for the href being launched', () => {
    expect(resumePositionFor(episode)).toBe(900);
  });

  it('never resumes when starting from the beginning', () => {
    expect(resumePositionFor(episode, true)).toBeUndefined();
  });

  it('ignores watched, zero and invalid progress', () => {
    expect(resumePositionFor({ ...episode, watched: 1 })).toBeUndefined();
    expect(resumePositionFor(null)).toBeUndefined();
    expect(resumePositionFor(undefined)).toBeUndefined();
    expect(resumePositionFor({ position: 0, duration: 1200, watched: 0 })).toBeUndefined();
    expect(resumePositionFor({ position: 10, duration: 0, watched: 0 })).toBeUndefined();
    expect(resumePositionFor({ position: 1200, duration: 1200, watched: 0 })).toBeUndefined();
    expect(resumePositionFor({ position: Number.NaN, duration: 1200, watched: 0 })).toBeUndefined();
  });
});
