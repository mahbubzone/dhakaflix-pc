/**
 * usePlayer Hook
 * 
 * Manages external player detection and launch.
 */

import { useState, useEffect, useCallback } from 'react';
import type { PlayerInfo } from '../types';

interface UsePlayerResult {
  players: PlayerInfo[];
  hasPlayer: boolean;
  loading: boolean;
  play: (url: string, title?: string, startPosition?: number) => Promise<boolean>;
  openDownloadPage: (player: 'vlc' | 'potplayer') => void;
}

export function usePlayer(): UsePlayerResult {
  const [players, setPlayers] = useState<PlayerInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    window.api.player.getAvailable()
      .then(setPlayers)
      .finally(() => setLoading(false));
  }, []);

  const hasPlayer = players.some((p) => p.installed);

  const play = useCallback(async (
    url: string,
    title?: string,
    startPosition?: number
  ): Promise<boolean> => {
    const result = await window.api.player.play(url, {
      title,
      startPosition,
    });

    if (!result.launched && result.error) {
      console.error('Play failed:', result.error);
    }

    return result.launched;
  }, []);

  const openDownloadPage = useCallback((player: 'vlc' | 'potplayer') => {
    window.api.player.openDownload(player);
  }, []);

  return {
    players,
    hasPlayer,
    loading,
    play,
    openDownloadPage,
  };
}
