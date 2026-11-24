/**
 * Config Service
 * 
 * Manages application settings persistence.
 */

import fs from 'fs';
import { getSettingsPath } from '../utils/paths';
import { logger } from '../utils/logger';

export interface AppSettings {
  theme: 'dark' | 'light' | 'system';
  preferredPlayer: 'vlc' | 'potplayer' | 'auto';
  autoScan: boolean;
  scanOnStartup: boolean;
  language: string;
  lastScanAt: number | null;
  windowBounds: {
    width: number;
    height: number;
    x?: number;
    y?: number;
    maximized: boolean;
  };
}

const DEFAULT_SETTINGS: AppSettings = {
  theme: 'dark',
  preferredPlayer: 'auto',
  autoScan: false,
  scanOnStartup: true,
  language: 'en',
  lastScanAt: null,
  windowBounds: {
    width: 1280,
    height: 720,
    maximized: false,
  },
};

class ConfigService {
  private settings: AppSettings;
  private settingsPath: string;

  constructor() {
    this.settingsPath = getSettingsPath();
    this.settings = this.load();
  }

  private load(): AppSettings {
    try {
      if (fs.existsSync(this.settingsPath)) {
        const data = fs.readFileSync(this.settingsPath, 'utf-8');
        const parsed = JSON.parse(data);
        return { ...DEFAULT_SETTINGS, ...parsed };
      }
    } catch (error) {
      logger.warn('Failed to load settings, using defaults', { error: (error as Error).message });
    }
    return { ...DEFAULT_SETTINGS };
  }

  private save(): void {
    try {
      fs.writeFileSync(this.settingsPath, JSON.stringify(this.settings, null, 2));
    } catch (error) {
      logger.error('Failed to save settings', { error: (error as Error).message });
    }
  }

  get<K extends keyof AppSettings>(key: K): AppSettings[K] {
    return this.settings[key];
  }

  set<K extends keyof AppSettings>(key: K, value: AppSettings[K]): void {
    this.settings[key] = value;
    this.save();
  }

  getAll(): AppSettings {
    return { ...this.settings };
  }

  setAll(settings: Partial<AppSettings>): void {
    this.settings = { ...this.settings, ...settings };
    this.save();
  }

  reset(): void {
    this.settings = { ...DEFAULT_SETTINGS };
    this.save();
  }
}

// Singleton
let configInstance: ConfigService | null = null;

export function getConfig(): ConfigService {
  if (!configInstance) {
    configInstance = new ConfigService();
  }
  return configInstance;
}

export const config = {
  get: <K extends keyof AppSettings>(key: K) => getConfig().get(key),
  set: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => getConfig().set(key, value),
  getAll: () => getConfig().getAll(),
  setAll: (settings: Partial<AppSettings>) => getConfig().setAll(settings),
};
