import apiClient from '../../../shared/services/api.js';

export const inventoryApi = {
  async getProducts(params = {}) {
    const res = await apiClient.get('/inventory/products', { params });
    return res.data;
  },
  async getCategories(params = {}) {
    const res = await apiClient.get('/inventory/categories', { params });
    return res.data;
  },
  async createProduct(productData) {
    const res = await apiClient.post('/inventory/products', productData);
    return res.data;
  },
  async updateProduct(id, productData) {
    const res = await apiClient.put(`/inventory/products/${id}`, productData);
    return res.data;
  },
  async deleteProduct(id) {
    const res = await apiClient.delete(`/inventory/products/${id}`);
    return res.data;
  },
  async getPurchaseOrders() {
    const res = await apiClient.get('/inventory/purchase-orders');
    return res.data;
  },
};

export default inventoryApi;
