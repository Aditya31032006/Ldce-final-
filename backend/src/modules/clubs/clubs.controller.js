import * as clubsRepo from './clubs.repository.js';

export async function registerClubController(req, res, next) {
  try {
    const { name, slug, city, phone, email, timezone } = req.body;
    if (!name || !slug) {
      return res.status(400).json({ message: "Name and slug are required" });
    }

    const clubId = await clubsRepo.registerClub(req.user.id, { name, slug, city, phone, email, timezone });
    return res.status(201).json({ message: "Club registered successfully", clubId });
  } catch (error) {
    next(error);
  }
}

export async function getClubDetailsController(req, res, next) {
  try {
    const club = await clubsRepo.getClubDetails(req.user?.id, req.clubId);
    if (!club) {
      return res.status(404).json({ message: "Club not found" });
    }
    return res.status(200).json({ club });
  } catch (error) {
    next(error);
  }
}

export async function updateClubDetailsController(req, res, next) {
  try {
    // Requires owner or manager (checked via middleware in route)
    const club = await clubsRepo.updateClubDetails(req.user.id, req.clubId, req.body);
    return res.status(200).json({ message: "Club updated", club });
  } catch (error) {
    next(error);
  }
}

export async function getClubSettingsController(req, res, next) {
  try {
    const settings = await clubsRepo.getClubSettings(req.user?.id, req.clubId);
    if (!settings) {
      return res.status(404).json({ message: "Settings not found" });
    }
    return res.status(200).json({ settings });
  } catch (error) {
    next(error);
  }
}

export async function updateClubSettingsController(req, res, next) {
  try {
    const settings = await clubsRepo.updateClubSettings(req.user.id, req.clubId, req.body);
    return res.status(200).json({ message: "Settings updated", settings });
  } catch (error) {
    next(error);
  }
}
