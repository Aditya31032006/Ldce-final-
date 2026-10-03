import apiClient from '../../../shared/services/api.js';

export const inventoryApi = {
  async getProducts() {
    const res = await apiClient.get('/inventory/products');
    return res.data;
  },
  async getPurchaseOrders() {
    const res = await apiClient.get('/inventory/purchase-orders');
    return res.data;
  },
};

export default inventoryApi;
