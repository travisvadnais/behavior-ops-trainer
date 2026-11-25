export type TacticCategory =
  | 'Frame & Pillars'
  | 'Authority & Presence'
  | 'Profiling & Detection'
  | 'Linguistic & Covert Influence'
  | 'Enhanced Influence & Biases'
  | 'Tactical Protocols';

export type Difficulty = 'Core' | 'Intermediate' | 'Advanced';

export interface GameOption {
  text: string;
  isCorrect: boolean;
  feedback: string;
}

export interface ScenarioGame {
  type: 'scenario';
  prompt: string;
  context: string;
  options: GameOption[];
}

export interface SpotCueGame {
  type: 'spot_cue';
  prompt: string;
  transcriptOrBehavior: string;
  options: GameOption[];
}

export interface SequenceGame {
  type: 'sequence';
  prompt: string;
  items: string[];
  explanation: string;
}

export type TacticGame = ScenarioGame | SpotCueGame | SequenceGame;

export interface Tactic {
  id: string;
  name: string;
  section: string;
  category: TacticCategory;
  difficulty: Difficulty;
  tagline: string;
  plainSummary: string;
  quickExample: string;
  overview: string;
  mechanism: string;
  fieldGuide: string[];
  drills: TacticGame[];
}

export type MasteryStatus = 'untrained' | 'practicing' | 'installed';

export interface TacticProgress {
  status: MasteryStatus;
  attempts: number;
  wins: number;
  lastPlayedAt?: number;
}

export interface UserStats {
  xp: number;
  streak: number;
  bestStreak: number;
  progress: Record<string, TacticProgress>;
}
