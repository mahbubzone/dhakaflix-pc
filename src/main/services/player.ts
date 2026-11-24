/**
 * Player Service
 * 
 * Detects and launches external video players (VLC, PotPlayer).
 */

import { spawn } from 'child_process';
import { shell } from 'electron';
import fs from 'fs';

export interface PlayerInfo {
  name: 'vlc' | 'potplayer';
  installed: boolean;
  path: string | null;
}

const VLC_PATHS = [
  'C:\\Program Files\\VideoLAN\\VLC\\vlc.exe',
  'C:\\Program Files (x86)\\VideoLAN\\VLC\\vlc.exe',
];

const POTPLAYER_PATHS = [
  'C:\\Program Files\\DAUM\\PotPlayer\\PotPlayerMini64.exe',
  'C:\\Program Files (x86)\\DAUM\\PotPlayer\\PotPlayerMini.exe',
  'C:\\Program Files\\DAUM\\PotPlayer\\PotPlayerMini.exe',
];

const DOWNLOAD_URLS = {
  vlc: 'https://www.videolan.org/vlc/',
  potplayer: 'https://potplayer.daum.net/',
};

function findExecutable(paths: string[]): string | null {
  for (const p of paths) {
    if (fs.existsSync(p)) {
      return p;
    }
  }
  return null;
}

export function getAvailablePlayers(): PlayerInfo[] {
  const vlcPath = findExecutable(VLC_PATHS);
  const potPath = findExecutable(POTPLAYER_PATHS);

  return [
    {
      name: 'vlc',
      installed: vlcPath !== null,
      path: vlcPath,
    },
    {
      name: 'potplayer',
      installed: potPath !== null,
      path: potPath,
    },
  ];
}

export interface PlayOptions {
  startPosition?: number; // seconds
  title?: string;
  preferredPlayer?: 'vlc' | 'potplayer';
}

export interface PlayResult {
  launched: boolean;
  player: string | null;
  error?: string;
}

export function play(url: string, options: PlayOptions = {}): PlayResult {
  // Validate URL
  try {
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return { launched: false, player: null, error: 'Invalid protocol' };
    }
  } catch {
    return { launched: false, player: null, error: 'Invalid URL' };
  }

  const players = getAvailablePlayers();
  
  // Find preferred or first available player
  let player: PlayerInfo | undefined;
  if (options.preferredPlayer) {
    player = players.find(p => p.name === options.preferredPlayer && p.installed);
  }
  if (!player) {
    player = players.find(p => p.installed);
  }

  if (!player || !player.path) {
    return { 
      launched: false, 
      player: null, 
      error: 'No video player found. Please install VLC or PotPlayer.' 
    };
  }

  const args = buildPlayerArgs(player.name, url, options);

  try {
    const child = spawn(player.path, args, {
      detached: true,
      stdio: 'ignore',
      windowsHide: false,
    });
    child.unref();

    return { launched: true, player: player.name };
  } catch (error) {
    return { 
      launched: false, 
      player: player.name, 
      error: (error as Error).message 
    };
  }
}

function buildPlayerArgs(
  playerName: 'vlc' | 'potplayer',
  url: string,
  options: PlayOptions
): string[] {
  const args: string[] = [];

  if (playerName === 'vlc') {
    args.push(url);
    if (options.startPosition && options.startPosition > 0) {
      args.push(`--start-time=${Math.floor(options.startPosition)}`);
    }
    if (options.title) {
      args.push(`--meta-title=${options.title}`);
    }
  } else if (playerName === 'potplayer') {
    args.push(url);
    if (options.startPosition && options.startPosition > 0) {
      // PotPlayer uses milliseconds
      args.push(`/seek=${Math.floor(options.startPosition * 1000)}`);
    }
    if (options.title) {
      args.push(`/title=${options.title}`);
    }
  }

  return args;
}

export function openPlayerDownload(player: 'vlc' | 'potplayer'): void {
  const url = DOWNLOAD_URLS[player];
  if (url) {
    shell.openExternal(url);
  }
}
