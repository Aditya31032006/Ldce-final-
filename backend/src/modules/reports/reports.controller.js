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

export async function getDashboardDataController(req, res, next) {
  try {
    const data = await reportsRepo.getDashboardData(req.user.id, req.clubId);
    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
}

export async function getAnalyticsDataController(req, res, next) {
  try {
    const range = req.query.range || 'all';
    const data = await reportsRepo.getAnalyticsData(req.user.id, req.clubId, range);
    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
}
