/**
 * Dynamically loads the Razorpay checkout script
 * @returns {Promise<boolean>}
 */
export function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      return resolve(true);
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => {
      console.error('Failed to load Razorpay SDK');
      resolve(false);
    };
    document.body.appendChild(script);
  });
}

/**
 * Initiates Razorpay payment popup
 * @param {Object} params
 * @param {string} params.orderId - Razorpay order ID (from backend)
 * @param {number} params.amount - In paise
 * @param {string} [params.currency='INR']
 * @param {string} [params.name='Sports Club']
 * @param {string} [params.description='Payment']
 * @param {Object} [params.prefill]
 * @param {Function} params.onSuccess - Callback with { razorpay_payment_id, razorpay_order_id, razorpay_signature }
 * @param {Function} [params.onDismiss]
 */
export async function openRazorpayCheckout({
  orderId,
  amount,
  currency = 'INR',
  name = 'Sports Club Cafe & Bar',
  description = 'POS & Cafe Order',
  prefill = {},
  onSuccess,
  onDismiss,
}) {
  const loaded = await loadRazorpayScript();
  if (!loaded) {
    throw new Error('Razorpay SDK could not be loaded. Please check your internet connection.');
  }

  const keyId = import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_SQOga2rRgYRMaJ';

  return new Promise((resolve, reject) => {
    const options = {
      key: keyId,
      amount: amount,
      currency: currency,
      name: name,
      description: description,
      order_id: orderId,
      handler: function (response) {
        if (onSuccess) {
          onSuccess(response);
        }
        resolve(response);
      },
      prefill: {
        name: prefill.name || '',
        email: prefill.email || '',
        contact: prefill.phone || prefill.contact || '',
      },
      theme: {
        color: '#1F5C46',
      },
      modal: {
        ondismiss: function () {
          if (onDismiss) onDismiss();
        },
      },
    };

    const rzp = new window.Razorpay(options);
    rzp.on('payment.failed', function (response) {
      console.error('Payment failed:', response.error);
      reject(new Error(response.error.description || 'Payment failed'));
    });
    rzp.open();
  });
}
