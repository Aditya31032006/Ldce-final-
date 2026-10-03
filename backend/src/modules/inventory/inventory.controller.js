import * as inventoryRepo from './inventory.repository.js';

export async function getProductsController(req, res, next) {
  try {
    const activeOnly = (req.user.role === 'member' || req.user.role === 'public') ? true : null;
    const products = await inventoryRepo.getProducts(req.user.id, req.clubId, activeOnly);
    return res.status(200).json({ products });
  } catch (error) {
    next(error);
  }
}

export async function createProductController(req, res, next) {
  try {
    const { name, variants } = req.body;
    if (!name) {
      return res.status(400).json({ message: "Product name is required" });
    }
    if (!variants || variants.length === 0) {
      return res.status(400).json({ message: "At least one variant is required" });
    }
    const product = await inventoryRepo.createProductTx(req.user.id, req.clubId, req.body, variants);
    return res.status(201).json({ message: "Product created", product });
  } catch (error) {
    next(error);
  }
}

export async function getPurchaseOrdersController(req, res, next) {
  try {
    const purchaseOrders = await inventoryRepo.getPurchaseOrders(req.user.id, req.clubId);
    return res.status(200).json({ purchaseOrders });
  } catch (error) { 
    next(error); 
  }
}