import { pool } from '../../config/database.js';

const SAMPLE_CATEGORIES = [
  { name: 'Beverages & Energy', station: 'bar', sort_order: 1 },
  { name: 'Post-Match Bowls', station: 'kitchen', sort_order: 2 },
  { name: 'Wraps & Sandwiches', station: 'kitchen', sort_order: 3 },
  { name: 'Courtside Bites & Pizzas', station: 'kitchen', sort_order: 4 },
  { name: 'Club Bar & Mocktails', station: 'bar', sort_order: 5 },
];

const SAMPLE_ITEMS = {
  'Beverages & Energy': [
    {
      name: 'Cold Brew Nitro Coffee',
      description: 'Slow-steeped single-origin Arabica, velvety nitrogen infusion.',
      price: 180,
      station: 'bar',
      is_veg: true,
      prep_minutes: 3,
      image_url: 'https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?w=500&auto=format&fit=crop&q=80',
    },
    {
      name: 'Whey Protein Shake (Chocolate Peanut)',
      description: '30g grass-fed whey isolate, roasted peanut butter, almond milk.',
      price: 240,
      station: 'bar',
      is_veg: true,
      prep_minutes: 4,
      image_url: 'https://images.unsplash.com/photo-1577805947697-89e18249d767?w=500&auto=format&fit=crop&q=80',
    },
    {
      name: 'Matcha Mint Energizer',
      description: 'Ceremonial grade Uji matcha, fresh garden mint, coconut water.',
      price: 190,
      station: 'bar',
      is_veg: true,
      prep_minutes: 3,
      image_url: 'https://images.unsplash.com/photo-1536256263959-770b48d82b0a?w=500&auto=format&fit=crop&q=80',
    },
    {
      name: 'Electrolyte Citrus Spritzer',
      description: 'Himalayan pink salt, valencia orange, sparkling soda & lime.',
      price: 140,
      station: 'bar',
      is_veg: true,
      prep_minutes: 2,
      image_url: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=500&auto=format&fit=crop&q=80',
    },
  ],
  'Post-Match Bowls': [
    {
      name: 'Grilled Chicken Quinoa Bowl',
      description: 'Herb-grilled chicken breast, organic tri-color quinoa, charred corn, avocado puree.',
      price: 360,
      station: 'kitchen',
      is_veg: false,
      prep_minutes: 12,
      image_url: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&auto=format&fit=crop&q=80',
    },
    {
      name: 'Mediterranean Falafel & Hummus Bowl',
      description: 'Crispy herb falafels, smoked paprika hummus, pickled beets, warm pita.',
      price: 310,
      station: 'kitchen',
      is_veg: true,
      prep_minutes: 10,
      image_url: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=500&auto=format&fit=crop&q=80',
    },
    {
      name: 'Paneer Tikka Protein Platter',
      description: 'Tandoor-charred cottage cheese skewers, bell peppers, mint yogurt drizzle.',
      price: 290,
      station: 'kitchen',
      is_veg: true,
      prep_minutes: 12,
      image_url: 'https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=500&auto=format&fit=crop&q=80',
    },
  ],
  'Wraps & Sandwiches': [
    {
      name: 'Smoked Chicken Avocado Sourdough',
      description: 'Hickory-smoked chicken, hass avocado slices, Dijon aioli on toasted artisanal sourdough.',
      price: 320,
      station: 'kitchen',
      is_veg: false,
      prep_minutes: 8,
      image_url: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=500&auto=format&fit=crop&q=80',
    },
    {
      name: 'Truffle Mushroom & Emmental Melt',
      description: 'Pan-seared portobello, Emmental cheese, black truffle butter on rye.',
      price: 280,
      station: 'kitchen',
      is_veg: true,
      prep_minutes: 8,
      image_url: 'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=500&auto=format&fit=crop&q=80',
    },
  ],
  'Courtside Bites & Pizzas': [
    {
      name: 'Artisan Margherita di Bufala',
      description: 'San Marzano tomatoes, buffalo mozzarella, fresh sweet basil on sourdough crust.',
      price: 380,
      station: 'kitchen',
      is_veg: true,
      prep_minutes: 14,
      image_url: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=500&auto=format&fit=crop&q=80',
    },
    {
      name: 'Pepperoni & Hot Honey Flatbread',
      description: 'Crisp artisanal flatbread, spiced pepperoni, aged cheddar & organic chilli honey.',
      price: 440,
      station: 'kitchen',
      is_veg: false,
      prep_minutes: 14,
      image_url: 'https://images.unsplash.com/photo-1534308983496-4fabb1a015ee?w=500&auto=format&fit=crop&q=80',
    },
    {
      name: 'High-Protein Energy Balls (3 pcs)',
      description: 'Rolled oats, Medjool dates, raw cacao, chia seeds & crushed pistachios.',
      price: 150,
      station: 'kitchen',
      is_veg: true,
      prep_minutes: 2,
      image_url: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=500&auto=format&fit=crop&q=80',
    },
  ],
  'Club Bar & Mocktails': [
    {
      name: 'Cucumber Jalapeño Botanical Tonic',
      description: 'Fresh English cucumber, jalapeno slice, elderflower tonic, rosemary sprig.',
      price: 190,
      station: 'bar',
      is_veg: true,
      prep_minutes: 4,
      image_url: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=500&auto=format&fit=crop&q=80',
    },
    {
      name: 'Blood Orange & Rosemary Spritz',
      description: 'Sicilian blood orange reduction, effervescent bubbles, aromatic rosemary smoke.',
      price: 220,
      station: 'bar',
      is_veg: true,
      prep_minutes: 4,
      image_url: 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=500&auto=format&fit=crop&q=80',
    },
  ],
};

