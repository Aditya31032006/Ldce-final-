import apiClient from '../../../shared/services/api.js';

export const bookingsApi = {
  async getBookings(params = {}) {
    const res = await apiClient.get('/bookings', { params });
    return res.data;
  },
  async getCalendar(params = {}) {
    const res = await apiClient.get('/bookings/calendar', { params });
    return res.data;
  },
  async createBooking(bookingData) {
    const res = await apiClient.post('/bookings', bookingData);
    return res.data;
  },
  async cancelBooking(bookingId) {
    const res = await apiClient.put(`/bookings/${bookingId}/cancel`);
    return res.data;
  },
};

export default bookingsApi;
