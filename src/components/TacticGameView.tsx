import React, { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  XCircle,
  RotateCcw,
  ArrowUp,
  ArrowDown,
  Sparkles,
  Crosshair,
  Layers,
  MessageSquare,
  Trophy,
} from 'lucide-react';
import type { Tactic, TacticGame } from '../types';

interface Props {
  tactic: Tactic;
  onResult: (tacticId: string, won: boolean, moduleCompleted?: boolean) => void;
  onNext?: () => void;
}

function shuffleArray<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export const TacticGameView: React.FC<Props> = ({ tactic, onResult, onNext }) => {
  const drills: TacticGame[] = tactic.drills;
  const [drillIdx, setDrillIdx] = useState(0);
  const [results, setResults] = useState<Array<boolean | null>>([]);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [seqOrder, setSeqOrder] = useState<string[]>([]);
  const [seqSubmitted, setSeqSubmitted] = useState<boolean>(false);
  const [finished, setFinished] = useState(false);

  const game = drills[drillIdx] ?? drills[0];

  // Reset when tactic changes
  useEffect(() => {
    setDrillIdx(0);
    setResults(drills.map(() => null));
    setSelectedIdx(null);
    setSeqSubmitted(false);
    setFinished(false);
  }, [tactic.id]);

  // Reset per-drill state when drillIdx changes
  useEffect(() => {
    setSelectedIdx(null);
    setSeqSubmitted(false);
    if (game && game.type === 'sequence') {
      let shuffled = shuffleArray(game.items);
      if (game.items.length > 1 && shuffled.every((v, i) => v === game.items[i])) {
        shuffled = [...shuffled.slice(1), shuffled[0]];
      }
      setSeqOrder(shuffled);
    }
  }, [tactic.id, drillIdx]);

  const shuffledOptions = useMemo(() => {
    if (game && (game.type === 'scenario' || game.type === 'spot_cue')) {
      return shuffleArray(game.options);
    }
    return [];
  }, [tactic.id, drillIdx]);

  const recordAnswer = (won: boolean) => {
    const nextResults = [...results];
    nextResults[drillIdx] = won;
    setResults(nextResults);

    const isLast = drillIdx === drills.length - 1;
    const allPassed = isLast && nextResults.every((r) => r === true);
    onResult(tactic.id, won, allPassed);
  };

  const handleOptionSelect = (idx: number) => {
    if (selectedIdx !== null) return;
    setSelectedIdx(idx);
    const chosen = shuffledOptions[idx];
    recordAnswer(chosen.isCorrect);
  };

  const moveSeqItem = (idx: number, dir: -1 | 1) => {
    if (seqSubmitted) return;
    const target = idx + dir;
    if (target < 0 || target >= seqOrder.length) return;
    const next = [...seqOrder];
    [next[idx], next[target]] = [next[target], next[idx]];
    setSeqOrder(next);
  };

  const handleSeqSubmit = () => {
    if (!game || game.type !== 'sequence' || seqSubmitted) return;
    setSeqSubmitted(true);
    const isCorrect = seqOrder.every((item, i) => item === game.items[i]);
    recordAnswer(isCorrect);
  };

  const handleAdvance = () => {
    if (drillIdx + 1 < drills.length) {
      setDrillIdx((i) => i + 1);
    } else {
      setFinished(true);
    }
  };

  const handleRestartModule = () => {
    setDrillIdx(0);
    setResults(drills.map(() => null));
    setSelectedIdx(null);
    setSeqSubmitted(false);
    setFinished(false);
  };

  const winsCount = results.filter((r) => r === true).length;

  if (finished) {
    const perfected = winsCount === drills.length;
    return (
      <div className="panel" style={{ textAlign: 'center', padding: '32px 24px' }}>
        <Trophy size={44} color={perfected ? '#10b981' : '#f59e0b'} style={{ marginBottom: 12 }} />
        <h3 style={{ margin: '0 0 8px 0', fontSize: 20 }}>
          {perfected ? 'Tactic Installed!' : 'Module Complete'}
        </h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14, margin: '0 0 20px 0' }}>
          You nailed <strong>{winsCount}</strong> out of <strong>{drills.length}</strong> scenarios for{' '}
          <strong>{tactic.name}</strong>.
          {!perfected && ' Score 100% across all scenarios to mark this tactic as Installed.'}
        </p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button className="btn" onClick={handleRestartModule}>
            <RotateCcw size={14} /> Replay Scenarios
          </button>
          {onNext && (
            <button className="btn btn-primary" onClick={onNext}>
              Next Tactic →
            </button>
          )}
        </div>
      </div>
    );
  }

  const gameBadge =
    game.type === 'scenario'
      ? { label: 'Scenario Sim', icon: <MessageSquare size={13} /> }
      : game.type === 'spot_cue'
      ? { label: 'Spot the Cue', icon: <Crosshair size={13} /> }
      : { label: 'Protocol Builder', icon: <Layers size={13} /> };

  const seqIsCorrect =
    game.type === 'sequence' && seqSubmitted && seqOrder.every((item, i) => item === game.items[i]);

  const hasAnsweredCurrent = selectedIdx !== null || seqSubmitted;

  return (
    <div className="panel">
      <div className="panel-header">
        <div>
          <div className="section-label">
            Brain Install Drill • Question {drillIdx + 1} of {drills.length}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
            <span className="badge badge-cyan">
              {gameBadge.icon} {gameBadge.label}
            </span>
            <div style={{ display: 'flex', gap: 5, marginLeft: 4 }}>
              {drills.map((_, i) => {
                const r = results[i];
                const bg =
                  r === true
                    ? '#10b981'
                    : r === false
                    ? '#f43f5e'
                    : i === drillIdx
                    ? '#38bdf8'
                    : '#1e2d47';
                return (
                  <span
                    key={i}
                    style={{
                      width: 22,
                      height: 6,
                      borderRadius: 999,
                      background: bg,
                      display: 'inline-block',
                    }}
                  />
                );
              })}
            </div>
          </div>
        </div>

        <button className="btn" onClick={handleRestartModule} title="Restart drill set">
          <RotateCcw size={14} />
        </button>
      </div>

      <h3 style={{ margin: '0 0 8px 0', fontSize: 16 }}>{game.prompt}</h3>

      {game.type === 'scenario' && (
        <div className="context-box">
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent-cyan)', marginBottom: 4 }}>
            SITUATION BRIEF
          </div>
          {game.context}
        </div>
      )}

      {game.type === 'spot_cue' && (
        <div className="context-box">
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent-amber)', marginBottom: 4 }}>
            OBSERVED TRANSCRIPT / BEHAVIOR
          </div>
          “{game.transcriptOrBehavior}”
        </div>
      )}

      {(game.type === 'scenario' || game.type === 'spot_cue') && (
        <>
          <div className="options-list">
            {shuffledOptions.map((opt, idx) => {
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
                  onClick={() => handleOptionSelect(idx)}
                >
                  <span style={{ fontWeight: 700, color: 'var(--text-muted)', minWidth: 20 }}>
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
            <div className={`feedback-box ${shuffledOptions[selectedIdx].isCorrect ? 'correct' : 'wrong'}`}>
              <div style={{ fontWeight: 700, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                {shuffledOptions[selectedIdx].isCorrect ? (
                  <>
                    <Sparkles size={16} /> Nice! (+25 XP)
                  </>
                ) : (
                  <>Not quite — check why:</>
                )}
              </div>
              <div style={{ marginBottom: 12 }}>{shuffledOptions[selectedIdx].feedback}</div>
              <button className="btn btn-primary" onClick={handleAdvance}>
                {drillIdx + 1 < drills.length ? 'Next Question →' : 'Finish Module →'}
              </button>
            </div>
          )}
        </>
      )}

      {game.type === 'sequence' && (
        <>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>
            Arrange the steps into the right order using the arrows:
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {seqOrder.map((item, idx) => {
              const isSpotRight = seqSubmitted && item === game.items[idx];
              return (
                <div
                  key={item}
                  className="seq-item"
                  style={
                    seqSubmitted
                      ? {
                          borderColor: isSpotRight ? 'var(--accent-emerald)' : 'var(--accent-rose)',
                          background: isSpotRight ? 'rgba(16,185,129,0.08)' : 'rgba(244,63,94,0.08)',
                        }
                      : undefined
                  }
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span className="seq-num">{idx + 1}</span>
                    <span>{item}</span>
                  </div>
                  {!seqSubmitted && (
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button
                        className="btn"
                        style={{ padding: '4px 8px' }}
                        disabled={idx === 0}
                        onClick={() => moveSeqItem(idx, -1)}
                        title="Move up"
                      >
                        <ArrowUp size={14} />
                      </button>
                      <button
                        className="btn"
                        style={{ padding: '4px 8px' }}
                        disabled={idx === seqOrder.length - 1}
                        onClick={() => moveSeqItem(idx, 1)}
                        title="Move down"
                      >
                        <ArrowDown size={14} />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {!hasAnsweredCurrent ? (
            <button className="btn btn-primary" style={{ marginTop: 16, width: '100%' }} onClick={handleSeqSubmit}>
              Lock In Sequence
            </button>
          ) : (
            <div className={`feedback-box ${seqIsCorrect ? 'correct' : 'wrong'}`}>
              <div style={{ fontWeight: 700, marginBottom: 4 }}>
                {seqIsCorrect ? 'Sequence Locked! (+25 XP)' : 'Order mismatch — compare with the correct sequence:'}
              </div>
              <div style={{ marginBottom: 10 }}>{game.explanation}</div>
              {!seqIsCorrect && (
                <ol style={{ margin: '6px 0 12px 18px', padding: 0, fontSize: 13 }}>
                  {game.items.map((step, i) => (
                    <li key={i}>{step}</li>
                  ))}
                </ol>
              )}
              <button className="btn btn-primary" onClick={handleAdvance}>
                {drillIdx + 1 < drills.length ? 'Next Question →' : 'Finish Module →'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};
