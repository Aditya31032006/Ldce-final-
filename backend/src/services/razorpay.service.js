import Razorpay from 'razorpay';
import crypto from 'crypto';
import { config } from '../config/config.js';

const razorpayInstance = new Razorpay({
  key_id: config.RAZORPAY_KEY_ID,
  key_secret: config.RAZORPAY_KEY_SECRET,
});

/**
 * Creates a Razorpay Order
 * @param {Object} options
 * @param {number} options.amount - In INR (rupees)
 * @param {string} [options.currency='INR']
 * @param {string} [options.receipt]
 * @param {Object} [options.notes]
 */
export async function createRazorpayOrder({ amount, currency = 'INR', receipt, notes = {} }) {
  try {
    const numericAmount = Number(amount || 0);
    const amountInPaise = Math.round(numericAmount * 100);

    if (amountInPaise <= 0) {
      throw new Error('Order amount must be greater than zero');
    }

    const options = {
      amount: amountInPaise,
      currency,
      receipt: receipt || `rcpt_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      notes,
    };

    const order = await razorpayInstance.orders.create(options);
    return {
      success: true,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      receipt: order.receipt,
      rawOrder: order,
    };
  } catch (error) {
    console.error('Error creating Razorpay order:', error);
    throw error;
  }
}

/**
 * Verifies Razorpay payment signature
 * @param {Object} verificationData
 * @param {string} verificationData.orderId
 * @param {string} verificationData.paymentId
 * @param {string} verificationData.signature
 * @returns {boolean}
 */
export function verifyRazorpaySignature({ orderId, paymentId, signature }) {
  if (!orderId || !paymentId || !signature) {
    return false;
  }

  const generatedSignature = crypto
    .createHmac('sha256', config.RAZORPAY_KEY_SECRET)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');

  return generatedSignature === signature;
}

export default {
  createRazorpayOrder,
  verifyRazorpaySignature,
  instance: razorpayInstance,
};
