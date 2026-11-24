/**
 * Settings View
 * 
 * App configuration and source management.
 */

import React, { useEffect, useState } from 'react';
import type { UpdateStatus } from '../../preload';
import { useSources } from '../hooks/useSources';
import { useCrawler } from '../hooks/useCrawler';
import { usePlayer } from '../hooks/usePlayer';
import './Settings.css';

const initialUpdateStatus: UpdateStatus = {
  checking: false,
  available: false,
  downloading: false,
  downloaded: false,
  version: null,
  progress: 0,
  error: null,
};

export default function Settings() {
  const { sources, loading: sourcesLoading, addSource, removeSource, testSource } = useSources();
  const { status, startScan, stopScan, isScanning } = useCrawler();
  const { players } = usePlayer();

  const [newSourceName, setNewSourceName] = useState('');
  const [newSourceUrl, setNewSourceUrl] = useState('');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);

  const [appVersion, setAppVersion] = useState<string | null>(null);
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus>(initialUpdateStatus);
  const [hasChecked, setHasChecked] = useState(false);
  const [updateActionError, setUpdateActionError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    window.api.update.getVersion()
      .then((version) => { if (active) setAppVersion(version); })
      .catch(() => { /* Version stays unknown if IPC fails. */ });
    window.api.update.getStatus()
      .then((status) => { if (active) setUpdateStatus(status); })
      .catch(() => { /* Keep the initial idle status. */ });

    const offAvailable = window.api.update.onAvailable((info) => {
      setHasChecked(true);
      setUpdateStatus((prev) => ({
        ...prev,
        checking: false,
        available: true,
        version: info.version,
        error: null,
      }));
    });
    const offProgress = window.api.update.onProgress(({ percent }) => {
      setUpdateStatus((prev) => ({
        ...prev,
        downloading: true,
        progress: Math.round(percent),
      }));
    });
    const offReady = window.api.update.onReady(() => {
      setUpdateStatus((prev) => ({
        ...prev,
        downloading: false,
        downloaded: true,
        progress: 100,
      }));
    });

    return () => {
      active = false;
      offAvailable();
      offProgress();
      offReady();
    };
  }, []);

  const handleCheckUpdates = async () => {
    setUpdateActionError(null);
    try {
      const status = await window.api.update.check();
      setHasChecked(true);
      setUpdateStatus(status);
    } catch (error) {
      setHasChecked(true);
      setUpdateActionError((error as Error).message);
    }
  };

  const handleDownloadUpdate = async () => {
    setUpdateActionError(null);
    try {
      const result = await window.api.update.download();
      if (!result.ok) setUpdateActionError(result.error);
    } catch (error) {
      setUpdateActionError((error as Error).message);
    }
  };

  const handleInstallUpdate = async () => {
    setUpdateActionError(null);
    try {
      const result = await window.api.update.install();
      if (!result.ok) setUpdateActionError(result.error);
    } catch (error) {
      setUpdateActionError((error as Error).message);
    }
  };

  const updateError = updateStatus.error || updateActionError;
  const getUpdateStatusText = (): string => {
    if (updateError) return `Error: ${updateError}`;
    if (updateStatus.checking) return 'Checking for updates...';
    if (updateStatus.downloading) return `Downloading... ${Math.round(updateStatus.progress)}%`;
    if (updateStatus.downloaded) {
      return `Version ${updateStatus.version || 'unknown'} downloaded — ready to install`;
    }
    if (updateStatus.available) return `Version ${updateStatus.version || 'unknown'} available`;
    return hasChecked ? 'Up to date' : 'Not checked yet';
  };
  const updateStatusText = getUpdateStatusText();

  const handleTestSource = async () => {
    if (!newSourceUrl) return;
    
    setTesting(true);
    setTestResult(null);
    
    const result = await testSource(newSourceUrl);
    
    if (result.ok) {
      setTestResult({ ok: true, message: `✓ Detected ${result.format} format` });
    } else {
      setTestResult({ ok: false, message: `✗ ${result.error || 'Connection failed'}` });
    }
    
    setTesting(false);
  };

  const handleAddSource = async () => {
    if (!newSourceName || !newSourceUrl) return;
    
    await addSource(newSourceName, newSourceUrl);
    setNewSourceName('');
    setNewSourceUrl('');
    setTestResult(null);
  };

  const handleScan = () => {
    if (isScanning) {
      stopScan();
    } else {
      startScan();
    }
  };

  const formatDate = (timestamp: number | null) => {
    if (!timestamp) return 'Never';
    return new Date(timestamp * 1000).toLocaleString();
  };

  return (
    <div className="settings">
      <h1 className="settings__title">Settings</h1>

      {/* Sources Section */}
      <section className="settings__section">
        <h2>Media Sources</h2>
        
        {sourcesLoading ? (
          <p>Loading sources...</p>
        ) : (
          <div className="settings__sources">
            {sources.map((source) => (
              <div key={source.id} className="settings__source">
                <div className="settings__source-info">
                  <span className="settings__source-name">{source.name}</span>
                  <span className="settings__source-url">{source.base_url}</span>
                  <span className="settings__source-meta">
                    Format: {source.format} • Last scan: {formatDate(source.last_scan_at)}
                    {source.last_scan_count > 0 && ` • ${source.last_scan_count} items`}
                  </span>
                </div>
                <button
                  className="settings__source-remove"
                  onClick={() => removeSource(source.id)}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Add Source Form */}
        <div className="settings__add-source">
          <h3>Add Custom Source</h3>
          <div className="settings__form">
            <input
              type="text"
              placeholder="Source name (e.g., My ISP Movies)"
              value={newSourceName}
              onChange={(e) => setNewSourceName(e.target.value)}
            />
            <input
              type="url"
              placeholder="URL (e.g., http://172.16.50.5/movies/)"
              value={newSourceUrl}
              onChange={(e) => setNewSourceUrl(e.target.value)}
            />
            <div className="settings__form-actions">
              <button onClick={handleTestSource} disabled={!newSourceUrl || testing}>
                {testing ? 'Testing...' : 'Test Connection'}
              </button>
              <button
                onClick={handleAddSource}
                disabled={!newSourceName || !newSourceUrl || !testResult?.ok}
                className="primary"
              >
                Add Source
              </button>
            </div>
            {testResult && (
              <div className={`settings__test-result ${testResult.ok ? 'success' : 'error'}`}>
                {testResult.message}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Scan Section */}
      <section className="settings__section">
        <h2>Library Scan</h2>
        <div className="settings__scan">
          <button
            className={`settings__scan-btn ${isScanning ? 'scanning' : ''}`}
            onClick={handleScan}
          >
            {isScanning ? 'Stop Scan' : 'Scan All Sources'}
          </button>
          
          {isScanning && (
            <div className="settings__scan-progress">
              <div className="settings__scan-status">
                {status.phase === 'scanning' ? 'Scanning' : 'Indexing'}
                {status.sourceName && `: ${status.sourceName}`}
              </div>
              <div className="settings__scan-stats">
                Discovered: {status.discovered} • Scanned: {status.scanned}
              </div>
              {status.currentPath && (
                <div className="settings__scan-path">{status.currentPath}</div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Player Section */}
      <section className="settings__section">
        <h2>Video Player</h2>
        <div className="settings__players">
          {players.map((player) => (
            <div key={player.name} className="settings__player">
              <span className="settings__player-name">
                {player.name === 'vlc' ? 'VLC Media Player' : 'PotPlayer'}
              </span>
              <span className={`settings__player-status ${player.installed ? 'installed' : ''}`}>
                {player.installed ? '✓ Installed' : '✗ Not found'}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Updates Section */}
      <section className="settings__section">
        <h2>Updates</h2>
        <div className="settings__updates">
          <div className="settings__update-info">
            <span className="settings__update-version">
              Current version: {appVersion || 'unknown'}
            </span>
            <span className={`settings__update-status ${updateError ? 'error' : ''} ${updateStatus.downloaded ? 'ready' : ''}`}>
              {updateStatusText}
            </span>
          </div>
          <div className="settings__update-actions">
            <button
              onClick={handleCheckUpdates}
              disabled={updateStatus.checking || updateStatus.downloading}
            >
              Check for updates
            </button>
            {updateStatus.available && !updateStatus.downloaded && (
              <button
                className="primary"
                onClick={handleDownloadUpdate}
                disabled={updateStatus.downloading}
              >
                {updateStatus.downloading ? 'Downloading...' : 'Download'}
              </button>
            )}
            {updateStatus.downloaded && (
              <button className="primary" onClick={handleInstallUpdate}>
                Install &amp; restart
              </button>
            )}
          </div>
        </div>
      </section>

      {/* About Section */}
      <section className="settings__section">
        <h2>About</h2>
        <div className="settings__about">
          <p><strong>DhakaFlix</strong></p>
          <p>Version: {appVersion || 'unknown'}</p>
          <p>A media catalogue and streaming app for ISP-provided servers.</p>
        </div>
      </section>
    </div>
  );
}
