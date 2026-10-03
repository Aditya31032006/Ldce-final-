import * as queries from './orders.query.js';
import { withTenantTransaction } from '../../shared/utils/transaction.util.js';

export async function createShopOrder(userId, clubId, orderData, items) {
  return withTenantTransaction(userId, clubId, async (client) => {
    // 1. Validate and lock stock for each item
    // Sort items by variant_id to prevent deadlocks
    const sortedItems = [...items].sort((a, b) => a.variant_id.localeCompare(b.variant_id));
    
    for (const item of sortedItems) {
      const vResult = await client.query(queries.LOCK_VARIANT, [item.variant_id, clubId]);
      if (vResult.rows.length === 0) {
        const err = new Error(`Variant ${item.variant_id} not found`);
        err.status = 404;
        throw err;
      }
      
      const variant = vResult.rows[0];
      if (variant.track_stock && variant.stock_qty < item.quantity) {
        const err = new Error(`Insufficient stock for variant ${item.variant_id}`);
        err.status = 400;
        throw err;
      }
    }

    // 2. Create Order
    const orderResult = await client.query(queries.INSERT_SHOP_ORDER, [
      clubId,
      orderData.member_id || null,
      orderData.guest_name || null,
      orderData.guest_phone || null,
      orderData.channel || 'pos',
      orderData.fulfillment || 'counter',
      orderData.delivery_address || null,
      orderData.status || 'pending',
      userId
    ]);
    const order = orderResult.rows[0];

    // 3. Create Order Items (Triggers will handle stock decrement and pricing automatically)
    const createdItems = [];
    for (const item of items) {
      const iResult = await client.query(queries.INSERT_SHOP_ORDER_ITEM, [
        clubId,
        order.id,
        item.variant_id,
        item.quantity
      ]);
      createdItems.push(iResult.rows[0]);
    }

    return { ...order, items: createdItems };
  });
}
