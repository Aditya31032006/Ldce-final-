import * as notificationsRepo from './notifications.repository.js';
import { runMembershipRenewalCheck } from '../../jobs/membershipRenewalCron.js';

export async function getMyNotificationsController(req, res, next) {
  try {
    const notifications = await notificationsRepo.getNotifications(req.user.id, req.clubId, req.user.memberId);
    return res.status(200).json({ notifications });
  } catch (error) {
    next(error);
  }
}

export async function triggerRenewalRemindersController(req, res, next) {
  try {
    const summary = await runMembershipRenewalCheck();
    return res.status(200).json({
      message: 'Membership renewal reminder check completed successfully.',
      summary,
    });
  } catch (error) {
    next(error);
  }
}
