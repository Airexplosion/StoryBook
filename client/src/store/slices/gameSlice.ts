import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { GameState } from '../../types';

const initialState: GameState = {
  room: null,
  players: [],
  currentPlayer: 0,
  round: 1,
  phase: 'waiting',
  firstPlayer: -1,
  gameBoard: {
    playerCards: [],
    effectCards: [],
  },
};

const gameSlice = createSlice({
  name: 'game',
  initialState,
  reducers: {
    setGameState: (state, action: PayloadAction<Partial<GameState>>) => {
      return { ...state, ...action.payload };
    },
    updatePlayer: (state, action: PayloadAction<{ index: number; data: Partial<typeof state.players[0]> }>) => {
      const { index, data } = action.payload;
      if (state.players[index]) {
        state.players[index] = { ...state.players[index], ...data };
      }
    },
    nextTurn: (state) => {
      state.currentPlayer = (state.currentPlayer + 1) % state.players.length;
      if (state.currentPlayer === state.firstPlayer) {
        state.round += 1;
      }
    },
    setPhase: (state, action: PayloadAction<GameState['phase']>) => {
      state.phase = action.payload;
    },
    addCardToBoard: (state, action: PayloadAction<{ type: 'player' | 'effect'; card: any }>) => {
      if (action.payload.type === 'player') {
        state.gameBoard.playerCards.push(action.payload.card);
      } else {
        state.gameBoard.effectCards.push(action.payload.card);
      }
    },
    removeCardFromBoard: (state, action: PayloadAction<{ type: 'player' | 'effect'; cardId: string }>) => {
      if (action.payload.type === 'player') {
        state.gameBoard.playerCards = state.gameBoard.playerCards.filter(
          card => card._id !== action.payload.cardId
        );
      } else {
        state.gameBoard.effectCards = state.gameBoard.effectCards.filter(
          card => card._id !== action.payload.cardId
        );
      }
    },
    resetGame: () => initialState,
  },
});

export const {
  setGameState,
  updatePlayer,
  nextTurn,
  setPhase,
  addCardToBoard,
  removeCardFromBoard,
  resetGame,
} = gameSlice.actions;

export default gameSlice.reducer;