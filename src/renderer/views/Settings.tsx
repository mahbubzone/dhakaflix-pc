/**
 * Settings View
 *
 * Tabbed app configuration: sources, library scan, players, updates, about.
 * All capabilities from the previous stacked layout are preserved.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Icon from '../components/common/Icon';
import type { UpdateStatus } from '../../preload';
import type { PlayerInfo, Source } from '../types';
import { useSources } from '../hooks/useSources';
import { useCrawler } from '../hooks/useCrawler';
import { usePlayer } from '../hooks/usePlayer';
import './Settings.css';

export type SettingsSection = 'sources' | 'library' | 'players' | 'updates' | 'about';

interface SettingsProps {
  initialSection?: SettingsSection;
}

interface SettingsTab {
  id: SettingsSection;
  label: string;
}

const TABS: SettingsTab[] = [
  { id: 'sources', label: 'Sources' },
  { id: 'library', label: 'Library' },
  { id: 'players', label: 'Players' },
  { id: 'updates', label: 'Updates' },
  { id: 'about', label: 'About' },
];

const initialUpdateStatus: UpdateStatus = {
  checking: false,
  available: false,
  downloading: false,
  downloaded: false,
  version: null,
  progress: 0,
  error: null,
};

function formatDate(timestamp: number | null): string {
  if (!timestamp) return 'Never';
  return new Date(timestamp * 1000).toLocaleString(undefined, {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

function formatFormat(format: string): string {
  if (format === 'unknown') return 'Format pending';
  if (format === 'h5ai') return 'H5AI';
  return format.toUpperCase();
}

function normalizeUrl(url: string): string {
  const trimmed = url.trim().replace(/\/+$/, '');
  const parts = /^([a-z]+:\/\/)([^/]+)(.*)$/i.exec(trimmed);
  // Scheme and host are case-insensitive; paths on BDIX servers may not be.
  return parts
    ? `${parts[1].toLowerCase()}${parts[2].toLowerCase()}${parts[3]}`
    : trimmed;
}

function Chip({ tone, children }: { tone: string; children: React.ReactNode }) {
  return <span className={`settings-chip settings-chip--${tone}`}>{children}</span>;
}

function Card({ title, helper, children, action }: {
  title: string;
  helper?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <section className="settings-card">
      <div className="settings-card__head">
        <div>
          <h3 className="settings-card__title">{title}</h3>
          {helper && <p className="settings-card__helper">{helper}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export default function Settings({ initialSection = 'sources' }: SettingsProps) {
  const { sources, loading: sourcesLoading, error: sourcesError, addSource, removeSource, testSource, refresh: refreshSources } = useSources();
  const { status, startScan, stopScan, isScanning, error: scanError, clearError, completedAt } = useCrawler();
  const { players, loading: playersLoading, refresh: refreshPlayers, openDownloadPage } = usePlayer();

  const [active, setActive] = useState<SettingsSection>(initialSection);
  const [newSourceName, setNewSourceName] = useState('');
  const [newSourceUrl, setNewSourceUrl] = useState('');
  const [touched, setTouched] = useState(false);
  const [testing, setTesting] = useState(false);
  const [adding, setAdding] = useState(false);
  const [removingId, setRemovingId] = useState<number | null>(null);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [confirm, setConfirm] = useState<
    | { kind: 'remove'; source: Source }
    | { kind: 'install'; version: string | null }
    | null
  >(null);

  const [appVersion, setAppVersion] = useState<string | null>(null);
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus>(initialUpdateStatus);
  const [updateStage, setUpdateStage] = useState<'check' | 'download' | 'install'>('check');
  const [hasChecked, setHasChecked] = useState(false);
  const [lastChecked, setLastChecked] = useState<string | null>(null);
  const [polite, setPolite] = useState('');
  const [assertive, setAssertive] = useState('');

  const nameRef = useRef<HTMLInputElement>(null);
  const confirmCancelRef = useRef<HTMLButtonElement>(null);
  const lastCompletedAt = useRef(completedAt);

  useEffect(() => {
    setActive(initialSection);
  }, [initialSection]);

  useEffect(() => {
    let mounted = true;
    window.api.update.getVersion()
      .then((version) => { if (mounted) setAppVersion(version); })
      .catch(() => { /* Version stays unknown if IPC fails. */ });
    window.api.update.getStatus()
      .then((value) => { if (mounted) setUpdateStatus(value); })
      .catch(() => { /* Keep the initial idle status. */ });

    const offAvailable = window.api.update.onAvailable((info) => {
      setHasChecked(true);
      setUpdateStatus((prev) => ({ ...prev, checking: false, available: true, version: info.version, error: null }));
      setPolite(`Version ${info.version} is available.`);
    });
    const offProgress = window.api.update.onProgress(({ percent }) => {
      setUpdateStatus((prev) => ({ ...prev, downloading: true, progress: Math.round(percent) }));
    });
    const offReady = window.api.update.onReady(() => {
      setUpdateStatus((prev) => ({ ...prev, downloading: false, downloaded: true, progress: 100 }));
      setPolite('Download complete. Ready to install.');
    });

    return () => {
      mounted = false;
      offAvailable();
      offProgress();
      offReady();
    };
  }, []);

  // A completed scan refreshes last-scan dates and counts.
  useEffect(() => {
    if (!completedAt || completedAt === lastCompletedAt.current) return;
    lastCompletedAt.current = completedAt;
    refreshSources();
    setPolite('Scan finished.');
  }, [completedAt, refreshSources]);

  useEffect(() => {
    if (scanError) setAssertive(scanError);
  }, [scanError]);

  useEffect(() => {
    if (!confirm) return;
    confirmCancelRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        setConfirm(null);
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [confirm]);

  const stats = useMemo(() => ({
    count: sources.length,
    titles: sources.reduce((total, source) => total + source.last_scan_count, 0),
    last: sources.reduce((latest, source) => Math.max(latest, source.last_scan_at ?? 0), 0),
  }), [sources]);

  const urlValid = /^https?:\/\/\S+$/i.test(newSourceUrl.trim());
  const duplicate = sources.some((source) => normalizeUrl(source.base_url) === normalizeUrl(newSourceUrl));
  const canAdd = !!newSourceName.trim() && urlValid && !duplicate && !adding;

  const goToTab = (id: SettingsSection) => {
    setActive(id);
    const content = document.querySelector('.content');
    if (content) content.scrollTop = 0;
  };

  const onTabKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const index = TABS.findIndex((tab) => tab.id === active);
    let next = index;
    if (event.key === 'ArrowRight') next = (index + 1) % TABS.length;
    else if (event.key === 'ArrowLeft') next = (index - 1 + TABS.length) % TABS.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = TABS.length - 1;
    else return;
    event.preventDefault();
    event.stopPropagation();
    setActive(TABS[next].id);
    window.requestAnimationFrame(() => {
      document.getElementById(`settings-tab-${TABS[next].id}`)?.focus();
    });
  };

  const handleTestSource = async () => {
    if (!newSourceUrl.trim()) return;
    setTesting(true);
    setTestResult(null);
    try {
      const result = await testSource(newSourceUrl.trim());
      const message = result.ok
        ? (result.format && result.format !== 'unknown'
          ? `Connected. Detected ${formatFormat(result.format)} format.`
          : 'Connected. Format not recognised. DhakaFlix will try common directory layouts.')
        : `Could not connect. ${result.error || 'Check the URL and your ISP connection.'}`;
      setTestResult({ ok: result.ok, message });
      setPolite(message);
      if (!result.ok) setAssertive(message);
    } catch (error) {
      const message = `Could not connect. ${(error as Error).message}`;
      setTestResult({ ok: false, message });
      setAssertive(message);
    } finally {
      setTesting(false);
    }
  };

  const handleAddSource = async () => {
    setTouched(true);
    if (!canAdd) return;
    setAdding(true);
    try {
      await addSource(newSourceName.trim(), newSourceUrl.trim());
      setNewSourceName('');
      setNewSourceUrl('');
      setTestResult(null);
      setTouched(false);
      setPolite('Source added.');
      nameRef.current?.focus();
    } catch (error) {
      setAssertive(`Could not add the source. ${(error as Error).message}`);
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = async (source: Source) => {
    setRemovingId(source.id);
    try {
      await removeSource(source.id);
      setConfirm(null);
      setPolite(`Removed ${source.name}.`);
    } catch (error) {
      setAssertive(`Could not remove the source. ${(error as Error).message}`);
    } finally {
      setRemovingId(null);
    }
  };

  const updateError = updateStatus.error;
  const updateText = (() => {
    if (updateError) return `Could not ${updateStage} the update. ${updateError}`;
    if (updateStatus.checking) return 'Looking for a new version…';
    if (updateStatus.downloading) {
      return updateStatus.progress > 0
        ? `Downloading version ${updateStatus.version ?? ''} — ${Math.round(updateStatus.progress)}% complete.`
        : 'Starting download…';
    }
    if (updateStatus.downloaded) return `Version ${updateStatus.version ?? ''} is ready. Installing restarts DhakaFlix.`;
    if (updateStatus.available) return `Version ${updateStatus.version ?? ''} is available.`;
    return hasChecked ? "You're on the latest version." : 'Check for updates to see if a new version is available.';
  })();
  const updateChip = updateError ? 'Update failed'
    : updateStatus.checking ? 'Checking…'
      : updateStatus.downloading ? 'Downloading'
        : updateStatus.downloaded ? 'Ready to install'
          : updateStatus.available ? 'Update available'
            : hasChecked ? 'Up to date' : 'Not checked';
  const updateTone = updateError ? 'danger'
    : updateStatus.downloaded || hasChecked ? 'success'
      : updateStatus.available ? 'accent' : 'neutral';

  const runUpdateStage = async (stage: 'check' | 'download' | 'install') => {
    setUpdateStage(stage);
    setUpdateStatus((prev) => ({ ...prev, error: null }));
    try {
      if (stage === 'check') {
        const result = await window.api.update.check();
        setUpdateStatus(result);
        setHasChecked(true);
        setLastChecked(new Date().toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }));
      } else if (stage === 'download') {
        const result = await window.api.update.download();
        if (!result.ok) setUpdateStatus((prev) => ({ ...prev, error: result.error }));
      } else {
        const result = await window.api.update.install();
        if (!result.ok) setUpdateStatus((prev) => ({ ...prev, error: result.error }));
        else setConfirm(null);
      }
    } catch (error) {
      setUpdateStatus((prev) => ({ ...prev, error: (error as Error).message }));
      setAssertive(`Could not ${stage} the update. ${(error as Error).message}`);
    }
  };

  const noPlayer = !playersLoading && players.every((player: PlayerInfo) => !player.installed);

  return (
    <div className="settings">
      <div aria-live="polite" aria-atomic="true" className="settings-visually-hidden">{polite}</div>
      <div role="alert" aria-live="assertive" aria-atomic="true" className="settings-visually-hidden">{assertive}</div>

      <header className="settings__header">
        <div>
          <h1 className="settings__title">Settings</h1>
          <p className="settings__subtitle">Manage sources, scans, players and app updates.</p>
        </div>
        <Chip tone="neutral">{appVersion ? `v${appVersion}` : 'Version unavailable'}</Chip>
      </header>

      <div
        className="settings__tabs"
        role="tablist"
        aria-label="Settings sections"
        onKeyDown={onTabKeyDown}
      >
        {TABS.map((tab) => (
          <button
            key={tab.id}
            id={`settings-tab-${tab.id}`}
            className={`settings__tab${active === tab.id ? ' settings__tab--active' : ''}`}
            type="button"
            role="tab"
            aria-selected={active === tab.id}
            aria-controls={`settings-panel-${tab.id}`}
            tabIndex={active === tab.id ? 0 : -1}
            onClick={() => goToTab(tab.id)}
          >
            {tab.label}
            {tab.id === 'library' && isScanning && <span className="settings__dot settings__dot--accent" title="Scan running" />}
            {tab.id === 'players' && noPlayer && <span className="settings__dot settings__dot--warn" title="No player installed" />}
            {tab.id === 'updates' && (updateStatus.available || updateStatus.downloaded) && <span className="settings__dot settings__dot--accent" title="Update available" />}
          </button>
        ))}
      </div>

      {active === 'sources' && (
        <div className="settings__panel" id="settings-panel-sources" role="tabpanel" aria-labelledby="settings-tab-sources" tabIndex={0}>
          <h2 className="settings__section-title">Media sources</h2>
          <p className="settings__section-helper">DhakaFlix indexes movie and series files from BDIX servers you add here.</p>

          <div className="settings__sources-grid">
            <Card title="Connected sources" helper={sources.length ? `${sources.length} connected` : undefined} action={<Chip tone="neutral">{sources.length}</Chip>}>
              {sourcesLoading ? (
                <p className="settings__meta">Loading sources…</p>
              ) : sourcesError && sources.length === 0 ? (
                <div className="settings__alert settings__alert--error">
                  <span>Could not load sources.</span>
                  <button className="settings-btn settings-btn--ghost" type="button" onClick={refreshSources}>
                    <Icon name="refresh-cw" style={{ fontSize: 'var(--icon-inline)' }} /> Try again
                  </button>
                </div>
              ) : sources.length === 0 ? (
                <div className="settings__empty">
                  <h4>No sources yet</h4>
                  <p>Add your ISP&apos;s media server to start building your library.</p>
                  <button className="settings-btn settings-btn--secondary" type="button" onClick={() => nameRef.current?.focus()}>Add your first source</button>
                </div>
              ) : (
                <ul className="settings__source-list" aria-label="Connected sources">
                  {sources.map((source) => {
                    const scanningThis = isScanning && status.sourceId === source.id;
                    const isConfirming = confirm?.kind === 'remove' && confirm.source.id === source.id;
                    return (
                      <li className={`settings__source${scanningThis ? ' settings__source--scanning' : ''}`} key={source.id}>
                        <div className="settings__source-main">
                          <div className="settings__source-line">
                            <span className="settings__source-name">{source.name}</span>
                            <Chip tone={source.format === 'unknown' ? 'neutral' : 'success'}>{formatFormat(source.format)}</Chip>
                            {scanningThis && <Chip tone="accent">Scanning</Chip>}
                          </div>
                          <span className="settings__source-url" title={source.base_url}>{source.base_url}</span>
                          <span className="settings__source-meta">
                            {scanningThis
                              ? 'Scan in progress. Stop the scan to remove this source.'
                              : source.last_scan_at
                                ? `Last scan ${formatDate(source.last_scan_at)} · ${source.last_scan_count.toLocaleString()} titles`
                                : 'Never scanned'}
                          </span>
                        </div>
                        {!isConfirming && (
                          <div className="settings__row-actions">
                            {!isScanning && (
                              <button
                                className="settings-btn settings-btn--ghost settings-btn--compact"
                                type="button"
                                aria-label={`Scan ${source.name}`}
                                onClick={() => void startScan(source.id)}
                              >
                                Scan
                              </button>
                            )}
                            <button
                              className="settings-btn settings-btn--danger-ghost settings-btn--compact"
                              type="button"
                              aria-label={`Remove ${source.name}`}
                              disabled={isScanning || removingId === source.id}
                              title={isScanning ? 'Stop the scan before removing a source' : undefined}
                              onClick={() => setConfirm({ kind: 'remove', source })}
                            >
                              Remove
                            </button>
                          </div>
                        )}
                        {isConfirming && (
                          <div className="settings__confirm" role="group" aria-label={`Remove ${source.name}`}>
                            <strong>Remove “{source.name}”?</strong>
                            <p>
                              {source.last_scan_count > 0
                                ? `This deletes ${source.last_scan_count.toLocaleString()} titles and their watch progress from your library. Files on the server are not touched.`
                                : 'This removes the source and its titles from your library. Files on the server are not touched.'}
                            </p>
                            <div className="settings__confirm-actions">
                              <button
                                ref={confirmCancelRef}
                                className="settings-btn settings-btn--secondary"
                                type="button"
                                onClick={() => setConfirm(null)}
                              >
                                Cancel
                              </button>
                              <button
                                className="settings-btn settings-btn--primary"
                                type="button"
                                disabled={removingId === source.id}
                                onClick={() => void handleRemove(source)}
                              >
                                {removingId === source.id ? 'Removing…' : 'Remove source'}
                              </button>
                            </div>
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </Card>

            <Card title="Add a source" helper="Paste the folder URL from your ISP. Testing is optional.">
              <div className="settings__field">
                <label htmlFor="settings-source-name">Name</label>
                <input
                  ref={nameRef}
                  id="settings-source-name"
                  type="text"
                  placeholder="ISP Movies"
                  value={newSourceName}
                  aria-invalid={touched && !newSourceName.trim()}
                  onChange={(event) => setNewSourceName(event.target.value)}
                  onBlur={() => setTouched(true)}
                  onKeyDown={(event) => { if (event.key === 'Enter') void handleAddSource(); }}
                />
                <span className="settings__field-helper">Shown in the app.</span>
              </div>
              <div className="settings__field">
                <label htmlFor="settings-source-url">Server URL</label>
                <input
                  id="settings-source-url"
                  type="url"
                  inputMode="url"
                  autoComplete="off"
                  spellCheck={false}
                  placeholder="http://172.16.50.5/movies/"
                  value={newSourceUrl}
                  aria-invalid={touched && !!newSourceUrl && (!urlValid || duplicate)}
                  onChange={(event) => {
                    setNewSourceUrl(event.target.value);
                    setTestResult(null);
                  }}
                  onBlur={() => setTouched(true)}
                  onKeyDown={(event) => { if (event.key === 'Enter') void handleAddSource(); }}
                />
                <span className="settings__field-helper">The folder URL from your ISP. Test it if you are unsure.</span>
                {touched && !!newSourceUrl && !urlValid && (
                  <span className="settings__field-error">Enter a full URL starting with http:// or https://.</span>
                )}
                {touched && duplicate && (
                  <span className="settings__field-error">This URL is already added.</span>
                )}
              </div>
              <div className="settings__form-actions">
                <button className="settings-btn settings-btn--secondary" type="button" disabled={!newSourceUrl.trim() || testing} onClick={() => void handleTestSource()}>
                  {testing ? 'Testing…' : 'Test connection'}
                </button>
                <button className="settings-btn settings-btn--primary" type="button" disabled={!canAdd} onClick={() => void handleAddSource()}>
                  {adding ? 'Adding…' : 'Add source'}
                </button>
              </div>
              {touched && !newSourceName.trim() && (
                <span className="settings__field-error">Name and server URL are required.</span>
              )}
              {testResult && (
                <div className={`settings__alert ${testResult.ok ? 'settings__alert--success' : 'settings__alert--error'}`} role={testResult.ok ? 'status' : 'alert'}>
                  {testResult.message}
                </div>
              )}
            </Card>
          </div>
        </div>
      )}

      {active === 'library' && (
        <div className="settings__panel" id="settings-panel-library" role="tabpanel" aria-labelledby="settings-tab-library" tabIndex={0}>
          <h2 className="settings__section-title">Library scan</h2>
          <p className="settings__section-helper">A scan reads folder listings from every source and adds new titles. Watch progress is kept.</p>
          <Card title={isScanning ? (status.sourceName ? `Scanning ${status.sourceName}` : 'Scanning all sources') : 'Library status'}>
            <div className="settings__scan-head">
              <Chip tone={isScanning ? (status.phase === 'indexing' ? 'warn' : 'accent') : 'neutral'}>
                {isScanning ? (status.phase === 'indexing' ? 'Indexing' : 'Scanning') : 'Idle'}
              </Chip>
              {sources.length === 0 && !isScanning ? (
                <button className="settings-btn settings-btn--secondary" type="button" onClick={() => goToTab('sources')}>Go to Sources</button>
              ) : (
                <button
                  className={`settings-btn ${isScanning ? 'settings-btn--stop' : 'settings-btn--primary'}`}
                  type="button"
                  onClick={() => void (isScanning ? stopScan() : startScan())}
                >
                  {isScanning ? 'Stop scan' : 'Start scan'}
                </button>
              )}
            </div>

            {!isScanning && (
              <p className="settings__body-text">
                {sources.length === 0
                  ? 'Add a source before you scan.'
                  : stats.last
                    ? `Last scan completed ${formatDate(stats.last)}.`
                    : 'No scan has run yet. Start a scan to add titles from your sources.'}
              </p>
            )}

            {isScanning && (
              <div className="settings__scan-progress">
                <p className="settings__body-text">
                  {status.phase === 'indexing'
                    ? 'Saving titles to your library…'
                    : status.discovered > 0
                      ? `${status.scanned} of ${status.discovered} folders scanned`
                      : 'Counting folders…'}
                </p>
                <div
                  className="settings__progress"
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={status.phase === 'scanning' && status.discovered > 0 ? Math.min(100, Math.round(status.scanned / status.discovered * 100)) : undefined}
                  aria-valuetext={status.discovered > 0 ? `${status.scanned} of ${status.discovered} folders scanned` : 'Scanning'}
                >
                  <div className="settings__progress-fill" style={{ width: status.phase === 'scanning' && status.discovered > 0 ? `${Math.min(100, status.scanned / status.discovered * 100)}%` : '30%' }} />
                </div>
                {status.currentPath && (
                  <div className="settings__path-block">
                    <span className="settings__path-label">Current folder</span>
                    <span className="settings__path" title={status.currentPath}>{status.currentPath}</span>
                  </div>
                )}
              </div>
            )}

            {scanError && (
              <div className="settings__alert settings__alert--error" role="alert">
                <span>{scanError}</span>
                <button className="settings-btn settings-btn--ghost" type="button" onClick={clearError}>Dismiss</button>
              </div>
            )}

            <dl className="settings__stats">
              <div><dt>Sources</dt><dd>{stats.count}</dd></div>
              <div><dt>Titles indexed</dt><dd>{stats.titles.toLocaleString()}</dd></div>
              <div><dt>Last scan</dt><dd>{stats.last ? formatDate(stats.last) : 'Never'}</dd></div>
            </dl>
          </Card>
        </div>
      )}

      {active === 'players' && (
        <div className="settings__panel" id="settings-panel-players" role="tabpanel" aria-labelledby="settings-tab-players" tabIndex={0}>
          <h2 className="settings__section-title">Video players</h2>
          <p className="settings__section-helper">DhakaFlix opens videos in an external player. Install one, then play any title.</p>
          <div className="settings__players-grid">
            {playersLoading ? (
              <Card title="Players"><p className="settings__meta">Checking for installed players…</p></Card>
            ) : (
              <>
                {(['vlc', 'potplayer'] as const).map((id) => {
                  const player = players.find((item) => item.name === id);
                  const installed = !!player?.installed;
                  const name = id === 'vlc' ? 'VLC media player' : 'PotPlayer';
                  return (
                    <Card
                      key={id}
                      title={name}
                      helper={id === 'vlc' ? 'Plays nearly every codec. Recommended.' : 'Lightweight player with strong subtitle support.'}
                    >
                      <Chip tone={installed ? 'success' : 'neutral'}>{installed ? 'Installed' : 'Not installed'}</Chip>
                      {installed && player?.path && <p className="settings__path">Found at {player.path}</p>}
                      {!installed && (
                        <>
                          <p className="settings__meta">Install {name}, then reopen Settings to detect it.</p>
                          <button
                            className="settings-btn settings-btn--secondary"
                            type="button"
                            aria-label={`Download ${name}, opens in your browser`}
                            onClick={() => openDownloadPage(id)}
                          >
                            Get {id === 'vlc' ? 'VLC' : 'PotPlayer'}
                          </button>
                        </>
                      )}
                    </Card>
                  );
                })}
                {noPlayer && (
                  <div className="settings__alert settings__alert--warn" role="status">
                    No supported player found. Install VLC or PotPlayer to play titles.
                  </div>
                )}
                <button className="settings-btn settings-btn--ghost" type="button" onClick={refreshPlayers}>
                  <Icon name="refresh-cw" style={{ fontSize: 'var(--icon-inline)' }} /> Check again
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {active === 'updates' && (
        <div className="settings__panel" id="settings-panel-updates" role="tabpanel" aria-labelledby="settings-tab-updates" tabIndex={0}>
          <h2 className="settings__section-title">App updates</h2>
          <p className="settings__section-helper">DhakaFlix downloads updates from GitHub Releases in the background.</p>
          <Card title="Update status">
            <div className="settings__update-version">
              <span>Current version</span>
              <strong>{appVersion ?? 'Unknown'}</strong>
            </div>
            <div className="settings__status-row">
              <Chip tone={updateTone}>{updateChip}</Chip>
              <span className="settings__body-text">{updateText}</span>
            </div>
            {updateStatus.downloading && (
              <div className="settings__progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(updateStatus.progress)} aria-valuetext={`Downloading, ${Math.round(updateStatus.progress)} percent`}>
                <div className="settings__progress-fill" style={{ width: `${Math.round(updateStatus.progress)}%` }} />
              </div>
            )}
            {lastChecked && !updateStatus.checking && <p className="settings__meta">Last checked at {lastChecked}.</p>}
            <div className="settings__form-actions">
              {!updateStatus.available && !updateStatus.downloaded && (
                <button className="settings-btn settings-btn--secondary" type="button" disabled={updateStatus.checking || updateStatus.downloading} onClick={() => void runUpdateStage('check')}>
                  {updateStatus.checking ? (
                    <>
                      <Icon name="loader-circle" style={{ fontSize: 'var(--icon-inline)' }} /> Checking…
                    </>
                  ) : (
                    <>
                      <Icon name="refresh-cw" style={{ fontSize: 'var(--icon-inline)' }} /> Check for updates
                    </>
                  )}
                </button>
              )}
              {updateStatus.available && !updateStatus.downloaded && (
                <button className="settings-btn settings-btn--primary" type="button" disabled={updateStatus.downloading} onClick={() => void runUpdateStage('download')}>
                  {updateStatus.downloading ? 'Downloading…' : 'Download update'}
                </button>
              )}
              {updateStatus.downloaded && (
                <button className="settings-btn settings-btn--primary" type="button" onClick={() => setConfirm({ kind: 'install', version: updateStatus.version })}>
                  Install and restart
                </button>
              )}
              {updateError && (
                <button className="settings-btn settings-btn--ghost" type="button" onClick={() => void runUpdateStage(updateStatus.downloaded ? 'install' : updateStatus.available ? 'download' : 'check')}>
                  <Icon name="refresh-cw" style={{ fontSize: 'var(--icon-inline)' }} /> Try again
                </button>
              )}
            </div>
            {confirm?.kind === 'install' && (
              <div className="settings__confirm" role="group" aria-label="Confirm install">
                <strong>Install version {confirm.version ?? ''} and restart?</strong>
                <p>DhakaFlix will close and reopen. Playback stops if it is running.</p>
                <div className="settings__confirm-actions">
                  <button ref={confirmCancelRef} className="settings-btn settings-btn--secondary" type="button" onClick={() => setConfirm(null)}>Cancel</button>
                  <button className="settings-btn settings-btn--primary" type="button" onClick={() => void runUpdateStage('install')}>Install and restart</button>
                </div>
              </div>
            )}
          </Card>
        </div>
      )}

      {active === 'about' && (
        <div className="settings__panel" id="settings-panel-about" role="tabpanel" aria-labelledby="settings-tab-about" tabIndex={0}>
          <h2 className="settings__section-title">About DhakaFlix</h2>
          <Card title="DhakaFlix">
            <p className="settings__brand"><span>Dhaka</span><b>Flix</b></p>
            <p className="settings__body-text">Version {appVersion ?? 'unknown'}</p>
            <p className="settings__meta">A media catalogue and streaming app for ISP-provided servers.</p>
            <p className="settings__meta">Built for BDIX networks.</p>
          </Card>
        </div>
      )}
    </div>
  );
}
