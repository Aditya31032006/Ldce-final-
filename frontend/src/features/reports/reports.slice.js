import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { reportsApi } from './services/reports.api.js';

export const fetchDailySummary = createAsyncThunk('reports/fetchDaily', async (_, { rejectWithValue }) => {
  try {
    return await reportsApi.getDailySummary();
  } catch (err) {
    return rejectWithValue(err.customMessage || 'Failed to fetch reports');
  }
});

const reportsSlice = createSlice({
  name: 'reports',
  initialState: {
    summary: null,
    loading: false,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchDailySummary.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchDailySummary.fulfilled, (state, action) => {
        state.loading = false;
        state.summary = action.payload;
      })
      .addCase(fetchDailySummary.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export default reportsSlice.reducer;
