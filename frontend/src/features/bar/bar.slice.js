import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  cart: [],
  total: 0,
  loading: false,
  error: null,
};

const barSlice = createSlice({
  name: 'bar',
  initialState,
  reducers: {
    addToCart: (state, action) => {
      const existing = state.cart.find((item) => item.id === action.payload.id);
      if (existing) {
        existing.qty += 1;
      } else {
        state.cart.push({ ...action.payload, qty: 1 });
      }
      state.total = state.cart.reduce((sum, i) => sum + i.price * i.qty, 0);
    },
    removeFromCart: (state, action) => {
      state.cart = state.cart.filter((item) => item.id !== action.payload);
      state.total = state.cart.reduce((sum, i) => sum + i.price * i.qty, 0);
    },
    clearCart: (state) => {
      state.cart = [];
      state.total = 0;
    },
  },
});

export const { addToCart, removeFromCart, clearCart } = barSlice.actions;
export default barSlice.reducer;
