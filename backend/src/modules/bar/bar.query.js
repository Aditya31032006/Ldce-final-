export const GET_TABLES = `
  SELECT t.id, t.name, t.zone, t.capacity, t.status, t.is_active,
         o.id AS active_order_id, o.order_no AS active_order_no,
         o.status AS active_order_status, o.total AS active_order_total,
         o.guest_name AS active_guest_name,
         m.full_name AS active_member_name, m.member_code AS active_member_code,
         o.opened_at AS active_order_opened_at,
         (SELECT count(*)::int FROM app.bar_order_items oi WHERE oi.order_id = o.id AND oi.kds_status <> 'cancelled') AS active_items_count
  FROM app.dining_tables t
  LEFT JOIN LATERAL (
    SELECT o.* FROM app.bar_orders o
    WHERE o.table_id = t.id AND o.status IN ('open', 'sent', 'served', 'billed')
    ORDER BY o.opened_at DESC LIMIT 1
  ) o ON true
  LEFT JOIN app.members m ON m.id = o.member_id
  WHERE t.club_id = $1 AND ($2::boolean IS NULL OR t.is_active = $2)
  ORDER BY t.zone ASC NULLS LAST, t.name ASC;
`;

export const INSERT_TABLE = `
  INSERT INTO app.dining_tables (club_id, name, zone, capacity, is_active)
  VALUES ($1, $2, $3, coalesce($4, 4), true)
  RETURNING *;
`;

export const UPDATE_TABLE_STATUS = `
  UPDATE app.dining_tables
  SET status = $3::app.table_status, updated_at = now()
  WHERE club_id = $1 AND id = $2
  RETURNING *;
`;

export const UPDATE_TABLE = `
  UPDATE app.dining_tables
  SET name = COALESCE($3, name),
      zone = COALESCE($4, zone),
      capacity = COALESCE($5, capacity),
      status = COALESCE($6::app.table_status, status),
      is_active = COALESCE($7, is_active),
      updated_at = now()
  WHERE club_id = $1 AND id = $2
  RETURNING *;
`;

export const GET_MENU_CATEGORIES = `
  SELECT id, name, station, sort_order, is_active
  FROM app.menu_categories
  WHERE club_id = $1 AND ($2::boolean IS NULL OR is_active = $2)
  ORDER BY sort_order ASC, name ASC;
`;

export const GET_MENU_ITEMS = `
  SELECT mi.id, mi.category_id, mi.name, mi.description, mi.price, mi.station,
         mi.is_veg, mi.prep_minutes, mi.sort_order, mi.is_available, mi.is_active, mi.image_url,
         c.name AS category_name
  FROM app.menu_items mi
  LEFT JOIN app.menu_categories c ON c.id = mi.category_id
  WHERE mi.club_id = $1
    AND ($2::uuid IS NULL OR mi.category_id = $2)
    AND ($3::boolean IS NULL OR mi.is_active = $3)
    AND ($4::boolean IS NULL OR mi.is_available = $4)
  ORDER BY mi.sort_order ASC, mi.name ASC;
`;

export const INSERT_MENU_CATEGORY = `
  INSERT INTO app.menu_categories (club_id, name, station, sort_order, is_active)
  VALUES ($1, $2, $3::app.station_type, coalesce($4, 0), true)
  RETURNING *;
`;

export const INSERT_MENU_ITEM = `
  INSERT INTO app.menu_items (
    club_id, category_id, name, description, price, station, is_veg, prep_minutes, sort_order, image_url, is_available, is_active
  )
  VALUES ($1, $2, $3, $4, $5, $6::app.station_type, $7, $8, coalesce($9, 0), $10, true, true)
  RETURNING *;
`;

export const UPDATE_MENU_ITEM = `
  UPDATE app.menu_items
  SET name = coalesce($3, name),
      price = coalesce($4, price),
      description = coalesce($5, description),
      is_available = coalesce($6, is_available),
      is_active = coalesce($7, is_active),
      image_url = coalesce($8, image_url),
      prep_minutes = coalesce($9, prep_minutes),
      is_veg = coalesce($10, is_veg),
      category_id = coalesce($11, category_id),
      station = coalesce($12::app.station_type, station),
      updated_at = now()
  WHERE club_id = $1 AND id = $2
  RETURNING *;
`;

