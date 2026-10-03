import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { plansApi } from './services/plans.api.js';

export const fetchPlans = createAsyncThunk('plans/fetchPlans', async (_, { rejectWithValue }) => {
  try {
    return await plansApi.getPlans();
  } catch (err) {
    return rejectWithValue(err.customMessage || 'Failed to fetch membership plans');
  }
});

const plansSlice = createSlice({
  name: 'plans',
  initialState: {
    plansList: [],
    loading: false,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchPlans.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchPlans.fulfilled, (state, action) => {
        state.loading = false;
        state.plansList = action.payload?.plans || action.payload || [];
      })
      .addCase(fetchPlans.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export default plansSlice.reducer;
