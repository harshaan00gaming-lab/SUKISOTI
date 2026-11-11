export type GameState = 'title' | 'playing' | 'paused' | 'gameover';

export type CharacterId = 'noor' | 'ravneet' | 'jass';

export interface CharacterSkin {
  id: string;
  name: string;
  description: string;
  unlocked: boolean;
  cost: number;
  palette: {
    primary: string;
    secondary: string;
    accent: string;
    hair: string;
    eyes?: string;
  };
}

export interface CharacterStats {
  agility: number;    // 1-5: lateral slide speed
  jump: number;       // 1-5: jump height / hang time
  magnet: number;     // 1-5: coin attraction radius
  multiplier: number; // 1-5: score rate boost
}

export interface CharacterInfo {
  id: CharacterId;
  name: string;
  title: string;
  description: string;
  trait: string;
  voiceStyle: string;
  unlocked: boolean;
  unlockCost: number;
  stats: CharacterStats;
  skins: CharacterSkin[];
  activeSkinId: string;
}

export type ObstacleType = 
  | 'hurdle'        // low hurdle: jump over
  | 'high_barrier'  // high gantry: roll / slide under
  | 'train'         // stationary or slow train: jump on roof or change lane
  | 'barrier_block';// solid obstacle: must switch lane

export interface ObstacleInstance {
  id: number;
  type: ObstacleType;
  lane: number;     // -1 (left), 0 (center), 1 (right)
  z: number;
  y: number;
  width: number;
  height: number;
  depth: number;
  speedZ?: number;  // for incoming trains
  mesh?: any;
  hasPassed?: boolean;
}

export type PowerupType = 'magnet' | 'sneakers' | 'jetpack' | 'multiplier' | 'shield';

export interface PowerupInstance {
  id: number;
  type: PowerupType;
  lane: number;
  z: number;
  y: number;
  collected?: boolean;
  mesh?: any;
}

export interface CoinInstance {
  id: number;
  lane: number;
  z: number;
  y: number;
  collected?: boolean;
  mesh?: any;
}

export interface ActivePowerup {
  type: PowerupType;
  remainingTime: number; // seconds
  totalTime: number;
}

export interface DailyChallenge {
  id: string;
  title: string;
  description: string;
  type: 'coins' | 'distance' | 'jumps' | 'slides' | 'score' | 'character_run';
  characterRequired?: CharacterId;
  target: number;
  current: number;
  rewardCoins: number;
  completed: boolean;
  claimed: boolean;
}

export interface LeaderboardEntry {
  id: string;
  name: string;
  characterId: CharacterId;
  score: number;
  distance: number;
  date: string;
  isPlayer?: boolean;
}

export interface RunSummary {
  score: number;
  distance: number;
  coins: number;
  jumps: number;
  slides: number;
  characterId: CharacterId;
  isNewBest: boolean;
}
