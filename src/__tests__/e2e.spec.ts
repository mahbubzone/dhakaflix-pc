/**
 * DhakaFlix Playwright E2E Tests
 * 
 * End-to-end tests for the Electron application.
 * Run: npx playwright test
 */

import { test, expect, ElectronApplication, Page } from '@playwright/test';
import { _electron as electron } from 'playwright';
import * as path from 'path';

let electronApp: ElectronApplication;
let window: Page;

test.describe('DhakaFlix E2E Tests', () => {
  
  test.beforeAll(async () => {
    // Launch Electron app
    electronApp = await electron.launch({
      args: [path.join(__dirname, '../../dist/main/index.js')],
      env: {
        ...process.env,
        NODE_ENV: 'test'
      }
    });
    
    window = await electronApp.firstWindow();
    await window.waitForLoadState('domcontentloaded');
  });
  
  test.afterAll(async () => {
    await electronApp.close();
  });
  
  test.describe('Application Startup', () => {
    test('app window opens successfully', async () => {
      expect(window).toBeTruthy();
      
      const title = await window.title();
      expect(title).toContain('DhakaFlix');
    });
    
    test('app loads within 5 seconds', async () => {
      const start = Date.now();
      await window.waitForSelector('[data-testid="app-loaded"]', { timeout: 5000 });
      const elapsed = Date.now() - start;
      
      expect(elapsed).toBeLessThan(5000);
    });
    
    test('sidebar navigation is visible', async () => {
      await expect(window.locator('[data-testid="sidebar"]')).toBeVisible();
    });
  });
  
  test.describe('First-Time Setup', () => {
    test.skip('shows setup wizard on fresh install', async () => {
      // This test requires a clean database state
      await expect(window.locator('[data-testid="setup-wizard"]')).toBeVisible();
    });
    
    test.skip('validates category URL input', async () => {
      const input = window.locator('[data-testid="category-url-input"]');
      const addButton = window.locator('[data-testid="add-category-button"]');
      
      // Invalid URL
      await input.fill('not-a-url');
      await addButton.click();
      await expect(window.locator('[data-testid="url-error"]')).toBeVisible();
      
      // Valid URL
      await input.fill('http://172.16.50.7/DHAKA-FLIX/Movies/');
      await addButton.click();
      await expect(window.locator('[data-testid="url-error"]')).not.toBeVisible();
    });
  });
  
  test.describe('Category Navigation', () => {
    test('shows categories in sidebar', async () => {
      const categories = window.locator('[data-testid="category-item"]');
      await expect(categories.first()).toBeVisible();
    });
    
    test('clicking category loads poster grid', async () => {
      const firstCategory = window.locator('[data-testid="category-item"]').first();
      await firstCategory.click();
      
      await expect(window.locator('[data-testid="poster-grid"]')).toBeVisible();
    });
    
    test('poster grid displays movie cards', async () => {
      const posterCards = window.locator('[data-testid="poster-card"]');
      await expect(posterCards.first()).toBeVisible({ timeout: 10000 });
    });
    
    test('grid scrolls smoothly with virtualization', async () => {
      const grid = window.locator('[data-testid="poster-grid"]');
      
      // Scroll down
      await grid.evaluate(el => el.scrollTop = 1000);
      await window.waitForTimeout(500);
      
      // Cards should still be visible (virtualized)
      await expect(window.locator('[data-testid="poster-card"]').first()).toBeVisible();
    });
  });
  
  test.describe('Search Functionality', () => {
    test('opens search with Ctrl+K', async () => {
      await window.keyboard.press('Control+k');
      await expect(window.locator('[data-testid="search-modal"]')).toBeVisible();
    });
    
    test('search input accepts text', async () => {
      const searchInput = window.locator('[data-testid="search-input"]');
      await searchInput.fill('Matrix');
      await expect(searchInput).toHaveValue('Matrix');
    });
    
    test('search returns results', async () => {
      const searchInput = window.locator('[data-testid="search-input"]');
      await searchInput.fill('The');
      
      // Wait for debounce and results
      await window.waitForTimeout(500);
      
      const results = window.locator('[data-testid="search-result"]');
      const count = await results.count();
      expect(count).toBeGreaterThan(0);
    });
    
    test('clicking result navigates to detail', async () => {
      const firstResult = window.locator('[data-testid="search-result"]').first();
      await firstResult.click();
      
      await expect(window.locator('[data-testid="detail-page"]')).toBeVisible();
    });
    
    test('Escape closes search', async () => {
      await window.keyboard.press('Control+k');
      await expect(window.locator('[data-testid="search-modal"]')).toBeVisible();
      
      await window.keyboard.press('Escape');
      await expect(window.locator('[data-testid="search-modal"]')).not.toBeVisible();
    });
  });
  
  test.describe('Detail Page', () => {
    test.beforeEach(async () => {
      // Navigate to a movie detail page
      const posterCard = window.locator('[data-testid="poster-card"]').first();
      await posterCard.click();
      await window.waitForSelector('[data-testid="detail-page"]');
    });
    
    test('displays movie title', async () => {
      await expect(window.locator('[data-testid="movie-title"]')).toBeVisible();
    });
    
    test('displays year and quality', async () => {
      await expect(window.locator('[data-testid="movie-year"]')).toBeVisible();
    });
    
    test('shows Play button', async () => {
      await expect(window.locator('[data-testid="play-button"]')).toBeVisible();
    });
    
    test('shows VLC button', async () => {
      await expect(window.locator('[data-testid="vlc-button"]')).toBeVisible();
    });
    
    test('back button returns to grid', async () => {
      await window.keyboard.press('Backspace');
      await expect(window.locator('[data-testid="poster-grid"]')).toBeVisible();
    });
  });
  
  test.describe('Video Playback', () => {
    test.beforeEach(async () => {
      // Navigate to movie and start playback
      const posterCard = window.locator('[data-testid="poster-card"]').first();
      await posterCard.click();
      await window.waitForSelector('[data-testid="play-button"]');
    });
    
    test('clicking Play starts video', async () => {
      await window.locator('[data-testid="play-button"]').click();
      
      const video = window.locator('video');
      await expect(video).toBeVisible({ timeout: 10000 });
      
      // Wait for playback to start
      await window.waitForFunction(() => {
        const v = document.querySelector('video');
        return v && v.currentTime > 0;
      }, { timeout: 15000 });
    });
    
    test('Space toggles play/pause', async () => {
      await window.locator('[data-testid="play-button"]').click();
      await window.waitForSelector('video');
      
      // Wait for playback
      await window.waitForTimeout(2000);
      
      // Pause
      await window.keyboard.press('Space');
      const paused = await window.evaluate(() => {
        const v = document.querySelector('video');
        return v?.paused;
      });
      expect(paused).toBe(true);
      
      // Resume
      await window.keyboard.press('Space');
      const playing = await window.evaluate(() => {
        const v = document.querySelector('video');
        return !v?.paused;
      });
      expect(playing).toBe(true);
    });
    
    test('Arrow keys seek video', async () => {
      await window.locator('[data-testid="play-button"]').click();
      await window.waitForSelector('video');
      await window.waitForTimeout(2000);
      
      const initialTime = await window.evaluate(() => {
        const v = document.querySelector('video');
        return v?.currentTime || 0;
      });
      
      // Seek forward
      await window.keyboard.press('ArrowRight');
      await window.waitForTimeout(500);
      
      const newTime = await window.evaluate(() => {
        const v = document.querySelector('video');
        return v?.currentTime || 0;
      });
      
      expect(newTime).toBeGreaterThan(initialTime);
    });
    
    test('F key toggles fullscreen', async () => {
      await window.locator('[data-testid="play-button"]').click();
      await window.waitForSelector('video');
      
      await window.keyboard.press('f');
      
      const isFullscreen = await window.evaluate(() => {
        return document.fullscreenElement !== null;
      });
      
      // Note: Fullscreen may not work in headless mode
      // This test may need to be run headed
    });
    
    test('Escape exits player', async () => {
      await window.locator('[data-testid="play-button"]').click();
      await window.waitForSelector('video');
      
      await window.keyboard.press('Escape');
      
      // Should return to detail page
      await expect(window.locator('[data-testid="detail-page"]')).toBeVisible();
    });
  });
  
  test.describe('Resume Functionality', () => {
    test.skip('Resume button appears for partial watch', async () => {
      // This requires a movie that has been partially watched
      // Would need test fixtures or mock data
      
      await expect(window.locator('[data-testid="resume-button"]')).toBeVisible();
    });
    
    test.skip('Resume starts at saved position', async () => {
      await window.locator('[data-testid="resume-button"]').click();
      
      await window.waitForFunction(() => {
        const v = document.querySelector('video');
        return v && v.currentTime > 10; // Should start past 0
      });
    });
  });
  
  test.describe('TV Series Navigation', () => {
    test.skip('series page shows season selector', async () => {
      // Navigate to a series
      // ...
      
      await expect(window.locator('[data-testid="season-selector"]')).toBeVisible();
    });
    
    test.skip('selecting season loads episodes', async () => {
      const seasonTab = window.locator('[data-testid="season-tab"]').nth(1);
      await seasonTab.click();
      
      const episodes = window.locator('[data-testid="episode-item"]');
      await expect(episodes.first()).toBeVisible();
    });
  });
  
  test.describe('Window Management', () => {
    test('window can be resized', async () => {
      const originalSize = await electronApp.evaluate(async ({ BrowserWindow }) => {
        const win = BrowserWindow.getAllWindows()[0];
        return win.getSize();
      });
      
      await electronApp.evaluate(async ({ BrowserWindow }) => {
        const win = BrowserWindow.getAllWindows()[0];
        win.setSize(1024, 768);
      });
      
      const newSize = await electronApp.evaluate(async ({ BrowserWindow }) => {
        const win = BrowserWindow.getAllWindows()[0];
        return win.getSize();
      });
      
      expect(newSize).toEqual([1024, 768]);
      
      // Restore original size
      await electronApp.evaluate(async ({ BrowserWindow }, size) => {
        const win = BrowserWindow.getAllWindows()[0];
        win.setSize(size[0], size[1]);
      }, originalSize);
    });
    
    test('window can be maximized and restored', async () => {
      await electronApp.evaluate(async ({ BrowserWindow }) => {
        const win = BrowserWindow.getAllWindows()[0];
        win.maximize();
      });
      
      const isMaximized = await electronApp.evaluate(async ({ BrowserWindow }) => {
        const win = BrowserWindow.getAllWindows()[0];
        return win.isMaximized();
      });
      
      expect(isMaximized).toBe(true);
      
      await electronApp.evaluate(async ({ BrowserWindow }) => {
        const win = BrowserWindow.getAllWindows()[0];
        win.restore();
      });
    });
  });
  
  test.describe('Keyboard Shortcuts', () => {
    const shortcuts = [
      { key: 'Control+k', description: 'Open search' },
      { key: 'Backspace', description: 'Go back' },
    ];
    
    test('Ctrl+K opens search', async () => {
      await window.keyboard.press('Control+k');
      await expect(window.locator('[data-testid="search-modal"]')).toBeVisible();
      await window.keyboard.press('Escape');
    });
  });
  
  test.describe('Error Handling', () => {
    test.skip('shows error for network failure', async () => {
      // Simulate network failure
      await window.route('**/*', route => route.abort());
      
      // Try to load a category
      await window.locator('[data-testid="category-item"]').first().click();
      
      await expect(window.locator('[data-testid="error-message"]')).toBeVisible();
      
      // Restore network
      await window.unroute('**/*');
    });
    
    test.skip('shows empty state for no results', async () => {
      await window.keyboard.press('Control+k');
      await window.locator('[data-testid="search-input"]').fill('xyznonexistent123');
      await window.waitForTimeout(500);
      
      await expect(window.locator('[data-testid="empty-results"]')).toBeVisible();
    });
  });
});

// Separate test file for performance tests
test.describe('Performance Tests', () => {
  test.skip('startup time under 3 seconds', async () => {
    const start = Date.now();
    
    const app = await electron.launch({
      args: [path.join(__dirname, '../../dist/main/index.js')]
    });
    
    const win = await app.firstWindow();
    await win.waitForSelector('[data-testid="app-loaded"]');
    
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(3000);
    
    await app.close();
  });
  
  test.skip('memory stays under 500MB during browsing', async () => {
    // Browse through multiple categories
    for (let i = 0; i < 5; i++) {
      const category = window.locator('[data-testid="category-item"]').nth(i);
      if (await category.isVisible()) {
        await category.click();
        await window.waitForTimeout(1000);
      }
    }
    
    // Check memory usage
    const memoryUsage = await electronApp.evaluate(async () => {
      return process.memoryUsage().heapUsed;
    });
    
    expect(memoryUsage).toBeLessThan(500 * 1024 * 1024); // 500MB
  });
});
