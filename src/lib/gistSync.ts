import type { UserStats } from '../types';

export interface SyncConfig {
  gistId: string;
  token: string;
}

const SYNC_STORAGE_KEY = 'behavior_ops_sync_v1';
const GIST_FILENAME = 'behavior-ops-trainer-data.json';

export function parseGistId(input: string): string {
  const trimmed = (input || '').trim();
  if (!trimmed) return '';
  const parts = trimmed.replace(/\/+$/, '').split('/');
  return parts[parts.length - 1] || '';
}

export function loadSyncConfig(): SyncConfig {
  try {
    const raw = localStorage.getItem(SYNC_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        gistId: typeof parsed.gistId === 'string' ? parsed.gistId : '',
        token: typeof parsed.token === 'string' ? parsed.token : '',
      };
    }
  } catch {
    // ignore storage errors
  }
  return { gistId: '', token: '' };
}

export function saveSyncConfig(config: SyncConfig): void {
  try {
    localStorage.setItem(SYNC_STORAGE_KEY, JSON.stringify(config));
  } catch {
    // ignore storage errors
  }
}

export function clearSyncConfig(): void {
  try {
    localStorage.removeItem(SYNC_STORAGE_KEY);
  } catch {
    // ignore storage errors
  }
}

export function isValidUserStats(data: unknown): data is UserStats {
  if (!data || typeof data !== 'object') return false;
  const obj = data as Record<string, unknown>;
  return (
    typeof obj.xp === 'number' &&
    typeof obj.streak === 'number' &&
    typeof obj.bestStreak === 'number' &&
    typeof obj.progress === 'object' &&
    obj.progress !== null &&
    !Array.isArray(obj.progress)
  );
}

export async function pushStatsToGist(config: SyncConfig, stats: UserStats): Promise<string> {
  const res = await fetch(`https://api.github.com/gists/${encodeURIComponent(config.gistId)}`, {
    method: 'PATCH',
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${config.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      files: {
        [GIST_FILENAME]: {
          content: JSON.stringify(
            {
              ...stats,
              updatedAt: new Date().toISOString(),
            },
            null,
            2
          ),
        },
      },
    }),
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export interface PullResult {
  stats: UserStats | null;
  time: string;
}

export async function pullStatsFromGist(config: SyncConfig): Promise<PullResult> {
  const res = await fetch(`https://api.github.com/gists/${encodeURIComponent(config.gistId)}`, {
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${config.token}`,
    },
    cache: 'no-store',
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  const gist = await res.json();
  const files = (gist.files || {}) as Record<string, { content?: string }>;
  const fileObj = files[GIST_FILENAME] || Object.values(files)[0];

  let parsed: unknown = null;
  try {
    parsed = fileObj?.content ? JSON.parse(fileObj.content) : null;
  } catch {
    parsed = null;
  }

  const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (isValidUserStats(parsed)) {
    return {
      stats: {
        xp: parsed.xp,
        streak: parsed.streak,
        bestStreak: parsed.bestStreak,
        progress: parsed.progress,
      },
      time,
    };
  }
  return { stats: null, time };
}
