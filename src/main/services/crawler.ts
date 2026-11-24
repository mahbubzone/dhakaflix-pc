/**
 * Crawler Service
 * 
 * Discovers and indexes media from ISP directory listings.
 * Supports h5ai, nginx autoindex, and Apache autoindex formats.
 * 
 * Features:
 * - BFS directory walk with semaphore (max 4 concurrent)
 * - Incremental scanning via mtime tracking
 * - Mark-and-sweep deletion for removed entries
 * - Progress events for UI updates
 */

import { EventEmitter } from 'events';
import Database from 'better-sqlite3';
import { getDatabase } from './database';
import { parseH5ai } from './parsers/h5ai';
import { parseNginx } from './parsers/nginx';
import { parseApache } from './parsers/apache';
import { parseTitle, isGroupingFolder } from './parsers/title';
import type { DirectoryEntry } from '../../shared/types';
import { fetchText } from '../utils/http';

export interface ScanStatus {
  running: boolean;
  sourceId: number | null;
  sourceName: string | null;
  phase: 'idle' | 'scanning' | 'indexing';
  scanned: number;
  discovered: number;
  currentPath: string | null;
}

export interface ScanResult {
  sourceId: number;
  added: number;
  updated: number;
  removed: number;
  duration: number;
}

export type { DirectoryEntry } from '../../shared/types';

interface Source {
  id: number;
  name: string;
  base_url: string;
  format: 'h5ai' | 'nginx' | 'apache' | 'unknown';
  enabled: number;
}

interface QueueItem {
  href: string;
  depth: number;
  category: string | null;
}

interface PendingMovie {
  href: string;
  parent: string;
  sourceId: number;
  category: string | null;
  title: string;
  year: number;
  quality: string | null;
  dualAudio: boolean;
  kind: number;
  scanId: number;
}

const MAX_CONCURRENT = 4;
const PROGRESS_INTERVAL = 50;
const MAX_DEPTH = 10;
const RETRY_DELAYS = [1000, 2000, 4000];

class CrawlerService extends EventEmitter {
  private status: ScanStatus = {
    running: false,
    sourceId: null,
    sourceName: null,
    phase: 'idle',
    scanned: 0,
    discovered: 0,
    currentPath: null,
  };

  private abortController: AbortController | null = null;
  private progressCounter = 0;

  getStatus(): ScanStatus {
    return { ...this.status };
  }

