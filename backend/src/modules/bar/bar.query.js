export const GET_MENU_CATEGORIES = `
  SELECT id, name, station, sort_order, is_active
  FROM app.menu_categories
  WHERE club_id = $1 AND ($2::boolean IS NULL OR is_active = $2)
  ORDER BY sort_order ASC;
`;

export const GET_MENU_ITEMS = `
  SELECT id, category_id, tax_rate_id, name, description, image_url, price, station, is_veg, prep_minutes, sort_order, is_available, is_active
  FROM app.menu_items
  WHERE club_id = $1 AND category_id = coalesce($2, category_id) AND ($3::boolean IS NULL OR is_active = $3)
  ORDER BY sort_order ASC;
`;

export const INSERT_TAB = `
  INSERT INTO app.tabs (club_id, member_id, guest_name, status, opened_by)
  VALUES ($1, $2, $3, 'open', $4)
  RETURNING *;
`;

export const INSERT_BAR_ORDER = `
  INSERT INTO app.bar_orders (club_id, table_id, tab_id, member_id, guest_name, status, opened_by)
  VALUES ($1, $2, $3, $4, $5, 'open', $6)
  RETURNING *;
`;

export const INSERT_BAR_ORDER_ITEM = `
  INSERT INTO app.bar_order_items (club_id, order_id, menu_item_id, quantity, notes, added_by)
  VALUES ($1, $2, $3, $4, $5, $6)
  RETURNING *;
`;
