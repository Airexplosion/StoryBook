export interface User {
  id: string;
  username: string;
  email: string;
  isAdmin: boolean;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
}

export interface Card {
  _id: string;
  name: string;
  type: 'story' | 'character' | 'hero';
  category: string;
  cost: string;
  attack?: number;
  health?: number;
  effect: string;
  flavor?: string;
  image?: string;
  faction: 'neutral' | 'hero1' | 'hero2' | 'hero3';
  isPublic: boolean;
  createdBy: {
    _id: string;
    username: string;
  };
  createdAt: string;
  ownerId?: string; // 用于游戏中标识卡牌拥有者
}

export interface DeckCard {
  card: Card;
  count: number;
}

export interface Deck {
  _id: string;
  name: string;
  heroCard: Card;
  championCardId?: string;
  championDescription?: string;
  cards: DeckCard[];
  totalCards: number;
  isPublic: boolean;
  createdBy: {
    _id: string;
    username: string;
  };
  createdAt: string;
}

export interface Room {
  _id: string;
  name: string;
  createdBy: {
    _id: string;
    username: string;
  };
  players: Array<{
    user: {
      _id: string;
      username: string;
    };
    deck?: Deck;
    isReady: boolean;
  }>;
  spectators: Array<{
    _id: string;
    username: string;
  }>;
  gameState: {
    currentTurn: number;
    round: number;
    phase: 'waiting' | 'mulliganing' | 'playing' | 'paused' | 'ended';
    firstPlayer: number;
  };
  maxPlayers: number;
  isActive: boolean;
  createdAt: string;
  realTimeStats?: {
    playerCount: number;
    spectatorCount: number;
  };
}

export interface ModifiedCard extends Card {
  modifiedAttack?: number;
  modifiedHealth?: number;
  originalAttack?: number;
  originalHealth?: number;
}

export interface GamePlayer {
  userId: string;
  username: string;
  heroName: string;
  health: number;
  maxHealth: number;
  mana: number;
  maxMana: number;
  handSize: number;
  deckSize: number;
  chapterProgress: number;
  maxChapterProgress: number;
  chapterTokens: number;
  isReady: boolean;
  notes: string;
  hand: Card[];
  graveyard: Card[];
  battlefield: ModifiedCard[];
  effectZone: ModifiedCard[];
  deck?: Card[];
  socketId?: string;
  deckId?: string;
  deckName?: string;
  hasCompletedTurn?: boolean;
  temporaryLeave?: boolean;
  lastActiveTime?: string;
  restartRequest?: boolean;
  isDeckLocked?: boolean;
  battlefieldSlots?: number;
  effectSlots?: number;
  championCard?: Card;
  championDescription?: string;
}

export interface GameState {
  room: Room | null;
  players: GamePlayer[];
  currentPlayer: number;
  round: number;
  phase: 'waiting' | 'mulliganing' | 'playing' | 'paused' | 'ended';
  firstPlayer: number;
  gameBoard: {
    playerCards: Card[];
    effectCards: Card[];
  };
}
