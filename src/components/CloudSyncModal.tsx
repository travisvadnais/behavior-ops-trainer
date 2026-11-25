import { useRef, useState } from 'react';
import { Cloud, Download, Upload, X, RefreshCw, Unplug, CheckCircle2 } from 'lucide-react';
import type { UserStats } from '../types';
import { isValidUserStats, parseGistId, type SyncConfig } from '../lib/gistSync';

interface CloudSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  syncConfig: SyncConfig;
  syncStatus: string;
  syncError: boolean;
  stats: UserStats;
  onConnect: (config: SyncConfig) => Promise<void>;
  onPull: () => Promise<void>;
  onPush: () => Promise<void>;
  onDisconnect: () => void;
  onImportStats: (next: UserStats) => void;
}

export function CloudSyncModal({
  isOpen,
  onClose,
  syncConfig,
  syncStatus,
  syncError,
  stats,
  onConnect,
  onPull,
  onPush,
  onDisconnect,
  onImportStats,
}: CloudSyncModalProps) {
  const [gistInput, setGistInput] = useState(syncConfig.gistId);
  const [tokenInput, setTokenInput] = useState(syncConfig.token);
  const [localMsg, setLocalMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const isConnected = Boolean(syncConfig.gistId && syncConfig.token);

  const handleConnect = async () => {
    const gistId = parseGistId(gistInput);
    const token = tokenInput.trim();
    if (!gistId || !token) {
      setLocalMsg('Enter both a Secret Gist ID (or URL) and a GitHub Token.');
      return;
    }
    setLocalMsg(null);
    setBusy(true);
    try {
      await onConnect({ gistId, token });
    } finally {
      setBusy(false);
    }
  };

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(stats, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `behavior-ops-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setLocalMsg('Exported progress backup JSON.');
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (!isValidUserStats(parsed)) {
        setLocalMsg('Invalid backup file format.');
        return;
      }
      onImportStats({
        xp: parsed.xp,
        streak: parsed.streak,
        bestStreak: parsed.bestStreak,
        progress: parsed.progress,
      });
      setLocalMsg('Imported progress! Syncing to cloud if connected.');
    } catch {
      setLocalMsg('Could not read JSON file.');
    } finally {
      e.target.value = '';
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
        <div className="panel-header" style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Cloud size={20} color="var(--accent-cyan)" />
            <h2 style={{ margin: 0, fontSize: 18 }}>Cloud Sync & Backup</h2>
          </div>
          <button className="btn" onClick={onClose} style={{ padding: '6px 10px' }} aria-label="Close">
            <X size={16} />
          </button>
        </div>

        <p style={{ margin: '0 0 16px', fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
          Sync your XP, streaks, and installed tactics between desktop and Android using one GitHub Secret Gist.
          Your credentials stay only in this browser&apos;s local storage.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label className="sync-label" htmlFor="syncGistId">
              Secret Gist ID (or full Gist URL)
            </label>
            <input
              id="syncGistId"
              className="sync-input"
              type="text"
              placeholder="e.g. a1b2c3d4e5f6... or https://gist.github.com/..."
              value={gistInput}
              onChange={(e) => setGistInput(e.target.value)}
            />
          </div>

          <div>
            <label className="sync-label" htmlFor="syncToken">
              GitHub Token (gist scope)
            </label>
            <input
              id="syncToken"
              className="sync-input"
              type="password"
              placeholder="ghp_... or github_pat_..."
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
            <button className="btn btn-primary" disabled={busy} onClick={handleConnect}>
              <CheckCircle2 size={15} /> {isConnected ? 'Update & Sync' : 'Connect & Sync'}
            </button>
            {isConnected && (
              <>
                <button
                  className="btn"
                  disabled={busy}
                  onClick={async () => {
                    setBusy(true);
                    try {
                      await onPull();
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  <RefreshCw size={14} /> Pull Latest
                </button>
                <button
                  className="btn"
                  disabled={busy}
                  onClick={async () => {
                    setBusy(true);
                    try {
                      await onPush();
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  <Upload size={14} /> Push Now
                </button>
                <button
                  className="btn"
                  style={{ color: 'var(--accent-rose)', borderColor: 'rgba(244, 63, 94, 0.35)' }}
                  onClick={() => {
                    onDisconnect();
                    setGistInput('');
                    setTokenInput('');
                    setLocalMsg(null);
                  }}
                >
                  <Unplug size={14} /> Disconnect
                </button>
              </>
            )}
          </div>

          <div
            style={{
              fontSize: 12,
              color: syncError ? 'var(--accent-rose)' : 'var(--text-secondary)',
              padding: '8px 10px',
              borderRadius: 8,
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border)',
            }}
          >
            Status: <strong>{syncStatus}</strong>
            {localMsg && <div style={{ marginTop: 4, color: 'var(--accent-cyan)' }}>{localMsg}</div>}
          </div>
        </div>

        <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '18px 0' }} />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            Manual JSON Backup (useful for moving local progress)
          </span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn" onClick={handleExport}>
              <Download size={14} /> Export JSON
            </button>
            <button className="btn" onClick={() => fileInputRef.current?.click()}>
              <Upload size={14} /> Import JSON
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json,.json"
              style={{ display: 'none' }}
              onChange={handleImportFile}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
