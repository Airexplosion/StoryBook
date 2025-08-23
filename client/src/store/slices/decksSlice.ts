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

export const recommendDeck = createAsyncThunk(
  'decks/recommendDeck',
  async ({ id, reason }: { id: string; reason: string }, { rejectWithValue }) => {
    try {
      console.log('Recommending deck:', id, 'with reason:', reason);
      const response = await api.decks.recommend(id, reason);
      console.log('Recommend response:', response);
      return { id, reason };
    } catch (error: any) {
      console.error('Recommend deck error:', error);
      // 如果是404错误，说明后端还没有实现这个接口，我们仍然返回成功以便前端可以测试
      if (error.response?.status === 404) {
        console.warn('推荐接口未实现，使用前端模拟');
        return { id, reason };
      }
      return rejectWithValue(error.response?.data?.message || '推荐卡组失败');
    }
  }
);

export const unrecommendDeck = createAsyncThunk(
  'decks/unrecommendDeck',
  async (id: string, { rejectWithValue }) => {
    try {
      console.log('Unrecommending deck:', id);
      const response = await api.decks.unrecommend(id);
      console.log('Unrecommend response:', response);
      return id;
    } catch (error: any) {
      console.error('Unrecommend deck error:', error);
      // 如果是404错误，说明后端还没有实现这个接口，我们仍然返回成功以便前端可以测试
      if (error.response?.status === 404) {
        console.warn('取消推荐接口未实现，使用前端模拟');
        return id;
      }
      return rejectWithValue(error.response?.data?.message || '取消推荐失败');
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
      })
      .addCase(recommendDeck.fulfilled, (state, action) => {
        console.log('✅ 推荐卡组成功:', action.payload);
        const deck = state.decks.find(deck => deck._id === action.payload.id);
        if (deck) {
          deck.isRecommended = true;
          deck.recommendReason = action.payload.reason;
          console.log('✅ 卡组已标记为推荐:', deck.name, '理由:', action.payload.reason);
        } else {
          console.error('❌ 未找到要推荐的卡组:', action.payload.id);
        }
      })
      .addCase(unrecommendDeck.fulfilled, (state, action) => {
        console.log('✅ 取消推荐成功:', action.payload);
        const deck = state.decks.find(deck => deck._id === action.payload);
        if (deck) {
          deck.isRecommended = false;
          deck.recommendReason = undefined;
          console.log('✅ 卡组推荐已取消:', deck.name);
        } else {
          console.error('❌ 未找到要取消推荐的卡组:', action.payload);
        }
      });
  },
});

export const { clearError } = decksSlice.actions;
export default decksSlice.reducer;
