/**
 * HTTP Client Utilities
 * 
 * Fetch wrapper with timeout, retry, and rate limiting.
 */

import { logger } from './logger';

interface FetchOptions {
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  signal?: AbortSignal;
  headers?: Record<string, string>;
}

const DEFAULT_TIMEOUT = 30000; // 30 seconds
const DEFAULT_RETRIES = 2;
const DEFAULT_RETRY_DELAY = 1000; // 1 second

/**
 * Fetch with timeout and retry support
 */
export async function fetchWithRetry(
  url: string,
  options: FetchOptions = {}
): Promise<Response> {
  const {
    timeout = DEFAULT_TIMEOUT,
    retries = DEFAULT_RETRIES,
    retryDelay = DEFAULT_RETRY_DELAY,
    signal,
    headers,
  } = options;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const timeoutController = new AbortController();
    const timeoutId = setTimeout(() => timeoutController.abort(), timeout);

    // Bridge the caller's signal onto this attempt's controller. A listener
    // added directly to the caller's signal would accumulate across retries
    // and requests, so it is always removed in the finally block below.
    const onExternalAbort = () => timeoutController.abort();
    if (signal) {
      if (signal.aborted) {
        timeoutController.abort();
      } else {
        signal.addEventListener('abort', onExternalAbort, { once: true });
      }
    }

    try {
      const response = await fetch(url, { signal: timeoutController.signal, headers });

      if (!response.ok && response.status >= 500 && attempt < retries) {
        throw new Error(`HTTP ${response.status}`);
      }

      return response;
    } catch (error) {
      lastError = error as Error;

      // Cancellation is deliberate; never retry it.
      if (signal?.aborted) {
        throw error;
      }

      // A timeout is retryable, a caller abort was handled above.
      if (attempt < retries) {
        logger.debug(`Fetch retry ${attempt + 1}/${retries}`, {
          url,
          error: (error as Error).message,
        });
        await sleep(retryDelay * (attempt + 1));
      }
    } finally {
      clearTimeout(timeoutId);
      if (signal) {
        signal.removeEventListener('abort', onExternalAbort);
      }
    }
  }

  throw lastError || new Error('Fetch failed');
}

/**
 * Fetch and return text content
 */
export async function fetchText(url: string, options?: FetchOptions): Promise<string> {
  const response = await fetchWithRetry(url, options);
  return response.text();
}

/**
 * Fetch and return JSON content
 */
export async function fetchJson<T>(url: string, options?: FetchOptions): Promise<T> {
  const response = await fetchWithRetry(url, options);
  return response.json() as Promise<T>;
}

/**
 * Simple semaphore for concurrency control
 */
export class Semaphore {
  private permits: number;
  private waiting: Array<() => void> = [];

  constructor(permits: number) {
    this.permits = permits;
  }

  async acquire(): Promise<void> {
    if (this.permits > 0) {
      this.permits--;
      return;
    }

    return new Promise((resolve) => {
      this.waiting.push(resolve);
    });
  }

  release(): void {
    const next = this.waiting.shift();
    if (next) {
      next();
    } else {
      this.permits++;
    }
  }

  async withPermit<T>(fn: () => Promise<T>): Promise<T> {
    await this.acquire();
    try {
      return await fn();
    } finally {
      this.release();
    }
  }
}

/**
 * Sleep utility
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

