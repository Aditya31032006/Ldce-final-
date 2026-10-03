import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const clubsApi = {
  /**
   * Fetch clubs joined by authenticated user
   */
  async getMyClubs() {
    const response = await api.get('/clubs/my-clubs');
    return response.data?.clubs || [];
  },

  /**
   * Fetch public clubs with search & pagination
   * @param {Object} params
   * @param {string} params.search - Fuzzy search query
   * @param {number} params.page - 1-indexed page number
   * @param {number} params.limit - Number of clubs per page
   */
  async getPublicClubs({ search = '', page = 1, limit = 6 } = {}) {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    params.append('page', page);
    params.append('limit', limit);

    const response = await api.get(`/clubs/public?${params.toString()}`);
    return response.data;
  },

  /**
   * Join an active public club as a member
   */
  async joinClub(clubId) {
    const response = await api.post(`/clubs/${clubId}/join`);
    return response.data;
  },

  /**
   * Fetch specific club details
   */
  async getClubDetails(clubId) {
    const response = await api.get(`/clubs/${clubId}`);
    return response.data?.club;
  },
  async getClubGallery(clubId) {
    const url = clubId ? `/clubs/${clubId}/gallery` : '/clubs/gallery';
    const res = await apiClient.get(url);
    return res.data;
  },
  async addClubGallery(data) {
    const res = await apiClient.post('/clubs/gallery', data);
    return res.data;
  },
  async deleteClubGallery(imageId) {
    const res = await apiClient.delete(`/clubs/gallery/${imageId}`);
    return res.data;
  },
};

export default clubsApi;

