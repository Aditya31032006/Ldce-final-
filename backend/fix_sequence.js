import 'dotenv/config';
import pg from 'pg';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  try {
    console.log('Connected to database:', process.env.DATABASE_URL);

    // 1. Update next_doc_no function to automatically handle collisions
    const updateFunctionSQL = `
CREATE OR REPLACE FUNCTION app.next_doc_no(p_club uuid, p_type text, p_prefix text DEFAULT '')
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = app, public AS $$
DECLARE
  v_out text;
  v_exists boolean;
BEGIN
  INSERT INTO document_sequences AS d (club_id, doc_type, prefix, last_number)
  VALUES (p_club, p_type, p_prefix, 1)
  ON CONFLICT (club_id, doc_type) DO UPDATE SET last_number = d.last_number + 1
  RETURNING d.prefix || lpad(d.last_number::text, d.padding, '0') INTO v_out;

  LOOP
    v_exists := false;
    IF p_type = 'payment' THEN
      SELECT EXISTS(SELECT 1 FROM app.payments WHERE club_id = p_club AND payment_no = v_out) INTO v_exists;
    ELSIF p_type = 'bar_order' THEN
      SELECT EXISTS(SELECT 1 FROM app.bar_orders WHERE club_id = p_club AND order_no = v_out) INTO v_exists;
    ELSIF p_type = 'shop_order' THEN
      SELECT EXISTS(SELECT 1 FROM app.shop_orders WHERE club_id = p_club AND order_no = v_out) INTO v_exists;
    ELSIF p_type = 'invoice' THEN
      SELECT EXISTS(SELECT 1 FROM app.invoices WHERE club_id = p_club AND invoice_no = v_out) INTO v_exists;
    ELSIF p_type = 'quote' THEN
      SELECT EXISTS(SELECT 1 FROM app.quotes WHERE club_id = p_club AND quote_no = v_out) INTO v_exists;
    ELSIF p_type = 'purchase_order' THEN
      SELECT EXISTS(SELECT 1 FROM app.purchase_orders WHERE club_id = p_club AND po_no = v_out) INTO v_exists;
    ELSIF p_type = 'member' THEN
      SELECT EXISTS(SELECT 1 FROM app.members WHERE club_id = p_club AND member_code = v_out) INTO v_exists;
    ELSIF p_type = 'employee' THEN
      SELECT EXISTS(SELECT 1 FROM app.employees WHERE club_id = p_club AND employee_code = v_out) INTO v_exists;
    END IF;

    EXIT WHEN NOT v_exists;

    UPDATE document_sequences
    SET last_number = last_number + 1
    WHERE club_id = p_club AND doc_type = p_type
    RETURNING prefix || lpad(last_number::text, padding, '0') INTO v_out;
  END LOOP;

  RETURN v_out;
END;
$$;
`;

    await pool.query(updateFunctionSQL);
    console.log('Successfully updated app.next_doc_no in database!');

    // 2. Also sync document_sequences with any existing maximum numbers in app.payments
    const syncSQL = `
      INSERT INTO app.document_sequences (club_id, doc_type, prefix, padding, last_number)
      SELECT 
        p.club_id,
        'payment',
        'PAY-',
        5,
        COALESCE(MAX(NULLIF(regexp_replace(p.payment_no, '\\D', '', 'g'), '')::bigint), 0)
      FROM app.payments p
      GROUP BY p.club_id
      ON CONFLICT (club_id, doc_type) 
      DO UPDATE SET last_number = GREATEST(
        document_sequences.last_number, 
        EXCLUDED.last_number
      );
    `;
    await pool.query(syncSQL);
    console.log('Successfully synchronized document_sequences for payments!');

    // Check sequences now
    const seqs = await pool.query("SELECT * FROM app.document_sequences");
    console.log('Current document_sequences:');
    console.table(seqs.rows);

  } catch (err) {
    console.error('Error during sequence fix:', err);
  } finally {
    await pool.end();
  }
}

run();
