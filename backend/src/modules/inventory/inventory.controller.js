import * as inventoryRepo from './inventory.repository.js';

export async function getProductsController(req, res, next) {
  try {
    const activeOnly = (req.user.role === 'member' || req.user.role === 'public') ? true : null;
    const { search, q } = req.query;
    const searchQuery = search || q || null;
    const products = await inventoryRepo.getProducts(req.user.id, req.clubId, activeOnly, searchQuery);
    return res.status(200).json({ products, clubId: req.clubId });
  } catch (error) {
    next(error);
  }
}

export async function getCategoriesController(req, res, next) {
  try {
    const categories = await inventoryRepo.getProductCategories(req.user.id, req.clubId);
    return res.status(200).json({ categories });
  } catch (error) {
    next(error);
  }
}

export async function createProductController(req, res, next) {
  try {
    const { name, variants } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ message: "Product name is required" });
    }
    const product = await inventoryRepo.createProductTx(req.user.id, req.clubId, req.body, variants);
    return res.status(201).json({ message: "Product created successfully", product });
  } catch (error) {
    next(error);
  }
}

export async function updateProductController(req, res, next) {
  try {
    const { id } = req.params;
    const updated = await inventoryRepo.updateProduct(req.user.id, req.clubId, id, req.body);
    return res.status(200).json({ message: "Product updated successfully", product: updated });
  } catch (error) {
    next(error);
  }
}

export async function deleteProductController(req, res, next) {
  try {
    const { id } = req.params;
    await inventoryRepo.deleteProduct(req.user.id, req.clubId, id);
    return res.status(200).json({ message: "Product deleted successfully" });
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