import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { ordersApi } from './services/orders.api.js';

export const fetchOrders = createAsyncThunk('orders/fetchOrders', async (_, { rejectWithValue }) => {
  try {
    return await ordersApi.getOrders();
  } catch (err) {
    return rejectWithValue(err.customMessage || 'Failed to fetch orders');
  }
});

const ordersSlice = createSlice({
  name: 'orders',
  initialState: {
    ordersList: [],
    loading: false,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchOrders.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchOrders.fulfilled, (state, action) => {
        state.loading = false;
        state.ordersList = action.payload?.orders || action.payload || [];
      })
      .addCase(fetchOrders.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export default ordersSlice.reducer;
