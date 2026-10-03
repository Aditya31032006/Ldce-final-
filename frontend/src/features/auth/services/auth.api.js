import apiClient from '../../../shared/services/api.js';

export const authApi = {
  /**
   * Log in user with email & password (and optional clubId)
   */
  async login(credentials) {
    const response = await apiClient.post('/auth/login', credentials);
    return response.data;
  },

  /**
   * Register a new user
   */
  async register(userData) {
    const response = await apiClient.post('/auth/register', userData);
    return response.data;
  },

  /**
   * Fetch current authenticated user profile and active club context
   */
  async getMe() {
    const response = await apiClient.get('/auth/me');
    return response.data;
  },

  /**
   * Logout user from backend session and clear cookie
   */
  async logout() {
    const response = await apiClient.post('/auth/logout');
    return response.data;
  },
};

export default authApi;
