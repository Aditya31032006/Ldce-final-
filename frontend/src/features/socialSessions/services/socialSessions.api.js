import apiClient from '../../../shared/services/api.js';

export const socialSessionsApi = {
  async getSessions() {
    const res = await apiClient.get('/social-sessions');
    return res.data;
  },
  async joinSession(sessionId) {
    const res = await apiClient.post(`/social-sessions/${sessionId}/join`);
    return res.data;
  },
};

export default socialSessionsApi;
