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
      // Update top-level game state properties first
      Object.assign(state, action.payload);

      // Explicitly update players to ensure all nested arrays are properly updated
      if (action.payload.players) {
        state.players = action.payload.players.map(newPlayer => {
          const existingPlayer = state.players.find(p => p.userId === newPlayer.userId);
          return {
            ...existingPlayer,
            ...newPlayer,
            // Ensure all arrays are properly updated to trigger re-renders
            hand: newPlayer.hand ? [...newPlayer.hand] : (existingPlayer?.hand || []),
            battlefield: newPlayer.battlefield ? [...newPlayer.battlefield] : (existingPlayer?.battlefield || []),
            effectZone: newPlayer.effectZone ? [...newPlayer.effectZone] : (existingPlayer?.effectZone || []),
            graveyard: newPlayer.graveyard ? [...newPlayer.graveyard] : (existingPlayer?.graveyard || []),
            deck: newPlayer.deck ? [...newPlayer.deck] : (existingPlayer?.deck || []),
            displayedHandCards: newPlayer.displayedHandCards ? [...newPlayer.displayedHandCards] : (existingPlayer?.displayedHandCards || []),
            customFields: newPlayer.customFields ? [...newPlayer.customFields] : (existingPlayer?.customFields || []),
          };
        });
      }

      // Ensure gameBoard is also properly updated
      if (action.payload.gameBoard) {
        state.gameBoard = {
          playerCards: action.payload.gameBoard.playerCards ? [...action.payload.gameBoard.playerCards] : [],
          effectCards: action.payload.gameBoard.effectCards ? [...action.payload.gameBoard.effectCards] : [],
        };
      }
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