  async startScan(sourceId: number): Promise<void> {
    if (this.status.running) {
      throw new Error('Scan already in progress');
    }

    const db = getDatabase();
    const source = db.prepare('SELECT * FROM sources WHERE id = ?').get(sourceId) as Source | undefined;
    
    if (!source) {
      throw new Error(`Source ${sourceId} not found`);
    }

    this.abortController = new AbortController();
    this.progressCounter = 0;
    this.status = {
      running: true,
      sourceId,
      sourceName: source.name,
      phase: 'scanning',
      scanned: 0,
      discovered: 0,
      currentPath: null,
    };

    this.emit('progress', this.status);

    try {
      const result = await this.runScan(source);
      this.emit('complete', result);
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        this.emit('error', (error as Error).message);
      }
    } finally {
      this.status.running = false;
      this.status.phase = 'idle';
      this.abortController = null;
      this.emit('progress', this.status);
    }
  }

  stopScan(): void {
    if (this.abortController) {
      this.abortController.abort();
    }
  }

  private async runScan(source: Source): Promise<ScanResult> {
    const startTime = Date.now();
    const db = getDatabase();
    const scanId = Date.now();
    
    let added = 0;
    let updated = 0;
    
    // Detect format if unknown
    let format = source.format;
    if (format === 'unknown') {
      const html = await this.fetchWithRetry(source.base_url);
      format = this.detectFormat(html);
      if (format !== 'unknown') {
        db.prepare('UPDATE sources SET format = ? WHERE id = ?').run(format, source.id);
      }
    }

    // BFS queue
    const queue: QueueItem[] = [{ href: source.base_url, depth: 0, category: null }];
    const visited = new Set<string>();
    const pendingMovies: PendingMovie[] = [];
    
    // Semaphore for concurrent fetches
    let activeCount = 0;
    const semaphore = {
      acquire: async () => {
        while (activeCount >= MAX_CONCURRENT) {
          await new Promise(r => setTimeout(r, 50));
          this.checkAbort();
        }
        activeCount++;
      },
      release: () => { activeCount--; }
    };

    // Process queue with concurrency
    while (queue.length > 0 || activeCount > 0) {
      this.checkAbort();
      
      // Fill up to MAX_CONCURRENT workers
      const batch: Promise<void>[] = [];
      while (queue.length > 0 && activeCount < MAX_CONCURRENT) {
        const item = queue.shift()!;
        if (visited.has(item.href)) continue;
        visited.add(item.href);
        
        await semaphore.acquire();
        batch.push(this.processDirectory(
          item, source, format, scanId, queue, pendingMovies, db, semaphore
        ));
      }
      
      if (batch.length > 0) {
        await Promise.allSettled(batch);
      } else if (activeCount > 0) {
        // Wait for active workers
        await new Promise(r => setTimeout(r, 50));
      }
    }

    // Batch insert movies
    this.status.phase = 'indexing';
    this.emitProgress();
    
    const insertResult = this.batchInsertMovies(db, pendingMovies);
    added = insertResult.added;
    updated = insertResult.updated;

    // Mark-and-sweep: remove movies not seen in this scan
    const removed = this.removeStaleMovies(db, source.id, scanId);

    // Update source metadata
    db.prepare(`
      UPDATE sources 
      SET last_scan_at = strftime('%s', 'now'), 
          last_scan_count = ?
      WHERE id = ?
    `).run(this.status.discovered, source.id);

    return {
      sourceId: source.id,
      added,
      updated,
      removed,
      duration: Date.now() - startTime,
    };
  }

  private async processDirectory(
    item: QueueItem,
    source: Source,
    format: string,
    scanId: number,
    queue: QueueItem[],
    pendingMovies: PendingMovie[],
    db: Database.Database,
    semaphore: { release: () => void }
  ): Promise<void> {
    try {
      this.status.currentPath = item.href.replace(source.base_url, '/');
      
      let html: string;
      try {
        html = await this.fetchWithRetry(item.href);
      } catch (error) {
        // Network error, skip this directory
        return;
      }

      const entries = this.parseEntries(format, item.href, html);
      
      // Get max mtime from entries for incremental scan comparison
      const dirMtime = Math.max(0, ...entries.map(e => e.mtime));
      
      // Check if directory changed since last scan
      const cachedDir = db.prepare('SELECT mtime FROM dirs WHERE href = ?').get(item.href) as { mtime: number } | undefined;
      const dirChanged = !cachedDir || cachedDir.mtime !== dirMtime;
      
      // Update dirs table
      db.prepare(`
        INSERT INTO dirs (href, source_id, mtime) VALUES (?, ?, ?)
        ON CONFLICT(href) DO UPDATE SET mtime = excluded.mtime
      `).run(item.href, source.id, dirMtime);

      this.status.scanned++;

      for (const entry of entries) {
        this.checkAbort();

        if (!entry.isDirectory) continue;

        // Try to parse as title
        const parsed = parseTitle(entry.name);
        
        if (parsed) {
          // It's a movie/series folder
          this.status.discovered++;
          
          // Only add/update if directory contents changed or movie is new
          if (dirChanged) {
            // Determine category from path. Titles sitting directly in the
            // source root have no parent folder, so fall back to the source
            // name instead of leaving the row uncategorised.
            const category =
              item.category ??
              this.extractCategory(item.href, source.base_url) ??
              source.name;
            
            pendingMovies.push({
              href: entry.href,
              parent: item.href,
              sourceId: source.id,
              category,
              title: parsed.title,
              year: parsed.year,
              quality: parsed.quality,
              dualAudio: parsed.dualAudio,
              kind: parsed.kind === 'series' ? 1 : parsed.kind === 'event' ? 2 : 0,
              scanId,
            });
          } else {
            // Just update scan_id to prevent deletion
            db.prepare('UPDATE movies SET scan_id = ? WHERE href = ?').run(scanId, entry.href);
          }
        } else if (item.depth < MAX_DEPTH) {
          // Group folder (year bucket, collection, season list) - queue it.
          //
          // A plain year bucket is a grouping aid, not a category: use the
          // source name so the UI gets one row per source instead of one row
          // per year. Named collections ("... Collection (2008-2019)") keep
          // their own name because that grouping is meaningful to the user.
          const category = item.depth === 0
            ? (isGroupingFolder(entry.name) ? source.name : entry.name)
            : item.category;

          queue.push({
            href: entry.href,
            depth: item.depth + 1,
            category,
          });
        }
      }

      this.maybeEmitProgress();
    } finally {
      semaphore.release();
    }
  }

  private parseEntries(format: string, href: string, html: string): DirectoryEntry[] {
    switch (format) {
      case 'h5ai':
        return parseH5ai(href, html);
      case 'nginx':
        return parseNginx(href, html);
      case 'apache':
        return parseApache(href, html);
      default:
        // Try h5ai first (most common for DhakaFlix), then others
        let entries = parseH5ai(href, html);
        if (entries.length === 0) entries = parseNginx(href, html);
        if (entries.length === 0) entries = parseApache(href, html);
        return entries;
    }
  }

  private batchInsertMovies(db: Database.Database, movies: PendingMovie[]): { added: number; updated: number } {
    let added = 0;
    let updated = 0;

    const insertStmt = db.prepare(`
      INSERT INTO movies (href, parent, source_id, category, title, year, quality, dual_audio, kind, scan_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(href) DO UPDATE SET
        parent = excluded.parent,
        category = excluded.category,
        title = excluded.title,
        year = excluded.year,
        quality = excluded.quality,
        dual_audio = excluded.dual_audio,
        kind = excluded.kind,
        scan_id = excluded.scan_id
    `);

    const checkStmt = db.prepare('SELECT id FROM movies WHERE href = ?');

    const batchSize = 100;
    for (let i = 0; i < movies.length; i += batchSize) {
      const batch = movies.slice(i, i + batchSize);
      
      const transaction = db.transaction((items: PendingMovie[]) => {
        for (const m of items) {
          const exists = checkStmt.get(m.href);
          insertStmt.run(
            m.href,
            m.parent,
            m.sourceId,
            m.category,
            m.title,
            m.year,
            m.quality,
            m.dualAudio ? 1 : 0,
            m.kind,
            m.scanId
          );
          if (exists) {
            updated++;
          } else {
            added++;
          }
        }
      });

      transaction(batch);
    }

    return { added, updated };
  }

  private removeStaleMovies(db: Database.Database, sourceId: number, scanId: number): number {
    // Get stale movie IDs
    const stale = db.prepare(`
      SELECT id FROM movies 
      WHERE source_id = ? AND (scan_id IS NULL OR scan_id < ?)
    `).all(sourceId, scanId) as { id: number }[];

    if (stale.length === 0) return 0;

    // Delete in batches
    const deleteStmt = db.prepare('DELETE FROM movies WHERE id = ?');
    
    const transaction = db.transaction((ids: number[]) => {
      for (const id of ids) {
        deleteStmt.run(id);
      }
    });

    transaction(stale.map(s => s.id));

    // Clean up orphaned dirs
    db.prepare('DELETE FROM dirs WHERE source_id = ? AND href NOT IN (SELECT DISTINCT parent FROM movies WHERE source_id = ?)').run(sourceId, sourceId);

    return stale.length;
  }

  private extractCategory(href: string, baseUrl: string): string | null {
    const relativePath = href.replace(baseUrl, '');
    const parts = relativePath.split('/').filter(Boolean);
    
    if (parts.length > 0) {
      // Decode URL encoding and return first folder name
      try {
        return decodeURIComponent(parts[0].replace(/\+/g, '%2B'));
      } catch {
        return parts[0];
      }
    }
    return null;
  }

  private async fetchWithRetry(url: string): Promise<string> {
    // Delegate to the shared client so timeouts, retries, and abort-listener
    // cleanup stay in one place instead of being reimplemented per service.
    return fetchText(url, {
      signal: this.abortController?.signal,
      timeout: 30000,
      retries: RETRY_DELAYS.length - 1,
      headers: {
        'User-Agent': 'DhakaFlix/1.0',
        Accept: 'text/html',
      },
    });
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private checkAbort(): void {
    if (this.abortController?.signal.aborted) {
      const error = new Error('Scan cancelled');
      error.name = 'AbortError';
      throw error;
    }
  }

  private maybeEmitProgress(): void {
    this.progressCounter++;
    if (this.progressCounter >= PROGRESS_INTERVAL) {
      this.emitProgress();
      this.progressCounter = 0;
    }
  }

  private emitProgress(): void {
    this.emit('progress', { ...this.status });
  }

  /**
   * Detect directory listing format from HTML response
   */
  detectFormat(html: string): 'h5ai' | 'nginx' | 'apache' | 'unknown' {
    if (html.includes('_h5ai') || html.includes('fb-n')) {
      return 'h5ai';
    }
    if (html.includes('Index of') && html.includes('<pre>')) {
      return 'nginx';
    }
    if (html.includes('Index of') && html.includes('<table>')) {
      return 'apache';
    }
    return 'unknown';
  }
}

export const crawlerService = new CrawlerService();
