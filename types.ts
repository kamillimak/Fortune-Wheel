
export interface Player {
  id: string;
  name: string;
}

export interface TeamMatch {
  timestamp: number;
  teamA: string[];
  teamB: string[];
}

export interface GameState {
  allPlayers: Player[];
  pool: Player[];
  teamA: Player[];
  teamB: Player[];
  currentSpinCount: number;
  isSpinning: boolean;
  roundComplete: boolean;
  history: TeamMatch[];
  pendingWinner: Player | null;
  captains: {
    teamA: Player | null;
    teamB: Player | null;
  } | null;
}

export enum SoundEffect {
  SPIN = 'spin',
  WIN = 'win',
  TICK = 'tick'
}
