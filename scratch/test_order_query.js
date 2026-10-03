import * as ordersRepo from '../backend/src/modules/orders/orders.repository.js';
import { pool } from '../backend/src/config/database.js';

async function test() {
  const clubId = 'e93f757c-b8b7-46ad-8c0a-316ee3ec2406';
  const ownerUserId = '80017516-c78f-4643-8217-710106e9a0b3'; // palashngandhi@gmail.com
  const memberUserId = 'b798763f-c50d-4277-a75c-321d07a77d26'; // adityangandhi@gmail.com

  console.log('Testing owner getting all orders...');
  const ownerOrders = await ordersRepo.getShopOrders(ownerUserId, clubId, null);
  console.log('Owner sees orders:', ownerOrders.length);
  if (ownerOrders.length > 0) {
    console.log('Sample owner order:', {
      order_no: ownerOrders[0].order_no,
      customer_name: ownerOrders[0].customer_name,
      total: ownerOrders[0].total,
      items: ownerOrders[0].items
    });
  }

  console.log('Testing member getting own orders...');
  const memberOrders = await ordersRepo.getShopOrders(memberUserId, clubId, memberUserId);
  console.log('Member sees orders:', memberOrders.length);

  console.log('Testing unrelated user seeing orders...');
  const emptyOrders = await ordersRepo.getShopOrders(ownerUserId, clubId, '00000000-0000-0000-0000-000000000000');
  console.log('Unrelated customer sees orders:', emptyOrders.length);

  process.exit(0);
}

test().catch(err => {
  console.error(err);
  process.exit(1);
});
