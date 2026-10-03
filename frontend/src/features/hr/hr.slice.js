import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { hrApi } from './services/hr.api.js';

export const fetchStaff = createAsyncThunk('hr/fetchStaff', async (_, { rejectWithValue }) => {
  try {
    return await hrApi.getStaff();
  } catch (err) {
    return rejectWithValue(err.customMessage || 'Failed to fetch staff');
  }
});

const hrSlice = createSlice({
  name: 'hr',
  initialState: {
    staffList: [],
    loading: false,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchStaff.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchStaff.fulfilled, (state, action) => {
        state.loading = false;
        state.staffList = action.payload?.staff || action.payload || [];
      })
      .addCase(fetchStaff.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export default hrSlice.reducer;
