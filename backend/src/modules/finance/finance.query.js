export const GET_PAYMENTS = `
  SELECT * FROM app.payments
  WHERE club_id = $1
  ORDER BY received_at DESC;
`;

export const INSERT_PAYMENT = `
  INSERT INTO app.payments (
    club_id, kind, method, amount, member_id, client_id, booking_id, social_player_id, shop_order_id, bar_order_id, tab_id, membership_id, invoice_id, reference, received_by
  ) VALUES (
    $1, coalesce($2, 'payment'), $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15
  ) RETURNING *;
`;

export const SETTLE_TAB = `
  UPDATE app.tabs SET status = 'settled' WHERE id = $1 AND club_id = $2;
`;

export const GET_INVOICES = 'SELECT * FROM app.invoices WHERE club_id = $1;';
export const GET_PAYABLES = 'SELECT * FROM app.payables WHERE club_id = $1;';