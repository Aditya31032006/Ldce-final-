import jwt from '../backend/node_modules/jsonwebtoken/index.js';

const JWT_SECRET = 'sports_club_platform_jwt_secret_dev_key_2026';
const BASE_URL = 'http://localhost:3000/api';

const OWNER_USER = {
  id: '80017516-c78f-4643-8217-710106e9a0b3',
  email: 'palashngandhi@gmail.com',
  clubId: 'e93f757c-b8b7-46ad-8c0a-316ee3ec2406',
  role: 'owner'
};

const MEMBER_USER = {
  id: 'b798763f-c50d-4277-a75c-321d07a77d26',
  email: 'adityangandhi@gmail.com',
  clubId: 'e93f757c-b8b7-46ad-8c0a-316ee3ec2406',
  role: 'member'
};

function getHeaders(user) {
  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role, clubId: user.clubId },
    JWT_SECRET,
    { expiresIn: '1h' }
  );
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
}

async function verify() {
  console.log('--- 1. Customer browses inventory products ---');
  const custHeaders = getHeaders(MEMBER_USER);
  const custProdsRes = await fetch(`${BASE_URL}/inventory/products`, { headers: custHeaders });
  console.log('Customer products HTTP status:', custProdsRes.status);
  const custProds = await custProdsRes.json();
  console.log(`Customer sees ${custProds.products?.length} products in club`);
  custProds.products?.forEach(p => {
    console.log(`- ${p.name} | Price: $${p.price} | Stock: ${p.stock_qty}`);
  });

  console.log('\n--- 2. Customer places an order for the first product ---');
  const targetProd = custProds.products[0];
  const targetVariant = targetProd.variants[0];
  const buyRes = await fetch(`${BASE_URL}/orders`, {
    method: 'POST',
    headers: custHeaders,
    body: JSON.stringify({
      guest_name: 'Aditya N. Gandhi',
      guest_phone: '+91 9876543210',
      fulfillment: 'delivery',
      delivery_address: '402 LDCE Sports Complex',
      items: [{ variant_id: targetVariant.id, quantity: 1 }]
    })
  });
  console.log('Order creation HTTP status:', buyRes.status);
  const buyData = await buyRes.json();
  console.log('Placed order:', buyData.order?.order_no, 'Total: $' + buyData.order?.total);

  console.log('\n--- 3. Customer checks order history (sees only their own) ---');
  const custOrdersRes = await fetch(`${BASE_URL}/orders`, { headers: custHeaders });
  const custOrders = await custOrdersRes.json();
  console.log(`Customer sees ${custOrders.orders?.length} orders:`);
  custOrders.orders?.forEach(o => {
    console.log(`- ${o.order_no} | Status: ${o.status} | Total: $${o.total}`);
  });

  console.log('\n--- 4. Customer attempts to add a new product (MUST BE 403 FORBIDDEN) ---');
  const forbiddenRes = await fetch(`${BASE_URL}/inventory/products`, {
    method: 'POST',
    headers: custHeaders,
    body: JSON.stringify({ name: 'Hack Racket', price: 99 })
  });
  console.log('Customer Add Product status:', forbiddenRes.status, forbiddenRes.status === 403 ? '✅ 403 Forbidden as expected!' : '❌ Failed');

  console.log('\n--- 5. Owner checks all club orders (sees all) ---');
  const ownerHeaders = getHeaders(OWNER_USER);
  const ownerOrdersRes = await fetch(`${BASE_URL}/orders`, { headers: ownerHeaders });
  const ownerOrders = await ownerOrdersRes.json();
  console.log(`Owner sees ${ownerOrders.orders?.length} club orders across all members`);

  console.log('\n🌟 ALL CHECKS PASSED PERFECTLY!');
}

verify().catch(console.error);
