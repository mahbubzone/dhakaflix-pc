/**
 * Tracked VLC Playback
 *
 * Launches VLC with its local HTTP interface enabled and polls status.json
 * so the main process can persist real playback progress. PotPlayer is not
 * tracked; it keeps the plain detached-launch path in player.ts.
 */

import { spawn, type ChildProcess } from 'child_process';
import { randomBytes } from 'crypto';
import fs from 'fs';
import net from 'net';
import { BrowserWindow } from 'electron';
import { getDatabaseService } from './database';
import { isValidMovieId } from '../utils/validation';
import type { PlayOptions } from './player';

const POLL_INTERVAL_MS = 3000;
const AVAILABILITY_TIMEOUT_MS = 10000;
const STATUS_TIMEOUT_MS = 2000;
const MAX_TRACKED_SESSIONS = 4;
const WATCHED_RATIO = 0.95;

const VLC_PATHS = [
  'C:\\Program Files\\VideoLAN\\VLC\\vlc.exe',
  'C:\\Program Files (x86)\\VideoLAN\\VLC\\vlc.exe',
];

export interface VlcStatus {
  state: string | null;
  position: number | null;
  duration: number | null;
}

export interface TrackedPlaybackResult {
  launched: boolean;
  error?: string;
}

interface TrackedSession {
  id: number;
  child: ChildProcess;
  port: number;
  password: string;
  timer: ReturnType<typeof setInterval> | null;
  deadline: number;
  statusAvailable: boolean;
  unavailableEmitted: boolean;
  finished: boolean;
  polling: boolean;
  last: VlcStatus;
  href?: string;
  movieId?: number;
  episodeId?: number;
}

const sessions = new Map<number, TrackedSession>();
let nextSessionId = 0;

/** Normalize one VLC status field. Zero is valid; negatives and NaN are not. */
function parseNonNegativeNumber(value: unknown): number | null {
  if (typeof value === 'number') {
    return Number.isFinite(value) && value >= 0 ? value : null;
  }
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
  }
  return null;
}

/** Pure parser for the payload returned by /requests/status.json. */
export function parseVlcStatus(json: unknown): VlcStatus {
  if (!json || typeof json !== 'object') {
    return { state: null, position: null, duration: null };
  }
  const raw = json as Record<string, unknown>;
  return {
    state: typeof raw.state === 'string' ? raw.state : null,
    position: parseNonNegativeNumber(raw.time),
    duration: parseNonNegativeNumber(raw.length),
  };
}

/** Pure argument builder matching the verified VLC HTTP-interface launch. */
export function buildVlcArgs(
  url: string,
  port: number,
  password: string,
  options: PlayOptions = {}
): string[] {
  const args: string[] = [
    url,
    '--extraintf=http',
    '--http-host=127.0.0.1',
    `--http-port=${port}`,
    `--http-password=${password}`,
    '--no-one-instance',
    '--no-video-title-show',
  ];

  if (
    typeof options.startPosition === 'number'
    && Number.isFinite(options.startPosition)
    && options.startPosition > 0
  ) {
    args.push(`--start-time=${Math.floor(options.startPosition)}`);
  }

  return args;
}

function findVlcPath(): string | null {
  for (const candidate of VLC_PATHS) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}

function allocatePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    const onError = (error: Error) => {
      server.removeListener('error', onError);
      reject(error);
    };
    server.once('error', onError);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      const port = address && typeof address === 'object' ? address.port : 0;
      server.close(() => {
        server.removeListener('error', onError);
        if (port > 0) resolve(port);
        else reject(new Error('Could not allocate a local port'));
      });
    });
  });
}

function sendToRenderer(channel: string, payload: unknown): void {
  try {
    const windows = BrowserWindow.getAllWindows();
    const target = windows.find((window) => !window.isDestroyed()) ?? windows[0];
    target?.webContents.send(channel, payload);
  } catch {
    // Renderer may be closing; progress updates must never break playback.
  }
}

function progressPayload(session: TrackedSession, status: VlcStatus) {
  return {
    movieId: session.movieId ?? null,
    href: session.href ?? null,
    position: status.position,
    duration: status.duration,
    state: status.state,
  };
}

function persistStatus(session: TrackedSession, status: VlcStatus): void {
  if (!session.href || (status.position === null && status.duration === null)) return;
  const position = status.position ?? 0;
  const duration = status.duration ?? 0;
  try {
    const db = getDatabaseService();
    db.saveProgressByHref(
      session.href,
      session.movieId ?? null,
      position,
      duration,
      session.episodeId ?? null
    );
  } catch {
    // A stale episode id must not lose progress; retry without the link.
    try {
      getDatabaseService().saveProgressByHref(
        session.href!, session.movieId ?? null, position, duration
      );
    } catch {
      // A failed progress write must never stop or crash playback.
    }
  }
}

