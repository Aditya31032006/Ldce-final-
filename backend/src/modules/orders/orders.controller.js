import * as ordersRepo from './orders.repository.js';
import { pool } from '../../config/database.js';
import { createRazorpayOrder } from '../../services/razorpay.service.js';

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

    // If online payment was completed via Razorpay, record it in ledger and confirm order
    const hasOnlinePayment = Boolean(
      req.body.razorpay_payment_id || 
      req.body.payment_method === 'online' || 
      req.body.paymentDetails?.reference
    );

    if (hasOnlinePayment) {
      const payRef = req.body.razorpay_payment_id || req.body.paymentDetails?.reference || 'Razorpay Online';
      const payAmt = Number(req.body.amount || order.total || 0);

      try {
        const payRes = await pool.query(`
          INSERT INTO app.payments (
            club_id, kind, method, status, amount, member_id, shop_order_id, reference, received_by, notes
          ) VALUES (
            $1, 'payment', 'online', 'completed', $2, $3, $4, $5, $6, $7
          ) RETURNING *;
        `, [
          req.clubId,
          payAmt > 0 ? payAmt : (order.total || 0),
          order.member_id || null,
          order.id,
          payRef,
          req.user.id,
          `Online Razorpay payment for shop order ${order.order_no || order.id}`
        ]);

        await pool.query(
          "UPDATE app.shop_orders SET status = 'confirmed', updated_at = NOW() WHERE id = $1 AND club_id = $2",
          [order.id, req.clubId]
        );

        order.status = 'confirmed';
        order.payment_method = 'online';
        order.payment_reference = payRef;
        order.payment = payRes.rows[0];
      } catch (payErr) {
        console.warn('Could not record shop order payment in ledger:', payErr.message);
      }
    }

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

export async function createShopRazorpayOrderController(req, res, next) {
  try {
    const { amount, product_name } = req.body;
    const targetAmount = Number(amount);

    if (!targetAmount || targetAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Valid amount is required' });
    }

    const rzpOrder = await createRazorpayOrder({
      amount: targetAmount,
      receipt: `so_${Date.now().toString().slice(-8)}`,
      notes: {
        clubId: req.clubId,
        userId: req.user?.id || '',
        productName: product_name || 'Shop Purchase',
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

export async function getShopOrdersController(req, res, next) {
  try {
    const isClubStaff = ['owner', 'manager', 'admin', 'shop_staff'].includes(req.user?.role);
    // If user is owner or shop staff, fetch all orders in club; otherwise only fetch customer's orders
    const customerUserId = isClubStaff ? null : req.user?.id;
    const { search, q } = req.query;
    const searchQuery = search || q || null;
    const orders = await ordersRepo.getShopOrders(req.user?.id, req.clubId, customerUserId, searchQuery);
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
    let { status } = req.body;

    // Handle legacy alias
    if (status === 'processing') {
      status = 'confirmed';
    }

    const validStatuses = ['pending', 'confirmed', 'ready', 'completed', 'cancelled'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({ message: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
    }

    const updated = await ordersRepo.updateOrderStatus(req.user.id, req.clubId, id, status);
    return res.status(200).json({ message: "Order status updated successfully", order: updated });
  } catch (error) {
    next(error);
  }
}


