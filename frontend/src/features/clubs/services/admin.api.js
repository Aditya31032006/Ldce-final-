import api from '../../../shared/services/api.js';

// ─── Sports ───────────────────────────────────────────────────────────────
export const sportsApi = {
  list: (active) => api.get('/sports', { params: active !== undefined ? { active } : {} }).then(r => r.data.sports || []),
  create: (data) => api.post('/sports', data).then(r => r.data.sport),
  update: (id, data) => api.put(`/sports/${id}`, data).then(r => r.data.sport),
  remove: (id) => api.delete(`/sports/${id}`).then(r => r.data),
};

// ─── Courts ───────────────────────────────────────────────────────────────
export const courtsApi = {
  list: (active) => api.get('/courts', { params: active !== undefined ? { active } : {} }).then(r => r.data.courts || []),
  getById: (id) => api.get(`/courts/${id}`).then(r => r.data.court),
  create: (data) => api.post('/courts', data).then(r => r.data.court),
  update: (id, data) => api.put(`/courts/${id}`, data).then(r => r.data.court),
  remove: (id) => api.delete(`/courts/${id}`).then(r => r.data),
  getHours: (id) => api.get(`/courts/${id}/hours`).then(r => r.data.hours || []),
  setHours: (id, hours) => api.put(`/courts/${id}/hours`, { hours }).then(r => r.data.hours || []),
  getAvailability: (day, sport_id) => api.get('/courts/availability', { params: { day, sport_id } }).then(r => r.data.availability || []),
};

// ─── Court Rates ──────────────────────────────────────────────────────────
export const courtRatesApi = {
  list: () => api.get('/court-rates').then(r => r.data.rates || []),
  create: (data) => api.post('/court-rates', data).then(r => r.data.rate),
  update: (id, data) => api.put(`/court-rates/${id}`, data).then(r => r.data.rate),
  remove: (id) => api.delete(`/court-rates/${id}`).then(r => r.data),
};

// ─── Plans ────────────────────────────────────────────────────────────────
export const plansApi = {
  list: (active) => api.get('/plans', { params: active !== undefined ? { active } : {} }).then(r => r.data.plans || []),
  getById: (id) => api.get(`/plans/${id}`).then(r => r.data.plan),
  create: (data) => api.post('/plans', data).then(r => r.data.plan),
  update: (id, data) => api.put(`/plans/${id}`, data).then(r => r.data.plan),
  remove: (id) => api.delete(`/plans/${id}`).then(r => r.data),
  addBenefit: (planId, label, sort_order) => api.post(`/plans/${planId}/benefits`, { label, sort_order }).then(r => r.data.benefit),
  removeBenefit: (planId, benefitId) => api.delete(`/plans/${planId}/benefits/${benefitId}`).then(r => r.data),
};

export default { sportsApi, courtsApi, courtRatesApi, plansApi };
