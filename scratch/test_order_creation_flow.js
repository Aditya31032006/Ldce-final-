import * as ordersRepo from '../backend/src/modules/orders/orders.repository.js';
import * as inventoryRepo from '../backend/src/modules/inventory/inventory.repository.js';

async function test() {
  const clubId = 'e93f757c-b8b7-46ad-8c0a-316ee3ec2406';
  const ownerUserId = '80017516-c78f-4643-8217-710106e9a0b3'; // palashngandhi@gmail.com
  const memberUserId = 'b798763f-c50d-4277-a75c-321d07a77d26'; // adityangandhi@gmail.com

  const products = await inventoryRepo.getProducts(ownerUserId, clubId);
  console.log('Available products:', products.length);
  const variantId = products[0].variants[0].id;

  console.log('Creating order placed by member...');
  const order = await ordersRepo.createShopOrder(memberUserId, clubId, {
    guest_name: 'Aditya N. Gandhi',
    channel: 'online',
    fulfillment: 'delivery',
    delivery_address: 'Flat 402, LDCE Sports Complex',
    status: 'pending'
  }, [
    { variant_id: variantId, quantity: 1 }
  ]);
  console.log('Created order:', order.order_no, 'id:', order.id);

  console.log('\n--- Owner View (All Club Orders) ---');
  const ownerOrders = await ordersRepo.getShopOrders(ownerUserId, clubId, null);
  console.log(`Found ${ownerOrders.length} orders:`);
  ownerOrders.forEach(o => {
    console.log(`Order: ${o.order_no} | Customer: ${o.customer_name} | Total: ${o.total} | Status: ${o.status} | Items: ${JSON.stringify(o.items)}`);
  });

  console.log('\n--- Customer View (Own Orders Only) ---');
  const memberOrders = await ordersRepo.getShopOrders(memberUserId, clubId, memberUserId);
  console.log(`Found ${memberOrders.length} orders:`);
  memberOrders.forEach(o => {
    console.log(`Order: ${o.order_no} | Customer: ${o.customer_name} | Total: ${o.total} | Status: ${o.status}`);
  });

  console.log('\n--- Third Party View (Someone else) ---');
  const someoneElseOrders = await ordersRepo.getShopOrders(memberUserId, clubId, '00000000-0000-0000-0000-000000000000');
  console.log(`Found ${someoneElseOrders.length} orders (must be 0)`);

  process.exit(0);
}

test().catch(err => {
  console.error('Error during test:', err);
  process.exit(1);
});
