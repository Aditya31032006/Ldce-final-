import * as barRepo from './bar.repository.js';

export async function getMenuController(req, res, next) {
  try {
    const activeOnly = (req.user.role === 'member' || req.user.role === 'public') ? true : null;
    const { categoryId } = req.query;
    const menu = await barRepo.getMenu(req.user.id, req.clubId, categoryId, activeOnly);
    return res.status(200).json(menu);
  } catch (error) {
    next(error);
  }
}

export async function createBarOrderController(req, res, next) {
  try {
    const { items, table_id, tab_id, open_new_tab, member_id, guest_name } = req.body;
    
    if (!items || items.length === 0) {
      return res.status(400).json({ message: "Order must have at least one item" });
    }

    const order = await barRepo.createBarOrderTx(req.user.id, req.clubId, req.body, items);
    return res.status(201).json({ message: "Bar order created", order });
  } catch (error) {
    next(error);
  }
}
