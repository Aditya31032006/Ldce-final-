import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { inventoryApi } from './services/inventory.api.js';

export const fetchInventoryProducts = createAsyncThunk('inventory/fetchProducts', async (_, { rejectWithValue }) => {
  try {
    return await inventoryApi.getProducts();
  } catch (err) {
    return rejectWithValue(err.customMessage || 'Failed to fetch inventory');
  }
});

const inventorySlice = createSlice({
  name: 'inventory',
  initialState: {
    products: [],
    loading: false,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchInventoryProducts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchInventoryProducts.fulfilled, (state, action) => {
        state.loading = false;
        state.products = action.payload?.products || action.payload || [];
      })
      .addCase(fetchInventoryProducts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export default inventorySlice.reducer;
