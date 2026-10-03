import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // Automatically sends and receives httpOnly cookies
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to attach active club id header
apiClient.interceptors.request.use((config) => {
  try {
    const activeClubId = localStorage.getItem('activeClubId');
    if (activeClubId && activeClubId !== 'undefined' && activeClubId !== 'null') {
      config.headers['x-club-id'] = activeClubId;
    }
  } catch (_) {
    // Ignore localStorage errors
  }
  return config;
});

// Interceptor for standardized response error formatting
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error.response?.data?.message ||
      error.response?.data?.errors?.[0]?.msg ||
      error.message ||
      'An unexpected error occurred';
    return Promise.reject({ ...error, customMessage: message });
  }
);

export default apiClient;
