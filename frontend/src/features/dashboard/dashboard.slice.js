import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { dashboardApi } from './services/dashboard.api.js';

export const fetchDashboardMetrics = createAsyncThunk(
  'dashboard/fetchMetrics',
  async (_, { rejectWithValue }) => {
    try {
      const data = await dashboardApi.getDailySummary();
      return data;
    } catch (err) {
      return rejectWithValue(err.customMessage || 'Failed to load dashboard metrics');
    }
  }
);

const initialState = {
  metrics: {
    activeBookings: 12,
    totalMembers: 248,
    courtOccupancyRate: '78%',
    dailyRevenue: 4850,
  },
  recentActivity: [],
  loading: false,
  error: null,
};

export const dashboardSlice = createSlice({
  name: 'dashboard',
  initialState,
  reducers: {
    clearDashboardError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchDashboardMetrics.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchDashboardMetrics.fulfilled, (state, action) => {
        state.loading = false;
        state.metrics = { ...state.metrics, ...action.payload };
      })
      .addCase(fetchDashboardMetrics.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { clearDashboardError } = dashboardSlice.actions;
export default dashboardSlice.reducer;
