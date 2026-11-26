/**
 * usePlayer Hook
 * 
 * Manages external player detection and launch.
 */

import { useState, useEffect, useCallback } from 'react';
import type { PlayerInfo } from '../types';

export interface PlayOptions {
  startPosition?: number;
  title?: string;
  preferredPlayer?: 'vlc' | 'potplayer';
  movieId?: number;
  href?: string;
  episodeId?: number;
}

interface PlayResult {
  launched: boolean;
  player: string | null;
  tracking: boolean;
  error?: string;
}

interface UsePlayerResult {
  players: PlayerInfo[];
  hasPlayer: boolean;
  loading: boolean;
  refresh: () => void;
  play: (url: string, options?: PlayOptions) => Promise<PlayResult>;
  openDownloadPage: (player: 'vlc' | 'potplayer') => void;
}

export function usePlayer(): UsePlayerResult {
  const [players, setPlayers] = useState<PlayerInfo[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(() => {
    setLoading(true);
    window.api.player.getAvailable()
      .then(setPlayers)
      .catch(() => setPlayers([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const hasPlayer = players.some((p) => p.installed);

  const play = useCallback(async (
    url: string,
    options: PlayOptions = {}
  ): Promise<PlayResult> => {
    const result = await window.api.player.play(url, options);

    if (!result.launched && result.error) {
      console.error('Play failed:', result.error);
    }

    return result;
  }, []);

  const openDownloadPage = useCallback((player: 'vlc' | 'potplayer') => {
    window.api.player.openDownload(player);
  }, []);

  return {
    players,
    hasPlayer,
    loading,
    refresh,
    play,
    openDownloadPage,
  };
}
