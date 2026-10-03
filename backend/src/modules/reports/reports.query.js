export const GET_DAILY_SUMMARY = `
  SELECT
    COUNT(b.id) as total_bookings,
    SUM(p.amount) as total_revenue
  FROM app.bookings b
  LEFT JOIN app.payments p ON p.booking_id = b.id
  WHERE b.club_id = $1 AND b.created_at::date = $2::date;
`;
// In a real scenario, this would have complex analytical queries.
