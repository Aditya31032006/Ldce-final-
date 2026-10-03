import * as courtsRepo from './courts.repository.js';

export async function getCourtsController(req, res, next) {
  try {
    const activeOnly = req.query.active === 'true' ? true : req.query.active === 'false' ? false : null;
    const courts = await courtsRepo.getCourts(req.user?.id, req.clubId, activeOnly);
    return res.status(200).json({ success: true, courts });
  } catch (error) {
    next(error);
  }
}

export async function getCourtByIdController(req, res, next) {
  try {
    const court = await courtsRepo.getCourtById(req.user?.id, req.clubId, req.params.courtId);
    if (!court) return res.status(404).json({ success: false, message: 'Court not found' });
    return res.status(200).json({ success: true, court });
  } catch (error) {
    next(error);
  }
}

export async function createCourtController(req, res, next) {
  try {
    const { name, sport_id, surface, description, image_url, is_indoor, has_lighting, max_players, sort_order } = req.body;
    if (!name?.trim()) return res.status(400).json({ success: false, message: 'Court name is required' });
    if (!sport_id) return res.status(400).json({ success: false, message: 'Sport is required' });
    const court = await courtsRepo.createCourt(req.user.id, req.clubId, { name: name.trim(), sport_id, surface, description, image_url, is_indoor, has_lighting, max_players, sort_order });
    return res.status(201).json({ success: true, message: 'Court created successfully', court });
  } catch (error) {
    next(error);
  }
}

export async function updateCourtController(req, res, next) {
  try {
    const court = await courtsRepo.updateCourt(req.user.id, req.clubId, req.params.courtId, req.body);
    return res.status(200).json({ success: true, message: 'Court updated', court });
  } catch (error) {
    next(error);
  }
}

export async function deleteCourtController(req, res, next) {
  try {
    const court = await courtsRepo.deleteCourt(req.user.id, req.clubId, req.params.courtId);
    return res.status(200).json({ success: true, message: 'Court deactivated', court });
  } catch (error) {
    next(error);
  }
}

export async function getCourtAvailabilityController(req, res, next) {
  try {
    const { day, sport_id } = req.query;
    if (!day) return res.status(400).json({ success: false, message: 'day query param required (YYYY-MM-DD)' });
    const availability = await courtsRepo.getCourtAvailability(req.user?.id, req.clubId, day, sport_id || null);
    return res.status(200).json({ success: true, availability });
  } catch (error) {
    next(error);
  }
}

export async function getOperatingHoursController(req, res, next) {
  try {
    const hours = await courtsRepo.getOperatingHours(req.user?.id, req.clubId, req.params.courtId);
    return res.status(200).json({ success: true, hours });
  } catch (error) {
    next(error);
  }
}

export async function upsertOperatingHoursController(req, res, next) {
  try {
    const { hours } = req.body; // array of { weekday, opens_at, closes_at, is_closed }
    if (!Array.isArray(hours)) return res.status(400).json({ success: false, message: 'hours must be an array' });
    const result = await courtsRepo.upsertOperatingHours(req.user.id, req.clubId, req.params.courtId, hours);
    return res.status(200).json({ success: true, message: 'Operating hours updated', hours: result });
  } catch (error) {
    next(error);
  }
}
