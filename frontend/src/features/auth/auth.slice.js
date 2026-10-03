import { createSlice } from '@reduxjs/toolkit';

export const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: null,
    role: null,
    clubId: null,
    isAuthenticated: false,
    loading: true, // starts true to check httpOnly session cookie on initial load
    error: null,
    successMessage: null,
  },
  reducers: {
    setLoading: (state, action) => {
      state.loading = Boolean(action.payload);
      if (action.payload) {
        state.error = null;
      }
    },
    setAuthSuccess: (state, action) => {
      const { user, role, clubId, message } = action.payload;
      state.user = user || state.user;
      state.role = role || user?.role || state.role;
      state.clubId = clubId || user?.clubId || state.clubId;
      state.isAuthenticated = true;
      state.loading = false;
      state.error = null;
      state.successMessage = message || null;
    },
    setUser: (state, action) => {
      state.user = action.payload?.user || action.payload;
      state.role = action.payload?.role || state.user?.role || state.role;
      state.clubId = action.payload?.clubId || state.user?.clubId || state.clubId;
      state.isAuthenticated = Boolean(state.user);
      state.loading = false;
    },
    setClubContext: (state, action) => {
      state.clubId = action.payload.clubId;
      if (action.payload.role) {
        state.role = action.payload.role;
      }
    },
    setError: (state, action) => {
      state.error = action.payload;
      state.loading = false;
    },
    clearError: (state) => {
      state.error = null;
    },
    clearSuccess: (state) => {
      state.successMessage = null;
    },
    logoutSuccess: (state) => {
      state.user = null;
      state.role = null;
      state.clubId = null;
      state.isAuthenticated = false;
      state.loading = false;
      state.error = null;
      state.successMessage = null;
    },
  },
});

export const {
  setLoading,
  setAuthSuccess,
  setUser,
  setClubContext,
  setError,
  clearError,
  clearSuccess,
  logoutSuccess,
} = authSlice.actions;

export default authSlice.reducer;
