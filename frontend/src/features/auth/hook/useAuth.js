import { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  setLoading,
  setAuthSuccess,
  setUser,
  setClubContext,
  setProfileComplete,
  setError,
  clearError,
  clearSuccess,
  logoutSuccess,
} from '../auth.slice.js';
import { authApi } from '../services/auth.api.js';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

/**
 * Layer 2: Auth Custom Hook
 * Encapsulates all business logic, Redux dispatches, and API interactions for authentication
 */
export function useAuth() {
  const dispatch = useDispatch();
  const {
    user,
    role,
    clubId,
    clubs,
    token,
    isAuthenticated,
    isProfileComplete,
    missingFields,
    loading,
    error,
    successMessage,
  } = useSelector((state) => state.auth);

  /**
   * Direct Login (Email + Password, optional clubId)
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
            token: response.token,
            isProfileComplete: response.isProfileComplete,
            missingFields: response.missingFields,
            message: response.message,
          })
        );
        return {
          success: true,
          user: response.user,
          role: response.role,
          clubId: response.clubId,
          isProfileComplete: response.isProfileComplete,
          requiresSetup: !response.isProfileComplete,
        };
      } catch (err) {
        const msg = err.customMessage || 'Invalid email or password';
        dispatch(setError(msg));
        return { success: false, error: msg };
      }
    },
    [dispatch]
  );

  /**
   * Direct Registration (Full Name, Email, Phone, Password)
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
            token: response.token,
            isProfileComplete: true,
            message: response.message,
          })
        );
        return { success: true, user: response.user };
      } catch (err) {
        const msg = err.customMessage || 'Failed to create account';
        dispatch(setError(msg));
        return { success: false, error: msg };
      }
    },
    [dispatch]
  );

  /**
   * Complete remaining profile fields (e.g. phone after Google OAuth)
   */
  const completeProfile = useCallback(
    async (profileData) => {
      dispatch(setLoading(true));
      try {
        const response = await authApi.setupProfile(profileData);
        dispatch(setProfileComplete({ user: response.user }));
        return { success: true, user: response.user, message: response.message };
      } catch (err) {
        const msg = err.customMessage || 'Failed to complete profile';
        dispatch(setError(msg));
        return { success: false, error: msg };
      }
    },
    [dispatch]
  );

  /**
   * Trigger Google OAuth Flow
   */
  const loginWithGoogle = useCallback(() => {
    window.location.href = `${API_BASE_URL}/auth/google`;
  }, []);

  /**
   * Fetch current authenticated user session details from cookie
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
            clubs: response.clubs,
            isProfileComplete: response.isProfileComplete,
            missingFields: response.missingFields,
          })
        );
        return {
          success: true,
          user: response.user,
          role: response.role,
          isProfileComplete: response.isProfileComplete,
        };
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
   * Logout user from backend and reset local state
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
   * Switch active club context
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
    clubs,
    token,
    isAuthenticated,
    isProfileComplete,
    missingFields,
    loading,
    error,
    successMessage,
    login,
    register,
    completeProfile,
    loginWithGoogle,
    logout,
    fetchCurrentUser,
    changeClub,
    resetError,
    resetSuccess,
  };
}

export default useAuth;
