/**
 * IPC Handler Registration
 * 
 * Registers all IPC handlers for main process.
 * Handlers validate input and delegate to services.
 */

import { app, ipcMain, BrowserWindow } from 'electron';
import { getDatabase, getDatabaseService } from './services/database';
import { fetchMetadataForMovie } from './services/metadata';
import { invalidateTrendingLocalCache, resolveTrendingMovies } from './services/trending';
import { crawlerService } from './services/crawler';
import { getUpdateService } from './services/updater';
import * as playerService from './services/player';
import * as mediaService from './services/media';
import { getHomeData } from './services/home';
import { normalizeWatchedFlag } from './services/progress';
import { isValidMovieId } from './utils/validation';

function errorMessage(error: unknown): string {
  return error instanceof Error && error.message ? error.message : String(error);
}

export function registerIpcHandlers(mainWindow: BrowserWindow): void {
  // ============================================================
  // Database Handlers
  // ============================================================

  ipcMain.handle('db:getMovies', async (_, options: {
    category?: string;
    excludeCategory?: string;
    kind?: 0 | 1;
    limit: number;
    offset: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }) => {
    const db = getDatabase();
    const { category, excludeCategory, kind, limit, offset, sortBy = 'added', sortOrder = 'desc' } = options;
    
    let sql = 'SELECT * FROM movies WHERE 1=1';
    const params: unknown[] = [];
    
    if (category) {
      sql += ' AND category = ?';
      params.push(category);
    }

    if (excludeCategory) {
      sql += ' AND (category IS NULL OR category != ?)';
      params.push(excludeCategory);
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
      WHERE p.episode_id IS NULL
        AND p.watched = 0 AND p.duration > 0 AND p.position > 0
        AND p.position < p.duration * 0.95
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

  ipcMain.handle('db:setWatched', async (_, href: unknown, watched: unknown) => {
    const flag = normalizeWatchedFlag(watched);
    if (typeof href !== 'string' || !href.trim() || flag === null) {
      return { ok: false, watched: 0, error: 'Invalid watched input' };
    }
    try {
      getDatabaseService().setWatched(href, flag);
      return { ok: true, watched: flag, error: null };
    } catch (error) {
      return { ok: false, watched: 0, error: errorMessage(error) };
    }
  });

  ipcMain.handle('db:getProgress', async (_, href: string) => {
    const db = getDatabase();
    return db.prepare(`
      SELECT position, duration, watched FROM progress WHERE href = ?
    `).get(href) as { position: number; duration: number; watched: number } | undefined || null;
  });

  // ============================================================
  // Watchlist Handlers
  // ============================================================

  ipcMain.handle('watchlist:get', async (_, limit?: number, offset?: number) => {
    const safeLimit = Number.isInteger(limit) && (limit as number) > 0
      ? Math.min(limit as number, 200) : 50;
    const safeOffset = Number.isInteger(offset) && (offset as number) >= 0 ? offset as number : 0;
    try {
      return getDatabaseService().getWatchlistMovies(safeLimit, safeOffset);
    } catch (error) {
      return { movies: [], total: 0, error: errorMessage(error) };
    }
  });

  ipcMain.handle('watchlist:add', async (_, movieId: unknown) => {
    if (!isValidMovieId(movieId)) return { ok: false, error: 'Invalid movie id' };
    try {
      getDatabaseService().addToWatchlist(movieId);
      return { ok: true, error: null };
    } catch (error) {
      return { ok: false, error: errorMessage(error) };
    }
  });

  ipcMain.handle('watchlist:remove', async (_, movieId: unknown) => {
    if (!isValidMovieId(movieId)) return { ok: false, error: 'Invalid movie id' };
    try {
      getDatabaseService().removeFromWatchlist(movieId);
      return { ok: true, error: null };
    } catch (error) {
      return { ok: false, error: errorMessage(error) };
    }
  });

  ipcMain.handle('watchlist:toggle', async (_, movieId: unknown) => {
    if (!isValidMovieId(movieId)) {
      return { ok: false, watchlisted: false, error: 'Invalid movie id' };
    }
    try {
      const service = getDatabaseService();
      const wasWatchlisted = service.isWatchlisted(movieId);
      if (wasWatchlisted) service.removeFromWatchlist(movieId);
      else service.addToWatchlist(movieId);
      return { ok: true, watchlisted: !wasWatchlisted, error: null };
    } catch (error) {
      return { ok: false, watchlisted: false, error: errorMessage(error) };
    }
  });

  ipcMain.handle('watchlist:has', async (_, movieId: unknown) => {
    if (!isValidMovieId(movieId)) {
      return { ok: false, watchlisted: false, error: 'Invalid movie id' };
    }
    try {
      return { ok: true, watchlisted: getDatabaseService().isWatchlisted(movieId), error: null };
    } catch (error) {
      return { ok: false, watchlisted: false, error: errorMessage(error) };
    }
  });

  // ============================================================
  // Favorites (separate from the watchlist)
  // ============================================================

  ipcMain.handle('favorite:get', async () => {
    try {
      const service = getDatabaseService();
      return {
        ok: true,
        favorite: { ids: service.getFavoriteIds(), count: service.getFavoriteCount() },
        error: null,
      };
    } catch (error) {
      return { ok: false, favorite: { ids: [], count: 0 }, error: errorMessage(error) };
    }
  });

  ipcMain.handle('favorite:add', async (_, movieId: unknown) => {
    if (!isValidMovieId(movieId)) {
      return { ok: false, favorite: false, error: 'Invalid movie id' };
    }
    try {
      getDatabaseService().addFavorite(movieId);
      return { ok: true, favorite: true, error: null };
    } catch (error) {
      return { ok: false, favorite: false, error: errorMessage(error) };
    }
  });

  ipcMain.handle('favorite:remove', async (_, movieId: unknown) => {
    if (!isValidMovieId(movieId)) {
      return { ok: false, favorite: false, error: 'Invalid movie id' };
    }
    try {
      getDatabaseService().removeFavorite(movieId);
      return { ok: true, favorite: false, error: null };
    } catch (error) {
      return { ok: false, favorite: false, error: errorMessage(error) };
    }
  });

  ipcMain.handle('favorite:toggle', async (_, movieId: unknown) => {
    if (!isValidMovieId(movieId)) {
      return { ok: false, favorite: false, error: 'Invalid movie id' };
    }
    try {
      return { ok: true, favorite: getDatabaseService().toggleFavorite(movieId), error: null };
    } catch (error) {
      return { ok: false, favorite: false, error: errorMessage(error) };
    }
  });

  ipcMain.handle('favorite:has', async (_, movieId: unknown) => {
    if (!isValidMovieId(movieId)) {
      return { ok: false, favorite: false, error: 'Invalid movie id' };
    }
    try {
      return { ok: true, favorite: getDatabaseService().isFavorite(movieId), error: null };
    } catch (error) {
      return { ok: false, favorite: false, error: errorMessage(error) };
    }
  });

  // ============================================================
  // Batched Home Handlers
  // ============================================================

  ipcMain.handle('home:get', async () => getHomeData());

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
    // A scan may add titles that match cached trending metas.
    invalidateTrendingLocalCache();
    mainWindow.webContents.send('crawler:complete', result);
  });

  crawlerService.on('error', (error) => {
    mainWindow.webContents.send('crawler:error', error);
  });

  // ============================================================
  // Metadata (Cinemeta)
  // ============================================================

  ipcMain.handle('meta:get', async (_, movieId: number) => {
    if (!isValidMovieId(movieId)) {
      return { ok: false, data: null, error: 'Invalid movie id' };
    }
    try {
      return { ok: true, data: await fetchMetadataForMovie(movieId), error: null };
    } catch (error) {
      return { ok: false, data: null, error: errorMessage(error) };
    }
  });

  ipcMain.handle('meta:getCached', async (_, movieId: number) => {
    if (!isValidMovieId(movieId)) {
      return { ok: false, data: null, error: 'Invalid movie id' };
    }
    try {
      return { ok: true, data: getDatabaseService().getMetadata(movieId), error: null };
    } catch (error) {
      return { ok: false, data: null, error: errorMessage(error) };
    }
  });

  // kind/limit are plain scalars; no objects or prototypes cross this boundary.
  ipcMain.handle('meta:getTrendingMovies', async (_, kind: unknown, limit: unknown) => {
    if (kind !== 'movie' && kind !== 'series') {
      return { ok: false, items: [], error: 'Invalid trending kind' };
    }
    if (limit !== undefined && (!Number.isInteger(limit) || (limit as number) < 1 || (limit as number) > 100)) {
      return { ok: false, items: [], error: 'Invalid trending limit' };
    }
    try {
      const items = await resolveTrendingMovies(kind, (limit as number | undefined) ?? 20);
      return { ok: true, items, error: null };
    } catch (error) {
      return { ok: false, items: [], error: errorMessage(error) };
    }
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
  // Update Handlers
  // ============================================================

  ipcMain.handle('update:getStatus', async () => {
    return getUpdateService().getStatus();
  });

  ipcMain.handle('update:check', async () => {
    return getUpdateService().check();
  });

  ipcMain.handle('update:download', async () => {
    try {
      await getUpdateService().download();
      return { ok: true, error: null };
    } catch (error) {
      return { ok: false, error: errorMessage(error) };
    }
  });

  ipcMain.handle('update:install', () => {
    try {
      getUpdateService().install();
      return { ok: true, error: null };
    } catch (error) {
      return { ok: false, error: errorMessage(error) };
    }
  });

  ipcMain.handle('update:getVersion', async () => {
    return app.getVersion();
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