function isWatched(status: VlcStatus): boolean {
  return status.duration !== null
    && status.duration > 0
    && status.position !== null
    && status.position / status.duration >= WATCHED_RATIO;
}

function markWatched(session: TrackedSession): void {
  if (!session.href) return;
  try {
    getDatabaseService().markWatched(session.href);
  } catch {
    // See persistStatus above.
  }
}

/** Final save + session cleanup, idempotent. */
function finishSession(id: number): void {
  const session = sessions.get(id);
  if (!session || session.finished) return;

  session.finished = true;
  session.polling = false;
  if (session.timer) clearInterval(session.timer);
  session.timer = null;
  sessions.delete(id);

  if (session.last.position === null && session.last.duration === null) return;
  persistStatus(session, session.last);
  if (isWatched(session.last)) markWatched(session);
  sendToRenderer('player:progress', progressPayload(session, session.last));
}

async function fetchStatus(session: TrackedSession): Promise<VlcStatus | null> {
  try {
    const response = await fetch(
      `http://127.0.0.1:${session.port}/requests/status.json`,
      {
        headers: {
          Authorization: 'Basic ' + Buffer.from(':' + session.password).toString('base64'),
        },
        signal: AbortSignal.timeout(STATUS_TIMEOUT_MS),
      }
    );
    if (!response.ok) return null;
    return parseVlcStatus(await response.json());
  } catch {
    return null;
  }
}

async function pollSession(id: number): Promise<void> {
  const session = sessions.get(id);
  if (!session || session.finished || !session.polling) return;

  const status = await fetchStatus(session);

  // The session may have ended while the request was in flight.
  const current = sessions.get(id);
  if (!current || current.finished || !current.polling) return;

  const hasData = status !== null
    && (status.state !== null || status.position !== null || status.duration !== null);

  if (hasData && status) {
    const terminal = status.state === 'stopped' || status.state === 'ended';
    // VLC zeroes time/length once playback ends; keep the last real numbers.
    const position = terminal && (status.position === null || status.position === 0)
      ? current.last.position
      : status.position ?? current.last.position;
    const duration = terminal && (status.duration === null || status.duration === 0)
      ? current.last.duration
      : status.duration ?? current.last.duration;
    const merged: VlcStatus = { state: status.state, position, duration };

    current.statusAvailable = true;
    current.last = merged;
    persistStatus(current, merged);
    sendToRenderer('player:progress', progressPayload(current, merged));

    if (terminal) finishSession(id);
    return;
  }

  if (!current.statusAvailable && !current.unavailableEmitted && Date.now() >= current.deadline) {
    current.unavailableEmitted = true;
    current.polling = false;
    if (current.timer) clearInterval(current.timer);
    current.timer = null;
    // Release the tracking slot; the detached VLC process keeps playing.
    sessions.delete(id);
    sendToRenderer('player:progress-unavailable', {
      movieId: current.movieId ?? null,
      href: current.href ?? null,
    });
  }
}

/**
 * Launch VLC with progress tracking. Playback survives HTTP failures; only
 * polling stops in that case. At most four sessions are tracked at once.
 */
export async function startVlcTrackedPlayback(
  url: string,
  options: PlayOptions = {},
  vlcPath?: string
): Promise<TrackedPlaybackResult> {
  const executable = vlcPath ?? findVlcPath();
  if (!executable) return { launched: false, error: 'VLC not found' };

  let port: number;
  let password: string;
  let args: string[];
  try {
    port = await allocatePort();
    password = randomBytes(16).toString('hex');
    args = buildVlcArgs(url, port, password, options);
  } catch (error) {
    return { launched: false, error: (error as Error).message };
  }

  let child: ChildProcess;
  try {
    child = spawn(executable, args, {
      detached: true,
      stdio: 'ignore',
      windowsHide: false,
    });
    child.unref();
  } catch (error) {
    return { launched: false, error: (error as Error).message };
  }

  // Oldest trackers are disposed first; playback itself is left untouched.
  while (sessions.size >= MAX_TRACKED_SESSIONS) {
    const oldestId = sessions.keys().next().value;
    if (oldestId === undefined) break;
    finishSession(oldestId);
  }

  const id = ++nextSessionId;
  const session: TrackedSession = {
    id,
    child,
    port,
    password,
    timer: null,
    deadline: Date.now() + AVAILABILITY_TIMEOUT_MS,
    statusAvailable: false,
    unavailableEmitted: false,
    finished: false,
    polling: true,
    last: { state: null, position: null, duration: null },
    href: typeof options.href === 'string' && options.href ? options.href : undefined,
    movieId: isValidMovieId(options.movieId) ? options.movieId : undefined,
    episodeId: isValidMovieId(options.episodeId) ? options.episodeId : undefined,
  };
  session.timer = setInterval(() => { void pollSession(id); }, POLL_INTERVAL_MS);
  sessions.set(id, session);

  child.once('error', () => finishSession(id));
  child.once('exit', () => finishSession(id));

  return { launched: true };
}
