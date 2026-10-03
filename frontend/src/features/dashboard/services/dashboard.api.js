import apiClient from '../../../shared/services/api.js';

export const dashboardApi = {
  async getDashboardData(params = {}) {
    const res = await apiClient.get('/reports/dashboard', { params });
    return res.data;
  },
  async getDailySummary(params = {}) {
    const res = await apiClient.get('/reports/daily', { params });
    return res.data;
  },
  async getQuickStats(params = {}) {
    const res = await apiClient.get('/clubs/settings', { params });
    return res.data;
  },
};

export default dashboardApi;
