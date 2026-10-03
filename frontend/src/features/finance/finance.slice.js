import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { financeApi } from './services/finance.api.js';

export const fetchPayments = createAsyncThunk('finance/fetchPayments', async (_, { rejectWithValue }) => {
  try {
    return await financeApi.getPayments();
  } catch (err) {
    return rejectWithValue(err.customMessage || 'Failed to fetch payments');
  }
});

const financeSlice = createSlice({
  name: 'finance',
  initialState: {
    payments: [],
    invoices: [],
    loading: false,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchPayments.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchPayments.fulfilled, (state, action) => {
        state.loading = false;
        state.payments = action.payload?.payments || action.payload || [];
      })
      .addCase(fetchPayments.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export default financeSlice.reducer;