export const INSERT_TAB = `
  INSERT INTO app.tabs (club_id, member_id, guest_name, status, opened_by)
  VALUES ($1, $2, $3, 'open', $4)
  RETURNING *;
`;

export const GET_ACTIVE_TAB_BY_MEMBER = `
  SELECT * FROM app.tabs
  WHERE club_id = $1 AND member_id = $2 AND status = 'open'
  LIMIT 1;
`;

export const INSERT_BAR_ORDER = `
  INSERT INTO app.bar_orders (club_id, table_id, tab_id, member_id, guest_name, status, opened_by, notes)
  VALUES ($1, $2, $3, $4, $5, 'open', $6, $7)
  RETURNING *;
`;

export const INSERT_BAR_ORDER_ITEM = `
  INSERT INTO app.bar_order_items (club_id, order_id, menu_item_id, quantity, notes, added_by)
  VALUES ($1, $2, $3, $4, $5, $6)
  RETURNING *;
`;

export const GET_BAR_ORDERS = `
  SELECT o.id, o.order_no, o.table_id, o.tab_id, o.member_id, o.guest_name,
         o.status, o.discount_percent, o.subtotal, o.discount_total, o.tax_total, o.total,
         o.opened_at, o.closed_at, o.notes,
         t.name AS table_name, t.zone AS table_zone,
         m.full_name AS member_name, m.member_code,
         u.full_name AS opened_by_name,
         coalesce(
           (SELECT json_agg(
              json_build_object(
                'id', oi.id,
                'menu_item_id', oi.menu_item_id,
                'item_name', oi.item_name,
                'station', oi.station,
                'quantity', oi.quantity,
                'unit_price', oi.unit_price,
                'discount_percent', oi.discount_percent,
                'tax_percent', oi.tax_percent,
                'line_subtotal', oi.line_subtotal,
                'discount_amount', oi.discount_amount,
                'tax_amount', oi.tax_amount,
                'line_total', oi.line_total,
                'notes', oi.notes,
                'kds_status', oi.kds_status,
                'sent_at', oi.sent_at,
                'ready_at', oi.ready_at,
                'served_at', oi.served_at,
                'created_at', oi.created_at
              ) ORDER BY oi.created_at ASC
            )
            FROM app.bar_order_items oi WHERE oi.order_id = o.id
           ), '[]'::json
         ) AS items
  FROM app.bar_orders o
  LEFT JOIN app.dining_tables t ON t.id = o.table_id
  LEFT JOIN app.members m ON m.id = o.member_id
  LEFT JOIN app.users u ON u.id = o.opened_by
  WHERE o.club_id = $1
    AND ($2::text IS NULL OR o.status = $2::app.bar_order_status)
    AND ($3::uuid IS NULL OR o.table_id = $3)
    AND ($4::uuid IS NULL OR o.member_id = $4 OR o.opened_by = $4)
  ORDER BY o.opened_at DESC
  LIMIT coalesce($5, 50);
`;

export const GET_ORDER_BY_ID = `
  SELECT o.id, o.order_no, o.table_id, o.tab_id, o.member_id, o.guest_name,
         o.status, o.discount_percent, o.subtotal, o.discount_total, o.tax_total, o.total,
         o.opened_at, o.closed_at, o.notes,
         t.name AS table_name, t.zone AS table_zone,
         m.full_name AS member_name, m.member_code,
         u.full_name AS opened_by_name,
         coalesce(
           (SELECT json_agg(
              json_build_object(
                'id', oi.id,
                'menu_item_id', oi.menu_item_id,
                'item_name', oi.item_name,
                'station', oi.station,
                'quantity', oi.quantity,
                'unit_price', oi.unit_price,
                'discount_percent', oi.discount_percent,
                'tax_percent', oi.tax_percent,
                'line_subtotal', oi.line_subtotal,
                'discount_amount', oi.discount_amount,
                'tax_amount', oi.tax_amount,
                'line_total', oi.line_total,
                'notes', oi.notes,
                'kds_status', oi.kds_status,
                'sent_at', oi.sent_at,
                'ready_at', oi.ready_at,
                'served_at', oi.served_at,
                'created_at', oi.created_at
              ) ORDER BY oi.created_at ASC
            )
            FROM app.bar_order_items oi WHERE oi.order_id = o.id
           ), '[]'::json
         ) AS items
  FROM app.bar_orders o
  LEFT JOIN app.dining_tables t ON t.id = o.table_id
  LEFT JOIN app.members m ON m.id = o.member_id
  LEFT JOIN app.users u ON u.id = o.opened_by
  WHERE o.club_id = $1 AND o.id = $2;
`;

