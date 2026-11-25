import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Brain,
  Flame,
  Search,
  CheckCircle2,
  Zap,
  Shield,
  BookOpen,
  ArrowLeft,
  Sparkles,
  RotateCcw,
  Cloud,
} from 'lucide-react';
import { TACTICS } from './data/tactics';
import type { Tactic, TacticCategory, UserStats } from './types';
import { TacticGameView } from './components/TacticGameView';
import { GauntletMode } from './components/GauntletMode';
import { CloudSyncModal } from './components/CloudSyncModal';
import {
  clearSyncConfig,
  loadSyncConfig,
  pullStatsFromGist,
  pushStatsToGist,
  saveSyncConfig,
  type SyncConfig,
} from './lib/gistSync';

const STORAGE_KEY = 'behavior_ops_trainer_stats_v1';

const CATEGORIES: Array<'All' | TacticCategory> = [
  'All',
  'Frame & Pillars',
  'Authority & Presence',
  'Profiling & Detection',
  'Linguistic & Covert Influence',
  'Enhanced Influence & Biases',
  'Tactical Protocols',
];

function loadStats(): UserStats {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore storage errors
  }
  return { xp: 0, streak: 0, bestStreak: 0, progress: {} };
}

export function App() {
  const [stats, setStats] = useState<UserStats>(loadStats);
  const [mode, setMode] = useState<'arsenal' | 'gauntlet'>('arsenal');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<'All' | TacticCategory>('All');
  const [statusFilter, setStatusFilter] = useState<'all' | 'untrained' | 'practicing' | 'installed'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [syncConfig, setSyncConfig] = useState<SyncConfig>(loadSyncConfig);
  const [syncOpen, setSyncOpen] = useState(false);
  const [syncStatus, setSyncStatus] = useState(() =>
    loadSyncConfig().gistId && loadSyncConfig().token ? 'Connected' : 'Not connected'
  );
  const [syncError, setSyncError] = useState(false);
  const skipNextPushRef = useRef(true);

  const handlePull = useCallback(
    async (configOverride?: SyncConfig, initIfEmpty = false, latestStats?: UserStats) => {
      const cfg = configOverride || syncConfig;
      if (!cfg.gistId || !cfg.token) return;
      setSyncError(false);
      setSyncStatus('Checking cloud...');
      try {
        const result = await pullStatsFromGist(cfg);
        if (result.stats) {
          skipNextPushRef.current = true;
          setStats(result.stats);
          setSyncStatus(`Pulled at ${result.time}`);
        } else if (initIfEmpty && latestStats) {
          const pushedTime = await pushStatsToGist(cfg, latestStats);
          setSyncStatus(`Synced at ${pushedTime}`);
        } else {
          setSyncStatus('Connected (no cloud data yet)');
        }
      } catch (err) {
        setSyncError(true);
        setSyncStatus(`Sync pull failed (${err instanceof Error ? err.message : 'error'})`);
      }
    },
    [syncConfig]
  );

  const handlePush = useCallback(
    async (configOverride?: SyncConfig, latestStats?: UserStats) => {
      const cfg = configOverride || syncConfig;
      if (!cfg.gistId || !cfg.token) return;
      setSyncError(false);
      setSyncStatus('Syncing...');
      try {
        const time = await pushStatsToGist(cfg, latestStats || stats);
        setSyncStatus(`Synced at ${time}`);
      } catch (err) {
        setSyncError(true);
        setSyncStatus(`Sync push failed (${err instanceof Error ? err.message : 'error'})`);
      }
    },
    [syncConfig, stats]
  );

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
    } catch {
      // ignore storage errors
    }

    if (skipNextPushRef.current) {
      skipNextPushRef.current = false;
      return;
    }

    if (!syncConfig.gistId || !syncConfig.token) return;
    const timer = window.setTimeout(() => {
      void handlePush(syncConfig, stats);
    }, 600);
    return () => window.clearTimeout(timer);
  }, [stats, syncConfig, handlePush]);

  useEffect(() => {
    const cfg = loadSyncConfig();
    if (cfg.gistId && cfg.token) {
      void handlePull(cfg, false);
    }
    // run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDrillResult = (tacticId: string, won: boolean, moduleCompleted = false) => {
    setStats((prev) => {
      const existing = prev.progress[tacticId] || { status: 'untrained', attempts: 0, wins: 0 };
      const nextWins = existing.wins + (won ? 1 : 0);
      const nextStatus =
        existing.status === 'installed' || moduleCompleted ? 'installed' : 'practicing';
      const nextStreak = won ? prev.streak + 1 : 0;
      return {
        xp: prev.xp + (won ? 25 : 5),
        streak: nextStreak,
        bestStreak: Math.max(prev.bestStreak, nextStreak),
        progress: {
          ...prev.progress,
          [tacticId]: {
            status: nextStatus,
            attempts: existing.attempts + 1,
            wins: nextWins,
            lastPlayedAt: Date.now(),
          },
        },
      };
    });
  };

  const installedCount = useMemo(
    () => TACTICS.filter((t) => stats.progress[t.id]?.status === 'installed').length,
    [stats.progress]
  );

  const filteredTactics = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return TACTICS.filter((t) => {
      if (categoryFilter !== 'All' && t.category !== categoryFilter) return false;
      const st = stats.progress[t.id]?.status || 'untrained';
      if (statusFilter !== 'all' && st !== statusFilter) return false;
      if (q) {
        const hay = `${t.name} ${t.tagline} ${t.overview} ${t.section}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [categoryFilter, statusFilter, searchQuery, stats.progress]);

  const selectedTactic: Tactic | undefined = useMemo(
    () => TACTICS.find((t) => t.id === selectedId),
    [selectedId]
  );

  const handleNextTactic = () => {
    if (!selectedTactic) return;
    const untrained = TACTICS.filter(
      (t) => t.id !== selectedTactic.id && (stats.progress[t.id]?.status || 'untrained') !== 'installed'
    );
    if (untrained.length > 0) {
      setSelectedId(untrained[0].id);
      return;
    }
    const idx = TACTICS.findIndex((t) => t.id === selectedTactic.id);
    setSelectedId(TACTICS[(idx + 1) % TACTICS.length].id);
  };

  const resetProgress = () => {
    if (window.confirm('Reset all installed tactics, XP, and streaks?')) {
      setStats({ xp: 0, streak: 0, bestStreak: 0, progress: {} });
    }
  };

  const masteryPct = TACTICS.length ? Math.round((installedCount / TACTICS.length) * 100) : 0;

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar-inner">
          <div
            className="brand"
            style={{ cursor: 'pointer' }}
            onClick={() => {
              setMode('arsenal');
              setSelectedId(null);
            }}
          >
            <div className="brand-icon">
              <Brain size={20} />
            </div>
            <div>
              <div className="brand-title">Behavior Ops // Brain Installer</div>
              <div className="brand-sub">Interactive Tactical Trainer • Chase Hughes Manual</div>
            </div>
          </div>

          <div className="hud-stats">
            <div className="hud-pill" title="Tactics installed into muscle memory">
              <CheckCircle2 size={15} color="#10b981" />
              <span>
                {installedCount} / {TACTICS.length} Installed
              </span>
            </div>
            <div className="hud-pill" title="Current win streak">
              <Flame size={15} color="#f59e0b" />
              <span>{stats.streak} Streak</span>
            </div>
            <div className="hud-pill" title="Total Tactical XP">
              <Zap size={15} color="#38bdf8" />
              <span>{stats.xp} XP</span>
            </div>

            <div className="nav-tabs">
              <button
                className={`btn ${mode === 'arsenal' ? 'btn-active' : ''}`}
                onClick={() => setMode('arsenal')}
              >
                <BookOpen size={15} /> Arsenal
              </button>
              <button
                className={`btn ${mode === 'gauntlet' ? 'btn-active' : ''}`}
                onClick={() => {
                  setMode('gauntlet');
                  setSelectedId(null);
                }}
              >
                <Flame size={15} /> Rapid-Fire Gauntlet
              </button>
              <button
                className="btn"
                onClick={() => setSyncOpen(true)}
                title={`Cloud Sync: ${syncStatus}`}
              >
                <Cloud size={15} />
                <span>Sync</span>
                <span
                  className="sync-dot"
                  style={{
                    background: syncError
                      ? 'var(--accent-rose)'
                      : syncConfig.gistId && syncConfig.token
                      ? 'var(--accent-emerald)'
                      : 'var(--text-muted)',
                  }}
                />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="main-container">
        {mode === 'gauntlet' ? (
          <GauntletMode
            tactics={TACTICS}
            onResult={handleDrillResult}
            onExit={() => setMode('arsenal')}
          />
        ) : selectedTactic ? (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <button className="btn" onClick={() => setSelectedId(null)}>
                <ArrowLeft size={15} /> Back to Arsenal
              </button>
              <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                {selectedTactic.section}
              </span>
            </div>

            <div className="workspace">
              {/* Left Panel: Field Brief */}
              <div className="panel">
                <div className="panel-header">
                  <div>
                    <div className="section-label">{selectedTactic.category}</div>
                    <h2 style={{ margin: 0, fontSize: 22 }}>{selectedTactic.name}</h2>
                  </div>
                  {stats.progress[selectedTactic.id]?.status === 'installed' ? (
                    <span className="badge badge-emerald">
                      <CheckCircle2 size={13} /> Installed
                    </span>
                  ) : stats.progress[selectedTactic.id]?.status === 'practicing' ? (
                    <span className="badge badge-amber">Practicing</span>
                  ) : (
                    <span className="badge badge-slate">Untrained</span>
                  )}
                </div>

                <p style={{ fontSize: 15, color: 'var(--accent-cyan)', fontWeight: 500, marginTop: 0 }}>
                  {selectedTactic.tagline}
                </p>

                <div
                  style={{
                    background: 'rgba(56, 189, 248, 0.07)',
                    border: '1px solid rgba(56, 189, 248, 0.28)',
                    borderRadius: 12,
                    padding: '14px 16px',
                    marginTop: 14,
                  }}
                >
                  <div className="section-label" style={{ marginBottom: 6 }}>
                    In Plain English (Executive Summary)
                  </div>
                  <p style={{ margin: 0, color: 'var(--text-primary)', fontSize: 14, lineHeight: 1.6 }}>
                    {selectedTactic.plainSummary}
                  </p>
                </div>

                <div
                  style={{
                    background: 'rgba(16, 185, 129, 0.06)',
                    border: '1px solid rgba(16, 185, 129, 0.25)',
                    borderRadius: 12,
                    padding: '14px 16px',
                    marginTop: 12,
                  }}
                >
                  <div className="section-label" style={{ color: 'var(--accent-emerald)', marginBottom: 6 }}>
                    Quick Real-World Example
                  </div>
                  <p style={{ margin: 0, color: 'var(--text-primary)', fontSize: 14, lineHeight: 1.6 }}>
                    {selectedTactic.quickExample}
                  </p>
                </div>

                <details style={{ marginTop: 18 }}>
                  <summary
                    style={{
                      cursor: 'pointer',
                      fontSize: 12,
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                      color: 'var(--text-secondary)',
                      userSelect: 'none',
                    }}
                  >
                    Deep-Dive Manual Notes &amp; Field Cues
                  </summary>

                  <div style={{ marginTop: 14 }}>
                    <div className="section-label">Tactical Overview</div>
                    <p style={{ margin: '6px 0 0 0', color: 'var(--text-secondary)', fontSize: 14 }}>
                      {selectedTactic.overview}
                    </p>
                  </div>

                  <div style={{ marginTop: 16 }}>
                    <div className="section-label">Psychological Mechanism</div>
                    <p style={{ margin: '6px 0 0 0', color: 'var(--text-secondary)', fontSize: 14 }}>
                      {selectedTactic.mechanism}
                    </p>
                  </div>

                  <div style={{ marginTop: 16 }}>
                    <div className="section-label">Field Execution &amp; Cues</div>
                    <ul className="guide-list" style={{ marginTop: 8 }}>
                      {selectedTactic.fieldGuide.map((item, idx) => (
                        <li key={idx}>{item}</li>
                      ))}
                    </ul>
                  </div>
                </details>
              </div>

              {/* Right Panel: Micro-Game */}
              <TacticGameView
                tactic={selectedTactic}
                onResult={handleDrillResult}
                onNext={handleNextTactic}
              />
            </div>
          </div>
        ) : (
          <>
            <div className="progress-banner">
              <div style={{ flex: 1, minWidth: 260 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, fontWeight: 600 }}>
                  <span>Neural Installation Progress</span>
                  <span style={{ color: 'var(--accent-emerald)' }}>{masteryPct}% Complete</span>
                </div>
                <div className="progress-track">
                  <div className="progress-fill" style={{ width: `${masteryPct}%` }} />
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <button
                  className="btn btn-emerald"
                  onClick={() => {
                    const next = TACTICS.find(
                      (t) => (stats.progress[t.id]?.status || 'untrained') !== 'installed'
                    );
                    setSelectedId((next || TACTICS[0]).id);
                  }}
                >
                  <Sparkles size={15} /> Train Next Untrained
                </button>
                <button className="btn" onClick={resetProgress} title="Reset progress">
                  <RotateCcw size={14} />
                </button>
              </div>
            </div>

            <div className="controls-bar">
              <div className="search-row">
                <div className="search-box">
                  <Search size={16} className="search-icon" />
                  <input
                    className="search-input"
                    placeholder="Search tactics, models, biases, protocols (e.g., KAPTOR, Needs Map, Anchoring)..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <div className="filter-chips">
                  {(['all', 'untrained', 'practicing', 'installed'] as const).map((st) => (
                    <button
                      key={st}
                      className={`chip ${statusFilter === st ? 'chip-active' : ''}`}
                      onClick={() => setStatusFilter(st)}
                    >
                      {st === 'all' ? 'All Status' : st.charAt(0).toUpperCase() + st.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="filter-chips">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    className={`chip ${categoryFilter === cat ? 'chip-active' : ''}`}
                    onClick={() => setCategoryFilter(cat)}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div className="tactics-grid">
              {filteredTactics.map((tactic) => {
                const prog = stats.progress[tactic.id];
                const isInstalled = prog?.status === 'installed';
                const isPracticing = prog?.status === 'practicing';
                return (
                  <div
                    key={tactic.id}
                    className={`tactic-card ${isInstalled ? 'installed' : ''}`}
                    onClick={() => setSelectedId(tactic.id)}
                  >
                    <div className="card-meta">
                      <span className="badge badge-cyan">{tactic.category}</span>
                      {isInstalled ? (
                        <span className="badge badge-emerald">
                          <CheckCircle2 size={12} /> Installed
                        </span>
                      ) : isPracticing ? (
                        <span className="badge badge-amber">Practicing</span>
                      ) : (
                        <span className="badge badge-slate">{tactic.difficulty}</span>
                      )}
                    </div>

                    <h3 className="card-title">{tactic.name}</h3>
                    <p className="card-tagline">{tactic.tagline}</p>

                    <div className="card-footer">
                      <span>
                        <Shield size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                        {tactic.drills.length} Scenarios
                      </span>
                      <span style={{ color: 'var(--accent-cyan)', fontWeight: 600 }}>
                        Train →
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </main>

      <CloudSyncModal
        isOpen={syncOpen}
        onClose={() => setSyncOpen(false)}
        syncConfig={syncConfig}
        syncStatus={syncStatus}
        syncError={syncError}
        stats={stats}
        onConnect={async (cfg) => {
          saveSyncConfig(cfg);
          setSyncConfig(cfg);
          await handlePull(cfg, true, stats);
        }}
        onPull={async () => {
          await handlePull(syncConfig, false);
        }}
        onPush={async () => {
          await handlePush(syncConfig, stats);
        }}
        onDisconnect={() => {
          clearSyncConfig();
          setSyncConfig({ gistId: '', token: '' });
          setSyncError(false);
          setSyncStatus('Not connected');
        }}
        onImportStats={(next) => {
          setStats(next);
        }}
      />
    </div>
  );
}

export default App;
