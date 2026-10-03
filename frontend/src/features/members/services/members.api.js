import apiClient from '../../../shared/services/api.js';

export const membersApi = {
  async getMembers(params = {}) {
    const res = await apiClient.get('/members', { params });
    return res.data;
  },
  async searchMembers(query) {
    const res = await apiClient.get('/members/search', { params: { q: query } });
    return res.data;
  },
  async getMemberById(id) {
    const res = await apiClient.get(`/members/${id}`);
    return res.data;
  },
  async createMember(memberData) {
    const res = await apiClient.post('/members', memberData);
    return res.data;
  },
};

export default membersApi;
