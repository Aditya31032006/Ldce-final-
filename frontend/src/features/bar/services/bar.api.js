import apiClient from '../../../shared/services/api.js';

export const barApi = {
  async getMenu() {
    const res = await apiClient.get('/bar/menu');
    return res.data;
  },
  async createBarOrder(orderData) {
    const res = await apiClient.post('/bar/orders', orderData);
    return res.data;
  },
};

export default barApi;
