import apiClient from '../../../shared/services/api.js';

export const clubsApi = {
  async getClubs() {
    const res = await apiClient.get('/clubs');
    return res.data;
  },
  async getClubDetails(clubId) {
    const res = await apiClient.get(`/clubs/${clubId}`);
    return res.data;
  },
  async getClubSettings() {
    const res = await apiClient.get('/clubs/settings');
    return res.data;
  },
  async updateClubSettings(settings) {
    const res = await apiClient.put('/clubs/settings', settings);
    return res.data;
  },
};

export default clubsApi;
