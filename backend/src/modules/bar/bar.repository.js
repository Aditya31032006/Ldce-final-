import * as queries from './bar.query.js';
import { withTenantTransaction } from '../../shared/utils/transaction.util.js';

export async function getTables(userId, clubId, activeOnly = null) {
  return withTenantTransaction(userId, clubId, async (client) => {
    const res = await client.query(queries.GET_TABLES, [clubId, activeOnly]);
    return res.rows;
  });
}

export async function createTable(userId, clubId, data) {
  return withTenantTransaction(userId, clubId, async (client) => {
    const res = await client.query(queries.INSERT_TABLE, [
      clubId,
      data.name,
      data.zone || null,
      data.capacity || 4,
    ]);
    return res.rows[0];
  });
}

export async function updateTableStatus(userId, clubId, tableId, status) {
  return withTenantTransaction(userId, clubId, async (client) => {
    const res = await client.query(queries.UPDATE_TABLE_STATUS, [clubId, tableId, status]);
    if (status === 'available') {
      // Clear/close lingering active orders on this table so it's fresh for next diners
      await client.query(
        "UPDATE app.bar_orders SET status = 'paid', closed_at = coalesce(closed_at, now()), updated_at = now() WHERE club_id = $1 AND table_id = $2 AND status IN ('billed', 'served')",
        [clubId, tableId]
      );
    }
    return res.rows[0];
  });
}

export async function updateTable(userId, clubId, tableId, data) {
  return withTenantTransaction(userId, clubId, async (client) => {
    const res = await client.query(queries.UPDATE_TABLE, [
      clubId,
      tableId,
      data.name || null,
      data.zone || null,
      data.capacity || null,
      data.status || null,
      data.is_active !== undefined ? data.is_active : null,
    ]);
    return res.rows[0];
  });
}

export async function getMenu(userId, clubId, categoryId = null, activeOnly = null, availableOnly = null) {
  return withTenantTransaction(userId, clubId, async (client) => {
    const catsResult = await client.query(queries.GET_MENU_CATEGORIES, [clubId, activeOnly]);
    const itemsResult = await client.query(queries.GET_MENU_ITEMS, [clubId, categoryId, activeOnly, availableOnly]);
    return {
      categories: catsResult.rows,
      items: itemsResult.rows,
    };
  });
}

export async function createMenuCategory(userId, clubId, data) {
  return withTenantTransaction(userId, clubId, async (client) => {
    const res = await client.query(queries.INSERT_MENU_CATEGORY, [
      clubId,
      data.name,
      data.station || 'kitchen',
      data.sort_order || 0,
    ]);
    return res.rows[0];
  });
}

export async function createMenuItem(userId, clubId, data) {
  return withTenantTransaction(userId, clubId, async (client) => {
    const res = await client.query(queries.INSERT_MENU_ITEM, [
      clubId,
      data.category_id,
      data.name,
      data.description || null,
      data.price,
      data.station || 'kitchen',
      data.is_veg !== undefined ? data.is_veg : true,
      data.prep_minutes || 5,
      data.sort_order || 0,
      data.image_url || null,
    ]);
    return res.rows[0];
  });
}

export async function updateMenuItem(userId, clubId, itemId, data) {
  return withTenantTransaction(userId, clubId, async (client) => {
    const res = await client.query(queries.UPDATE_MENU_ITEM, [
      clubId,
      itemId,
      data.name || null,
      data.price !== undefined ? Number(data.price) : null,
      data.description || null,
      data.is_available !== undefined ? data.is_available : null,
      data.is_active !== undefined ? data.is_active : null,
      data.image_url || null,
      data.prep_minutes !== undefined ? Number(data.prep_minutes) : null,
      data.is_veg !== undefined ? data.is_veg : null,
      data.category_id || null,
      data.station || null,
    ]);
    return res.rows[0];
  });
}

export async function deleteMenuItem(userId, clubId, itemId) {
  return withTenantTransaction(userId, clubId, async (client) => {
    try {
      const res = await client.query('DELETE FROM app.menu_items WHERE club_id = $1 AND id = $2 RETURNING *', [clubId, itemId]);
      if (res.rows.length > 0) return res.rows[0];
    } catch {
      // Soft-delete if foreign key references exist
      const res = await client.query('UPDATE app.menu_items SET is_active = false, is_available = false WHERE club_id = $1 AND id = $2 RETURNING *', [clubId, itemId]);
      return res.rows[0];
    }
  });
}

