import * as barRepo from './bar.repository.js';
import { createRazorpayOrder, verifyRazorpaySignature } from '../../services/razorpay.service.js';

export async function getTablesController(req, res, next) {
  try {
    const activeOnly = req.query.active_only === 'true';
    const tables = await barRepo.getTables(req.user?.id, req.clubId, activeOnly ? true : null);
    return res.status(200).json({ success: true, data: tables });
  } catch (error) {
    next(error);
  }
}

export async function createTableController(req, res, next) {
  try {
    const { name, zone, capacity } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, message: 'Table name is required' });
    }
    const table = await barRepo.createTable(req.user.id, req.clubId, { name, zone, capacity });
    return res.status(201).json({ success: true, message: 'Table created', data: table });
  } catch (error) {
    next(error);
  }
}

export async function updateTableStatusController(req, res, next) {
  try {
    const { id } = req.params;
    const { status } = req.body;
    if (!status) {
      return res.status(400).json({ success: false, message: 'Status is required' });
    }
    const table = await barRepo.updateTableStatus(req.user.id, req.clubId, id, status);
    return res.status(200).json({ success: true, message: 'Table status updated', data: table });
  } catch (error) {
    next(error);
  }
}

export async function updateTableController(req, res, next) {
  try {
    const { id } = req.params;
    const { name, zone, capacity, status, is_active } = req.body;
    const table = await barRepo.updateTable(req.user.id, req.clubId, id, {
      name,
      zone,
      capacity: capacity !== undefined ? Number(capacity) : undefined,
      status,
      is_active,
    });
    return res.status(200).json({ success: true, message: 'Table updated successfully', data: table });
  } catch (error) {
    next(error);
  }
}

export async function getMenuController(req, res, next) {
  try {
    const { categoryId, active_only, available_only } = req.query;
    const isMemberOrPublic = req.user?.role === 'member' || !req.user;
    const activeOnly = isMemberOrPublic ? true : (active_only !== 'false');
    const availableOnly = isMemberOrPublic ? true : (available_only === 'true' ? true : null);

    const menu = await barRepo.getMenu(req.user?.id, req.clubId, categoryId || null, activeOnly, availableOnly);
    return res.status(200).json({ success: true, data: menu });
  } catch (error) {
    next(error);
  }
}

export async function createMenuCategoryController(req, res, next) {
  try {
    const { name, station, sort_order } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, message: 'Category name is required' });
    }
    const category = await barRepo.createMenuCategory(req.user.id, req.clubId, { name, station, sort_order });
    return res.status(201).json({ success: true, message: 'Category created', data: category });
  } catch (error) {
    next(error);
  }
}

export async function createMenuItemController(req, res, next) {
  try {
    const { category_id, name, price } = req.body;
    if (!category_id || !name || price === undefined) {
      return res.status(400).json({ success: false, message: 'Category, name, and price are required' });
    }
    const item = await barRepo.createMenuItem(req.user.id, req.clubId, req.body);
    return res.status(201).json({ success: true, message: 'Menu item created', data: item });
  } catch (error) {
    next(error);
  }
}

export async function updateMenuItemController(req, res, next) {
  try {
    const { id } = req.params;
    const item = await barRepo.updateMenuItem(req.user.id, req.clubId, id, req.body);
    return res.status(200).json({ success: true, message: 'Menu item updated', data: item });
  } catch (error) {
    next(error);
  }
}

export async function deleteMenuItemController(req, res, next) {
  try {
    const { id } = req.params;
    const item = await barRepo.deleteMenuItem(req.user.id, req.clubId, id);
    return res.status(200).json({ success: true, message: 'Menu item removed successfully', data: item });
  } catch (error) {
    next(error);
  }
}

export async function getOrdersController(req, res, next) {
  try {
    let memberFilter = req.query.member_id || null;
    if (req.user?.role === 'member') {
      memberFilter = req.query.member_id || req.user.id;
    }
    const filters = {
      status: req.query.status || null,
      table_id: req.query.table_id || null,
      member_id: memberFilter,
      limit: req.query.limit ? parseInt(req.query.limit, 10) : 50,
    };
    const orders = await barRepo.getOrders(req.user?.id, req.clubId, filters);
    return res.status(200).json({ success: true, data: orders });
  } catch (error) {
    next(error);
  }
}

export async function getOrderByIdController(req, res, next) {
  try {
    const { id } = req.params;
    const order = await barRepo.getOrderById(req.user?.id, req.clubId, id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }
    return res.status(200).json({ success: true, data: order });
  } catch (error) {
    next(error);
  }
}

export async function createBarOrderController(req, res, next) {
  try {
    const { items, table_id, tab_id, open_new_tab, charge_to_tab, member_id, guest_name, notes } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Order must have at least one item' });
    }

    const orderData = {
      table_id,
      tab_id,
      open_new_tab,
      charge_to_tab,
      member_id,
      guest_name,
      notes,
    };

    const order = await barRepo.createBarOrderTx(req.user.id, req.clubId, orderData, items);
    return res.status(201).json({ success: true, message: 'Bar order created', data: order });
  } catch (error) {
    next(error);
  }
}

export async function addItemsToOrderController(req, res, next) {
  try {
    const { id } = req.params;
    const { items } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ success: false, message: 'At least one item is required' });
    }

    const order = await barRepo.addItemsToOrderTx(req.user.id, req.clubId, id, items);
    return res.status(200).json({ success: true, message: 'Items added to order', data: order });
  } catch (error) {
    next(error);
  }
}

