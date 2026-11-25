import { parseVlcStatus, buildVlcArgs } from '../main/services/playback';

describe('parseVlcStatus', () => {
  it('parses numeric time and length', () => {
    expect(parseVlcStatus({ state: 'playing', time: 42, length: 6313 })).toEqual({
      state: 'playing',
      position: 42,
      duration: 6313,
    });
  });

  it('accepts numeric strings', () => {
    expect(parseVlcStatus({ state: 'paused', time: '12', length: '240' })).toEqual({
      state: 'paused',
      position: 12,
      duration: 240,
    });
  });

  it('ignores negative, NaN, and infinite values', () => {
    expect(parseVlcStatus({ state: 'playing', time: -1, length: Number.POSITIVE_INFINITY })).toEqual({
      state: 'playing',
      position: null,
      duration: null,
    });
    expect(parseVlcStatus({ time: 'abc', length: NaN })).toEqual({
      state: null,
      position: null,
      duration: null,
    });
  });

  it('keeps zero as a valid position', () => {
    expect(parseVlcStatus({ state: 'playing', time: 0, length: 0 })).toEqual({
      state: 'playing',
      position: 0,
      duration: 0,
    });
  });

  it('returns null fields for invalid payloads', () => {
    for (const input of [null, undefined, 'playing', 42]) {
      expect(parseVlcStatus(input)).toEqual({ state: null, position: null, duration: null });
    }
  });
});

describe('buildVlcArgs', () => {
  const url = 'http://127.0.0.1:8080/video.mkv';

  it('builds the verified HTTP interface arguments', () => {
    expect(buildVlcArgs(url, 43210, 'secret')).toEqual([
      url,
      '--extraintf=http',
      '--http-host=127.0.0.1',
      '--http-port=43210',
      '--http-password=secret',
      '--no-one-instance',
      '--no-video-title-show',
    ]);
  });

  it('adds a floored start time when provided', () => {
    expect(buildVlcArgs(url, 1234, 'pw', { startPosition: 90.9 }))
      .toContain('--start-time=90');
  });

  it('omits start time for zero or invalid values', () => {
    for (const startPosition of [0, -3, Number.NaN, Number.POSITIVE_INFINITY]) {
      const args = buildVlcArgs(url, 1234, 'pw', { startPosition });
      expect(args.some((arg) => arg.startsWith('--start-time='))).toBe(false);
    }
  });
});
