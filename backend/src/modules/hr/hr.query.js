export const GET_STAFF = `
  SELECT cs.user_id, cs.role, cs.is_active, cs.created_at, u.full_name, u.email, u.phone, u.avatar_url
  FROM app.club_staff cs
  JOIN app.users u ON cs.user_id = u.id
  WHERE cs.club_id = $1 
    AND ($2::boolean IS NULL OR cs.is_active = $2)
    AND (
      $3::text IS NULL OR $3::text = '' OR
      u.full_name ILIKE '%' || $3 || '%' OR
      u.email ILIKE '%' || $3 || '%' OR
      u.phone ILIKE '%' || $3 || '%' OR
      cs.role::text ILIKE '%' || $3 || '%' OR
      similarity(u.full_name, $3) > 0.15 OR
      similarity(COALESCE(u.email, ''), $3) > 0.15
    )
  ORDER BY 
    CASE WHEN $3::text IS NOT NULL AND $3::text != '' 
      THEN similarity(u.full_name, $3)
      ELSE 0
    END DESC,
    cs.created_at ASC;
`;

export const ADD_STAFF = `
  INSERT INTO app.club_staff (club_id, user_id, role, is_active, updated_at)
  VALUES ($1, $2, $3, true, now())
  ON CONFLICT (club_id, user_id)
  DO UPDATE SET role = EXCLUDED.role, is_active = true, updated_at = now()
  RETURNING *;
`;

export const REMOVE_STAFF = `
  DELETE FROM app.club_staff
  WHERE club_id = $1 AND user_id = $2
  RETURNING *;
`;

// ─── Employees & Salary Queries ─────────────────────────────────────────────
export const GET_EMPLOYEES = `
  SELECT e.*, u.avatar_url, u.email as user_email, u.phone as user_phone,
    (SELECT COUNT(*) FROM app.leave_requests lr WHERE lr.employee_id = e.id AND lr.status = 'approved' AND CURRENT_DATE BETWEEN lr.from_date AND lr.to_date) > 0 AS is_on_leave_today
  FROM app.employees e
  LEFT JOIN app.users u ON e.user_id = u.id
  WHERE e.club_id = $1
    AND (
      $2::text IS NULL OR $2::text = '' OR
      e.full_name ILIKE '%' || $2 || '%' OR
      e.employee_code ILIKE '%' || $2 || '%' OR
      e.designation ILIKE '%' || $2 || '%' OR
      e.department ILIKE '%' || $2 || '%' OR
      e.email ILIKE '%' || $2 || '%' OR
      e.phone ILIKE '%' || $2 || '%' OR
      similarity(e.full_name, $2) > 0.15 OR
      similarity(COALESCE(e.designation, ''), $2) > 0.15 OR
      similarity(COALESCE(e.department, ''), $2) > 0.15
    )
  ORDER BY 
    CASE WHEN $2::text IS NOT NULL AND $2::text != '' 
      THEN similarity(e.full_name, $2)
      ELSE 0
    END DESC,
    e.is_active DESC, e.full_name ASC;
`;

export const GET_EMPLOYEE_BY_ID = `
  SELECT e.*, u.avatar_url, u.email as user_email, u.phone as user_phone
  FROM app.employees e
  LEFT JOIN app.users u ON e.user_id = u.id
  WHERE e.club_id = $1 AND e.id = $2;
`;

export const INSERT_EMPLOYEE = `
  INSERT INTO app.employees (
    club_id, employee_code, full_name, phone, email, designation, department, hired_on, base_salary, user_id, is_active
  )
  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, true)
  RETURNING *;
`;

export const UPDATE_EMPLOYEE = `
  UPDATE app.employees
  SET full_name = COALESCE($3, full_name),
      phone = COALESCE($4, phone),
      email = COALESCE($5, email),
      designation = COALESCE($6, designation),
      department = COALESCE($7, department),
      base_salary = COALESCE($8, base_salary),
      hired_on = COALESCE($9, hired_on),
      is_active = COALESCE($10, is_active),
      updated_at = now()
  WHERE club_id = $1 AND id = $2
  RETURNING *;
`;

export const DELETE_EMPLOYEE = `
  UPDATE app.employees
  SET is_active = false, updated_at = now()
  WHERE club_id = $1 AND id = $2
  RETURNING *;
`;

// ─── Leave Types & Requests ────────────────────────────────────────────────
export const GET_LEAVE_TYPES = `
  SELECT * FROM app.leave_types 
  WHERE club_id = $1 AND is_active = true 
  ORDER BY name ASC;
`;

