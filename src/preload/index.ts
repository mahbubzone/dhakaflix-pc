/**
 * Preload Script
 * 
 * Exposes a safe API to the renderer process via contextBridge.
 * This is the ONLY way for renderer to communicate with main process.
 */

import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';

// Type definitions
export interface Movie {
  id: number;
  href: string;
  parent: string | null;
  source_id: number;
  category: string | null;
  title: string;
  year: number | null;
  quality: string | null;
  dual_audio: number;
  kind: number;
  poster: string | null;
  video: string | null;
  size: number;
  added: number;
  seen: number;
}

export interface Episode {
  id: number;
  movie_id: number;
  href: string;
  season: number;
  episode: number;
  title: string | null;
  size: number;
}

export interface Source {
  id: number;
  name: string;
  base_url: string;
  format: 'h5ai' | 'nginx' | 'apache' | 'unknown';
  enabled: number;
  last_scan_at: number | null;
  last_scan_count: number;
}

export interface ScanStatus {
  running: boolean;
  sourceId: number | null;
  sourceName: string | null;
  phase: 'idle' | 'scanning' | 'indexing';
  scanned: number;
  discovered: number;
  currentPath: string | null;
}

export interface PlayerInfo {
  name: 'vlc' | 'potplayer';
  installed: boolean;
  path: string | null;
}

export interface PlayResult {
  launched: boolean;
  player: string | null;
  error?: string;
}

export interface UpdateStatus {
  checking: boolean;
  available: boolean;
  downloading: boolean;
  downloaded: boolean;
  version: string | null;
  progress: number;
  error: string | null;
}

export interface UpdateResult {
  ok: boolean;
  error: string | null;
}

