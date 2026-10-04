import * as queries from './orders.query.js';
import { withTenantTransaction } from '../../shared/utils/transaction.util.js';

export async function createShopOrder(userId, clubId, orderData, items) {
  return withTenantTransaction(userId, clubId, async (client) => {
    // 0. Auto-resolve ctx_member & role from DB session context
    const ctxRes = await client.query('SELECT app.ctx_member() AS mem_id, app.ctx_role() AS role');
    const ctxMember = ctxRes.rows[0]?.mem_id || null;
    const ctxRole = ctxRes.rows[0]?.role || 'public';
    const isStaff = ['owner', 'manager', 'front_desk', 'shop_staff'].includes(ctxRole);

    const channel = isStaff ? (orderData.channel || 'pos') : 'online';
    const status = isStaff ? (orderData.status || 'completed') : 'pending';
    const memberId = orderData.member_id || ctxMember || null;
    
    // Ensure delivery address constraint is met
    const fulfillment = orderData.fulfillment || 'counter';
    let deliveryAddress = orderData.delivery_address ? orderData.delivery_address.trim() : null;
    if (fulfillment === 'delivery' && !deliveryAddress) {
      deliveryAddress = 'Club Facility Delivery / In-person Pickup';
    }

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
      memberId,
      orderData.guest_name || null,
      orderData.guest_phone || null,
      channel,
      fulfillment,
      deliveryAddress,
      status,
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

    // 4. Fetch refreshed order with trigger-calculated total & order_no
    const freshRes = await client.query('SELECT * FROM app.shop_orders WHERE id = $1', [order.id]);
    const finalOrder = freshRes.rows[0] || order;

    return { ...finalOrder, items: createdItems };
  });
}

export async function getShopOrders(userId, clubId, customerUserId = null, search = null) {
  return withTenantTransaction(userId, clubId, async (client) => {
    const res = await client.query(queries.GET_SHOP_ORDERS, [clubId, customerUserId, search ? search.trim() : null]);
    return res.rows || [];
  });
}

export async function updateOrderStatus(userId, clubId, orderId, status) {
  return withTenantTransaction(userId, clubId, async (client) => {
    const res = await client.query(queries.UPDATE_SHOP_ORDER_STATUS, [status, orderId, clubId]);
    if (res.rows.length === 0) {
      const err = new Error("Order not found or update not permitted");
      err.status = 404;
      throw err;
    }
    return res.rows[0];
  });
}

