import apiClient from '../../../shared/services/api.js';

export const barApi = {
  // Tables
  getTables: async (clubId, activeOnly = null) => {
    const config = clubId ? { headers: { 'x-club-id': clubId } } : {};
    const res = await apiClient.get('/bar/tables', {
      ...config,
      params: activeOnly !== null ? { active_only: activeOnly } : {},
    });
    return res.data.data;
  },

  createTable: async (tableData, clubId) => {
    const config = clubId ? { headers: { 'x-club-id': clubId } } : {};
    const res = await apiClient.post('/bar/tables', tableData, config);
    return res.data.data;
  },

  updateTableStatus: async (tableId, status, clubId) => {
    const config = clubId ? { headers: { 'x-club-id': clubId } } : {};
    const res = await apiClient.put(`/bar/tables/${tableId}/status`, { status }, config);
    return res.data.data;
  },

  updateTable: async (tableId, tableData, clubId) => {
    const config = clubId ? { headers: { 'x-club-id': clubId } } : {};
    const res = await apiClient.put(`/bar/tables/${tableId}`, tableData, config);
    return res.data.data;
  },

  // Menu
  createMenuCategory: async (categoryData, clubId) => {
    const config = clubId ? { headers: { 'x-club-id': clubId } } : {};
    const res = await apiClient.post('/bar/menu/category', categoryData, config);
    return res.data.data;
  },

  getMenu: async (clubId, categoryId = null, availableOnly = null) => {
    const config = clubId ? { headers: { 'x-club-id': clubId } } : {};
    const res = await apiClient.get('/bar/menu', {
      ...config,
      params: {
        ...(categoryId ? { categoryId } : {}),
        ...(availableOnly !== null ? { available_only: availableOnly } : {}),
      },
    });
    return res.data.data;
  },

  createMenuItem: async (itemData, clubId) => {
    const config = clubId ? { headers: { 'x-club-id': clubId } } : {};
    const res = await apiClient.post('/bar/menu/item', itemData, config);
    return res.data.data;
  },

  updateMenuItem: async (itemId, data, clubId) => {
    const config = clubId ? { headers: { 'x-club-id': clubId } } : {};
    const res = await apiClient.put(`/bar/menu/item/${itemId}`, data, config);
    return res.data.data;
  },

  // Orders
  getOrders: async (filters = {}, clubId) => {
    const config = clubId ? { headers: { 'x-club-id': clubId } } : {};
    const res = await apiClient.get('/bar/orders', {
      ...config,
      params: filters,
    });
    return res.data.data;
  },

  getOrderById: async (orderId, clubId) => {
    const config = clubId ? { headers: { 'x-club-id': clubId } } : {};
    const res = await apiClient.get(`/bar/orders/${orderId}`, config);
    return res.data.data;
  },

  createOrder: async (orderData, clubId) => {
    const config = clubId ? { headers: { 'x-club-id': clubId } } : {};
    const res = await apiClient.post('/bar/orders', orderData, config);
    return res.data.data;
  },

  addItemsToOrder: async (orderId, items, clubId) => {
    const config = clubId ? { headers: { 'x-club-id': clubId } } : {};
    const res = await apiClient.post(`/bar/orders/${orderId}/items`, { items }, config);
    return res.data.data;
  },

  billOrder: async (orderId, clubId) => {
    const config = clubId ? { headers: { 'x-club-id': clubId } } : {};
    const res = await apiClient.post(`/bar/orders/${orderId}/bill`, {}, config);
    return res.data.data;
  },

  payOrder: async (orderId, paymentData, clubId) => {
    const config = clubId ? { headers: { 'x-club-id': clubId } } : {};
    const res = await apiClient.post(`/bar/orders/${orderId}/pay`, paymentData, config);
    return res.data.data;
  },

  // Razorpay
  createRazorpayOrder: async (data, clubId) => {
    const config = clubId ? { headers: { 'x-club-id': clubId } } : {};
    const res = await apiClient.post('/bar/payments/razorpay/create-order', data, config);
    return res.data.data;
  },

  verifyRazorpayPayment: async (data, clubId) => {
    const config = clubId ? { headers: { 'x-club-id': clubId } } : {};
    const res = await apiClient.post('/bar/payments/razorpay/verify', data, config);
    return res.data.data;
  },

  // KDS
  getKdsItems: async (station = null, clubId) => {
    const config = clubId ? { headers: { 'x-club-id': clubId } } : {};
    const res = await apiClient.get('/bar/kds', {
      ...config,
      params: station ? { station } : {},
    });
    return res.data.data;
  },

  updateKdsItemStatus: async (itemId, status, clubId) => {
    const config = clubId ? { headers: { 'x-club-id': clubId } } : {};
    const res = await apiClient.put(`/bar/kds/${itemId}`, { status }, config);
    return res.data.data;
  },

  // Tabs
  getTabs: async (status = 'open', clubId) => {
    const config = clubId ? { headers: { 'x-club-id': clubId } } : {};
    const res = await apiClient.get('/bar/tabs', {
      ...config,
      params: { status },
    });
    return res.data.data;
  },

  settleTab: async (tabId, paymentData, clubId) => {
    const config = clubId ? { headers: { 'x-club-id': clubId } } : {};
    const res = await apiClient.post(`/bar/tabs/${tabId}/settle`, paymentData, config);
    return res.data.data;
  },

  // Daily Closing
  getDailyClosing: async (date = null, clubId) => {
    const config = clubId ? { headers: { 'x-club-id': clubId } } : {};
    const res = await apiClient.get('/bar/daily-closing', {
      ...config,
      params: date ? { date } : {},
    });
    return res.data.data;
  },
};

export default barApi;
