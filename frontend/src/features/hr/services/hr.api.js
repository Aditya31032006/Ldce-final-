import apiClient from '../../../shared/services/api.js';

export const hrApi = {
  async getStaff() {
    const res = await apiClient.get('/hr');
    return res.data;
  },
  async addStaff(staffData) {
    const res = await apiClient.post('/hr', staffData);
    return res.data;
  },
  async removeStaff(userId) {
    const res = await apiClient.delete(`/hr/${userId}`);
    return res.data;
  },
};

export default hrApi;

