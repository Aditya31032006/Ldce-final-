import { pool } from '../config/database.js';

const ELITE_CLUB_ID = '5f87ac28-bbf3-40e6-87bb-8aea85412e48';
const ADI_CLUB_ID = '442751d8-1c64-4080-99b4-2c23b7a32b2e';

const ELITE_OWNER_ID = 'e300bf62-5488-4bae-a7b5-c6db462ad0b5'; // harshilu01@gmail.com
const ADI_OWNER_ID = 'adb02d1a-80e1-4659-9fbb-3e295b9fd514';   // adityangandhi@gmail.com

async function run() {
  const client = await pool.connect();
  console.log('🚀 Starting realistic database seeding for Adi-Club & Elite Club...');

  try {
    await client.query('BEGIN');

    // =========================================================================
    // PART 1: ADI-CLUB COMPLETE SETUP & POPULATION
    // =========================================================================
    console.log('\n--- 1. Setting up Adi-Club (adityangandhi@gmail.com) ---');

    // 1.1 Update Adi-Club Details
    await client.query(`
      UPDATE app.clubs
      SET legal_name = 'Adi Sports & Racquet Club LLP',
          tagline = 'Premier Athletic Sanctuary & Racquet Club',
          description = 'World-class sports and leisure club offering international standard tennis, badminton, pickleball and squash courts with luxury dining, pro equipment and community leagues.',
          city = 'Ahmedabad',
          state = 'Gujarat',
          postal_code = '380015',
          address_line1 = 'Near Sindhu Bhavan Road, Bodakdev',
          brand_color = '#0284c7',
          cover_url = 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=1600&auto=format&fit=crop&q=80',
          logo_url = 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=200&auto=format&fit=crop&q=80',
          status = 'active',
          is_public = true,
          updated_at = NOW()
      WHERE id = $1
    `, [ADI_CLUB_ID]);

    // 1.2 Sports for Adi-Club
    const sportsData = [
      { name: 'Tennis', desc: 'Championship clay & synthetic hard courts', icon: '🎾', order: 1 },
      { name: 'Badminton', desc: 'BWF standard wooden sprung indoor courts', icon: '🏸', order: 2 },
      { name: 'Pickleball', desc: 'Tournament grade outdoor & indoor pickleball courts', icon: '🏓', order: 3 },
      { name: 'Squash', desc: 'Glass-back air-conditioned international squash courts', icon: '🎾', order: 4 },
    ];

    const adiSports = {};
    for (const s of sportsData) {
      const res = await client.query(`
        INSERT INTO app.sports (club_id, name, description, icon, sort_order, is_active)
        VALUES ($1, $2, $3, $4, $5, true)
        ON CONFLICT DO NOTHING
        RETURNING *
      `, [ADI_CLUB_ID, s.name, s.desc, s.icon, s.order]);

      if (res.rows[0]) {
        adiSports[s.name] = res.rows[0].id;
      } else {
        const existing = await client.query(`SELECT id FROM app.sports WHERE club_id = $1 AND name = $2`, [ADI_CLUB_ID, s.name]);
        adiSports[s.name] = existing.rows[0]?.id;
      }
    }
    console.log(`✓ Adi-Club Sports configured: ${Object.keys(adiSports).join(', ')}`);

    // 1.3 Courts for Adi-Club
    const courtsData = [
      { name: 'Centre Court 1 (Tennis)', sport: 'Tennis', surface: 'Clay', is_indoor: false, lighting: true, players: 4, rate: 800, order: 1 },
      { name: 'Grand Court A (Tennis)', sport: 'Tennis', surface: 'Hard Court', is_indoor: false, lighting: true, players: 4, rate: 650, order: 2 },
      { name: 'Teakwood Arena 1 (Badminton)', sport: 'Badminton', surface: 'Teakwood Cushion', is_indoor: true, lighting: true, players: 4, rate: 500, order: 3 },
      { name: 'Teakwood Arena 2 (Badminton)', sport: 'Badminton', surface: 'Teakwood Cushion', is_indoor: true, lighting: true, players: 4, rate: 500, order: 4 },
      { name: 'Pro Arena 1 (Pickleball)', sport: 'Pickleball', surface: 'Polyurethane', is_indoor: true, lighting: true, players: 4, rate: 450, order: 5 },
      { name: 'Glass Back Championship (Squash)', sport: 'Squash', surface: 'Hardwood / Glass', is_indoor: true, lighting: true, players: 2, rate: 400, order: 6 },
    ];

    const adiCourts = [];
    for (const c of courtsData) {
      const sportId = adiSports[c.sport];
      const res = await client.query(`
        INSERT INTO app.courts (club_id, sport_id, name, surface, is_indoor, has_lighting, max_players, sort_order, is_active)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true)
        RETURNING *
      `, [ADI_CLUB_ID, sportId, c.name, c.surface, c.is_indoor, c.lighting, c.players, c.order]);
      
      const court = res.rows[0];
      adiCourts.push({ ...court, rate: c.rate });

      // Add court rate rule in app.court_rates
      await client.query(`
        INSERT INTO app.court_rates (club_id, court_id, price, priority, is_active)
        VALUES ($1, $2, $3, 10, true)
      `, [ADI_CLUB_ID, court.id, c.rate]);

      // Add operating hours for 7 days
      for (let day = 0; day <= 6; day++) {
        await client.query(`
          INSERT INTO app.court_operating_hours (club_id, court_id, weekday, opens_at, closes_at, is_closed)
          VALUES ($1, $2, $3, '06:00:00', '23:00:00', false)
          ON CONFLICT (court_id, weekday) DO NOTHING
        `, [ADI_CLUB_ID, court.id, day]);
      }
    }
    console.log(`✓ Adi-Club Courts created: ${adiCourts.length} courts with full 7-day operating schedules.`);

    // 1.4 Membership Plans for Adi-Club
    const plansData = [
      { name: 'Monthly Athletic Pass', code: 'ADI-M30', desc: '30-day full access to all standard courts with 10% court discount', price: 1999, days: 30, courtDisc: 10, shopDisc: 5, barDisc: 5, order: 1 },
      { name: 'Quarterly Elite All-Access', code: 'ADI-Q90', desc: '90-day multi-sport pass with 20% court discount & advance booking', price: 4999, days: 90, courtDisc: 20, shopDisc: 10, barDisc: 10, order: 2 },
      { name: 'Annual Gold Champion', code: 'ADI-A365', desc: '365-day VIP pass with 30% court discount, free social play & cafe perks', price: 15999, days: 365, courtDisc: 30, shopDisc: 15, barDisc: 15, order: 3 },
    ];

    const adiPlans = [];
    for (const p of plansData) {
      const res = await client.query(`
        INSERT INTO app.plans (
          club_id, name, code, description, price, duration_days,
          court_discount_percent, shop_discount_percent, bar_discount_percent,
          is_public, is_active, sort_order
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true, true, $10)
        RETURNING *
      `, [ADI_CLUB_ID, p.name, p.code, p.desc, p.price, p.days, p.courtDisc, p.shopDisc, p.barDisc, p.order]);
      adiPlans.push(res.rows[0]);
    }
    console.log(`✓ Adi-Club Membership Plans created: ${adiPlans.length}`);

    // 1.5 Users & Members for Adi-Club (16 realistic athlete profiles)
    const membersData = [
      { firstName: 'Rohan', lastName: 'Mehra', email: 'rohan.mehra@gmail.com', phone: '9825111001', gender: 'male', planIdx: 2 },
      { firstName: 'Ananya', lastName: 'Joshi', email: 'ananya.joshi@gmail.com', phone: '9825111002', gender: 'female', planIdx: 1 },
      { firstName: 'Devansh', lastName: 'Shah', email: 'devansh.shah@gmail.com', phone: '9825111003', gender: 'male', planIdx: 1 },
      { firstName: 'Tanvi', lastName: 'Patel', email: 'tanvi.patel@gmail.com', phone: '9825111004', gender: 'female', planIdx: 0 },
      { firstName: 'Siddharth', lastName: 'Nair', email: 'siddharth.nair@gmail.com', phone: '9825111005', gender: 'male', planIdx: 2 },
      { firstName: 'Kavita', lastName: 'Reddy', email: 'kavita.reddy@gmail.com', phone: '9825111006', gender: 'female', planIdx: 1 },
      { firstName: 'Aarav', lastName: 'Singhania', email: 'aarav.singhania@gmail.com', phone: '9825111007', gender: 'male', planIdx: 0 },
      { firstName: 'Meera', lastName: 'Kapadia', email: 'meera.kapadia@gmail.com', phone: '9825111008', gender: 'female', planIdx: 1 },
      { firstName: 'Yash', lastName: 'Trivedi', email: 'yash.trivedi@gmail.com', phone: '9825111009', gender: 'male', planIdx: 0 },
      { firstName: 'Niharika', lastName: 'Roy', email: 'niharika.roy@gmail.com', phone: '9825111010', gender: 'female', planIdx: 2 },
      { firstName: 'Karan', lastName: 'Dave', email: 'karan.dave@gmail.com', phone: '9825111011', gender: 'male', planIdx: 1 },
      { firstName: 'Pooja', lastName: 'Bansal', email: 'pooja.bansal@gmail.com', phone: '9825111012', gender: 'female', planIdx: 0 },
      { firstName: 'Hardik', lastName: 'Panchal', email: 'hardik.panchal@gmail.com', phone: '9825111013', gender: 'male', planIdx: 1 },
      { firstName: 'Shruti', lastName: 'Agrawal', email: 'shruti.agrawal@gmail.com', phone: '9825111014', gender: 'female', planIdx: 2 },
      { firstName: 'Jayesh', lastName: 'Vora', email: 'jayesh.vora@gmail.com', phone: '9825111015', gender: 'male', planIdx: 0 },
      { firstName: 'Riddhi', lastName: 'Parikh', email: 'riddhi.parikh@gmail.com', phone: '9825111016', gender: 'female', planIdx: 1 },
    ];

    let paySeqAdi = 1;
    const adiMembers = [];

    for (let i = 0; i < membersData.length; i++) {
      const m = membersData[i];
      let userId;
      const userRes = await client.query(`SELECT id FROM app.users WHERE email = $1`, [m.email]);
      if (userRes.rows[0]) {
        userId = userRes.rows[0].id;
      } else {
        const fullName = `${m.firstName} ${m.lastName}`;
        const newUser = await client.query(`
          INSERT INTO app.users (email, phone, full_name, is_active, created_at)
          VALUES ($1, $2, $3, true, NOW() - INTERVAL '${30 + i * 5} days')
          RETURNING id
        `, [m.email, m.phone, fullName]);
        userId = newUser.rows[0].id;

        await client.query(`
          INSERT INTO app.user_credentials (user_id, password_hash)
          VALUES ($1, '$2b$10$abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmnopqr')
          ON CONFLICT DO NOTHING
        `, [userId]);
      }

      // Member in app.members (full_name is generated)
      const memberCode = `ADI-M${String(1000 + i)}`;
      const memberRes = await client.query(`
        INSERT INTO app.members (
          club_id, user_id, member_code, first_name, last_name,
          phone, email, gender, city, status, joined_on, created_by
        ) VALUES (
          $1, $2, $3, $4, $5,
          $6, $7, $8, 'Ahmedabad', 'active', CURRENT_DATE - INTERVAL '${25 + i * 4} days', $9
        ) RETURNING *
      `, [
        ADI_CLUB_ID, userId, memberCode,
        m.firstName, m.lastName,
        m.phone, m.email, m.gender, ADI_OWNER_ID
      ]);
      const member = memberRes.rows[0];
      adiMembers.push(member);

      // Assign Plan & Membership
      const plan = adiPlans[m.planIdx];
      const memRes = await client.query(`
        INSERT INTO app.memberships (
          club_id, member_id, plan_id, start_date, end_date,
          status, price_paid, auto_renew, created_by
        ) VALUES (
          $1, $2, $3, CURRENT_DATE - INTERVAL '${10 + i * 2} days',
          CURRENT_DATE + INTERVAL '${plan.duration_days - 10} days',
          'active', $4, true, $5
        ) RETURNING id
      `, [ADI_CLUB_ID, member.id, plan.id, plan.price, ADI_OWNER_ID]);
      const membershipId = memRes.rows[0].id;

      // Payment for Membership (revenue_source is generated)
      const paymentNo = `PAY-${String(paySeqAdi++).padStart(5, '0')}`;
      const method = ['upi', 'card', 'online'][i % 3];
      await client.query(`
        INSERT INTO app.payments (
          club_id, payment_no, kind, method, status, amount,
          member_id, membership_id, received_by,
          received_at, notes, reference
        ) VALUES (
          $1, $2, 'payment', $3, 'completed', $4,
          $5, $6, $7,
          NOW() - INTERVAL '${10 + i * 2} days', 'Membership Activation Fee', 'TXN_MEM_${Date.now()}_${i}'
        )
      `, [ADI_CLUB_ID, paymentNo, method, plan.price, member.id, membershipId, ADI_OWNER_ID]);
    }
    console.log(`✓ Adi-Club Members & Subscriptions seeded: ${adiMembers.length} active athletes with paid plans.`);

    // 1.6 Court Bookings & Reservations (30 bookings: past, today, future)
    console.log('Seeding Adi-Club court bookings and reservations...');
    const bookingSlots = [
      // Past Week Bookings (Completed)
      { courtIdx: 0, daysAgo: 6, hour: 7, dur: 1, memberIdx: 0, status: 'completed' },
      { courtIdx: 1, daysAgo: 6, hour: 17, dur: 1, memberIdx: 1, status: 'completed' },
      { courtIdx: 2, daysAgo: 5, hour: 8, dur: 1, memberIdx: 2, status: 'completed' },
      { courtIdx: 3, daysAgo: 5, hour: 18, dur: 1, memberIdx: 3, status: 'completed' },
      { courtIdx: 4, daysAgo: 4, hour: 9, dur: 1, memberIdx: 4, status: 'completed' },
      { courtIdx: 5, daysAgo: 4, hour: 19, dur: 1, memberIdx: 5, status: 'completed' },
      { courtIdx: 0, daysAgo: 3, hour: 7, dur: 1, memberIdx: 6, status: 'completed' },
      { courtIdx: 1, daysAgo: 3, hour: 16, dur: 1, memberIdx: 7, status: 'completed' },
      { courtIdx: 2, daysAgo: 2, hour: 8, dur: 1, memberIdx: 8, status: 'completed' },
      { courtIdx: 3, daysAgo: 2, hour: 19, dur: 1, memberIdx: 9, status: 'completed' },
      { courtIdx: 4, daysAgo: 1, hour: 10, dur: 1, memberIdx: 10, status: 'completed' },
      { courtIdx: 5, daysAgo: 1, hour: 18, dur: 1, memberIdx: 11, status: 'completed' },

      // Today's Bookings (Confirmed / Completed)
      { courtIdx: 0, daysAgo: 0, hour: 6, dur: 1, memberIdx: 0, status: 'completed' },
      { courtIdx: 0, daysAgo: 0, hour: 8, dur: 1, memberIdx: 1, status: 'completed' },
      { courtIdx: 0, daysAgo: 0, hour: 17, dur: 1, memberIdx: 2, status: 'confirmed' },
      { courtIdx: 0, daysAgo: 0, hour: 19, dur: 1, memberIdx: 3, status: 'confirmed' },
      { courtIdx: 1, daysAgo: 0, hour: 7, dur: 1, memberIdx: 4, status: 'completed' },
      { courtIdx: 1, daysAgo: 0, hour: 16, dur: 1, memberIdx: 5, status: 'confirmed' },
      { courtIdx: 1, daysAgo: 0, hour: 18, dur: 1, memberIdx: 6, status: 'confirmed' },
      { courtIdx: 2, daysAgo: 0, hour: 7, dur: 1, memberIdx: 7, status: 'completed' },
      { courtIdx: 2, daysAgo: 0, hour: 9, dur: 1, memberIdx: 8, status: 'completed' },
      { courtIdx: 2, daysAgo: 0, hour: 17, dur: 1, memberIdx: 9, status: 'confirmed' },
      { courtIdx: 2, daysAgo: 0, hour: 20, dur: 1, memberIdx: 10, status: 'confirmed' },
      { courtIdx: 3, daysAgo: 0, hour: 8, dur: 1, memberIdx: 11, status: 'completed' },
      { courtIdx: 3, daysAgo: 0, hour: 18, dur: 1, memberIdx: 12, status: 'confirmed' },
      { courtIdx: 4, daysAgo: 0, hour: 9, dur: 1, memberIdx: 13, status: 'completed' },
      { courtIdx: 4, daysAgo: 0, hour: 19, dur: 1, memberIdx: 14, status: 'confirmed' },
      { courtIdx: 5, daysAgo: 0, hour: 18, dur: 1, memberIdx: 15, status: 'confirmed' },

      // Upcoming Days (Tomorrow & Day After)
      { courtIdx: 0, daysAgo: -1, hour: 7, dur: 1, memberIdx: 0, status: 'confirmed' },
      { courtIdx: 1, daysAgo: -1, hour: 17, dur: 1, memberIdx: 1, status: 'confirmed' },
      { courtIdx: 2, daysAgo: -1, hour: 8, dur: 1, memberIdx: 2, status: 'confirmed' },
      { courtIdx: 3, daysAgo: -1, hour: 18, dur: 1, memberIdx: 3, status: 'confirmed' },
      { courtIdx: 4, daysAgo: -2, hour: 10, dur: 1, memberIdx: 4, status: 'confirmed' },
      { courtIdx: 5, daysAgo: -2, hour: 19, dur: 1, memberIdx: 5, status: 'confirmed' },
    ];

    for (let i = 0; i < bookingSlots.length; i++) {
      const bs = bookingSlots[i];
      const court = adiCourts[bs.courtIdx];
      const member = adiMembers[bs.memberIdx];

      const start = new Date();
      start.setDate(start.getDate() - bs.daysAgo);
      start.setHours(bs.hour, 0, 0, 0);

      const end = new Date(start);
      end.setHours(start.getHours() + bs.dur);

      const resvRes = await client.query(`
        INSERT INTO app.court_reservations (club_id, court_id, start_at, end_at, kind, status)
        VALUES ($1, $2, $3, $4, 'booking', 'active')
        RETURNING id
      `, [ADI_CLUB_ID, court.id, start.toISOString(), end.toISOString()]);
      const resvId = resvRes.rows[0].id;

      const rate = Number(court.rate || 500);
      const bookRes = await client.query(`
        INSERT INTO app.bookings (
          club_id, reservation_id, member_id, channel, status, created_by,
          base_price, total_amount, created_at
        ) VALUES (
          $1, $2, $3, 'online', $4, $5,
          $6, $6, $7
        ) RETURNING id
      `, [ADI_CLUB_ID, resvId, member.id, bs.status, ADI_OWNER_ID, rate, start.toISOString()]);
      const bookingId = bookRes.rows[0].id;

      // Payment for booking (revenue_source generated automatically)
      const payNo = `PAY-${String(paySeqAdi++).padStart(5, '0')}`;
      const method = ['upi', 'card', 'cash', 'online'][i % 4];
      await client.query(`
        INSERT INTO app.payments (
          club_id, payment_no, kind, method, status, amount,
          member_id, booking_id, received_by,
          received_at, notes, reference
        ) VALUES (
          $1, $2, 'payment', $3, 'completed', $4,
          $5, $6, $7,
          $8, 'Court Reservation Settlement', 'TXN_COURT_${Date.now()}_${i}'
        )
      `, [ADI_CLUB_ID, payNo, method, rate, member.id, bookingId, ADI_OWNER_ID, start.toISOString()]);
    }
    console.log(`✓ Adi-Club Bookings & Court Revenue seeded: ${bookingSlots.length} reservations with payments.`);

    // 1.7 Cafe & Bar (Menu, Orders & Items)
    console.log('Seeding Adi-Club Cafe & Bar Outlets...');
    const barCats = [
      { name: 'Specialty Beverages & Coffee', station: 'bar', order: 1 },
      { name: 'Protein Smoothies & Wellness', station: 'bar', order: 2 },
      { name: 'Clubhouse Gourmet Bowls & Bites', station: 'kitchen', order: 3 },
    ];
    const adiBarCats = [];
    for (const bc of barCats) {
      const res = await client.query(`
        INSERT INTO app.menu_categories (club_id, name, station, sort_order, is_active)
        VALUES ($1, $2, $3, $4, true)
        RETURNING *
      `, [ADI_CLUB_ID, bc.name, bc.station, bc.order]);
      adiBarCats.push(res.rows[0]);
    }

    const menuItemsData = [
      { catIdx: 0, name: 'Nitro Cold Brew Espresso', price: 180, station: 'bar', veg: true, prep: 4 },
      { catIdx: 0, name: 'Matcha Lemon Energizer', price: 210, station: 'bar', veg: true, prep: 5 },
      { catIdx: 0, name: 'Electrolyte Coconut Cooler', price: 140, station: 'bar', veg: true, prep: 3 },
      { catIdx: 1, name: 'Whey Protein Shake (Double Cocoa)', price: 260, station: 'bar', veg: true, prep: 6 },
      { catIdx: 1, name: 'Peanut Butter Banana Recovery Smoothie', price: 240, station: 'bar', veg: true, prep: 5 },
      { catIdx: 2, name: 'Avocado & Halloumi Sourdough Toast', price: 290, station: 'kitchen', veg: true, prep: 12 },
      { catIdx: 2, name: 'Grilled Herb Chicken Quinoa Bowl', price: 350, station: 'kitchen', veg: false, prep: 15 },
      { catIdx: 2, name: 'Paneer Tikka Protein Wrap', price: 270, station: 'kitchen', veg: true, prep: 10 },
      { catIdx: 2, name: 'Artisan Woodfired Margherita Flatbread', price: 340, station: 'kitchen', veg: true, prep: 14 },
    ];

    const adiMenuItems = [];
    for (const mi of menuItemsData) {
      const cat = adiBarCats[mi.catIdx];
      const res = await client.query(`
        INSERT INTO app.menu_items (
          club_id, category_id, name, price, station, is_veg, prep_minutes, is_available, is_active
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, true, true)
        RETURNING *
      `, [ADI_CLUB_ID, cat.id, mi.name, mi.price, mi.station, mi.veg, mi.prep]);
      adiMenuItems.push(res.rows[0]);
    }

    // 16 Bar Orders with line items and payments
    let barOrderSeq = 1;
    for (let i = 0; i < 16; i++) {
      const member = adiMembers[i % adiMembers.length];
      const orderNo = `BAR-${String(barOrderSeq++).padStart(5, '0')}`;
      const item1 = adiMenuItems[i % adiMenuItems.length];
      const item2 = adiMenuItems[(i + 3) % adiMenuItems.length];
      const total = Number(item1.price) + Number(item2.price);

      const daysAgo = i < 6 ? i : (i < 12 ? 0 : 1);
      const orderDate = new Date();
      orderDate.setDate(orderDate.getDate() - daysAgo);
      orderDate.setHours(10 + (i % 10), 30, 0, 0);

      const orderRes = await client.query(`
        INSERT INTO app.bar_orders (
          club_id, order_no, member_id, guest_name, status,
          subtotal, total, opened_by, opened_at, closed_at, created_at
        ) VALUES (
          $1, $2, $3, $4, 'paid',
          $5, $5, $6, $7, $7, $7
        ) RETURNING id
      `, [ADI_CLUB_ID, orderNo, member.id, `${member.first_name} ${member.last_name}`, total, ADI_OWNER_ID, orderDate.toISOString()]);
      const orderId = orderRes.rows[0].id;

      // Items (line_subtotal, line_total, discount_amount, tax_amount are generated)
      for (const itm of [item1, item2]) {
        await client.query(`
          INSERT INTO app.bar_order_items (
            club_id, order_id, menu_item_id, item_name, station, quantity,
            unit_price, kds_status, added_by, created_at
          ) VALUES (
            $1, $2, $3, $4, $5, 1,
            $6, 'served', $7, $8
          )
        `, [ADI_CLUB_ID, orderId, itm.id, itm.name, itm.station, itm.price, ADI_OWNER_ID, orderDate.toISOString()]);
      }

      // Payment for Bar Order
      const payNo = `PAY-${String(paySeqAdi++).padStart(5, '0')}`;
      const method = ['upi', 'card', 'cash'][i % 3];
      await client.query(`
        INSERT INTO app.payments (
          club_id, payment_no, kind, method, status, amount,
          member_id, bar_order_id, received_by,
          received_at, notes, reference
        ) VALUES (
          $1, $2, 'payment', $3, 'completed', $4,
          $5, $6, $7,
          $8, 'Bar & Cafe Bill Settlement', 'TXN_BAR_${Date.now()}_${i}'
        )
      `, [ADI_CLUB_ID, payNo, method, total, member.id, orderId, ADI_OWNER_ID, orderDate.toISOString()]);
    }
    console.log(`✓ Adi-Club Cafe & Bar Orders seeded: 16 orders with payments.`);

    // 1.8 Pro Shop Categories, Products & Orders
    console.log('Seeding Adi-Club Pro Shop inventory & orders...');
    const shopCats = [
      { name: 'Rackets & Paddles', order: 1 },
      { name: 'Apparel & Footwear', order: 2 },
      { name: 'Balls & Accessories', order: 3 },
    ];
    const adiShopCats = [];
    for (const sc of shopCats) {
      const res = await client.query(`
        INSERT INTO app.product_categories (club_id, name, sort_order, is_active)
        VALUES ($1, $2, $3, true)
        RETURNING *
      `, [ADI_CLUB_ID, sc.name, sc.order]);
      adiShopCats.push(res.rows[0]);
    }

    const proShopData = [
      { catIdx: 0, name: 'Yonex Astrox 88D Pro Badminton Racket', price: 9499, sku: 'ADI-RKT-YNX', stock: 15 },
      { catIdx: 0, name: 'Wilson Clash 100 Pro Tennis Racket', price: 14999, sku: 'ADI-RKT-WLS', stock: 10 },
      { catIdx: 0, name: 'Selkirk Vanguard 2.0 Pickleball Paddle', price: 5499, sku: 'ADI-PDL-SLK', stock: 20 },
      { catIdx: 1, name: 'Adi-Club Dry-Fit Performance Athletic Tee', price: 1299, sku: 'ADI-APP-TEE', stock: 45 },
      { catIdx: 2, name: 'Wilson US Open Championship Tennis Balls (3-Pack)', price: 650, sku: 'ADI-BAL-WLS', stock: 60 },
      { catIdx: 2, name: 'Yonex Aerosensa 30 Feather Shuttlecocks (Tube of 12)', price: 1850, sku: 'ADI-SHT-YNX', stock: 35 },
      { catIdx: 2, name: 'Tourna Grip Original Overgrip (Pack of 3)', price: 450, sku: 'ADI-ACC-TRN', stock: 80 },
    ];

    const adiProducts = [];
    for (const p of proShopData) {
      const cat = adiShopCats[p.catIdx];
      const prodRes = await client.query(`
        INSERT INTO app.products (club_id, category_id, name, is_online, is_active)
        VALUES ($1, $2, $3, true, true)
        RETURNING *
      `, [ADI_CLUB_ID, cat.id, p.name]);
      const prod = prodRes.rows[0];

      const varRes = await client.query(`
        INSERT INTO app.product_variants (
          club_id, product_id, sku, price, stock_qty, reorder_level, is_active
        ) VALUES ($1, $2, $3, $4, $5, 5, true)
        RETURNING *
      `, [ADI_CLUB_ID, prod.id, p.sku, p.price, p.stock]);
      adiProducts.push({ ...prod, variant_id: varRes.rows[0].id, price: p.price });
    }

    // 10 Pro Shop Orders with items and payments
    let shopOrderSeq = 1;
    for (let i = 0; i < 10; i++) {
      const member = adiMembers[i % adiMembers.length];
      const orderNo = `SHP-${String(shopOrderSeq++).padStart(5, '0')}`;
      const prod = adiProducts[i % adiProducts.length];
      const qty = (i % 2) + 1;
      const total = Number(prod.price) * qty;

      const daysAgo = (i % 5);
      const orderDate = new Date();
      orderDate.setDate(orderDate.getDate() - daysAgo);

      const orderRes = await client.query(`
        INSERT INTO app.shop_orders (
          club_id, order_no, member_id, guest_name, channel, fulfillment, status,
          subtotal, total, placed_at, completed_at, created_by, created_at
        ) VALUES (
          $1, $2, $3, $4, 'pos', 'counter', 'completed',
          $5, $5, $6, $6, $7, $6
        ) RETURNING id
      `, [ADI_CLUB_ID, orderNo, member.id, `${member.first_name} ${member.last_name}`, total, orderDate.toISOString(), ADI_OWNER_ID]);
      const orderId = orderRes.rows[0].id;

      // shop_order_items (line totals generated)
      await client.query(`
        INSERT INTO app.shop_order_items (
          club_id, order_id, variant_id, item_name, quantity, unit_price
        ) VALUES ($1, $2, $3, $4, $5, $6)
      `, [ADI_CLUB_ID, orderId, prod.variant_id, prod.name, qty, prod.price]);

      // Payment for shop order
      const payNo = `PAY-${String(paySeqAdi++).padStart(5, '0')}`;
      const method = ['card', 'upi', 'cash'][i % 3];
      await client.query(`
        INSERT INTO app.payments (
          club_id, payment_no, kind, method, status, amount,
          member_id, shop_order_id, received_by,
          received_at, notes, reference
        ) VALUES (
          $1, $2, 'payment', $3, 'completed', $4,
          $5, $6, $7,
          $8, 'Pro Shop Retail Sale', 'TXN_SHP_${Date.now()}_${i}'
        )
      `, [ADI_CLUB_ID, payNo, method, total, member.id, orderId, ADI_OWNER_ID, orderDate.toISOString()]);
    }
    console.log(`✓ Adi-Club Pro Shop Orders seeded: 10 orders with inventory and payments.`);

    // 1.9 Staff & Employees for Adi-Club
    const staffData = [
      { code: 'EMP-A101', name: 'Chirag Mehta', phone: '9825900001', email: 'chirag.coach@adiclub.com', role: 'Head Tennis Pro & Academy Director', dept: 'Athletics & Coaching', salary: 70000 },
      { code: 'EMP-A102', name: 'Sneha Kothari', phone: '9825900002', email: 'sneha.frontdesk@adiclub.com', role: 'Head of Member Relations & Front Desk', dept: 'Member Services', salary: 38000 },
      { code: 'EMP-A103', name: 'Amit Rathod', phone: '9825900003', email: 'amit.cafe@adiclub.com', role: 'Lead Barista & Food & Beverage Manager', dept: 'Hospitality & Dining', salary: 35000 },
      { code: 'EMP-A104', name: 'Ramesh Solanki', phone: '9825900004', email: 'ramesh.ops@adiclub.com', role: 'Senior Facilities & Court Operations Tech', dept: 'Facilities Management', salary: 30000 },
      { code: 'EMP-A105', name: 'Priya Gandhi', phone: '9825900005', email: 'priya.gandhi@adiclub.com', role: 'General Operations Director', dept: 'Executive Management', salary: 60000 },
    ];

    for (const st of staffData) {
      await client.query(`
        INSERT INTO app.employees (
          club_id, employee_code, full_name, phone, email,
          designation, department, hired_on, base_salary, is_active
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_DATE - INTERVAL '180 days', $8, true)
      `, [ADI_CLUB_ID, st.code, st.name, st.phone, st.email, st.role, st.dept, st.salary]);
    }
    console.log(`✓ Adi-Club Staff: 5 departments staffed.`);


    // =========================================================================
    // PART 2: ELITE CLUB EXPANSION & HEAVY TRAFFIC SEEDING
    // =========================================================================
    console.log('\n--- 2. Enhancing Elite Club (harshilu01@gmail.com) ---');

    // 2.1 Additional Sports for Elite Club (Pickleball & Squash)
    const eliteNewSports = [
      { name: 'Pickleball', desc: 'Fast-paced paddle sport on cushioned tournament courts', icon: '🏓', order: 3 },
      { name: 'Squash', desc: 'Air-conditioned international glass-back courts', icon: 'zap', order: 4 },
    ];
    const eliteSportsMap = {};
    const existingEliteSports = await client.query(`SELECT id, name FROM app.sports WHERE club_id = $1`, [ELITE_CLUB_ID]);
    existingEliteSports.rows.forEach(r => { eliteSportsMap[r.name] = r.id; });

    for (const ns of eliteNewSports) {
      if (!eliteSportsMap[ns.name]) {
        const res = await client.query(`
          INSERT INTO app.sports (club_id, name, description, icon, sort_order, is_active)
          VALUES ($1, $2, $3, $4, $5, true)
          RETURNING *
        `, [ELITE_CLUB_ID, ns.name, ns.desc, ns.icon, ns.order]);
        eliteSportsMap[ns.name] = res.rows[0].id;
      }
    }

    // 2.2 Additional Courts for Elite Club
    const existingEliteCourts = await client.query(`SELECT id, name FROM app.courts WHERE club_id = $1`, [ELITE_CLUB_ID]);
    const eliteCourts = [...existingEliteCourts.rows];

    if (eliteSportsMap['Pickleball']) {
      const pCourt = await client.query(`
        INSERT INTO app.courts (club_id, sport_id, name, surface, is_indoor, has_lighting, max_players, sort_order, is_active)
        VALUES ($1, $2, 'Elite Pickleball Arena 1', 'Cushioned Acrylic', true, true, 4, 5, true)
        RETURNING *
      `, [ELITE_CLUB_ID, eliteSportsMap['Pickleball']]);
      eliteCourts.push(pCourt.rows[0]);

      for (let day = 0; day <= 6; day++) {
        await client.query(`
          INSERT INTO app.court_operating_hours (club_id, court_id, weekday, opens_at, closes_at, is_closed)
          VALUES ($1, $2, $3, '06:00:00', '23:00:00', false)
          ON CONFLICT (court_id, weekday) DO NOTHING
        `, [ELITE_CLUB_ID, pCourt.rows[0].id, day]);
      }
    }

    if (eliteSportsMap['Squash']) {
      const sCourt = await client.query(`
        INSERT INTO app.courts (club_id, sport_id, name, surface, is_indoor, has_lighting, max_players, sort_order, is_active)
        VALUES ($1, $2, 'Glass Back Squash Arena', 'Hardwood / Glass', true, true, 2, 6, true)
        RETURNING *
      `, [ELITE_CLUB_ID, eliteSportsMap['Squash']]);
      eliteCourts.push(sCourt.rows[0]);

      for (let day = 0; day <= 6; day++) {
        await client.query(`
          INSERT INTO app.court_operating_hours (club_id, court_id, weekday, opens_at, closes_at, is_closed)
          VALUES ($1, $2, $3, '06:00:00', '23:00:00', false)
          ON CONFLICT (court_id, weekday) DO NOTHING
        `, [ELITE_CLUB_ID, sCourt.rows[0].id, day]);
      }
    }
    console.log(`✓ Elite Club Courts now active: ${eliteCourts.length}`);

    // 2.3 Additional Realistic Members for Elite Club (15 new members)
    const eliteNewMembersData = [
      { firstName: 'Kunal', lastName: 'Singhania', email: 'kunal.singhania@gmail.com', phone: '9825222001', gender: 'male' },
      { firstName: 'Radhika', lastName: 'Desai', email: 'radhika.desai@gmail.com', phone: '9825222002', gender: 'female' },
      { firstName: 'Manish', lastName: 'Choksi', email: 'manish.choksi@gmail.com', phone: '9825222003', gender: 'male' },
      { firstName: 'Simran', lastName: 'Bajaj', email: 'simran.bajaj@gmail.com', phone: '9825222004', gender: 'female' },
      { firstName: 'Arjun', lastName: 'Sheth', email: 'arjun.sheth@gmail.com', phone: '9825222005', gender: 'male' },
      { firstName: 'Ritika', lastName: 'Somani', email: 'ritika.somani@gmail.com', phone: '9825222006', gender: 'female' },
      { firstName: 'Bhavin', lastName: 'Shah', email: 'bhavin.shah@gmail.com', phone: '9825222007', gender: 'male' },
      { firstName: 'Dipali', lastName: 'Thaker', email: 'dipali.thaker@gmail.com', phone: '9825222008', gender: 'female' },
      { firstName: 'Pranav', lastName: 'Mahajan', email: 'pranav.mahajan@gmail.com', phone: '9825222009', gender: 'male' },
      { firstName: 'Isha', lastName: 'Merchant', email: 'isha.merchant@gmail.com', phone: '9825222010', gender: 'female' },
      { firstName: 'Tapan', lastName: 'Goswami', email: 'tapan.goswami@gmail.com', phone: '9825222011', gender: 'male' },
      { firstName: 'Shraddha', lastName: 'Vora', email: 'shraddha.vora@gmail.com', phone: '9825222012', gender: 'female' },
      { firstName: 'Parthiv', lastName: 'Patel', email: 'parthiv.cricket@gmail.com', phone: '9825222013', gender: 'male' },
      { firstName: 'Alka', lastName: 'Lakhani', email: 'alka.lakhani@gmail.com', phone: '9825222014', gender: 'female' },
      { firstName: 'Saurabh', lastName: 'Jani', email: 'saurabh.jani@gmail.com', phone: '9825222015', gender: 'male' },
    ];

    const elitePlans = await client.query(`SELECT id, price, duration_days FROM app.plans WHERE club_id = $1`, [ELITE_CLUB_ID]);
    const plansList = elitePlans.rows;

    let paySeqElite = 10;
    const allEliteMembers = [];
    const newEliteMembers = [];
    const existingMems = await client.query(`SELECT id, first_name, last_name, email FROM app.members WHERE club_id = $1`, [ELITE_CLUB_ID]);
    allEliteMembers.push(...existingMems.rows);

    for (let i = 0; i < eliteNewMembersData.length; i++) {
      const m = eliteNewMembersData[i];
      let userId;
      const userRes = await client.query(`SELECT id FROM app.users WHERE email = $1`, [m.email]);
      if (userRes.rows[0]) {
        userId = userRes.rows[0].id;
      } else {
        const fullName = `${m.firstName} ${m.lastName}`;
        const newUser = await client.query(`
          INSERT INTO app.users (email, phone, full_name, is_active, created_at)
          VALUES ($1, $2, $3, true, NOW() - INTERVAL '${40 + i * 3} days')
          RETURNING id
        `, [m.email, m.phone, fullName]);
        userId = newUser.rows[0].id;

        await client.query(`
          INSERT INTO app.user_credentials (user_id, password_hash)
          VALUES ($1, '$2b$10$abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmnopqr')
          ON CONFLICT DO NOTHING
        `, [userId]);
      }

      const memberCode = `ELT-M${String(2000 + i)}`;
      const memberRes = await client.query(`
        INSERT INTO app.members (
          club_id, user_id, member_code, first_name, last_name,
          phone, email, gender, city, status, joined_on, created_by
        ) VALUES (
          $1, $2, $3, $4, $5,
          $6, $7, $8, 'Ahmedabad', 'active', CURRENT_DATE - INTERVAL '${35 + i * 3} days', $9
        ) RETURNING *
      `, [
        ELITE_CLUB_ID, userId, memberCode,
        m.firstName, m.lastName,
        m.phone, m.email, m.gender, ELITE_OWNER_ID
      ]);
      const member = memberRes.rows[0];
      allEliteMembers.push(member);
      newEliteMembers.push(member);

      // Membership & payment
      if (plansList.length > 0) {
        const plan = plansList[i % plansList.length];
        const memRes = await client.query(`
          INSERT INTO app.memberships (
            club_id, member_id, plan_id, start_date, end_date,
            status, price_paid, auto_renew, created_by
          ) VALUES (
            $1, $2, $3, CURRENT_DATE - INTERVAL '${15 + i} days',
            CURRENT_DATE + INTERVAL '${plan.duration_days - 15} days',
            'active', $4, true, $5
          ) RETURNING id
        `, [ELITE_CLUB_ID, member.id, plan.id, plan.price, ELITE_OWNER_ID]);
        const membershipId = memRes.rows[0].id;

        const paymentNo = `PAY-${String(paySeqElite++).padStart(5, '0')}`;
        const method = ['upi', 'card', 'online'][i % 3];
        await client.query(`
          INSERT INTO app.payments (
            club_id, payment_no, kind, method, status, amount,
            member_id, membership_id, received_by,
            received_at, notes, reference
          ) VALUES (
            $1, $2, 'payment', $3, 'completed', $4,
            $5, $6, $7,
            NOW() - INTERVAL '${15 + i} days', 'Elite Membership Pass Settlement', 'TXN_ELT_${Date.now()}_${i}'
          )
        `, [ELITE_CLUB_ID, paymentNo, method, plan.price, member.id, membershipId, ELITE_OWNER_ID]);
      }
    }
    console.log(`✓ Elite Club Members: now ${allEliteMembers.length} active registered athletes.`);

    // 2.4 Additional Court Bookings for Elite Club (30+ bookings)
    console.log('Seeding additional bookings for Elite Club...');
    const eliteBookingSlots = [
      // Past days (days: 5, 4, 3, 2, 1)
      { cIdx: 0, days: 5, hr: 7, st: 'completed', mIdx: 0 },
      { cIdx: 1, days: 5, hr: 8, st: 'completed', mIdx: 1 },
      { cIdx: 2, days: 4, hr: 18, st: 'completed', mIdx: 2 },
      { cIdx: 3, days: 4, hr: 19, st: 'completed', mIdx: 3 },
      { cIdx: 0, days: 3, hr: 6, st: 'completed', mIdx: 4 },
      { cIdx: 1, days: 3, hr: 17, st: 'completed', mIdx: 5 },
      { cIdx: 2, days: 2, hr: 7, st: 'completed', mIdx: 6 },
      { cIdx: 3, days: 2, hr: 20, st: 'completed', mIdx: 7 },
      { cIdx: 0, days: 1, hr: 9, st: 'completed', mIdx: 8 },
      { cIdx: 1, days: 1, hr: 16, st: 'completed', mIdx: 9 },
      { cIdx: 2, days: 1, hr: 18, st: 'completed', mIdx: 10 },
      { cIdx: 3, days: 1, hr: 19, st: 'completed', mIdx: 11 },

      // Today (days: 0) - each booking has a unique member index
      { cIdx: 0, days: 0, hr: 7, st: 'completed', mIdx: 0 },
      { cIdx: 0, days: 0, hr: 9, st: 'completed', mIdx: 1 },
      { cIdx: 0, days: 0, hr: 17, st: 'confirmed', mIdx: 2 },
      { cIdx: 0, days: 0, hr: 19, st: 'confirmed', mIdx: 3 },
      { cIdx: 1, days: 0, hr: 8, st: 'completed', mIdx: 4 },
      { cIdx: 1, days: 0, hr: 18, st: 'confirmed', mIdx: 5 },
      { cIdx: 2, days: 0, hr: 6, st: 'completed', mIdx: 6 },
      { cIdx: 2, days: 0, hr: 8, st: 'completed', mIdx: 7 },
      { cIdx: 2, days: 0, hr: 17, st: 'confirmed', mIdx: 8 },
      { cIdx: 2, days: 0, hr: 20, st: 'confirmed', mIdx: 9 },
      { cIdx: 3, days: 0, hr: 7, st: 'completed', mIdx: 10 },
      { cIdx: 3, days: 0, hr: 19, st: 'confirmed', mIdx: 11 },

      // Tomorrow & Day After (each slot has distinct member index)
      { cIdx: 0, days: -1, hr: 8, st: 'confirmed', mIdx: 0 },
      { cIdx: 1, days: -1, hr: 17, st: 'confirmed', mIdx: 1 },
      { cIdx: 2, days: -1, hr: 7, st: 'confirmed', mIdx: 2 },
      { cIdx: 3, days: -1, hr: 18, st: 'confirmed', mIdx: 3 },
      { cIdx: 0, days: -2, hr: 9, st: 'confirmed', mIdx: 4 },
      { cIdx: 1, days: -2, hr: 19, st: 'confirmed', mIdx: 5 },
    ];

    for (let i = 0; i < eliteBookingSlots.length; i++) {
      const bs = eliteBookingSlots[i];
      const court = eliteCourts[bs.cIdx % eliteCourts.length];
      const member = newEliteMembers[bs.mIdx % newEliteMembers.length];

      const start = new Date();
      start.setDate(start.getDate() - bs.days);
      start.setHours(bs.hr, 0, 0, 0);

      const end = new Date(start);
      end.setHours(start.getHours() + 1);

      // Check if overlapping reservation already exists
      const overlap = await client.query(`
        SELECT id FROM app.court_reservations
        WHERE court_id = $1 AND status = 'active'
          AND tstzrange(start_at, end_at, '[)') && tstzrange($2::timestamptz, $3::timestamptz, '[)')
      `, [court.id, start.toISOString(), end.toISOString()]);

      if (overlap.rows.length === 0) {
        const resvRes = await client.query(`
          INSERT INTO app.court_reservations (club_id, court_id, start_at, end_at, kind, status)
          VALUES ($1, $2, $3, $4, 'booking', 'active')
          RETURNING id
        `, [ELITE_CLUB_ID, court.id, start.toISOString(), end.toISOString()]);
        const resvId = resvRes.rows[0].id;

        const rate = 500;
        const bookRes = await client.query(`
          INSERT INTO app.bookings (
            club_id, reservation_id, member_id, channel, status, created_by,
            base_price, total_amount, created_at
          ) VALUES ($1, $2, $3, 'online', $4, $5, $6, $6, $7)
          RETURNING id
        `, [ELITE_CLUB_ID, resvId, member.id, bs.st, ELITE_OWNER_ID, rate, start.toISOString()]);
        const bookingId = bookRes.rows[0].id;

        const payNo = `PAY-${String(paySeqElite++).padStart(5, '0')}`;
        const method = ['upi', 'card', 'online', 'cash'][i % 4];
        await client.query(`
          INSERT INTO app.payments (
            club_id, payment_no, kind, method, status, amount,
            member_id, booking_id, received_by,
            received_at, notes, reference
          ) VALUES (
            $1, $2, 'payment', $3, 'completed', $4,
            $5, $6, $7,
            $8, 'Court Rental Booking Fee', 'TXN_ELT_CRT_${Date.now()}_${i}'
          )
        `, [ELITE_CLUB_ID, payNo, method, rate, member.id, bookingId, ELITE_OWNER_ID, start.toISOString()]);
      }
    }
    console.log(`✓ Elite Club: Added high-traffic bookings and court revenue.`);

    // 2.5 Additional Cafe & Bar Orders for Elite Club
    const eliteMenuItems = await client.query(`SELECT id, name, price, station FROM app.menu_items WHERE club_id = $1`, [ELITE_CLUB_ID]);
    if (eliteMenuItems.rows.length > 0) {
      let eliteBarSeq = 20;
      for (let i = 0; i < 15; i++) {
        const member = allEliteMembers[i % allEliteMembers.length];
        const orderNo = `BAR-${String(eliteBarSeq++).padStart(5, '0')}`;
        const item1 = eliteMenuItems.rows[i % eliteMenuItems.rows.length];
        const item2 = eliteMenuItems.rows[(i + 2) % eliteMenuItems.rows.length];
        const total = Number(item1.price) + Number(item2.price);

        const daysAgo = (i % 6);
        const orderDate = new Date();
        orderDate.setDate(orderDate.getDate() - daysAgo);
        orderDate.setHours(11 + (i % 8), 15, 0, 0);

        const orderRes = await client.query(`
          INSERT INTO app.bar_orders (
            club_id, order_no, member_id, guest_name, status,
            subtotal, total, opened_by, opened_at, closed_at, created_at
          ) VALUES ($1, $2, $3, $4, 'paid', $5, $5, $6, $7, $7, $7)
          RETURNING id
        `, [ELITE_CLUB_ID, orderNo, member.id, `${member.first_name || 'Member'} ${member.last_name || ''}`, total, ELITE_OWNER_ID, orderDate.toISOString()]);
        const orderId = orderRes.rows[0].id;

        for (const itm of [item1, item2]) {
          await client.query(`
            INSERT INTO app.bar_order_items (
              club_id, order_id, menu_item_id, item_name, station, quantity,
              unit_price, kds_status, added_by, created_at
            ) VALUES ($1, $2, $3, $4, $5, 1, $6, 'served', $7, $8)
          `, [ELITE_CLUB_ID, orderId, itm.id, itm.name, itm.station, itm.price, ELITE_OWNER_ID, orderDate.toISOString()]);
        }

        const payNo = `PAY-${String(paySeqElite++).padStart(5, '0')}`;
        const method = ['upi', 'card', 'cash'][i % 3];
        await client.query(`
          INSERT INTO app.payments (
            club_id, payment_no, kind, method, status, amount,
            member_id, bar_order_id, received_by,
            received_at, notes, reference
          ) VALUES (
            $1, $2, 'payment', $3, 'completed', $4,
            $5, $6, $7,
            $8, 'Bar & Cafe Bill Settlement', 'TXN_ELT_BAR_${Date.now()}_${i}'
          )
        `, [ELITE_CLUB_ID, payNo, method, total, member.id, orderId, ELITE_OWNER_ID, orderDate.toISOString()]);
      }
      console.log(`✓ Elite Club: Added 15 new bar orders with payments.`);
    }

    // 2.6 Additional Pro Shop Orders for Elite Club
    const eliteVariants = await client.query(`
      SELECT pv.id as variant_id, p.name, pv.price
      FROM app.products p
      JOIN app.product_variants pv ON pv.product_id = p.id
      WHERE p.club_id = $1
    `, [ELITE_CLUB_ID]);

    if (eliteVariants.rows.length > 0) {
      let eliteShopSeq = 20;
      for (let i = 0; i < 8; i++) {
        const member = allEliteMembers[i % allEliteMembers.length];
        const orderNo = `SHP-${String(eliteShopSeq++).padStart(5, '0')}`;
        const prod = eliteVariants.rows[i % eliteVariants.rows.length];
        const total = Number(prod.price);

        const daysAgo = (i % 5);
        const orderDate = new Date();
        orderDate.setDate(orderDate.getDate() - daysAgo);

        const orderRes = await client.query(`
          INSERT INTO app.shop_orders (
            club_id, order_no, member_id, guest_name, channel, fulfillment, status,
            subtotal, total, placed_at, completed_at, created_by, created_at
          ) VALUES (
            $1, $2, $3, $4, 'pos', 'counter', 'completed',
            $5, $5, $6, $6, $7, $6
          ) RETURNING id
        `, [ELITE_CLUB_ID, orderNo, member.id, `${member.first_name || 'Member'} ${member.last_name || ''}`, total, orderDate.toISOString(), ELITE_OWNER_ID]);
        const orderId = orderRes.rows[0].id;

        await client.query(`
          INSERT INTO app.shop_order_items (
            club_id, order_id, variant_id, item_name, quantity, unit_price
          ) VALUES ($1, $2, $3, $4, 1, $5)
        `, [ELITE_CLUB_ID, orderId, prod.variant_id, prod.name, prod.price]);

        const payNo = `PAY-${String(paySeqElite++).padStart(5, '0')}`;
        const method = ['card', 'upi', 'cash'][i % 3];
        await client.query(`
          INSERT INTO app.payments (
            club_id, payment_no, kind, method, status, amount,
            member_id, shop_order_id, received_by,
            received_at, notes, reference
          ) VALUES (
            $1, $2, 'payment', $3, 'completed', $4,
            $5, $6, $7,
            $8, 'Pro Shop Merch Purchase', 'TXN_ELT_SHP_${Date.now()}_${i}'
          )
        `, [ELITE_CLUB_ID, payNo, method, total, member.id, orderId, ELITE_OWNER_ID, orderDate.toISOString()]);
      }
      console.log(`✓ Elite Club: Added 8 new Pro Shop retail orders with payments.`);
    }

    await client.query('COMMIT');
    console.log('\n🎉 ALL REALISTIC SEEDING COMPLETED AND COMMITTED SUCCESSFULLY!');

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ SEEDING TRANSACTION ERROR:', err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

run();
