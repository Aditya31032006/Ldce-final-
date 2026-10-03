import jwt from '../backend/node_modules/jsonwebtoken/index.js';

const JWT_SECRET = 'sports_club_platform_jwt_secret_dev_key_2026';
const BASE_URL = 'http://localhost:3000/api';

const testUsers = [
  {
    email: 'eagleofdarkness31@gmail.com',
    id: '5a8b6306-71f8-4dae-acc7-004e9a94882d',
    role: 'public',
    clubId: 'e93f757c-b8b7-46ad-8c0a-316ee3ec2406'
  },
  {
    email: 'adityangandhi@gmail.com',
    id: 'b798763f-c50d-4277-a75c-321d07a77d26',
    role: 'member',
    clubId: 'e93f757c-b8b7-46ad-8c0a-316ee3ec2406'
  },
  {
    email: 'palashngandhi@gmail.com',
    id: '80017516-c78f-4643-8217-710106e9a0b3',
    role: 'owner',
    clubId: 'e93f757c-b8b7-46ad-8c0a-316ee3ec2406'
  }
];

async function run() {
  // First, get a product variant to order
  const ownerToken = jwt.sign(testUsers[2], JWT_SECRET, { expiresIn: '1h' });
  const pRes = await fetch(`${BASE_URL}/inventory/products`, {
    headers: { 'Authorization': `Bearer ${ownerToken}` }
  });
  const pData = await pRes.json();
  const variantId = pData.products[0].variants[0].id;
  console.log(`Testing with product variant: ${variantId} (${pData.products[0].name})\n`);

  for (const user of testUsers) {
    console.log(`=== Testing POST /api/orders for ${user.email} (${user.role}) ===`);
    const token = jwt.sign(user, JWT_SECRET, { expiresIn: '1h' });

    // Test 1: Delivery order
    const resDelivery = await fetch(`${BASE_URL}/orders`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        guest_name: user.email.split('@')[0],
        guest_phone: '+91 9999988888',
        fulfillment: 'delivery',
        delivery_address: '102 LDCE Complex, Ahmedabad',
        items: [{ variant_id: variantId, quantity: 1 }]
      })
    });
    console.log(`Delivery order HTTP status: ${resDelivery.status}`);
    const dataDelivery = await resDelivery.json();
    if (resDelivery.status === 201) {
      console.log(`✅ Success: Order ${dataDelivery.order?.order_no} created (id: ${dataDelivery.order?.id})`);
    } else {
      console.error(`❌ FAILED:`, dataDelivery);
    }

    // Test 2: Counter pickup order
    const resCounter = await fetch(`${BASE_URL}/orders`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        guest_name: user.email.split('@')[0],
        guest_phone: '+91 9999988888',
        fulfillment: 'counter',
        items: [{ variant_id: variantId, quantity: 1 }]
      })
    });
    console.log(`Counter pickup order HTTP status: ${resCounter.status}`);
    const dataCounter = await resCounter.json();
    if (resCounter.status === 201) {
      console.log(`✅ Success: Order ${dataCounter.order?.order_no} created (id: ${dataCounter.order?.id})\n`);
    } else {
      console.error(`❌ FAILED:`, dataCounter);
    }
  }

  console.log('🎉 ALL USERS TESTED SUCCESSFULLY!');
  process.exit(0);
}

run().catch(console.error);
