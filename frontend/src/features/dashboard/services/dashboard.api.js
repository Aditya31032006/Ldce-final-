import apiClient from '../../../shared/services/api.js';

export const dashboardApi = {
  async getDailySummary() {
    const res = await apiClient.get('/reports/daily');
    return res.data;
  },
  async getQuickStats() {
    const res = await apiClient.get('/clubs/settings');
    return res.data;
  },
};

export default dashboardApi;
