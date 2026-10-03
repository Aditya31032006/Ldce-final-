import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { courtsApi } from './services/courts.api.js';

export const fetchCourts = createAsyncThunk('courts/fetchCourts', async (_, { rejectWithValue }) => {
  try {
    return await courtsApi.getCourts();
  } catch (err) {
    return rejectWithValue(err.customMessage || 'Failed to fetch courts');
  }
});

const courtsSlice = createSlice({
  name: 'courts',
  initialState: {
    courtsList: [],
    loading: false,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchCourts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCourts.fulfilled, (state, action) => {
        state.loading = false;
        state.courtsList = action.payload?.courts || action.payload || [];
      })
      .addCase(fetchCourts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export default courtsSlice.reducer;