const SAMPLE_TABLES = [
  { name: 'T-01', zone: 'Courtside Cafe', capacity: 2 },
  { name: 'T-02', zone: 'Courtside Cafe', capacity: 4 },
  { name: 'T-03', zone: 'Courtside Cafe', capacity: 4 },
  { name: 'T-04', zone: 'Indoor Lounge', capacity: 4 },
  { name: 'T-05', zone: 'Indoor Lounge', capacity: 6 },
  { name: 'T-06', zone: 'Indoor Lounge', capacity: 4 },
  { name: 'T-07', zone: 'Terrace Bar', capacity: 2 },
  { name: 'T-08', zone: 'Terrace Bar', capacity: 4 },
  { name: 'T-09', zone: 'Terrace Bar', capacity: 6 },
  { name: 'T-10', zone: 'Terrace Bar', capacity: 8 },
];

export async function seedBarForClubs() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const clubsRes = await client.query('SELECT id, name FROM app.clubs');

    for (const club of clubsRes.rows) {
      console.log(`Seeding Bar & Cafe data for club: ${club.name} (${club.id})...`);

      // 1. Seed Tables
      for (const table of SAMPLE_TABLES) {
        await client.query(`
          INSERT INTO app.dining_tables (club_id, name, zone, capacity, status, is_active)
          VALUES ($1, $2, $3, $4, 'available', true)
          ON CONFLICT (club_id, name) DO UPDATE 
          SET zone = EXCLUDED.zone, capacity = EXCLUDED.capacity, is_active = true;
        `, [club.id, table.name, table.zone, table.capacity]);
      }

      // 2. Seed Categories & Items
      for (const cat of SAMPLE_CATEGORIES) {
        const catRes = await client.query(`
          INSERT INTO app.menu_categories (club_id, name, station, sort_order, is_active)
          VALUES ($1, $2, $3, $4, true)
          ON CONFLICT (club_id, name) DO UPDATE
          SET station = EXCLUDED.station, sort_order = EXCLUDED.sort_order, is_active = true
          RETURNING id;
        `, [club.id, cat.name, cat.station, cat.sort_order]);

        const catId = catRes.rows[0].id;
        const items = SAMPLE_ITEMS[cat.name] || [];

        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          await client.query(`
            INSERT INTO app.menu_items (
              club_id, category_id, name, description, price, station, is_veg, prep_minutes, sort_order, is_available, is_active, image_url
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true, true, $10)
            ON CONFLICT (club_id, name) DO UPDATE
            SET category_id = EXCLUDED.category_id,
                price = EXCLUDED.price,
                description = EXCLUDED.description,
                station = EXCLUDED.station,
                is_veg = EXCLUDED.is_veg,
                prep_minutes = EXCLUDED.prep_minutes,
                image_url = EXCLUDED.image_url,
                is_available = true,
                is_active = true;
          `, [club.id, catId, item.name, item.description, item.price, item.station, item.is_veg, item.prep_minutes, i + 1, item.image_url]);
        }
      }
    }

    await client.query('COMMIT');
    console.log('✅ Bar & Cafe data seeded successfully!');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Failed to seed bar data:', error);
    throw error;
  } finally {
    client.release();
  }
}

if (process.argv[1]?.includes('seed-bar-data.js')) {
  seedBarForClubs().then(() => process.exit(0)).catch(() => process.exit(1));
}
