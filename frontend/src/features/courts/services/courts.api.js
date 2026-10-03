import apiClient from '../../../shared/services/api.js';

export const courtsApi = {
  async getCourts() {
    const res = await apiClient.get('/courts');
    return res.data;
  },
  async createCourt(courtData) {
    const res = await apiClient.post('/courts', courtData);
    return res.data;
  },
};

export default courtsApi;
