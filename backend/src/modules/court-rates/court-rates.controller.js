import * as repo from './court-rates.repository.js';

export async function getCourtRatesController(req, res, next) {
  try {
    const activeOnly = req.query.active === 'true' ? true : req.query.active === 'false' ? false : null;
    const rates = await repo.getCourtRates(req.user?.id, req.clubId, activeOnly);
    return res.status(200).json({ success: true, rates });
  } catch (error) { next(error); }
}

export async function createCourtRateController(req, res, next) {
  try {
    if (req.body.price === undefined || req.body.price === null) {
      return res.status(400).json({ success: false, message: 'price is required' });
    }
    const rate = await repo.createCourtRate(req.user.id, req.clubId, req.body);
    return res.status(201).json({ success: true, message: 'Pricing rule created', rate });
  } catch (error) { next(error); }
}

export async function updateCourtRateController(req, res, next) {
  try {
    const rate = await repo.updateCourtRate(req.user.id, req.clubId, req.params.rateId, req.body);
    return res.status(200).json({ success: true, message: 'Pricing rule updated', rate });
  } catch (error) { next(error); }
}

export async function deleteCourtRateController(req, res, next) {
  try {
    const rate = await repo.deleteCourtRate(req.user.id, req.clubId, req.params.rateId);
    return res.status(200).json({ success: true, message: 'Pricing rule deactivated', rate });
  } catch (error) { next(error); }
}
