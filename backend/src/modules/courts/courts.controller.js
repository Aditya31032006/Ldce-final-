import * as courtsRepo from './courts.repository.js';

export async function getCourtsController(req, res, next) {
  try {
    const activeOnly = (req.user?.role === 'member' || req.user?.role === 'public') ? true : null;
    const courts = await courtsRepo.getCourts(req.user?.id, req.clubId, activeOnly);
    return res.status(200).json({ courts });
  } catch (error) {
    next(error);
  }
}

export async function createCourtController(req, res, next) {
  try {
    const { name, sport_id } = req.body;
    if (!name || !sport_id) {
      return res.status(400).json({ message: "Name and sport_id are required" });
    }
    const court = await courtsRepo.createCourt(req.user.id, req.clubId, req.body);
    return res.status(201).json({ message: "Court created", court });
  } catch (error) {
    next(error);
  }
}

export async function getCourtAvailabilityController(req, res, next) {
  try {
    const { day, sportId } = req.query;
    if (!day) {
      return res.status(400).json({ message: "Query parameter 'day' (YYYY-MM-DD) is required" });
    }
    const availability = await courtsRepo.getCourtAvailability(req.user?.id, req.clubId, day, sportId);
    return res.status(200).json({ availability });
  } catch (error) {
    next(error);
  }
}
