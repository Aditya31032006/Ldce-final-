import * as queries from './bar.query.js';
import { withTenantTransaction } from '../../shared/utils/transaction.util.js';

export async function getMenu(userId, clubId, categoryId = null, activeOnly = null) {
  return withTenantTransaction(userId, clubId, async (client) => {
    const catsResult = await client.query(queries.GET_MENU_CATEGORIES, [clubId, activeOnly]);
    const itemsResult = await client.query(queries.GET_MENU_ITEMS, [clubId, categoryId, activeOnly]);
    return {
      categories: catsResult.rows,
      items: itemsResult.rows
    };
  });
}

export async function createBarOrderTx(userId, clubId, orderData, items) {
  return withTenantTransaction(userId, clubId, async (client) => {
    // 1. (Optional) Check tab constraints: only one open tab per member allowed. 
    // Handled by DB Unique Index: uq_one_open_tab_per_member
    
    let tabId = orderData.tab_id;
    if (!tabId && orderData.open_new_tab) {
        // Create new tab
        const tabResult = await client.query(queries.INSERT_TAB, [
            clubId, orderData.member_id || null, orderData.guest_name || null, userId
        ]);
        tabId = tabResult.rows[0].id;
    }

    // 2. Create Bar Order
    const orderResult = await client.query(queries.INSERT_BAR_ORDER, [
        clubId,
        orderData.table_id || null,
        tabId || null,
        orderData.member_id || null,
        orderData.guest_name || null,
        userId
    ]);
    const order = orderResult.rows[0];

    // 3. Create Bar Order Items
    const createdItems = [];
    for (const item of items) {
        const itemResult = await client.query(queries.INSERT_BAR_ORDER_ITEM, [
            clubId,
            order.id,
            item.menu_item_id,
            item.quantity,
            item.notes || null,
            userId
        ]);
        createdItems.push(itemResult.rows[0]);
    }

    return { ...order, items: createdItems };
  });
}
