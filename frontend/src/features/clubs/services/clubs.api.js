import api from '../../../shared/services/api.js';

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
   * Join an active public club as a member (optionally with selected plan)
   */
  async joinClub(clubId, planId = null, paymentDetails = null) {
    const payload = {};
    if (planId) payload.plan_id = planId;
    if (paymentDetails) payload.paymentDetails = paymentDetails;
    const response = await api.post(`/clubs/${clubId}/join`, payload);
    return response.data;
  },

  /**
   * Fetch specific club details
   */
  async getClubDetails(clubId) {
    const response = await api.get(`/clubs/${clubId}`);
    return response.data?.club;
  },

  /**
   * Fetch club gallery images (owner: uses clubId in context header)
   */
  async getClubGallery(clubId) {
    const id = clubId || localStorage.getItem('activeClubId');
    const response = await api.get(`/clubs/${id}/gallery`);
    return response.data;
  },

  /**
   * Add images to club gallery (owner only)
   */
  async addClubGallery(clubId, data) {
    const id = clubId || localStorage.getItem('activeClubId');
    const response = await api.post(`/clubs/${id}/gallery`, data);
    return response.data;
  },

  /**
   * Delete an image from club gallery (owner only)
   */
  async deleteClubGallery(clubId, imageId) {
    const id = clubId || localStorage.getItem('activeClubId');
    const response = await api.delete(`/clubs/${id}/gallery/${imageId}`);
    return response.data;
  },
};

export default clubsApi;
