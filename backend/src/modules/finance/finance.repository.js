import * as queries from './finance.query.js';
import { withTenantTransaction } from '../../shared/utils/transaction.util.js';

export async function createPaymentTx(userId, clubId, paymentData) {
  return withTenantTransaction(userId, clubId, async (client) => {
    // Basic validation ensures only one source is linked
    const sources = [
        paymentData.booking_id, paymentData.social_player_id, paymentData.shop_order_id, 
        paymentData.bar_order_id, paymentData.tab_id, paymentData.membership_id, paymentData.invoice_id
    ];
    if (sources.filter(s => s != null).length !== 1) {
        const err = new Error("Payment must be linked to exactly one source (booking, shop_order, etc.)");
        err.status = 400;
        throw err;
    }

    const res = await client.query(queries.INSERT_PAYMENT, [
        clubId,
        paymentData.kind || 'payment',
        paymentData.method,
        paymentData.amount,
        paymentData.member_id || null,
        paymentData.client_id || null,
        paymentData.booking_id || null,
        paymentData.social_player_id || null,
        paymentData.shop_order_id || null,
        paymentData.bar_order_id || null,
        paymentData.tab_id || null,
        paymentData.membership_id || null,
        paymentData.invoice_id || null,
        paymentData.reference || null,
        userId
    ]);
    
    // If it's a tab payment and we want to settle, we might need additional logic here
    if (paymentData.tab_id && paymentData.settle_tab) {
        // triggers will handle settlement logic and throw if unpaid balance remains
        await client.query(queries.SETTLE_TAB, [paymentData.tab_id, clubId]);
    }

    return res.rows[0];
  });
}

export async function getPayments(userId, clubId) {
  return withTenantTransaction(userId, clubId, async (client) => {
    const res = await client.query(queries.GET_PAYMENTS, [clubId]);
    return res.rows;
  });
}

export async function getInvoices(userId, clubId) {
  return withTenantTransaction(userId, clubId, async (client) => {
    const res = await client.query(queries.GET_INVOICES, [clubId]);
    return res.rows;
  });
}