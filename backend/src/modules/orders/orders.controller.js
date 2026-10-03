import * as ordersRepo from './orders.repository.js';

export async function createShopOrderController(req, res, next) {
  try {
    const { items, member_id, guest_name } = req.body;
    
    if (!items || items.length === 0) {
      return res.status(400).json({ message: "Order must have at least one item" });
    }

    if (!member_id && !guest_name) {
      return res.status(400).json({ message: "Either member_id or guest_name is required" });
    }

    if (req.user.role === 'member') {
      req.body.member_id = req.user.memberId;
      req.body.channel = 'online';
      req.body.status = 'pending';
    } else {
      req.body.channel = req.body.channel || 'pos';
    }

    const order = await ordersRepo.createShopOrder(req.user.id, req.clubId, req.body, items);
    return res.status(201).json({ message: "Order created successfully", order });
  } catch (error) {
    next(error);
  }
}

export async function getShopOrdersController(req, res, next) {
  try {
    const orders = await ordersRepo.getShopOrders(req.user.id, req.clubId);
    return res.status(200).json({ orders });
  } catch (error) {
    next(error);
  }
}
