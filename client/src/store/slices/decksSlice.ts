import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { Deck } from '../../types';
import api from '../../services/api';

interface DecksState {
  decks: Deck[];
  isLoading: boolean;
  error: string | null;
}

const initialState: DecksState = {
  decks: [],
  isLoading: false,
  error: null,
};

export const fetchDecks = createAsyncThunk(
  'decks/fetchDecks',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/decks');
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || '获取卡组失败');
    }
  }
);

export const createDeck = createAsyncThunk(
  'decks/createDeck',
  async (deckData: Partial<Deck>, { rejectWithValue }) => {
    try {
      const response = await api.post('/decks', deckData);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || '创建卡组失败');
    }
  }
);

export const updateDeck = createAsyncThunk(
  'decks/updateDeck',
  async ({ id, deckData }: { id: string; deckData: Partial<Deck> }, { rejectWithValue }) => {
    try {
      const response = await api.put(`/decks/${id}`, deckData);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || '更新卡组失败');
    }
  }
);

export const deleteDeck = createAsyncThunk(
  'decks/deleteDeck',
  async (id: string, { rejectWithValue }) => {
    try {
      await api.delete(`/decks/${id}`);
      return id;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || '删除卡组失败');
    }
  }
);

export const favoriteDeck = createAsyncThunk(
  'decks/favoriteDeck',
  async (id: string, { rejectWithValue }) => {
    try {
      await api.decks.favorite(id);
      return id;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || '收藏卡组失败');
    }
  }
);

export const unfavoriteDeck = createAsyncThunk(
  'decks/unfavoriteDeck',
  async (id: string, { rejectWithValue }) => {
    try {
      await api.decks.unfavorite(id);
      return id;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || '取消收藏失败');
    }
  }
);

export const copyDeck = createAsyncThunk(
  'decks/copyDeck',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await api.decks.copy(id);
      return response.data.deck;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || '复制卡组失败');
    }
  }
);

const decksSlice = createSlice({
  name: 'decks',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchDecks.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchDecks.fulfilled, (state, action) => {
        state.isLoading = false;
        state.decks = action.payload;
      })
      .addCase(fetchDecks.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      .addCase(createDeck.fulfilled, (state, action) => {
        state.decks.unshift(action.payload);
      })
      .addCase(updateDeck.fulfilled, (state, action) => {
        const index = state.decks.findIndex(deck => deck._id === action.payload._id);
        if (index !== -1) {
          state.decks[index] = action.payload;
        }
      })
      .addCase(deleteDeck.fulfilled, (state, action) => {
        state.decks = state.decks.filter(deck => deck._id !== action.payload);
      })
      .addCase(favoriteDeck.fulfilled, (state, action) => {
        const deck = state.decks.find(deck => deck._id === action.payload);
        if (deck) {
          deck.isFavorited = true;
        }
      })
      .addCase(unfavoriteDeck.fulfilled, (state, action) => {
        const deck = state.decks.find(deck => deck._id === action.payload);
        if (deck) {
          deck.isFavorited = false;
        }
      })
      .addCase(copyDeck.fulfilled, (state, action) => {
        state.decks.unshift(action.payload);
      });
  },
});

export const { clearError } = decksSlice.actions;
export default decksSlice.reducer;
