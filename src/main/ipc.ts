/**
 * IPC Handler Registration
 * 
 * Registers all IPC handlers for main process.
 * Handlers validate input and delegate to services.
 */

import { ipcMain, BrowserWindow } from 'electron';
import { getDatabase } from './services/database';
import { crawlerService } from './services/crawler';
import * as playerService from './services/player';
import * as mediaService from './services/media';

export function registerIpcHandlers(mainWindow: BrowserWindow): void {
  // ============================================================
  // Database Handlers
  // ============================================================

  ipcMain.handle('db:getMovies', async (_, options: {
    category?: string;
    kind?: 0 | 1;
    limit: number;
    offset: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }) => {
    const db = getDatabase();
    const { category, kind, limit, offset, sortBy = 'added', sortOrder = 'desc' } = options;
    
    let sql = 'SELECT * FROM movies WHERE 1=1';
    const params: unknown[] = [];
    
    if (category) {
      sql += ' AND category = ?';
      params.push(category);
    }
    
    if (kind !== undefined) {
      sql += ' AND kind = ?';
      params.push(kind);
    }
    
    // Count total
    const countSql = sql.replace('SELECT *', 'SELECT COUNT(*) as count');
    const { count: total } = db.prepare(countSql).get(...params) as { count: number };
    
    // Add ordering and pagination
    const validSortColumns = ['added', 'title', 'year'];
    const column = validSortColumns.includes(sortBy) ? sortBy : 'added';
    const order = sortOrder === 'asc' ? 'ASC' : 'DESC';
    
    sql += ` ORDER BY ${column} ${order} LIMIT ? OFFSET ?`;
    params.push(limit, offset);
    
    const movies = db.prepare(sql).all(...params);
    
    return { movies, total };
  });

  ipcMain.handle('db:getMovie', async (_, id: number) => {
    const db = getDatabase();
    return db.prepare('SELECT * FROM movies WHERE id = ?').get(id);
  });

  ipcMain.handle('db:search', async (_, query: string, limit = 50) => {
    const db = getDatabase();
    // Strip characters that FTS5 treats as query syntax so user input cannot
    // produce a malformed MATCH expression.
    const sanitizedQuery = query.replace(/["'()*:^-]/g, ' ').replace(/\s+/g, ' ').trim();

    if (!sanitizedQuery) {
      return [];
    }

    try {
      return db.prepare(`
        SELECT m.*
        FROM movies m
        WHERE m.id IN (
          SELECT rowid FROM movies_fts WHERE movies_fts MATCH ?
        )
        ORDER BY m.added DESC
        LIMIT ?
      `).all(`${sanitizedQuery}*`, limit);
    } catch {
      // Fall back to a plain substring match if FTS rejects the expression
      return db.prepare(`
        SELECT * FROM movies
        WHERE title LIKE ?
        ORDER BY added DESC
        LIMIT ?
      `).all(`%${sanitizedQuery}%`, limit);
    }
  });

  ipcMain.handle('db:getCategories', async () => {
    const db = getDatabase();
    return db.prepare(`
      SELECT category, COUNT(*) as count
      FROM movies
      WHERE category IS NOT NULL
      GROUP BY category
      ORDER BY category
    `).all();
  });

  ipcMain.handle('db:getEpisodes', async (_, movieId: number) => {
    const db = getDatabase();
    return db.prepare(`
      SELECT * FROM episodes
      WHERE movie_id = ?
      ORDER BY season, episode
    `).all(movieId);
  });

  ipcMain.handle('db:getContinueWatching', async (_, limit: number) => {
    const db = getDatabase();
    return db.prepare(`
      SELECT m.*, p.position, p.duration
      FROM progress p
      JOIN movies m ON m.id = p.movie_id
      WHERE p.watched = 0 AND p.position > 0
      ORDER BY p.updated_at DESC
      LIMIT ?
    `).all(limit);
  });

  ipcMain.handle('db:saveProgress', async (_, href: string, position: number, duration: number) => {
    const db = getDatabase();
    db.prepare(`
      INSERT INTO progress (href, movie_id, position, duration, updated_at)
      VALUES (?, (SELECT id FROM movies WHERE href = ?), ?, ?, strftime('%s', 'now'))
      ON CONFLICT(href) DO UPDATE SET
        movie_id = excluded.movie_id,
        position = excluded.position,
        duration = excluded.duration,
        updated_at = strftime('%s', 'now')
    `).run(href, href, position, duration);
  });

  ipcMain.handle('db:markWatched', async (_, href: string) => {
    const db = getDatabase();
    db.prepare(`
      INSERT INTO progress (href, movie_id, watched, updated_at)
      VALUES (?, (SELECT id FROM movies WHERE href = ?), 1, strftime('%s', 'now'))
      ON CONFLICT(href) DO UPDATE SET
        movie_id = excluded.movie_id,
        watched = 1,
        updated_at = strftime('%s', 'now')
    `).run(href, href);
  });

  ipcMain.handle('db:getProgress', async (_, href: string) => {
    const db = getDatabase();
    return db.prepare(`
      SELECT position, duration, watched FROM progress WHERE href = ?
    `).get(href) as { position: number; duration: number; watched: number } | undefined || null;
  });

  // ============================================================
  // Crawler Handlers
  // ============================================================

  ipcMain.handle('crawler:start', async (_, sourceId?: number) => {
    if (sourceId !== undefined) {
      await crawlerService.startScan(sourceId);
    } else {
      // Scan all enabled sources sequentially
      const db = getDatabase();
      const sources = db.prepare('SELECT id FROM sources WHERE enabled = 1').all() as { id: number }[];
      for (const source of sources) {
        if (!crawlerService.getStatus().running) {
          await crawlerService.startScan(source.id);
        }
      }
    }
  });

  ipcMain.handle('crawler:stop', async () => {
    crawlerService.stopScan();
  });

  ipcMain.handle('crawler:status', async () => {
    return crawlerService.getStatus();
  });

  // Forward crawler events to renderer
  crawlerService.on('progress', (status) => {
    mainWindow.webContents.send('crawler:progress', status);
  });

  crawlerService.on('complete', (result) => {
    mainWindow.webContents.send('crawler:complete', result);
  });

  crawlerService.on('error', (error) => {
    mainWindow.webContents.send('crawler:error', error);
  });

  // ============================================================
  // Media Assets
  // ============================================================

  ipcMain.handle('media:resolve', async (_, movieId: number) => {
    if (!Number.isInteger(movieId) || movieId <= 0) {
      throw new Error('Invalid movie id');
    }
    return mediaService.resolveAssets(movieId);
  });

  // ============================================================
  // Player Handlers
  // ============================================================

  ipcMain.handle('player:getAvailable', async () => {
    return playerService.getAvailablePlayers();
  });

  ipcMain.handle('player:play', async (_, url: string, options?: playerService.PlayOptions) => {
    return playerService.play(url, options);
  });

  ipcMain.handle('player:openDownload', async (_, player: 'vlc' | 'potplayer') => {
    playerService.openPlayerDownload(player);
  });

  // ============================================================
  // Sources Handlers
  // ============================================================

  ipcMain.handle('sources:getAll', async () => {
    const db = getDatabase();
    return db.prepare('SELECT * FROM sources ORDER BY name').all();
  });

  ipcMain.handle('sources:add', async (_, source: { name: string; baseUrl: string }) => {
    const db = getDatabase();
    const result = db.prepare(`
      INSERT INTO sources (name, base_url, format)
      VALUES (?, ?, 'unknown')
    `).run(source.name, source.baseUrl);
    
    return db.prepare('SELECT * FROM sources WHERE id = ?').get(result.lastInsertRowid);
  });

  ipcMain.handle('sources:remove', async (_, id: number) => {
    const db = getDatabase();
    db.prepare('DELETE FROM sources WHERE id = ?').run(id);
  });

  ipcMain.handle('sources:test', async (_, baseUrl: string) => {
    try {
      const response = await fetch(baseUrl, { method: 'GET' });
      if (!response.ok) {
        return { ok: false, format: null, error: `HTTP ${response.status}` };
      }
      
      const html = await response.text();
      const format = crawlerService.detectFormat(html);
      
      return { ok: true, format };
    } catch (error) {
      return { ok: false, format: null, error: (error as Error).message };
    }
  });

  // ============================================================
  // Window Handlers
  // ============================================================

  ipcMain.on('window:minimize', () => {
    mainWindow.minimize();
  });

  ipcMain.on('window:maximize', () => {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  });

  ipcMain.on('window:close', () => {
    mainWindow.close();
  });

  ipcMain.handle('window:isMaximized', () => {
    return mainWindow.isMaximized();
  });

  mainWindow.on('maximize', () => {
    mainWindow.webContents.send('window:maximizeChange', true);
  });

  mainWindow.on('unmaximize', () => {
    mainWindow.webContents.send('window:maximizeChange', false);
  });
}
