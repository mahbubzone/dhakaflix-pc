/**
 * Application Path Utilities
 * 
 * Centralized path management for app data, cache, and logs.
 */

import { app } from 'electron';
import path from 'path';
import fs from 'fs';

/**
 * Get the user data directory
 * Windows: %APPDATA%/DhakaFlix
 */
export function getUserDataPath(): string {
  return app.getPath('userData');
}

/**
 * Get the database file path
 */
export function getDatabasePath(): string {
  return path.join(getUserDataPath(), 'library.db');
}

/**
 * Get the image cache directory
 */
export function getCachePath(): string {
  const cachePath = path.join(getUserDataPath(), 'cache', 'images');
  fs.mkdirSync(cachePath, { recursive: true });
  return cachePath;
}

/**
 * Get the logs directory
 */
export function getLogsPath(): string {
  const logsPath = path.join(getUserDataPath(), 'logs');
  fs.mkdirSync(logsPath, { recursive: true });
  return logsPath;
}

/**
 * Get the settings file path
 */
export function getSettingsPath(): string {
  return path.join(getUserDataPath(), 'settings.json');
}

/**
 * Ensure all required directories exist
 */
export function ensureDirectories(): void {
  const dirs = [
    getUserDataPath(),
    getCachePath(),
    getLogsPath(),
  ];
  
  for (const dir of dirs) {
    fs.mkdirSync(dir, { recursive: true });
  }
}
