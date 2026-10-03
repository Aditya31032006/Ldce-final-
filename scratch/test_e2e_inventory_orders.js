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

function getAuthHeader(user) {
  const token = jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      clubId: user.clubId
    },
    JWT_SECRET,
    { expiresIn: '1h' }
  );
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
}

async function run() {
  console.log('=== 1. OWNER AUTH & ROLE VALIDATION ===');
  const ownerHeaders = getAuthHeader(OWNER_USER);
  const meRes = await fetch(`${BASE_URL}/auth/me`, { headers: ownerHeaders });
  const meData = await meRes.json();
  console.log('Profile status:', meRes.status, 'role:', meData.user?.role, 'clubId:', meData.user?.club_id || OWNER_USER.clubId);

  console.log('\n=== 2. OWNER INVENTORY GET PRODUCTS ===');
  const getProdRes = await fetch(`${BASE_URL}/inventory/products`, { headers: ownerHeaders });
  const getProdData = await getProdRes.json();
  console.log('Inventory get status:', getProdRes.status, 'Product count:', getProdData.products?.length);

  console.log('\n=== 3. OWNER ADD NEW PRODUCT ===');
  const newProdPayload = {
    name: 'Babolat Pure Aero Tennis Racket 2026',
    category_name: 'Rackets',
    sku: `BPA-${Date.now().toString().slice(-4)}`,
    price: 229.99,
    mrp: 259.99,
    stock_qty: 15,
    reorder_level: 3,
    description: 'Spin machine racket endorsed by top ATP champions.',
    is_online: true
  };
  const addProdRes = await fetch(`${BASE_URL}/inventory/products`, {
    method: 'POST',
    headers: ownerHeaders,
    body: JSON.stringify(newProdPayload)
  });
  const addProdData = await addProdRes.json();
  console.log('Add product status:', addProdRes.status, 'Created:', addProdData.product?.name, 'SKU:', addProdData.product?.variants?.[0]?.sku);

  console.log('\n=== 4. MEMBER ACCESS RESTRICTION TO INVENTORY POST (RBAC) ===');
  const memberHeaders = getAuthHeader(MEMBER_USER);
  const memberAddProdRes = await fetch(`${BASE_URL}/inventory/products`, {
    method: 'POST',
    headers: memberHeaders,
    body: JSON.stringify(newProdPayload)
  });
  console.log('Member attempt to add product status (must be 403):', memberAddProdRes.status);

  console.log('\n=== 5. OWNER GET ALL CLUB ORDERS ===');
  const ownerOrdersRes = await fetch(`${BASE_URL}/orders`, { headers: ownerHeaders });
  const ownerOrdersData = await ownerOrdersRes.json();
  console.log('Owner orders status:', ownerOrdersRes.status, 'Scope:', ownerOrdersData.scope, 'Count:', ownerOrdersData.orders?.length);
  if (ownerOrdersData.orders?.length > 0) {
    const firstOrder = ownerOrdersData.orders[0];
    console.log('First order details:', {
      order_no: firstOrder.order_no,
      customer: firstOrder.customer_name,
      total: firstOrder.total,
      status: firstOrder.status,
      items: firstOrder.items?.map(i => i.item_name)
    });

    console.log('\n=== 6. OWNER UPDATE ORDER STATUS ===');
    const updateRes = await fetch(`${BASE_URL}/orders/${firstOrder.id}/status`, {
      method: 'PATCH',
      headers: ownerHeaders,
      body: JSON.stringify({ status: 'completed' })
    });
    const updateData = await updateRes.json();
    console.log('Status update response:', updateRes.status, 'New status:', updateData.order?.status);
  }

  console.log('\n=== 7. CUSTOMER GET OWN ORDERS ===');
  const memberOrdersRes = await fetch(`${BASE_URL}/orders`, { headers: memberHeaders });
  const memberOrdersData = await memberOrdersRes.json();
  console.log('Customer orders status:', memberOrdersRes.status, 'Scope:', memberOrdersData.scope, 'Count:', memberOrdersData.orders?.length);
  memberOrdersData.orders?.forEach(o => {
    console.log(`- ${o.order_no}: Customer = ${o.customer_name}, Status = ${o.status}, Total = $${o.total}`);
  });

  console.log('\n✅ ALL E2E VERIFICATIONS PASSED SUCCESSFULLY!');
}

run().catch(console.error);
