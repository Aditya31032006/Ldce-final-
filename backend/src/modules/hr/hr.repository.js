import * as queries from './hr.query.js';
import { withTenantTransaction } from '../../shared/utils/transaction.util.js';

// ─── Staff Access & Roles ───────────────────────────────────────────────────
export async function getStaff(userId, clubId, activeOnly = null) {
  return withTenantTransaction(userId, clubId, async (client) => {
    const res = await client.query(queries.GET_STAFF, [clubId, activeOnly]);
    return res.rows;
  });
}

export async function addStaff(userId, clubId, staffData) {
  return withTenantTransaction(userId, clubId, async (client) => {
    const res = await client.query(queries.ADD_STAFF, [
      clubId,
      staffData.user_id,
      staffData.role
    ]);
    return res.rows[0];
  });
}

export async function removeStaff(userId, clubId, staffUserId) {
  return withTenantTransaction(userId, clubId, async (client) => {
    const res = await client.query(queries.REMOVE_STAFF, [clubId, staffUserId]);
    return res.rows[0];
  });
}

// ─── Employees & Salary Management ──────────────────────────────────────────
export async function getEmployees(userId, clubId) {
  return withTenantTransaction(userId, clubId, async (client) => {
    const res = await client.query(queries.GET_EMPLOYEES, [clubId]);
    return res.rows;
  });
}

export async function getEmployeeById(userId, clubId, empId) {
  return withTenantTransaction(userId, clubId, async (client) => {
    const res = await client.query(queries.GET_EMPLOYEE_BY_ID, [clubId, empId]);
    return res.rows[0] || null;
  });
}

export async function createEmployee(userId, clubId, data) {
  return withTenantTransaction(userId, clubId, async (client) => {
    const res = await client.query(queries.INSERT_EMPLOYEE, [
      clubId,
      data.employee_code,
      data.full_name,
      data.phone || null,
      data.email || null,
      data.designation || null,
      data.department || null,
      data.hired_on || new Date().toISOString().split('T')[0],
      Number(data.base_salary || 0),
      data.user_id || null,
    ]);
    return res.rows[0];
  });
}

export async function updateEmployee(userId, clubId, empId, data) {
  return withTenantTransaction(userId, clubId, async (client) => {
    const res = await client.query(queries.UPDATE_EMPLOYEE, [
      clubId,
      empId,
      data.full_name !== undefined ? data.full_name : null,
      data.phone !== undefined ? data.phone : null,
      data.email !== undefined ? data.email : null,
      data.designation !== undefined ? data.designation : null,
      data.department !== undefined ? data.department : null,
      data.base_salary !== undefined ? Number(data.base_salary) : null,
      data.hired_on !== undefined ? data.hired_on : null,
      data.is_active !== undefined ? Boolean(data.is_active) : null,
    ]);
    return res.rows[0];
  });
}

export async function deleteEmployee(userId, clubId, empId) {
  return withTenantTransaction(userId, clubId, async (client) => {
    const res = await client.query(queries.DELETE_EMPLOYEE, [clubId, empId]);
    return res.rows[0];
  });
}

// ─── Leave Types & Requests ─────────────────────────────────────────────────
export async function getLeaveTypes(userId, clubId) {
  return withTenantTransaction(userId, clubId, async (client) => {
    const res = await client.query(queries.GET_LEAVE_TYPES, [clubId]);
    return res.rows;
  });
}

export async function createLeaveType(userId, clubId, data) {
  return withTenantTransaction(userId, clubId, async (client) => {
    const res = await client.query(queries.INSERT_LEAVE_TYPE, [
      clubId,
      data.name,
      data.annual_quota_days || 15,
      data.is_paid !== false,
    ]);
    return res.rows[0];
  });
}

export async function getLeaveRequests(userId, clubId) {
  return withTenantTransaction(userId, clubId, async (client) => {
    const res = await client.query(queries.GET_LEAVE_REQUESTS, [clubId]);
    return res.rows;
  });
}

