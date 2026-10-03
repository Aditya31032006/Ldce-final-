import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { socialSessionsApi } from './services/socialSessions.api.js';

export const fetchSocialSessions = createAsyncThunk('socialSessions/fetch', async (_, { rejectWithValue }) => {
  try {
    return await socialSessionsApi.getSessions();
  } catch (err) {
    return rejectWithValue(err.customMessage || 'Failed to fetch social sessions');
  }
});

const socialSessionsSlice = createSlice({
  name: 'socialSessions',
  initialState: {
    sessionsList: [],
    loading: false,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchSocialSessions.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchSocialSessions.fulfilled, (state, action) => {
        state.loading = false;
        state.sessionsList = action.payload?.sessions || action.payload || [];
      })
      .addCase(fetchSocialSessions.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export default socialSessionsSlice.reducer;
