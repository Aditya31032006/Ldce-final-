import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { leadsApi } from './services/leads.api.js';

export const fetchLeads = createAsyncThunk('leads/fetchLeads', async (_, { rejectWithValue }) => {
  try {
    return await leadsApi.getLeads();
  } catch (err) {
    return rejectWithValue(err.customMessage || 'Failed to fetch leads');
  }
});

const leadsSlice = createSlice({
  name: 'leads',
  initialState: {
    leadsList: [],
    loading: false,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchLeads.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchLeads.fulfilled, (state, action) => {
        state.loading = false;
        state.leadsList = action.payload?.leads || action.payload || [];
      })
      .addCase(fetchLeads.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export default leadsSlice.reducer;
