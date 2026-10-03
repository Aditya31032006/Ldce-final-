import * as ordersRepo from './orders.repository.js';

export async function createShopOrderController(req, res, next) {
  try {
    const { items, member_id, guest_name } = req.body;
    
    if (!items || items.length === 0) {
      return res.status(400).json({ message: "Order must have at least one item" });
    }

    if (!member_id && !guest_name && !req.user.id) {
      return res.status(400).json({ message: "Customer identification is required" });
    }

    if (req.user.role === 'member' || req.user.role === 'public') {
      req.body.channel = 'online';
      req.body.status = 'pending';
      if (!req.body.guest_name && req.user.fullName) {
        req.body.guest_name = req.user.fullName;
      }
    } else {
      req.body.channel = req.body.channel || 'pos';
    }

    const order = await ordersRepo.createShopOrder(req.user.id, req.clubId, req.body, items);
    return res.status(201).json({ message: "Order created successfully", order });
  } catch (error) {
    if (error.code === '42501' || error.message?.includes('row-level security policy')) {
      return res.status(403).json({
        message: "You must be an active member of this club to place online orders. Please join the club first."
      });
    }
    next(error);
  }
}

export async function getShopOrdersController(req, res, next) {
  try {
    const isClubStaff = ['owner', 'manager', 'admin', 'shop_staff'].includes(req.user?.role);
    // If user is owner or shop staff, fetch all orders in club; otherwise only fetch customer's orders
    const customerUserId = isClubStaff ? null : req.user?.id;
    const orders = await ordersRepo.getShopOrders(req.user?.id, req.clubId, customerUserId);
    return res.status(200).json({ 
      orders, 
      isClubStaff,
      scope: isClubStaff ? 'all_club_orders' : 'my_orders'
    });
  } catch (error) {
    next(error);
  }
}

export async function updateOrderStatusController(req, res, next) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['pending', 'processing', 'completed', 'cancelled'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({ message: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
    }

    const updated = await ordersRepo.updateOrderStatus(req.user.id, req.clubId, id, status);
    return res.status(200).json({ message: "Order status updated successfully", order: updated });
  } catch (error) {
    next(error);
  }
}


