import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { ordersApi } from './services/orders.api.js';

export const fetchOrders = createAsyncThunk('orders/fetchOrders', async (_, { rejectWithValue }) => {
  try {
    return await ordersApi.getOrders();
  } catch (err) {
    return rejectWithValue(err.customMessage || 'Failed to fetch orders');
  }
});

export const updateOrderStatusAction = createAsyncThunk(
  'orders/updateStatus',
  async ({ orderId, status }, { rejectWithValue }) => {
    try {
      const res = await ordersApi.updateOrderStatus(orderId, status);
      return res.order;
    } catch (err) {
      return rejectWithValue(err.customMessage || 'Failed to update order status');
    }
  }
);

const ordersSlice = createSlice({
  name: 'orders',
  initialState: {
    ordersList: [],
    isClubStaff: false,
    scope: 'my_orders',
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
        state.ordersList = action.payload?.orders || (Array.isArray(action.payload) ? action.payload : []);
        state.isClubStaff = Boolean(action.payload?.isClubStaff);
        state.scope = action.payload?.scope || 'my_orders';
      })
      .addCase(fetchOrders.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(updateOrderStatusAction.fulfilled, (state, action) => {
        if (action.payload?.id) {
          const idx = state.ordersList.findIndex((o) => o.id === action.payload.id);
          if (idx !== -1) {
            state.ordersList[idx] = { ...state.ordersList[idx], ...action.payload };
          }
        }
      });
  },
});

export default ordersSlice.reducer;