export const GET_KDS_ITEMS = `
  SELECT oi.id, oi.order_id, oi.menu_item_id, oi.item_name, oi.station,
         oi.quantity, oi.notes, oi.kds_status, oi.created_at, oi.sent_at, oi.ready_at, oi.served_at,
         o.order_no, o.table_id, t.name AS table_name, t.zone AS table_zone,
         o.guest_name, m.full_name AS member_name
  FROM app.bar_order_items oi
  JOIN app.bar_orders o ON o.id = oi.order_id
  LEFT JOIN app.dining_tables t ON t.id = o.table_id
  LEFT JOIN app.members m ON m.id = o.member_id
  WHERE oi.club_id = $1
    AND ($2::text IS NULL OR oi.station = $2::app.station_type)
    AND oi.kds_status IN ('new', 'preparing', 'ready')
    AND o.status <> 'void'
    AND (
      o.status = 'paid'
      OR o.tab_id IS NOT NULL
      OR EXISTS (
        SELECT 1 FROM app.payments p
        WHERE p.bar_order_id = o.id AND p.status = 'completed'
      )
    )
  ORDER BY oi.created_at ASC;
`;

export const UPDATE_KDS_STATUS = `
  UPDATE app.bar_order_items
  SET kds_status = $3::app.kds_status,
      ready_at = CASE WHEN $3 = 'ready' AND ready_at IS NULL THEN now() ELSE ready_at END,
      served_at = CASE WHEN $3 = 'served' AND served_at IS NULL THEN now() ELSE served_at END
  WHERE club_id = $1 AND id = $2
  RETURNING *;
`;

export const UPDATE_BAR_ORDER_STATUS = `
  UPDATE app.bar_orders
  SET status = $3::app.bar_order_status,
      closed_at = CASE WHEN $3 IN ('paid', 'void') THEN now() ELSE closed_at END,
      updated_at = now()
  WHERE club_id = $1 AND id = $2
  RETURNING *;
`;

export const RECORD_PAYMENT = `
  INSERT INTO app.payments (
    club_id, kind, method, status, amount, member_id, bar_order_id, tab_id, reference, received_by, notes
  )
  VALUES ($1, 'payment', $2::app.payment_method, 'completed', $3, $4, $5, $6, $7, $8, $9)
  RETURNING *;
`;

export const GET_MEMBER_TABS = `
  SELECT t.id, t.member_id, t.guest_name, t.status, t.opened_at, t.settled_at,
         m.full_name AS member_name, m.member_code, m.phone AS member_phone,
         coalesce(sum(o.total), 0) AS balance,
         count(o.id) AS orders_count
  FROM app.tabs t
  LEFT JOIN app.members m ON m.id = t.member_id
  LEFT JOIN app.bar_orders o ON o.tab_id = t.id AND o.status <> 'void'
  WHERE t.club_id = $1 AND ($2::text IS NULL OR t.status = $2::app.tab_status)
  GROUP BY t.id, m.full_name, m.member_code, m.phone
  ORDER BY t.opened_at DESC;
`;

export const SETTLE_TAB = `
  UPDATE app.tabs
  SET status = 'settled', settled_at = now(), settled_by = $3
  WHERE club_id = $1 AND id = $2
  RETURNING *;
`;

export const GET_DAILY_CLOSING = `
  SELECT day, orders, gross, discounts, tax, net_total
  FROM app.v_bar_daily_closing
  WHERE club_id = $1 AND day = coalesce($2::date, current_date);
`;

export const GET_DAILY_PAYMENTS_BREAKDOWN = `
  SELECT method, sum(amount) AS total_amount, count(*) AS count
  FROM app.payments
  WHERE club_id = $1 AND revenue_source = 'bar' AND status = 'completed'
    AND (received_at AT TIME ZONE 'Asia/Kolkata')::date = coalesce($2::date, current_date)
  GROUP BY method;
`;
