import * as queries from './reports.query.js';
import { withTenantTransaction } from '../../shared/utils/transaction.util.js';

export async function getDailySummary(userId, clubId, date) {
  return withTenantTransaction(userId, clubId, async (client) => {
    const res = await client.query(queries.GET_DAILY_SUMMARY, [clubId, date]);
    return res.rows[0];
  });
}