export async function getOrders(userId, clubId, filters = {}) {
  return withTenantTransaction(userId, clubId, async (client) => {
    const res = await client.query(queries.GET_BAR_ORDERS, [
      clubId,
      filters.status || null,
      filters.table_id || null,
      filters.member_id || null,
      filters.limit || 50,
    ]);
    return res.rows;
  });
}

export async function getOrderById(userId, clubId, orderId) {
  return withTenantTransaction(userId, clubId, async (client) => {
    const res = await client.query(queries.GET_ORDER_BY_ID, [clubId, orderId]);
    return res.rows[0] || null;
  });
}

export async function createBarOrderTx(userId, clubId, orderData, items) {
  return withTenantTransaction(userId, clubId, async (client) => {
    let tabId = orderData.tab_id || null;

    // If customer wants to put on member tab:
    if (orderData.open_new_tab || orderData.charge_to_tab) {
      if (orderData.member_id) {
        const existingTab = await client.query(queries.GET_ACTIVE_TAB_BY_MEMBER, [clubId, orderData.member_id]);
        if (existingTab.rows.length > 0) {
          tabId = existingTab.rows[0].id;
        } else {
          const tabResult = await client.query(queries.INSERT_TAB, [
            clubId,
            orderData.member_id,
            orderData.guest_name || null,
            userId,
          ]);
          tabId = tabResult.rows[0].id;
        }
      } else {
        const tabResult = await client.query(queries.INSERT_TAB, [
          clubId,
          null,
          orderData.guest_name || 'Counter Guest',
          userId,
        ]);
        tabId = tabResult.rows[0].id;
      }
    }

    // 1. Create order
    const orderResult = await client.query(queries.INSERT_BAR_ORDER, [
      clubId,
      orderData.table_id || null,
      tabId,
      orderData.member_id || null,
      orderData.guest_name || null,
      userId,
      orderData.notes || null,
    ]);
    const order = orderResult.rows[0];

    // If order is placed on a table, mark the table as occupied
    if (orderData.table_id) {
      await client.query(
        "UPDATE app.dining_tables SET status = 'occupied', updated_at = now() WHERE club_id = $1 AND id = $2",
        [clubId, orderData.table_id]
      );
    }

    // 2. Add items
    const createdItems = [];
    for (const item of items) {
      const itemResult = await client.query(queries.INSERT_BAR_ORDER_ITEM, [
        clubId,
        order.id,
        item.menu_item_id,
        item.quantity || 1,
        item.notes || null,
        userId,
      ]);
      createdItems.push(itemResult.rows[0]);
    }

    // 3. Return full order with updated totals
    const finalOrder = await client.query(queries.GET_ORDER_BY_ID, [clubId, order.id]);
    return finalOrder.rows[0];
  });
}

export async function addItemsToOrderTx(userId, clubId, orderId, items) {
  return withTenantTransaction(userId, clubId, async (client) => {
    for (const item of items) {
      await client.query(queries.INSERT_BAR_ORDER_ITEM, [
        clubId,
        orderId,
        item.menu_item_id,
        item.quantity || 1,
        item.notes || null,
        userId,
      ]);
    }
    const finalOrder = await client.query(queries.GET_ORDER_BY_ID, [clubId, orderId]);
    return finalOrder.rows[0];
  });
}

export async function getKdsItems(userId, clubId, station = null) {
  return withTenantTransaction(userId, clubId, async (client) => {
    const res = await client.query(queries.GET_KDS_ITEMS, [clubId, station]);
    return res.rows;
  });
}

export async function updateKdsItemStatus(userId, clubId, itemId, status) {
  return withTenantTransaction(userId, clubId, async (client) => {
    const res = await client.query(queries.UPDATE_KDS_STATUS, [clubId, itemId, status]);
    return res.rows[0];
  });
}

export async function billOrder(userId, clubId, orderId) {
  return withTenantTransaction(userId, clubId, async (client) => {
    const res = await client.query(queries.UPDATE_BAR_ORDER_STATUS, [clubId, orderId, 'billed']);
    return res.rows[0];
  });
}