export async function createLeaveRequest(userId, clubId, data) {
  return withTenantTransaction(userId, clubId, async (client) => {
    const res = await client.query(queries.INSERT_LEAVE_REQUEST, [
      clubId,
      data.employee_id,
      data.leave_type_id,
      data.from_date,
      data.to_date,
      Number(data.days || 1),
      data.reason || null,
    ]);
    return res.rows[0];
  });
}

export async function updateLeaveStatus(userId, clubId, requestId, status, decisionNote, decidedBy) {
  return withTenantTransaction(userId, clubId, async (client) => {
    const res = await client.query(queries.UPDATE_LEAVE_STATUS, [
      clubId,
      requestId,
      status,
      decidedBy,
      decisionNote || null,
    ]);
    return res.rows[0];
  });
}

// ─── Payroll Runs & Entries ─────────────────────────────────────────────────
export async function getPayrollRuns(userId, clubId) {
  return withTenantTransaction(userId, clubId, async (client) => {
    const res = await client.query(queries.GET_PAYROLL_RUNS, [clubId]);
    return res.rows;
  });
}

export async function getPayrollEntries(userId, clubId, runId) {
  return withTenantTransaction(userId, clubId, async (client) => {
    const res = await client.query(queries.GET_PAYROLL_ENTRIES_BY_RUN, [clubId, runId]);
    return res.rows;
  });
}

export async function generateMonthlyPayroll(userId, clubId, periodMonth) {
  return withTenantTransaction(userId, clubId, async (client) => {
    // 1. Create or get run for period_month
    const runRes = await client.query(queries.INSERT_PAYROLL_RUN, [clubId, periodMonth]);
    const run = runRes.rows[0];

    // 2. Fetch all active employees
    const empRes = await client.query(
      "SELECT * FROM app.employees WHERE club_id = $1 AND is_active = true",
      [clubId]
    );
    const employees = empRes.rows;

    const entries = [];
    for (const emp of employees) {
      const baseSalary = Number(emp.base_salary || 0);

      // Check unpaid leave days for this employee in this month
      const unpaidLeaveRes = await client.query(`
        SELECT COALESCE(SUM(lr.days), 0) as unpaid_days
        FROM app.leave_requests lr
        JOIN app.leave_types lt ON lr.leave_type_id = lt.id
        WHERE lr.club_id = $1
          AND lr.employee_id = $2
          AND lr.status = 'approved'
          AND lt.is_paid = false
          AND lr.from_date >= $3::date
          AND lr.from_date < ($3::date + interval '1 month')
      `, [clubId, emp.id, periodMonth]);

      const unpaidDays = Number(unpaidLeaveRes.rows[0]?.unpaid_days || 0);
      const perDayRate = baseSalary > 0 ? (baseSalary / 30) : 0;
      const deductionForUnpaidLeave = Math.round(unpaidDays * perDayRate * 100) / 100;

      const allowances = 0; // Configurable baseline
      const deductions = deductionForUnpaidLeave;

      const entryRes = await client.query(queries.INSERT_PAYROLL_ENTRY, [
        clubId,
        run.id,
        emp.id,
        baseSalary,
        allowances,
        deductions,
        unpaidDays,
        'bank_transfer',
      ]);
      entries.push(entryRes.rows[0]);
    }

    return { run, entries };
  });
}

export async function approvePayrollRun(userId, clubId, runId, status = 'paid') {
  return withTenantTransaction(userId, clubId, async (client) => {
    const res = await client.query(queries.APPROVE_PAYROLL_RUN, [
      clubId,
      runId,
      status,
      userId,
    ]);
    return res.rows[0];
  });
}

