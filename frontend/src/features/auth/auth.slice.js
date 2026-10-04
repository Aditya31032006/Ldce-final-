import { createSlice } from '@reduxjs/toolkit';

/**
 * Layer 3: Auth Redux Slice
 * Manages global authentication, role context, multi-tenant club selection, and profile completeness
 */
export const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: null,
    role: null,
    clubId: typeof window !== 'undefined' ? localStorage.getItem('activeClubId') : null,
    clubs: [],
    token: typeof window !== 'undefined' ? localStorage.getItem('token') : null,
    isAuthenticated: false,
    isProfileComplete: true,
    missingFields: [],
    loading: true, // starts true to check session on initial mount
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
      const { user, role, clubId, clubs, token, isProfileComplete, missingFields, message } = action.payload;
      state.user = user || state.user;
      state.role = role || user?.role || state.role || 'public';
      state.clubId = clubId || user?.clubId || (clubs && clubs[0]?.id) || (clubs && clubs[0]?.club_id) || state.clubId;
      state.clubs = clubs || state.clubs || [];
      state.token = token || state.token;
      state.isAuthenticated = true;
      state.isProfileComplete = isProfileComplete !== undefined ? Boolean(isProfileComplete) : true;
      state.missingFields = missingFields || [];
      state.loading = false;
      state.error = null;
      state.successMessage = message || null;
      if (state.clubId) {
        try { localStorage.setItem('activeClubId', state.clubId); } catch (_) {}
      }
      if (state.token) {
        try { localStorage.setItem('token', state.token); } catch (_) {}
      }
    },
    setUser: (state, action) => {
      const payload = action.payload;
      if (!payload) {
        state.user = null;
        state.isAuthenticated = false;
        state.loading = false;
        return;
      }
      state.user = payload.user || payload;
      state.role = payload.role || state.user?.role || state.role || 'public';
      const clubsList = payload.clubs || state.clubs || [];
      state.clubId = payload.clubId || state.user?.clubId || (clubsList[0]?.id || clubsList[0]?.club_id) || state.clubId;
      state.clubs = clubsList;
      if (payload.token) {
        state.token = payload.token;
        try { localStorage.setItem('token', payload.token); } catch (_) {}
      }
      state.isProfileComplete = payload.isProfileComplete !== undefined ? Boolean(payload.isProfileComplete) : true;
      state.missingFields = payload.missingFields || [];
      state.isAuthenticated = Boolean(state.user);
      state.loading = false;
      if (state.clubId) {
        try { localStorage.setItem('activeClubId', state.clubId); } catch (_) {}
      }
    },
    setClubContext: (state, action) => {
      state.clubId = action.payload.clubId;
      if (action.payload.role) {
        state.role = action.payload.role;
      }
      if (state.clubId) {
        try { localStorage.setItem('activeClubId', state.clubId); } catch (_) {}
      }
    },
    setProfileComplete: (state, action) => {
      state.isProfileComplete = true;
      state.missingFields = [];
      if (action.payload?.user) {
        state.user = action.payload.user;
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
      state.clubs = [];
      state.token = null;
      state.isAuthenticated = false;
      state.isProfileComplete = true;
      state.missingFields = [];
      state.loading = false;
      state.error = null;
      state.successMessage = null;
      try { localStorage.removeItem('activeClubId'); } catch (_) {}
      try { localStorage.removeItem('token'); } catch (_) {}
    },
  },
});

export const {
  setLoading,
  setAuthSuccess,
  setUser,
  setClubContext,
  setProfileComplete,
  setError,
  clearError,
  clearSuccess,
  logoutSuccess,
} = authSlice.actions;

export default authSlice.reducer;
