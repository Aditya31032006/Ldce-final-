import apiClient from '../../../shared/services/api.js';

export const reportsApi = {
  async getDashboardData(params = {}) {
    const res = await apiClient.get('/reports/dashboard', { params });
    return res.data;
  },

  async getAnalyticsData(params = {}) {
    const res = await apiClient.get('/reports/analytics', { params });
    return res.data;
  },

  async getDailySummary(params = {}) {
    const res = await apiClient.get('/reports/daily', { params });
    return res.data;
  },
};

export default reportsApi;
