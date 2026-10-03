import * as reportsRepo from './reports.repository.js';

export async function getDailySummaryController(req, res, next) {
  try {
    const date = req.query.date || new Date().toISOString().split('T')[0];
    const summary = await reportsRepo.getDailySummary(req.user.id, req.clubId, date);
    return res.status(200).json({ summary });
  } catch (error) {
    next(error);
  }
}
