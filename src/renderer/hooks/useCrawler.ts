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
  isScanning: boolean;
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

  useEffect(() => {
    // Get initial status
    window.api.crawler.getStatus().then(setStatus);

    // Subscribe to progress updates
    const cleanupProgress = window.api.crawler.onProgress(setStatus);
    
    const cleanupComplete = window.api.crawler.onComplete(() => {
      setStatus((prev) => ({ ...prev, running: false, phase: 'idle' }));
    });

    const cleanupError = window.api.crawler.onError((error) => {
      console.error('Crawler error:', error);
      setStatus((prev) => ({ ...prev, running: false, phase: 'idle' }));
    });

    return () => {
      cleanupProgress();
      cleanupComplete();
      cleanupError();
    };
  }, []);

  const startScan = useCallback(async (sourceId?: number) => {
    await window.api.crawler.start(sourceId);
  }, []);

  const stopScan = useCallback(async () => {
    await window.api.crawler.stop();
  }, []);

  return {
    status,
    startScan,
    stopScan,
    isScanning: status.running,
  };
}
