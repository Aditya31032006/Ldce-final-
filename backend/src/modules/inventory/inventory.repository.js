import * as queries from './inventory.query.js';
import { withTenantTransaction } from '../../shared/utils/transaction.util.js';

export async function getProducts(userId, clubId, activeOnly = null, search = null) {
  return withTenantTransaction(userId, clubId, async (client) => {
    const res = await client.query(queries.GET_PRODUCTS, [clubId, activeOnly, search ? search.trim() : null]);
    return res.rows;
  });
}

export async function getProductCategories(userId, clubId) {
  return withTenantTransaction(userId, clubId, async (client) => {
    const res = await client.query(queries.GET_PRODUCT_CATEGORIES, [clubId]);
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
    let categoryId = productData.category_id || null;

    // Auto-resolve or create category by name if provided
    if (!categoryId && productData.category_name && productData.category_name.trim()) {
      const trimmedCat = productData.category_name.trim();
      const existing = await client.query(queries.FIND_PRODUCT_CATEGORY_BY_NAME, [clubId, trimmedCat]);
      if (existing.rows.length > 0) {
        categoryId = existing.rows[0].id;
      } else {
        const newCat = await client.query(queries.INSERT_PRODUCT_CATEGORY, [clubId, trimmedCat]);
        categoryId = newCat.rows[0]?.id || null;
      }
    }

    const pResult = await client.query(queries.INSERT_PRODUCT, [
      clubId,
      categoryId,
      productData.brand_id || null,
      productData.name.trim(),
      productData.description ? productData.description.trim() : null,
      productData.image_url ? productData.image_url.trim() : null,
      productData.is_online !== undefined ? Boolean(productData.is_online) : true,
      productData.is_active !== undefined ? Boolean(productData.is_active) : true
    ]);
    const product = pResult.rows[0];

    const variants = [];
    // If explicit variants are given, use them; otherwise create one primary variant from flat fields
    const variantsToInsert = (variantsData && variantsData.length > 0) ? variantsData : [{
      sku: productData.sku ? productData.sku.trim() : `SKU-${Date.now().toString(36).toUpperCase()}`,
      barcode: productData.barcode || null,
      size: productData.size || null,
      color: productData.color || null,
      price: Number(productData.price) || 0,
      mrp: productData.mrp ? Number(productData.mrp) : null,
      cost_price: productData.cost_price ? Number(productData.cost_price) : null,
      track_stock: productData.track_stock !== undefined ? Boolean(productData.track_stock) : true,
      stock_qty: Number(productData.stock_qty) || 0,
      reorder_level: Number(productData.reorder_level) || 5,
      is_active: true
    }];

    for (const v of variantsToInsert) {
      const vResult = await client.query(queries.INSERT_VARIANT, [
        clubId,
        product.id,
        v.sku || `SKU-${Date.now().toString(36).toUpperCase()}`,
        v.barcode || null,
        v.size || null,
        v.color || null,
        Number(v.price) || 0,
        v.mrp ? Number(v.mrp) : null,
        v.track_stock !== undefined ? Boolean(v.track_stock) : true,
        Number(v.stock_qty) || 0,
        Number(v.reorder_level) || 0,
        v.is_active !== undefined ? Boolean(v.is_active) : true
      ]);
      variants.push(vResult.rows[0]);
    }
    
    return { ...product, variants };
  });
}

export async function updateProduct(userId, clubId, productId, updateData) {
  return withTenantTransaction(userId, clubId, async (client) => {
    let categoryId = updateData.category_id !== undefined ? updateData.category_id : null;

    if (!categoryId && updateData.category_name && updateData.category_name.trim()) {
      const trimmedCat = updateData.category_name.trim();
      const existing = await client.query(queries.FIND_PRODUCT_CATEGORY_BY_NAME, [clubId, trimmedCat]);
      if (existing.rows.length > 0) {
        categoryId = existing.rows[0].id;
      } else {
        const newCat = await client.query(queries.INSERT_PRODUCT_CATEGORY, [clubId, trimmedCat]);
        categoryId = newCat.rows[0]?.id || null;
      }
    }

    const pResult = await client.query(queries.UPDATE_PRODUCT, [
      productId,
      clubId,
      updateData.name !== undefined ? updateData.name.trim() : null,
      updateData.description !== undefined ? updateData.description.trim() : null,
      categoryId,
      updateData.image_url !== undefined ? updateData.image_url.trim() : null,
      updateData.is_online !== undefined ? Boolean(updateData.is_online) : null,
      updateData.is_active !== undefined ? Boolean(updateData.is_active) : null
    ]);

    if (updateData.stock_qty !== undefined || updateData.price !== undefined) {
      await client.query(queries.UPDATE_VARIANT_STOCK, [
        productId,
        clubId,
        updateData.stock_qty !== undefined ? Number(updateData.stock_qty) : null,
        updateData.price !== undefined ? Number(updateData.price) : null,
        updateData.mrp !== undefined ? Number(updateData.mrp) : null,
        updateData.is_active !== undefined ? Boolean(updateData.is_active) : null
      ]);
    }

    return pResult.rows[0];
  });
}

export async function deleteProduct(userId, clubId, productId) {
  return withTenantTransaction(userId, clubId, async (client) => {
    const res = await client.query(queries.DELETE_PRODUCT, [productId, clubId]);
    return res.rows[0];
  });
}

export async function getPurchaseOrders(userId, clubId) {
  return withTenantTransaction(userId, clubId, async (client) => {
    const res = await client.query(queries.GET_PURCHASE_ORDERS, [clubId]);
    return res.rows;
  });
}