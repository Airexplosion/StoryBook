import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { Room } from '../../types';
import api from '../../services/api';

interface RoomsState {
  rooms: Room[];
  currentRoom: Room | null;
  isLoading: boolean;
  error: string | null;
}

const initialState: RoomsState = {
  rooms: [],
  currentRoom: null,
  isLoading: false,
  error: null,
};

export const fetchRooms = createAsyncThunk(
  'rooms/fetchRooms',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/rooms');
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || '获取房间列表失败');
    }
  }
);

export const createRoom = createAsyncThunk(
  'rooms/createRoom',
  async (roomData: { name: string }, { rejectWithValue }) => {
    try {
      const response = await api.post('/rooms', roomData);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || '创建房间失败');
    }
  }
);

export const joinRoom = createAsyncThunk(
  'rooms/joinRoom',
  async ({ roomId, type }: { roomId: string; type: 'player' | 'spectator' }, { rejectWithValue }) => {
    try {
      const response = await api.post(`/rooms/${roomId}/join`, { type });
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || '加入房间失败');
    }
  }
);

export const leaveRoom = createAsyncThunk(
  'rooms/leaveRoom',
  async (roomId: string, { rejectWithValue }) => {
    try {
      const response = await api.post(`/rooms/${roomId}/leave`);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || '离开房间失败');
    }
  }
);

export const deleteRoom = createAsyncThunk(
  'rooms/deleteRoom',
  async (roomId: string, { rejectWithValue }) => {
    try {
      await api.delete(`/rooms/${roomId}`);
      return roomId;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || '删除房间失败');
    }
  }
);

const roomsSlice = createSlice({
  name: 'rooms',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setCurrentRoom: (state, action) => {
      state.currentRoom = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchRooms.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchRooms.fulfilled, (state, action) => {
        state.isLoading = false;
        state.rooms = action.payload;
      })
      .addCase(fetchRooms.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      .addCase(createRoom.fulfilled, (state, action) => {
        state.rooms.push(action.payload);
        state.currentRoom = action.payload;
      })
      .addCase(joinRoom.fulfilled, (state, action) => {
        const index = state.rooms.findIndex(room => room._id === action.payload._id);
        if (index !== -1) {
          state.rooms[index] = action.payload;
        }
        state.currentRoom = action.payload;
      })
      .addCase(leaveRoom.fulfilled, (state, action) => {
        const index = state.rooms.findIndex(room => room._id === action.payload._id);
        if (index !== -1) {
          state.rooms[index] = action.payload;
        }
        if (state.currentRoom?._id === action.payload._id) {
          state.currentRoom = action.payload;
        }
      })
      .addCase(deleteRoom.fulfilled, (state, action) => {
        state.rooms = state.rooms.filter(room => room._id !== action.payload);
        if (state.currentRoom?._id === action.payload) {
          state.currentRoom = null;
        }
      });
  },
});

export const { clearError, setCurrentRoom } = roomsSlice.actions;
export default roomsSlice.reducer;