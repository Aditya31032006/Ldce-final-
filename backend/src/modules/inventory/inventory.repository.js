import * as queries from './inventory.query.js';
import { withTenantTransaction } from '../../shared/utils/transaction.util.js';

export async function getProducts(userId, clubId, activeOnly = null) {
  return withTenantTransaction(userId, clubId, async (client) => {
    const res = await client.query(queries.GET_PRODUCTS, [clubId, activeOnly]);
    return res.rows;
  });
}

export async function getProductVariants(userId, clubId, productId) {
  return withTenantTransaction(userId, clubId, async (client) => {
    const res = await client.query(queries.GET_PRODUCT_VARIANTS, [clubId, productId]);
    return res.rows;
  });
}

export async function createProductTx(userId, clubId, productData, variantsData = []) {
  return withTenantTransaction(userId, clubId, async (client) => {
    const pResult = await client.query(queries.INSERT_PRODUCT, [
      clubId,
      productData.category_id || null,
      productData.brand_id || null,
      productData.name,
      productData.description || null,
      productData.image_url || null,
      productData.is_online,
      productData.is_active
    ]);
    const product = pResult.rows[0];

    const variants = [];
    for (const v of variantsData) {
      const vResult = await client.query(queries.INSERT_VARIANT, [
        clubId,
        product.id,
        v.sku,
        v.barcode || null,
        v.size || null,
        v.color || null,
        v.price,
        v.mrp || null,
        v.track_stock,
        v.stock_qty,
        v.reorder_level,
        v.is_active
      ]);
      variants.push(vResult.rows[0]);
    }
    
    return { ...product, variants };
  });
}

export async function getPurchaseOrders(userId, clubId) {
  return withTenantTransaction(userId, clubId, async (client) => {
    const res = await client.query(queries.GET_PURCHASE_ORDERS, [clubId]);
    return res.rows;
  });
}