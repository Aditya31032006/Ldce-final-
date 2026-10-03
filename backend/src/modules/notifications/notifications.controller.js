import * as notificationsRepo from './notifications.repository.js';

export async function getMyNotificationsController(req, res, next) {
  try {
    const notifications = await notificationsRepo.getNotifications(req.user.id, req.clubId, req.user.memberId);
    return res.status(200).json({ notifications });
  } catch (error) {
    next(error);
  }
}
