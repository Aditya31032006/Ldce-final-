import apiClient from '../../../shared/services/api.js';

export const reportsApi = {
  async getDailySummary() {
    const res = await apiClient.get('/reports/daily');
    return res.data;
  },
};

export default reportsApi;