export async function getKdsController(req, res, next) {
  try {
    const station = req.query.station || null;
    const items = await barRepo.getKdsItems(req.user.id, req.clubId, station);
    return res.status(200).json({ success: true, data: items });
  } catch (error) {
    next(error);
  }
}

export async function updateKdsItemStatusController(req, res, next) {
  try {
    const { itemId } = req.params;
    const { status } = req.body;
    if (!status) {
      return res.status(400).json({ success: false, message: 'Status is required' });
    }
    const item = await barRepo.updateKdsItemStatus(req.user.id, req.clubId, itemId, status);
    return res.status(200).json({ success: true, message: 'KDS status updated', data: item });
  } catch (error) {
    next(error);
  }
}

export async function billOrderController(req, res, next) {
  try {
    const { id } = req.params;
    const order = await barRepo.billOrder(req.user.id, req.clubId, id);
    return res.status(200).json({ success: true, message: 'Order marked as billed', data: order });
  } catch (error) {
    next(error);
  }
}

export async function payAndSettleOrderController(req, res, next) {
  try {
    const { id } = req.params;
    const { method, reference, notes, razorpay_payment_id } = req.body;

    const result = await barRepo.payAndSettleOrder(req.user.id, req.clubId, id, {
      method: method || 'cash',
      reference: reference || razorpay_payment_id,
      notes,
    });

    return res.status(200).json({ success: true, message: 'Order paid successfully', data: result });
  } catch (error) {
    next(error);
  }
}

export async function cancelOrderController(req, res, next) {
  try {
    const { id } = req.params;
    const { reason } = req.body || {};
    const order = await barRepo.cancelOrder(req.user.id, req.clubId, id, reason);
    return res.status(200).json({ success: true, message: 'Order cancelled successfully', data: order });
  } catch (error) {
    next(error);
  }
}

export async function createRazorpayOrderController(req, res, next) {
  try {
    const { order_id, amount } = req.body;

    let targetAmount = amount;
    if (order_id && !targetAmount) {
      const existingOrder = await barRepo.getOrderById(req.user.id, req.clubId, order_id);
      if (!existingOrder) {
        return res.status(404).json({ success: false, message: 'Bar order not found' });
      }
      targetAmount = Number(existingOrder.total);
    }

    if (!targetAmount || targetAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Amount must be greater than zero' });
    }

    const rzpOrder = await createRazorpayOrder({
      amount: targetAmount,
      receipt: `bar_${order_id ? order_id.substring(0, 8) : Date.now()}`,
      notes: {
        clubId: req.clubId,
        orderId: order_id || '',
        userId: req.user.id,
      },
    });

    return res.status(200).json({
      success: true,
      data: {
        orderId: rzpOrder.orderId,
        amount: rzpOrder.amount,
        currency: rzpOrder.currency,
        key: process.env.RAZORPAY_KEY_ID || 'rzp_test_SQOga2rRgYRMaJ',
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function verifyRazorpayPaymentController(req, res, next) {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, order_id } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: 'Missing required Razorpay payment verification parameters',
      });
    }

    const isValid = verifyRazorpaySignature({
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
      signature: razorpay_signature,
    });

    if (!isValid) {
      return res.status(400).json({ success: false, message: 'Invalid payment signature' });
    }

    if (order_id) {
      const settlement = await barRepo.payAndSettleOrder(req.user.id, req.clubId, order_id, {
        method: 'online',
        reference: razorpay_payment_id,
        notes: `Razorpay Payment ID: ${razorpay_payment_id}`,
      });
      return res.status(200).json({
        success: true,
        message: 'Razorpay payment verified and order settled successfully',
        data: settlement,
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Razorpay payment verified successfully',
      data: { paymentId: razorpay_payment_id },
    });
  } catch (error) {
    next(error);
  }
}

export async function getTabsController(req, res, next) {
  try {
    const status = req.query.status || 'open';
    const filterStatus = status === 'all' ? null : status;
    const tabs = await barRepo.getMemberTabs(req.user.id, req.clubId, filterStatus);
    return res.status(200).json({ success: true, data: tabs });
  } catch (error) {
    next(error);
  }
}

export async function settleTabController(req, res, next) {
  try {
    const { id } = req.params;
    const { method, reference } = req.body;
    const tab = await barRepo.settleTabTx(req.user.id, req.clubId, id, {
      method: method || 'cash',
      reference: reference || null,
    });
    return res.status(200).json({ success: true, message: 'Tab settled successfully', data: tab });
  } catch (error) {
    next(error);
  }
}

export async function getDailyClosingController(req, res, next) {
  try {
    const { date } = req.query;
    const closing = await barRepo.getDailyClosing(req.user.id, req.clubId, date || null);
    const summary = closing.summary || {};
    const payload = {
      ...closing,
      orders_count: Number(summary.orders || 0),
      total_sales: Number(summary.net_total || 0),
      gross_sales: Number(summary.gross || 0),
      total_discounts: Number(summary.discounts || 0),
      total_tax: Number(summary.tax || 0),
      by_payment_method: closing.payment_breakdown || [],
    };
    return res.status(200).json({ success: true, data: payload });
  } catch (error) {
    next(error);
  }
}
