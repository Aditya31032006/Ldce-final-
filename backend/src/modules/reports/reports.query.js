export const GET_DAILY_SUMMARY = `
  SELECT
    COUNT(b.id) as total_bookings,
    COALESCE(SUM(p.amount), 0) as total_revenue
  FROM app.bookings b
  LEFT JOIN app.payments p ON p.booking_id = b.id
  WHERE b.club_id = $1 AND b.created_at::date = $2::date;
`;

export const GET_DASHBOARD_DATA = `
  WITH revenue_agg AS (
    SELECT 
      COALESCE(SUM(amount), 0) AS total_revenue,
      COALESCE(SUM(CASE WHEN revenue_source = 'courts' THEN amount ELSE 0 END), 0) AS revenue_courts,
      COALESCE(SUM(CASE WHEN revenue_source = 'membership' THEN amount ELSE 0 END), 0) AS revenue_membership,
      COALESCE(SUM(CASE WHEN revenue_source = 'shop' THEN amount ELSE 0 END), 0) AS revenue_shop,
      COALESCE(SUM(CASE WHEN revenue_source = 'bar' THEN amount ELSE 0 END), 0) AS revenue_bar,
      COUNT(id) AS payment_transactions_count
    FROM app.payments
    WHERE club_id = $1 AND status = 'completed'
  ),
  bookings_agg AS (
    SELECT
      COUNT(*) AS total_bookings,
      COUNT(CASE WHEN b.status IN ('confirmed', 'pending') THEN 1 END) AS active_bookings,
      COUNT(CASE WHEN b.status = 'completed' THEN 1 END) AS completed_bookings,
      COUNT(CASE WHEN b.status = 'cancelled' THEN 1 END) AS cancelled_bookings,
      COUNT(CASE WHEN cr.start_at::date = CURRENT_DATE THEN 1 END) AS today_bookings
    FROM app.bookings b
    JOIN app.court_reservations cr ON b.reservation_id = cr.id
    WHERE b.club_id = $1
  ),
  members_agg AS (
    SELECT
      COUNT(*) AS total_members,
      COUNT(CASE WHEN status = 'active' THEN 1 END) AS active_members,
      COUNT(CASE WHEN joined_on >= (CURRENT_DATE - INTERVAL '30 days') THEN 1 END) AS new_members_30d
    FROM app.members
    WHERE club_id = $1
  ),
  orders_agg AS (
    SELECT
      (SELECT COUNT(*) FROM app.shop_orders WHERE club_id = $1) AS shop_orders_total,
      (SELECT COUNT(*) FROM app.shop_orders WHERE club_id = $1 AND status IN ('pending', 'confirmed')) AS shop_orders_pending,
      (SELECT COUNT(*) FROM app.bar_orders WHERE club_id = $1) AS bar_orders_total,
      (SELECT COUNT(*) FROM app.bar_orders WHERE club_id = $1 AND status = 'open') AS bar_orders_open
  ),
  courts_count AS (
    SELECT COUNT(*) AS total_courts FROM app.courts WHERE club_id = $1 AND is_active = true
  )
  SELECT 
    r.*, b.*, m.*, o.*, c.total_courts
  FROM revenue_agg r
  CROSS JOIN bookings_agg b
  CROSS JOIN members_agg m
  CROSS JOIN orders_agg o
  CROSS JOIN courts_count c;
`;

export const GET_COURTS_OVERVIEW = `
  SELECT
    c.id, 
    c.name, 
    COALESCE(s.name, 'Multi-Sport') as sport, 
    c.surface, 
    c.is_indoor,
    c.max_players,
    COUNT(cr.id) as total_reservations,
    COALESCE(SUM(EXTRACT(EPOCH FROM (cr.end_at - cr.start_at)) / 3600), 0) as total_hours_booked,
    EXISTS(
      SELECT 1 FROM app.court_reservations cr_active 
      WHERE cr_active.court_id = c.id 
        AND cr_active.status = 'active'
        AND NOW() BETWEEN cr_active.start_at AND cr_active.end_at
    ) as is_currently_occupied
  FROM app.courts c
  LEFT JOIN app.sports s ON c.sport_id = s.id
  LEFT JOIN app.court_reservations cr ON cr.court_id = c.id AND cr.status = 'active'
  WHERE c.club_id = $1 AND c.is_active = true
  GROUP BY c.id, c.name, s.name, c.surface, c.is_indoor, c.max_players, c.sort_order
  ORDER BY c.sort_order, c.name;
`;

