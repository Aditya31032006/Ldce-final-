import * as queries from './notifications.query.js';
import { withTenantTransaction } from '../../shared/utils/transaction.util.js';

export async function getNotifications(userId, clubId, memberId) {
  return withTenantTransaction(userId, clubId, async (client) => {
    const res = await client.query(queries.GET_NOTIFICATIONS, [clubId, memberId]);
    return res.rows;
  });
}

export async function createNotification(userId, clubId, notificationData) {
  return withTenantTransaction(userId, clubId, async (client) => {
    const res = await client.query(queries.INSERT_NOTIFICATION, [
      clubId,
      notificationData.type || 'system',
      notificationData.channel || 'in_app',
      notificationData.member_id,
      notificationData.subject,
      notificationData.content
    ]);
    return res.rows[0];
  });
}