// API exposed to renderer
const api = {
  // ============================================================
  // Database
  // ============================================================
  db: {
    getMovies: (options: {
      category?: string;
      kind?: 0 | 1;
      limit: number;
      offset: number;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
    }): Promise<{ movies: Movie[]; total: number }> =>
      ipcRenderer.invoke('db:getMovies', options),

    getMovie: (id: number): Promise<Movie | null> =>
      ipcRenderer.invoke('db:getMovie', id),

    searchMovies: (query: string, limit?: number): Promise<Movie[]> =>
      ipcRenderer.invoke('db:search', query, limit),

    getCategories: (): Promise<{ category: string; count: number }[]> =>
      ipcRenderer.invoke('db:getCategories'),

    getEpisodes: (movieId: number): Promise<Episode[]> =>
      ipcRenderer.invoke('db:getEpisodes', movieId),

    getContinueWatching: (limit: number): Promise<(Movie & { position: number; duration: number })[]> =>
      ipcRenderer.invoke('db:getContinueWatching', limit),

    saveProgress: (href: string, position: number, duration: number): Promise<void> =>
      ipcRenderer.invoke('db:saveProgress', href, position, duration),

    markWatched: (href: string): Promise<void> =>
      ipcRenderer.invoke('db:markWatched', href),

    getProgress: (href: string): Promise<{ position: number; duration: number; watched: number } | null> =>
      ipcRenderer.invoke('db:getProgress', href),
  },

  // ============================================================
  // Crawler
  // ============================================================
  crawler: {
    start: (sourceId?: number): Promise<void> =>
      ipcRenderer.invoke('crawler:start', sourceId),

    stop: (): Promise<void> =>
      ipcRenderer.invoke('crawler:stop'),

    getStatus: (): Promise<ScanStatus> =>
      ipcRenderer.invoke('crawler:status'),

    onProgress: (callback: (status: ScanStatus) => void): (() => void) => {
      const handler = (_: IpcRendererEvent, status: ScanStatus) => callback(status);
      ipcRenderer.on('crawler:progress', handler);
      return () => ipcRenderer.removeListener('crawler:progress', handler);
    },

    onComplete: (callback: (result: unknown) => void): (() => void) => {
      const handler = (_: IpcRendererEvent, result: unknown) => callback(result);
      ipcRenderer.on('crawler:complete', handler);
      return () => ipcRenderer.removeListener('crawler:complete', handler);
    },

    onError: (callback: (error: string) => void): (() => void) => {
      const handler = (_: IpcRendererEvent, error: string) => callback(error);
      ipcRenderer.on('crawler:error', handler);
      return () => ipcRenderer.removeListener('crawler:error', handler);
    },
  },

  // ============================================================
  // Media Assets
  // ============================================================
  media: {
    resolve: (movieId: number): Promise<{
      movieId: number;
      video: string | null;
      poster: string | null;
      episodes: number;
      cached: boolean;
    }> => ipcRenderer.invoke('media:resolve', movieId),
  },

  // ============================================================
  // Player
  // ============================================================
  player: {
    getAvailable: (): Promise<PlayerInfo[]> =>
      ipcRenderer.invoke('player:getAvailable'),

    play: (url: string, options?: {
      startPosition?: number;
      title?: string;
      preferredPlayer?: 'vlc' | 'potplayer';
    }): Promise<PlayResult> =>
      ipcRenderer.invoke('player:play', url, options),

    openDownload: (player: 'vlc' | 'potplayer'): Promise<void> =>
      ipcRenderer.invoke('player:openDownload', player),
  },

  // ============================================================
  // Sources
  // ============================================================
  sources: {
    getAll: (): Promise<Source[]> =>
      ipcRenderer.invoke('sources:getAll'),

    add: (source: { name: string; baseUrl: string }): Promise<Source> =>
      ipcRenderer.invoke('sources:add', source),

    remove: (id: number): Promise<void> =>
      ipcRenderer.invoke('sources:remove', id),

    test: (baseUrl: string): Promise<{ ok: boolean; format: string | null; error?: string }> =>
      ipcRenderer.invoke('sources:test', baseUrl),
  },

  // ============================================================
  // Updates
  // ============================================================
  update: {
    getStatus: (): Promise<UpdateStatus> =>
      ipcRenderer.invoke('update:getStatus'),

    getVersion: (): Promise<string> =>
      ipcRenderer.invoke('update:getVersion'),

    check: (): Promise<UpdateStatus> =>
      ipcRenderer.invoke('update:check'),

    download: (): Promise<UpdateResult> =>
      ipcRenderer.invoke('update:download'),

    install: (): Promise<UpdateResult> =>
      ipcRenderer.invoke('update:install'),

    onAvailable: (callback: (info: { version: string }) => void): (() => void) => {
      const handler = (_: IpcRendererEvent, info: { version: string }) => callback(info);
      ipcRenderer.on('update:available', handler);
      return () => ipcRenderer.removeListener('update:available', handler);
    },

    onProgress: (callback: (progress: { percent: number }) => void): (() => void) => {
      const handler = (_: IpcRendererEvent, progress: { percent: number }) => callback(progress);
      ipcRenderer.on('update:progress', handler);
      return () => ipcRenderer.removeListener('update:progress', handler);
    },

    onReady: (callback: () => void): (() => void) => {
      const handler = () => callback();
      ipcRenderer.on('update:ready', handler);
      return () => ipcRenderer.removeListener('update:ready', handler);
    },
  },

  // ============================================================
  // Window
  // ============================================================
  window: {
    minimize: (): void => ipcRenderer.send('window:minimize'),
    
    maximize: (): void => ipcRenderer.send('window:maximize'),
    
    close: (): void => ipcRenderer.send('window:close'),
    
    isMaximized: (): Promise<boolean> => ipcRenderer.invoke('window:isMaximized'),
    
    onMaximizeChange: (callback: (maximized: boolean) => void): (() => void) => {
      const handler = (_: IpcRendererEvent, maximized: boolean) => callback(maximized);
      ipcRenderer.on('window:maximizeChange', handler);
      return () => ipcRenderer.removeListener('window:maximizeChange', handler);
    },
  },
};

// Expose to renderer
contextBridge.exposeInMainWorld('api', api);

// Type declaration for renderer
declare global {
  interface Window {
    api: typeof api;
  }
}
