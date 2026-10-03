import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { bookingsApi } from './services/bookings.api.js';

export const fetchBookings = createAsyncThunk('bookings/fetchBookings', async (params, { rejectWithValue }) => {
  try {
    return await bookingsApi.getBookings(params);
  } catch (err) {
    return rejectWithValue(err.customMessage || 'Failed to fetch bookings');
  }
});

const bookingsSlice = createSlice({
  name: 'bookings',
  initialState: {
    bookingsList: [],
    selectedBooking: null,
    loading: false,
    error: null,
  },
  reducers: {
    setSelectedBooking: (state, action) => {
      state.selectedBooking = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchBookings.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchBookings.fulfilled, (state, action) => {
        state.loading = false;
        state.bookingsList = action.payload?.bookings || action.payload || [];
      })
      .addCase(fetchBookings.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { setSelectedBooking } = bookingsSlice.actions;
export default bookingsSlice.reducer;
