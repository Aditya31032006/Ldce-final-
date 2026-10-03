import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { clubsApi } from './services/clubs.api.js';

export const fetchClubs = createAsyncThunk('clubs/fetchClubs', async (_, { rejectWithValue }) => {
  try {
    return await clubsApi.getClubs();
  } catch (err) {
    return rejectWithValue(err.customMessage || 'Failed to fetch clubs');
  }
});

const clubsSlice = createSlice({
  name: 'clubs',
  initialState: {
    clubsList: [],
    selectedClub: null,
    loading: false,
    error: null,
  },
  reducers: {
    setSelectedClub: (state, action) => {
      state.selectedClub = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchClubs.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchClubs.fulfilled, (state, action) => {
        state.loading = false;
        state.clubsList = action.payload?.clubs || action.payload || [];
      })
      .addCase(fetchClubs.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { setSelectedClub } = clubsSlice.actions;
export default clubsSlice.reducer;
