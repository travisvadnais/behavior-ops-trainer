import React, { useMemo, useState } from 'react';
import { Flame, CheckCircle2, XCircle, Trophy, RotateCcw } from 'lucide-react';
import type { ScenarioGame, SpotCueGame, Tactic } from '../types';

interface Props {
  tactics: Tactic[];
  onResult: (tacticId: string, won: boolean) => void;
  onExit: () => void;
}

function shuffle<T>(arr: T[]): T[] {
  const c = [...arr];
  for (let i = c.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [c[i], c[j]] = [c[j], c[i]];
  }
  return c;
}

interface GauntletItem {
  tactic: Tactic;
  drill: ScenarioGame | SpotCueGame;
}

export const GauntletMode: React.FC<Props> = ({ tactics, onResult, onExit }) => {
  const [seed, setSeed] = useState(0);
  const deck = useMemo<GauntletItem[]>(() => {
    const pool: GauntletItem[] = [];
    for (const t of tactics) {
      const mc = t.drills.filter(
        (d): d is ScenarioGame | SpotCueGame => d.type === 'scenario' || d.type === 'spot_cue'
      );
      if (mc.length > 0) {
        const pick = mc[Math.floor(Math.random() * mc.length)];
        pool.push({ tactic: t, drill: pick });
      }
    }
    return shuffle(pool).slice(0, 7);
  }, [tactics, seed]);

  const [round, setRound] = useState(0);
  const [score, setScore] = useState(0);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);

  const current = deck[round];

  const options = useMemo(() => {
    if (!current) return [];
    return shuffle(current.drill.options);
  }, [current]);

  if (!current) {
    return (
      <div className="panel" style={{ maxWidth: 640, margin: '0 auto', textAlign: 'center' }}>
        <Trophy size={42} color="#f59e0b" style={{ marginBottom: 10 }} />
        <h2 style={{ margin: '0 0 8px 0' }}>Gauntlet Complete</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: 15 }}>
          You scored <strong>{score}</strong> / {deck.length} in this Rapid-Fire Drill.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 20 }}>
          <button
            className="btn btn-primary"
            onClick={() => {
              setRound(0);
              setScore(0);
              setSelectedIdx(null);
              setSeed((s) => s + 1);
            }}
          >
            <RotateCcw size={15} /> Run Another Gauntlet
          </button>
          <button className="btn" onClick={onExit}>
            Back to Arsenal
          </button>
        </div>
      </div>
    );
  }

  const handlePick = (idx: number) => {
    if (selectedIdx !== null) return;
    setSelectedIdx(idx);
    const won = options[idx].isCorrect;
    if (won) setScore((s) => s + 1);
    onResult(current.tactic.id, won);
  };

  return (
    <div className="panel" style={{ maxWidth: 760, margin: '0 auto' }}>
      <div className="panel-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className="badge badge-amber">
            <Flame size={13} /> Rapid-Fire Gauntlet
          </span>
          <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            Round {round + 1} of {deck.length}
          </span>
        </div>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent-emerald)' }}>
          Score: {score}
        </div>
      </div>

      <div className="section-label">
        {current.tactic.category} • {current.tactic.name}
      </div>
      <h3 style={{ margin: '0 0 10px 0', fontSize: 18 }}>{current.drill.prompt}</h3>

      {current.drill.type === 'scenario' && (
        <div className="context-box">{current.drill.context}</div>
      )}
      {current.drill.type === 'spot_cue' && (
        <div className="context-box">“{current.drill.transcriptOrBehavior}”</div>
      )}

      <div className="options-list">
        {options.map((opt, idx) => {
          const isSelected = selectedIdx === idx;
          const showResult = selectedIdx !== null;
          let cls = 'option-btn';
          if (showResult) {
            if (opt.isCorrect) cls += ' correct';
            else if (isSelected) cls += ' wrong';
          }
          return (
            <button
              key={idx}
              className={cls}
              disabled={showResult}
              onClick={() => handlePick(idx)}
            >
              <span style={{ fontWeight: 700, color: 'var(--text-muted)' }}>
                {String.fromCharCode(65 + idx)}.
              </span>
              <span style={{ flex: 1 }}>{opt.text}</span>
              {showResult && opt.isCorrect && <CheckCircle2 size={18} color="#10b981" />}
              {showResult && isSelected && !opt.isCorrect && <XCircle size={18} color="#f43f5e" />}
            </button>
          );
        })}
      </div>

      {selectedIdx !== null && (
        <div className={`feedback-box ${options[selectedIdx].isCorrect ? 'correct' : 'wrong'}`}>
          <div style={{ marginBottom: 10 }}>{options[selectedIdx].feedback}</div>
          <button
            className="btn btn-primary"
            onClick={() => {
              setSelectedIdx(null);
              setRound((r) => r + 1);
            }}
          >
            {round + 1 < deck.length ? 'Next Round →' : 'View Results'}
          </button>
        </div>
      )}
    </div>
  );
};
