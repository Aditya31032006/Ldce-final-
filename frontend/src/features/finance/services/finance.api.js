import apiClient from '../../../shared/services/api.js';

export const financeApi = {
  async getPayments() {
    const res = await apiClient.get('/finance/payments');
    return res.data;
  },
  async getInvoices() {
    const res = await apiClient.get('/finance/invoices');
    return res.data;
  },
  async createPayment(paymentData) {
    const res = await apiClient.post('/finance/payments', paymentData);
    return res.data;
  },
};

export default financeApi;
