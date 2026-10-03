import apiClient from '../../../shared/services/api.js';

export const ordersApi = {
  async getOrders(params = {}) {
    const res = await apiClient.get('/orders', { params });
    return res.data;
  },
  async createOrder(orderData, params = {}) {
    const res = await apiClient.post('/orders', orderData, { params });
    return res.data;
  },
  async updateOrderStatus(orderId, status) {
    const res = await apiClient.patch(`/orders/${orderId}/status`, { status });
    return res.data;
  },
};

export default ordersApi;

