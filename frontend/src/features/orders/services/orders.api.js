import apiClient from '../../../shared/services/api.js';

export const ordersApi = {
  async getOrders() {
    const res = await apiClient.get('/orders');
    return res.data;
  },
  async createOrder(orderData) {
    const res = await apiClient.post('/orders', orderData);
    return res.data;
  },
};

export default ordersApi;
