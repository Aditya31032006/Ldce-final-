import apiClient from '../../../shared/services/api.js';

export const plansApi = {
  async getPlans() {
    const res = await apiClient.get('/plans');
    return res.data;
  },
  async createPlan(planData) {
    const res = await apiClient.post('/plans', planData);
    return res.data;
  },
};

export default plansApi;