// ─── Diagnostics Engine ─────────────────────────────────────────────────────
export async function getHRDiagnostics(userId, clubId) {
  return withTenantTransaction(userId, clubId, async (client) => {
    // 1. Employee headcount & salary stats
    const empStats = await client.query(`
      SELECT 
        COUNT(*)::int as total_employees,
        COUNT(CASE WHEN is_active THEN 1 END)::int as active_employees,
        COUNT(CASE WHEN NOT is_active THEN 1 END)::int as inactive_employees,
        COALESCE(SUM(CASE WHEN is_active THEN base_salary ELSE 0 END), 0)::numeric(12,2) as total_monthly_payroll,
        COALESCE(AVG(CASE WHEN is_active AND base_salary > 0 THEN base_salary ELSE NULL END), 0)::numeric(12,2) as avg_base_salary,
        COUNT(CASE WHEN is_active AND (base_salary = 0 OR base_salary IS NULL) THEN 1 END)::int as missing_salary_count
      FROM app.employees
      WHERE club_id = $1
    `, [clubId]);

    // 2. Department salary & headcount breakdown
    const deptStats = await client.query(`
      SELECT 
        COALESCE(department, 'Unassigned') as department,
        COUNT(*)::int as headcount,
        COALESCE(SUM(base_salary), 0)::numeric(12,2) as total_salary,
        COALESCE(AVG(base_salary), 0)::numeric(12,2) as avg_salary
      FROM app.employees
      WHERE club_id = $1 AND is_active = true
      GROUP BY department
      ORDER BY total_salary DESC
    `, [clubId]);

    // 3. Leave analytics
    const leaveStats = await client.query(`
      SELECT 
        COUNT(CASE WHEN status = 'pending' THEN 1 END)::int as pending_approvals,
        COUNT(CASE WHEN status = 'approved' AND date_trunc('month', created_at) = date_trunc('month', CURRENT_DATE) THEN 1 END)::int as approved_this_month,
        COALESCE(SUM(CASE WHEN status = 'approved' AND date_trunc('month', created_at) = date_trunc('month', CURRENT_DATE) THEN days ELSE 0 END), 0)::numeric(5,1) as total_days_taken_this_month,
        COUNT(CASE WHEN status = 'approved' AND CURRENT_DATE BETWEEN from_date AND to_date THEN 1 END)::int as currently_on_leave_today
      FROM app.leave_requests
      WHERE club_id = $1
    `, [clubId]);

    // 4. Payroll run summary
    const payrollStats = await client.query(`
      SELECT 
        COUNT(*)::int as total_runs,
        COUNT(CASE WHEN status = 'draft' THEN 1 END)::int as draft_runs,
        COUNT(CASE WHEN status = 'paid' THEN 1 END)::int as paid_runs,
        COALESCE(SUM(CASE WHEN status = 'paid' THEN pe_sum.total_net ELSE 0 END), 0)::numeric(12,2) as total_disbursed_all_time
      FROM app.payroll_runs pr
      LEFT JOIN LATERAL (
        SELECT SUM(net_pay) as total_net FROM app.payroll_entries WHERE run_id = pr.id
      ) pe_sum ON true
      WHERE pr.club_id = $1
    `, [clubId]);

    // 5. System staff linking status
    const staffStats = await client.query(`
      SELECT 
        COUNT(*)::int as system_staff_count,
        COUNT(CASE WHEN e.id IS NOT NULL THEN 1 END)::int as staff_with_employee_record,
        COUNT(CASE WHEN e.id IS NULL THEN 1 END)::int as staff_without_employee_record
      FROM app.club_staff cs
      LEFT JOIN app.employees e ON cs.club_id = e.club_id AND cs.user_id = e.user_id
      WHERE cs.club_id = $1 AND cs.is_active = true
    `, [clubId]);

    return {
      employees: empStats.rows[0],
      departments: deptStats.rows,
      leaves: leaveStats.rows[0],
      payroll: payrollStats.rows[0],
      staff_integration: staffStats.rows[0],
    };
  });
}