export const INSERT_LEAVE_TYPE = `
  INSERT INTO app.leave_types (club_id, name, annual_quota_days, is_paid, is_active)
  VALUES ($1, $2, $3, $4, true)
  ON CONFLICT (club_id, name)
  DO UPDATE SET annual_quota_days = EXCLUDED.annual_quota_days, is_paid = EXCLUDED.is_paid, is_active = true, updated_at = now()
  RETURNING *;
`;

export const GET_LEAVE_REQUESTS = `
  SELECT lr.*, e.full_name as employee_name, e.employee_code, e.department, e.designation,
         lt.name as leave_type_name, lt.is_paid,
         u.full_name as decided_by_name
  FROM app.leave_requests lr
  JOIN app.employees e ON lr.employee_id = e.id
  JOIN app.leave_types lt ON lr.leave_type_id = lt.id
  LEFT JOIN app.users u ON lr.decided_by = u.id
  WHERE lr.club_id = $1
    AND (
      $2::text IS NULL OR $2::text = '' OR
      e.full_name ILIKE '%' || $2 || '%' OR
      lt.name ILIKE '%' || $2 || '%' OR
      lr.status::text ILIKE '%' || $2 || '%' OR
      lr.reason ILIKE '%' || $2 || '%' OR
      similarity(e.full_name, $2) > 0.15
    )
  ORDER BY lr.created_at DESC;
`;

export const INSERT_LEAVE_REQUEST = `
  INSERT INTO app.leave_requests (club_id, employee_id, leave_type_id, from_date, to_date, days, reason, status)
  VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending')
  RETURNING *;
`;

export const UPDATE_LEAVE_STATUS = `
  UPDATE app.leave_requests
  SET status = $3, decided_by = $4, decided_at = now(), decision_note = $5, updated_at = now()
  WHERE club_id = $1 AND id = $2
  RETURNING *;
`;

// ─── Payroll Runs & Entries ────────────────────────────────────────────────
export const GET_PAYROLL_RUNS = `
  SELECT pr.*, u.full_name as approved_by_name,
         COUNT(pe.id)::int as total_entries,
         COALESCE(SUM(pe.base_salary), 0)::numeric(12,2) as total_base_salary,
         COALESCE(SUM(pe.allowances), 0)::numeric(12,2) as total_allowances,
         COALESCE(SUM(pe.deductions), 0)::numeric(12,2) as total_deductions,
         COALESCE(SUM(pe.net_pay), 0)::numeric(12,2) as total_net_pay
  FROM app.payroll_runs pr
  LEFT JOIN app.users u ON pr.approved_by = u.id
  LEFT JOIN app.payroll_entries pe ON pr.id = pe.run_id
  WHERE pr.club_id = $1
  GROUP BY pr.id, u.full_name
  ORDER BY pr.period_month DESC;
`;

export const GET_PAYROLL_ENTRIES_BY_RUN = `
  SELECT pe.*, e.full_name as employee_name, e.employee_code, e.designation, e.department
  FROM app.payroll_entries pe
  JOIN app.employees e ON pe.employee_id = e.id
  WHERE pe.club_id = $1 AND pe.run_id = $2
  ORDER BY e.full_name ASC;
`;

export const INSERT_PAYROLL_RUN = `
  INSERT INTO app.payroll_runs (club_id, period_month, status)
  VALUES ($1, $2, 'draft')
  ON CONFLICT (club_id, period_month)
  DO UPDATE SET updated_at = now()
  RETURNING *;
`;

export const INSERT_PAYROLL_ENTRY = `
  INSERT INTO app.payroll_entries (
    club_id, run_id, employee_id, base_salary, allowances, deductions, unpaid_leave_days, payment_method
  )
  VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
  ON CONFLICT (run_id, employee_id)
  DO UPDATE SET
    base_salary = EXCLUDED.base_salary,
    allowances = EXCLUDED.allowances,
    deductions = EXCLUDED.deductions,
    unpaid_leave_days = EXCLUDED.unpaid_leave_days,
    payment_method = EXCLUDED.payment_method,
    updated_at = now()
  RETURNING *;
`;

export const APPROVE_PAYROLL_RUN = `
  UPDATE app.payroll_runs
  SET status = $3, approved_by = $4, approved_at = now(), updated_at = now()
  WHERE club_id = $1 AND id = $2
  RETURNING *;
`;