export const GET_RECENT_ACTIVITY = `
  (
    SELECT 'booking' as type, b.id::text, 'Court Booking: ' || COALESCE(c.name, 'Court') as title,
           COALESCE(m.full_name, b.guest_name, 'Guest Player') as actor,
           b.total_amount as amount, b.status::text, b.created_at
    FROM app.bookings b
    JOIN app.court_reservations cr ON b.reservation_id = cr.id
    JOIN app.courts c ON cr.court_id = c.id
    LEFT JOIN app.members m ON b.member_id = m.id
    WHERE b.club_id = $1
    ORDER BY b.created_at DESC
    LIMIT 6
  )
  UNION ALL
  (
    SELECT 'payment' as type, p.id::text, 'Payment Received (' || p.revenue_source || ')' as title,
           COALESCE(m.full_name, 'Direct Client') as actor,
           p.amount, p.status::text, p.received_at as created_at
    FROM app.payments p
    LEFT JOIN app.members m ON p.member_id = m.id
    WHERE p.club_id = $1
    ORDER BY p.received_at DESC
    LIMIT 6
  )
  UNION ALL
  (
    SELECT 'shop_order' as type, so.id::text, 'Pro Shop Order ' || so.order_no as title,
           COALESCE(m.full_name, so.guest_name, 'Customer') as actor,
           so.total as amount, so.status::text, so.placed_at as created_at
    FROM app.shop_orders so
    LEFT JOIN app.members m ON so.member_id = m.id
    WHERE so.club_id = $1
    ORDER BY so.placed_at DESC
    LIMIT 6
  )
  UNION ALL
  (
    SELECT 'bar_order' as type, bo.id::text, 'Bar/Cafe Order ' || bo.order_no as title,
           COALESCE(m.full_name, bo.guest_name, 'Cafe Patron') as actor,
           bo.total as amount, bo.status::text, bo.opened_at as created_at
    FROM app.bar_orders bo
    LEFT JOIN app.members m ON bo.member_id = m.id
    WHERE bo.club_id = $1
    ORDER BY bo.opened_at DESC
    LIMIT 6
  )
  ORDER BY created_at DESC
  LIMIT 15;
`;

export const GET_ANALYTICS_PAYMENT_METHODS = `
  SELECT 
    method, 
    COUNT(*)::int as count, 
    COALESCE(SUM(amount), 0) as total_amount
  FROM app.payments
  WHERE club_id = $1 AND status = 'completed'
  GROUP BY method
  ORDER BY total_amount DESC;
`;

export const GET_SPORT_UTILIZATION = `
  SELECT 
    COALESCE(s.name, 'Other') as sport,
    COUNT(DISTINCT c.id)::int as courts_count,
    COUNT(cr.id)::int as reservations_count,
    COALESCE(SUM(EXTRACT(EPOCH FROM (cr.end_at - cr.start_at)) / 3600), 0) as total_hours_booked
  FROM app.courts c
  LEFT JOIN app.sports s ON c.sport_id = s.id
  LEFT JOIN app.court_reservations cr ON cr.court_id = c.id AND cr.status = 'active'
  WHERE c.club_id = $1 AND c.is_active = true
  GROUP BY s.name
  ORDER BY total_hours_booked DESC;
`;

export const GET_HOURLY_DISTRIBUTION = `
  SELECT 
    EXTRACT(HOUR FROM cr.start_at)::int AS hour,
    COUNT(*)::int AS count
  FROM app.court_reservations cr
  WHERE cr.club_id = $1
  GROUP BY EXTRACT(HOUR FROM cr.start_at)
  ORDER BY hour;
`;

export const GET_PLANS_BREAKDOWN = `
  SELECT 
    p.id, 
    p.name, 
    p.price, 
    p.court_discount_percent,
    COUNT(ms.id)::int as active_subscribers,
    COALESCE(SUM(ms.price_paid), 0) as total_collected
  FROM app.plans p
  LEFT JOIN app.memberships ms ON ms.plan_id = p.id AND ms.club_id = p.club_id AND ms.status = 'active'
  WHERE p.club_id = $1
  GROUP BY p.id, p.name, p.price, p.court_discount_percent
  ORDER BY active_subscribers DESC, p.price DESC;
`;

export const GET_TOP_SHOP_PRODUCTS = `
  SELECT 
    i.item_name, 
    COALESCE(SUM(i.quantity), 0)::int as units_sold, 
    COALESCE(SUM(i.line_total), 0) as total_sales
  FROM app.shop_order_items i
  JOIN app.shop_orders o ON i.order_id = o.id
  WHERE o.club_id = $1 AND o.status <> 'cancelled'
  GROUP BY i.item_name
  ORDER BY units_sold DESC, total_sales DESC
  LIMIT 8;
`;

export const GET_TOP_BAR_ITEMS = `
  SELECT 
    bi.item_name, 
    bi.station,
    COALESCE(SUM(bi.quantity), 0)::int as units_sold, 
    COALESCE(SUM(bi.line_total), 0) as total_sales
  FROM app.bar_order_items bi
  JOIN app.bar_orders bo ON bi.order_id = bo.id
  WHERE bo.club_id = $1 AND bo.status <> 'void'
  GROUP BY bi.item_name, bi.station
  ORDER BY units_sold DESC, total_sales DESC
  LIMIT 8;
`;

export const GET_BOOKING_DEMOGRAPHICS = `
  SELECT
    COUNT(CASE WHEN member_id IS NOT NULL THEN 1 END)::int as member_bookings,
    COUNT(CASE WHEN member_id IS NULL AND guest_name IS NOT NULL THEN 1 END)::int as guest_bookings,
    COUNT(CASE WHEN channel = 'online' THEN 1 END)::int as online_bookings,
    COUNT(CASE WHEN channel = 'counter' THEN 1 END)::int as walkin_bookings,
    COUNT(*)::int as total_bookings
  FROM app.bookings
  WHERE club_id = $1;
`;

export const GET_STAFF_DISTRIBUTION = `
  SELECT 
    COALESCE(department, 'General Operations') as department, 
    COUNT(*)::int as staff_count, 
    COALESCE(SUM(base_salary), 0) as total_salary
  FROM app.employees
  WHERE club_id = $1 AND is_active = true
  GROUP BY department
  ORDER BY staff_count DESC;
`;
