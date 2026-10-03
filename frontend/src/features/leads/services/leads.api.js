import apiClient from '../../../shared/services/api.js';

export const leadsApi = {
  async getLeads() {
    const res = await apiClient.get('/leads');
    return res.data;
  },
  async updateLeadStatus(id, status) {
    const res = await apiClient.put(`/leads/${id}/status`, { status });
    return res.data;
  },
};

export default leadsApi;
