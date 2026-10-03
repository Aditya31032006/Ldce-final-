import { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  setLoading,
  setAuthSuccess,
  setUser,
  setClubContext,
  setError,
  clearError,
  clearSuccess,
  logoutSuccess,
} from '../auth.slice.js';
import { authApi } from '../services/auth.api.js';

export function useAuth() {
  const dispatch = useDispatch();
  const { user, role, clubId, isAuthenticated, loading, error, successMessage } = useSelector(
    (state) => state.auth
  );

  /**
   * Log in user
   */
  const login = useCallback(
    async (credentials) => {
      dispatch(setLoading(true));
      try {
        const response = await authApi.login(credentials);
        dispatch(
          setAuthSuccess({
            user: response.user,
            role: response.role,
            clubId: response.clubId,
            message: response.message,
          })
        );
        return { success: true, user: response.user, role: response.role, clubId: response.clubId };
      } catch (err) {
        const msg = err.customMessage || 'Invalid email or password';
        dispatch(setError(msg));
        return { success: false, error: msg };
      }
    },
    [dispatch]
  );

  /**
   * Register new user
   */
  const register = useCallback(
    async (userData) => {
      dispatch(setLoading(true));
      try {
        const response = await authApi.register(userData);
        dispatch(
          setAuthSuccess({
            user: response.user,
            role: 'public',
            message: response.message,
          })
        );
        return { success: true, user: response.user };
      } catch (err) {
        const msg = err.customMessage || 'Failed to register account';
        dispatch(setError(msg));
        return { success: false, error: msg };
      }
    },
    [dispatch]
  );

  /**
   * Fetch profile of currently authenticated user using session cookie
   */
  const fetchCurrentUser = useCallback(async () => {
    dispatch(setLoading(true));
    try {
      const response = await authApi.getMe();
      if (response.user) {
        dispatch(
          setUser({
            user: response.user,
            role: response.role,
            clubId: response.clubId,
          })
        );
        return { success: true, user: response.user, role: response.role };
      } else {
        dispatch(logoutSuccess());
        return { success: false };
      }
    } catch {
      dispatch(logoutSuccess());
      return { success: false };
    }
  }, [dispatch]);

  /**
   * Log out user from backend and reset local Redux state
   */
  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch (e) {
      console.warn('Backend logout cleanup notice:', e);
    } finally {
      dispatch(logoutSuccess());
    }
  }, [dispatch]);

  /**
   * Switch or set active club context
   */
  const changeClub = useCallback(
    (newClubId, newRole) => {
      dispatch(setClubContext({ clubId: newClubId, role: newRole }));
    },
    [dispatch]
  );

  const resetError = useCallback(() => {
    dispatch(clearError());
  }, [dispatch]);

  const resetSuccess = useCallback(() => {
    dispatch(clearSuccess());
  }, [dispatch]);

  return {
    user,
    role,
    clubId,
    isAuthenticated,
    loading,
    error,
    successMessage,
    login,
    register,
    logout,
    fetchCurrentUser,
    changeClub,
    resetError,
    resetSuccess,
  };
}

export default useAuth;
