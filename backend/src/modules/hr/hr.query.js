export const GET_STAFF = `
  SELECT cs.user_id, cs.role, cs.is_active, cs.created_at, u.full_name, u.email, u.phone, u.avatar_url
  FROM app.club_staff cs
  JOIN app.users u ON cs.user_id = u.id
  WHERE cs.club_id = $1 AND ($2::boolean IS NULL OR cs.is_active = $2)
  ORDER BY cs.created_at ASC;
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

export const GET_EMPLOYEES = 'SELECT * FROM app.employees WHERE club_id = $1;';
export const INSERT_EMPLOYEE = 'INSERT INTO app.employees (club_id, employee_code, full_name, base_salary) VALUES ($1, $2, $3, $4) RETURNING *;';
export const GET_LEAVE_REQUESTS = 'SELECT * FROM app.leave_requests WHERE club_id = $1;';