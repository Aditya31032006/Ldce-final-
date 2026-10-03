export const GET_STAFF = `
  SELECT cs.user_id, cs.role, cs.is_active, u.full_name, u.email, u.phone
  FROM app.club_staff cs
  JOIN users u ON cs.user_id = u.id
  WHERE cs.club_id = $1 AND ($2::boolean IS NULL OR cs.is_active = $2);
`;

export const ADD_STAFF = `
  INSERT INTO app.club_staff (club_id, user_id, role, is_active)
  VALUES ($1, $2, $3, true)
  RETURNING *;
`;

export const GET_EMPLOYEES = 'SELECT * FROM app.employees WHERE club_id = $1;';
export const INSERT_EMPLOYEE = 'INSERT INTO app.employees (club_id, employee_code, full_name, base_salary) VALUES ($1, $2, $3, $4) RETURNING *;';
export const GET_LEAVE_REQUESTS = 'SELECT * FROM app.leave_requests WHERE club_id = $1;';