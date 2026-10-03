import * as sportsRepo from './sports.repository.js';

export async function getSportsController(req, res, next) {
  try {
    const activeOnly = req.query.active === 'true' ? true : req.query.active === 'false' ? false : null;
    const sports = await sportsRepo.getSports(req.user?.id, req.clubId, activeOnly);
    return res.status(200).json({ success: true, sports });
  } catch (error) {
    next(error);
  }
}

export async function createSportController(req, res, next) {
  try {
    const { name, description, icon, sort_order } = req.body;
    if (!name?.trim()) return res.status(400).json({ success: false, message: 'Sport name is required' });
    const sport = await sportsRepo.createSport(req.user.id, req.clubId, { name: name.trim(), description, icon, sort_order });
    return res.status(201).json({ success: true, message: 'Sport created successfully', sport });
  } catch (error) {
    next(error);
  }
}

export async function updateSportController(req, res, next) {
  try {
    const { sportId } = req.params;
    const sport = await sportsRepo.updateSport(req.user.id, req.clubId, sportId, req.body);
    return res.status(200).json({ success: true, message: 'Sport updated', sport });
  } catch (error) {
    next(error);
  }
}

export async function deleteSportController(req, res, next) {
  try {
    const { sportId } = req.params;
    const sport = await sportsRepo.deleteSport(req.user.id, req.clubId, sportId);
    return res.status(200).json({ success: true, message: 'Sport deactivated', sport });
  } catch (error) {
    next(error);
  }
}
