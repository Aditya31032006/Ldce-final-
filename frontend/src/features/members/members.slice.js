import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { membersApi } from './services/members.api.js';

export const fetchMembers = createAsyncThunk('members/fetchMembers', async (params, { rejectWithValue }) => {
  try {
    return await membersApi.getMembers(params);
  } catch (err) {
    return rejectWithValue(err.customMessage || 'Failed to fetch members');
  }
});

const membersSlice = createSlice({
  name: 'members',
  initialState: {
    membersList: [],
    loading: false,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchMembers.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMembers.fulfilled, (state, action) => {
        state.loading = false;
        state.membersList = action.payload?.members || action.payload || [];
      })
      .addCase(fetchMembers.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export default membersSlice.reducer;
