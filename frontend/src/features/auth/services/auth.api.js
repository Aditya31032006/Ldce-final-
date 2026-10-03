import apiClient from '../../../shared/services/api.js';

/**
 * Layer 4: Auth API Service
 * Handles all network requests to the authentication backend endpoints
 */
export const authApi = {
  /**
   * Log in user with email & password (and optional clubId)
   */
  async login(credentials) {
    const response = await apiClient.post('/auth/login', credentials);
    return response.data;
  },

  /**
   * Register a new user directly with all required fields (fullName, email, phone, password)
   */
  async register(userData) {
    const response = await apiClient.post('/auth/register', userData);
    return response.data;
  },

  /**
   * Register a new Club / Cafe Facility (Owner & Admin)
   */
  async registerClub(clubData) {
    const response = await apiClient.post('/auth/register-club', clubData);
    return response.data;
  },

  /**
   * Complete remaining profile fields (e.g. phone after Google OAuth)
   */
  async setupProfile(profileData) {
    const response = await apiClient.post('/auth/setup-profile', profileData);
    return response.data;
  },

  /**
   * Fetch current authenticated user session details, active club, and profile completion status
   */
  async getMe() {
    const response = await apiClient.get('/auth/me');
    return response.data;
  },

  /**
   * Logout user from backend session and clear HTTP-only cookies
   */
  async logout() {
    const response = await apiClient.post('/auth/logout');
    return response.data;
  },

  /**
   * Get OAuth configuration status (checks if Google OAuth is enabled on backend)
   */
  async getOAuthStatus() {
    const response = await apiClient.get('/auth/oauth/config');
    return response.data;
  },

  /**
   * Update user profile avatar picture (Base64 or URL)
   */
  async updateAvatar(avatarUrl, userId = null) {
    const payload = {
      avatarUrl,
      avatar_url: avatarUrl,
    };
    if (userId) {
      payload.userId = userId;
    }
    const response = await apiClient.put('/auth/profile/avatar', payload);
    return response.data;
  },


  /**
   * Delete user profile avatar picture
   */
  async deleteAvatar() {
    const response = await apiClient.delete('/auth/profile/avatar');
    return response.data;
  },

  /**
   * Set local password for OAuth user who does not have a password yet
   */
  async setPassword(password) {
    const response = await apiClient.post('/auth/profile/password/set', { password });
    return response.data;
  },

  /**
   * Change password for authenticated user (verifies old password)
   */
  async changePassword({ oldPassword, newPassword }) {
    const response = await apiClient.post('/auth/profile/password/change', {
      oldPassword,
      newPassword,
    });
    return response.data;
  },

  /**
   * Request OTP for password reset (guest or authenticated)
   */
  async requestPasswordResetOtp(email) {
    const response = await apiClient.post('/auth/password/request-otp', { email });
    return response.data;
  },

  /**
   * Verify OTP and reset password (guest or authenticated)
   */
  async resetPasswordWithOtp({ email, otp, newPassword }) {
    const response = await apiClient.post('/auth/password/reset', { email, otp, newPassword });
    return response.data;
  },

  /**
   * Fetch list of clubs for the multi-tenant club selector
   */
  async getClubs() {
    const response = await apiClient.get('/clubs');
    return response.data;
  },
};

export default authApi;


