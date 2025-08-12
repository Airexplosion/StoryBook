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
  type: '故事牌' | '配角牌' | '主角牌' | '关键字效果';
  category: string;
  cost: string;
  attack?: number;
  health?: number;
  effect: string;
  flavor?: string;
  image?: string;
  faction: 'neutral' | 'hero1' | 'hero2' | 'hero3' | '中立';
  isPublic: boolean;
  createdBy: {
    _id: string;
    username: string;
  };
  createdAt: string;
  ownerId?: string; // 用于游戏中标识卡牌拥有者
  originalCost?: string; // 用于保存原始费用，当费用被修改时
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
  isFavorited?: boolean;
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
  cardNote?: string; // 卡牌备注
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
  championCardId?: string;
  championDescription?: string;
  showFirstPlayerDrawHint?: boolean;
  turnsCompleted?: number; // 玩家完成的回合数
  displayedHandCards?: Card[]; // 新增：玩家展示的手牌
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

export interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface PaginatedResponse<T> {
  cards?: T[];
  data?: T[];
  pagination: PaginationInfo;
}

export interface Hero {
  _id: string;
  name: string;
  effect: string;
  image?: string;
}

export interface Faction {
  id: string;
  name: string;
  description?: string;
}

export interface GameConfig {
  factions: Faction[];
  types: Array<{ id: string; name: string }>;
  categories: {
    [key: string]: Array<{ id: string; name: string; description: string }>;
  };
}
