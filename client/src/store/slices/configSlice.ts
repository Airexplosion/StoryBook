import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import api from '../../services/api';
import { GameConfig, Faction } from '../../types';

interface ConfigState {
  config: GameConfig | null;
  isLoading: boolean;
  error: string | null;
}

const initialState: ConfigState = {
  config: null,
  isLoading: false,
  error: null,
};

// 异步thunk：获取游戏配置
export const fetchConfig = createAsyncThunk(
  'config/fetchConfig',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.config.getConfig();
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || '获取配置失败');
    }
  }
);

// 异步thunk：更新阵营配置
export const updateFactions = createAsyncThunk(
  'config/updateFactions',
  async (factions: Faction[], { rejectWithValue }) => {
    try {
      const response = await api.config.updateFactions(factions);
      return response.data.factions;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || '更新阵营配置失败');
    }
  }
);

const configSlice = createSlice({
  name: 'config',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // 获取配置
      .addCase(fetchConfig.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchConfig.fulfilled, (state, action: PayloadAction<GameConfig>) => {
        state.isLoading = false;
        state.config = action.payload;
        state.error = null;
      })
      .addCase(fetchConfig.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // 更新阵营配置
      .addCase(updateFactions.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateFactions.fulfilled, (state, action: PayloadAction<Faction[]>) => {
        state.isLoading = false;
        if (state.config) {
          state.config.factions = action.payload;
        }
        state.error = null;
      })
      .addCase(updateFactions.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearError } = configSlice.actions;
export default configSlice.reducer;