export async function payAndSettleOrder(userId, clubId, orderId, paymentData) {
  return withTenantTransaction(userId, clubId, async (client) => {
    // 1. Get current order
    const orderRes = await client.query(queries.GET_ORDER_BY_ID, [clubId, orderId]);
    const order = orderRes.rows[0];
    if (!order) {
      throw new Error('Order not found');
    }

    const method = paymentData.method || 'cash';
    const amount = Number(order.total);

    // 2. Insert payment record
    const paymentRes = await client.query(queries.RECORD_PAYMENT, [
      clubId,
      method,
      amount,
      order.member_id || null,
      order.id,
      null, // Exactly one FK source required by schema
      paymentData.reference || (paymentData.razorpay_payment_id || null),
      userId,
      paymentData.notes || `Bar order payment: ${order.order_no}`,
    ]);

    // 3. Mark order as paid
    const updatedOrderRes = await client.query(queries.UPDATE_BAR_ORDER_STATUS, [clubId, orderId, 'paid']);
    const paidOrder = updatedOrderRes.rows[0];

    // 4. Ensure table is marked as occupied for the dining guests until staff clears it
    if (paidOrder?.table_id) {
      await client.query(
        "UPDATE app.dining_tables SET status = 'occupied', updated_at = now() WHERE club_id = $1 AND id = $2",
        [clubId, paidOrder.table_id]
      );
    }

    return {
      order: paidOrder,
      payment: paymentRes.rows[0],
    };

  });
}

export async function cancelOrder(userId, clubId, orderId, reason = null) {
  return withTenantTransaction(userId, clubId, async (client) => {
    // 1. Mark all order items as cancelled
    await client.query(
      "UPDATE app.bar_order_items SET kds_status = 'cancelled', updated_at = now() WHERE club_id = $1 AND order_id = $2",
      [clubId, orderId]
    );

    // 2. Mark order as void (trigger trg_table automatically resets dining table status to available)
    const res = await client.query(
      `UPDATE app.bar_orders
       SET status = 'void',
           closed_at = now(),
           notes = coalesce(notes || ' | ', '') || coalesce($3, 'Payment cancelled or failed'),
           updated_at = now()
       WHERE club_id = $1 AND id = $2
       RETURNING *`,
      [clubId, orderId, reason]
    );

    const cancelledOrder = res.rows[0];
    if (cancelledOrder?.table_id) {
      const activeRes = await client.query(
        "SELECT id FROM app.bar_orders WHERE club_id = $1 AND table_id = $2 AND status IN ('open', 'sent', 'served', 'billed') AND id <> $3 LIMIT 1",
        [clubId, cancelledOrder.table_id, orderId]
      );
      if (activeRes.rows.length === 0) {
        await client.query(
          "UPDATE app.dining_tables SET status = 'available', updated_at = now() WHERE club_id = $1 AND id = $2",
          [clubId, cancelledOrder.table_id]
        );
      }
    }

    return cancelledOrder;
  });
}

export async function getMemberTabs(userId, clubId, status = 'open') {
  return withTenantTransaction(userId, clubId, async (client) => {
    const res = await client.query(queries.GET_MEMBER_TABS, [clubId, status]);
    return res.rows;
  });
}

export async function settleTabTx(userId, clubId, tabId, paymentData) {
  return withTenantTransaction(userId, clubId, async (client) => {
    // 1. Get tab outstanding balance
    const ordersRes = await client.query(
      "SELECT coalesce(sum(total), 0) AS due FROM app.bar_orders WHERE tab_id = $1 AND status <> 'void'",
      [tabId]
    );
    const due = Number(ordersRes.rows[0]?.due || 0);

    const paidRes = await client.query(
      "SELECT coalesce(sum(amount), 0) AS paid FROM app.payments WHERE tab_id = $1 AND status = 'completed'",
      [tabId]
    );
    const alreadyPaid = Number(paidRes.rows[0]?.paid || 0);
    const balance = due - alreadyPaid;

    if (balance > 0) {
      // Record payment for the remaining balance
      await client.query(queries.RECORD_PAYMENT, [
        clubId,
        paymentData.method || 'cash',
        balance,
        paymentData.member_id || null,
        null,
        tabId,
        paymentData.reference || null,
        userId,
        `Tab settlement: ${tabId}`,
      ]);
    }

    // 2. Mark tab settled (trigger trg_tab_settle & trg_tab_close_orders will execute)
    const tabRes = await client.query(queries.SETTLE_TAB, [clubId, tabId, userId]);
    return tabRes.rows[0];
  });
}

export async function getDailyClosing(userId, clubId, date = null) {
  return withTenantTransaction(userId, clubId, async (client) => {
    const closingRes = await client.query(queries.GET_DAILY_CLOSING, [clubId, date]);
    const paymentsRes = await client.query(queries.GET_DAILY_PAYMENTS_BREAKDOWN, [clubId, date]);

    return {
      summary: closingRes.rows[0] || {
        day: date || new Date().toISOString().split('T')[0],
        orders: 0,
        gross: '0.00',
        discounts: '0.00',
        tax: '0.00',
        net_total: '0.00',
      },
      payment_breakdown: paymentsRes.rows,
    };
  });
}
