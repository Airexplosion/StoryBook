import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import cardsReducer from './slices/cardsSlice';
import decksReducer from './slices/decksSlice';
import roomsReducer from './slices/roomsSlice';
import gameReducer from './slices/gameSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    cards: cardsReducer,
    decks: decksReducer,
    rooms: roomsReducer,
    game: gameReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;