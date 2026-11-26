/**
 * useCrawler Hook
 * 
 * Manages crawler state and progress.
 */

import { useState, useEffect, useCallback } from 'react';
import type { ScanStatus } from '../types';

interface UseCrawlerResult {
  status: ScanStatus;
  startScan: (sourceId?: number) => Promise<void>;
  stopScan: () => Promise<void>;
  clearError: () => void;
  isScanning: boolean;
  error: string | null;
  completedAt: number | null;
}

const DEFAULT_STATUS: ScanStatus = {
  running: false,
  sourceId: null,
  sourceName: null,
  phase: 'idle',
  scanned: 0,
  discovered: 0,
  currentPath: null,
};

export function useCrawler(): UseCrawlerResult {
  const [status, setStatus] = useState<ScanStatus>(DEFAULT_STATUS);
  const [error, setError] = useState<string | null>(null);
  const [completedAt, setCompletedAt] = useState<number | null>(null);

  useEffect(() => {
    window.api.crawler.getStatus().then(setStatus);

    const cleanupProgress = window.api.crawler.onProgress(setStatus);

    const cleanupComplete = window.api.crawler.onComplete(() => {
      setStatus((prev) => ({ ...prev, running: false, phase: 'idle' }));
      setError(null);
      setCompletedAt(Date.now());
    });

    const cleanupError = window.api.crawler.onError((message) => {
      console.error('Crawler error:', message);
      setStatus((prev) => ({ ...prev, running: false, phase: 'idle' }));
      setError(message || 'Scan stopped unexpectedly.');
    });

    return () => {
      cleanupProgress();
      cleanupComplete();
      cleanupError();
    };
  }, []);

  const startScan = useCallback(async (sourceId?: number) => {
    setError(null);
    try {
      await window.api.crawler.start(sourceId);
    } catch (cause) {
      setError((cause as Error).message || 'Could not start the scan.');
    }
  }, []);

  const stopScan = useCallback(async () => {
    try {
      await window.api.crawler.stop();
    } catch (cause) {
      setError((cause as Error).message || 'Could not stop the scan.');
    }
  }, []);

  return {
    status,
    startScan,
    stopScan,
    clearError: () => setError(null),
    isScanning: status.running,
    error,
    completedAt,
  };
}
