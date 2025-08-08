import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { Card } from '../../types';
import api from '../../services/api';

interface CardsState {
  cards: Card[];
  isLoading: boolean;
  error: string | null;
}

const initialState: CardsState = {
  cards: [],
  isLoading: false,
  error: null,
};

export const fetchCards = createAsyncThunk(
  'cards/fetchCards',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/cards');
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || '获取卡牌失败');
    }
  }
);

export const createCard = createAsyncThunk(
  'cards/createCard',
  async (cardData: Partial<Card>, { rejectWithValue }) => {
    try {
      const response = await api.post('/cards', cardData);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || '创建卡牌失败');
    }
  }
);

export const updateCard = createAsyncThunk(
  'cards/updateCard',
  async ({ id, cardData }: { id: string; cardData: Partial<Card> }, { rejectWithValue }) => {
    try {
      const response = await api.put(`/cards/${id}`, cardData);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || '更新卡牌失败');
    }
  }
);

export const deleteCard = createAsyncThunk(
  'cards/deleteCard',
  async (id: string, { rejectWithValue }) => {
    try {
      await api.delete(`/cards/${id}`);
      return id;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || '删除卡牌失败');
    }
  }
);

const cardsSlice = createSlice({
  name: 'cards',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCards.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchCards.fulfilled, (state, action) => {
        state.isLoading = false;
        state.cards = action.payload;
      })
      .addCase(fetchCards.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      .addCase(createCard.fulfilled, (state, action) => {
        state.cards.push(action.payload);
      })
      .addCase(updateCard.fulfilled, (state, action) => {
        const index = state.cards.findIndex(card => card._id === action.payload._id);
        if (index !== -1) {
          state.cards[index] = action.payload;
        }
      })
      .addCase(deleteCard.fulfilled, (state, action) => {
        state.cards = state.cards.filter(card => card._id !== action.payload);
      });
  },
});

export const { clearError } = cardsSlice.actions;
export default cardsSlice.reducer;