import * as hrRepo from './hr.repository.js';
import * as authRepo from '../auth/auth.repository.js';

// ─── Staff Access Controllers ───────────────────────────────────────────────
export async function getStaffController(req, res, next) {
  try {
    const activeOnly = (req.user.role !== 'owner' && req.user.role !== 'manager') ? true : null;
    const staff = await hrRepo.getStaff(req.user.id, req.clubId, activeOnly);
    return res.status(200).json({ staff });
  } catch (error) {
    next(error);
  }
}

export async function addStaffController(req, res, next) {
  try {
    let { user_id, email, role } = req.body;
    if (!role) {
      return res.status(400).json({ message: "Role is required (e.g. manager, front_desk, bar_staff, kitchen, shop_staff)" });
    }

    if (!user_id) {
      if (!email) {
        return res.status(400).json({ message: "Customer email or user_id is required" });
      }
      const normalizedEmail = email.trim().toLowerCase();
      const user = await authRepo.findUserByEmail(normalizedEmail);
      if (!user) {
        return res.status(404).json({ 
          message: `No existing user found with email "${normalizedEmail}". The person must register first before being added as staff.` 
        });
      }
      user_id = user.id;
    }

    const staff = await hrRepo.addStaff(req.user.id, req.clubId, { user_id, role });
    return res.status(201).json({ message: "Staff member added successfully", staff });
  } catch (error) {
    next(error);
  }
}

export async function removeStaffController(req, res, next) {
  try {
    const { userId } = req.params;
    if (!userId) {
      return res.status(400).json({ message: "Staff user ID is required" });
    }
    if (userId === req.user.id) {
      return res.status(400).json({ message: "You cannot remove yourself from staff" });
    }
    const removed = await hrRepo.removeStaff(req.user.id, req.clubId, userId);
    if (!removed) {
      return res.status(404).json({ message: "Staff member not found" });
    }
    return res.status(200).json({ message: "Staff member removed successfully", staff: removed });
  } catch (error) {
    next(error);
  }
}

// ─── Employees & Salary Controllers ─────────────────────────────────────────
export async function getEmployeesController(req, res, next) {
  try {
    const employees = await hrRepo.getEmployees(req.user.id, req.clubId);
    return res.status(200).json({ employees });
  } catch (error) { 
    next(error); 
  }
}

export async function createEmployeeController(req, res, next) {
  try {
    const { employee_code, full_name, phone, email, designation, department, hired_on, base_salary, user_id } = req.body;
    if (!full_name || !full_name.trim()) {
      return res.status(400).json({ message: "Full name is required" });
    }
    const finalCode = employee_code?.trim() || `EMP-${Date.now().toString().slice(-4)}`;

    const employee = await hrRepo.createEmployee(req.user.id, req.clubId, {
      employee_code: finalCode,
      full_name: full_name.trim(),
      phone: phone?.trim(),
      email: email?.trim(),
      designation: designation?.trim(),
      department: department?.trim(),
      hired_on,
      base_salary: Number(base_salary || 0),
      user_id,
    });
    return res.status(201).json({ message: "Employee registered successfully", employee });
  } catch (error) {
    next(error);
  }
}

export async function updateEmployeeController(req, res, next) {
  try {
    const { id } = req.params;
    const employee = await hrRepo.updateEmployee(req.user.id, req.clubId, id, req.body);
    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }
    return res.status(200).json({ message: "Employee details and salary updated successfully", employee });
  } catch (error) {
    next(error);
  }
}

export async function deleteEmployeeController(req, res, next) {
  try {
    const { id } = req.params;
    const employee = await hrRepo.deleteEmployee(req.user.id, req.clubId, id);
    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }
    return res.status(200).json({ message: "Employee deactivated successfully", employee });
  } catch (error) {
    next(error);
  }
}

// ─── Leave Management Controllers ───────────────────────────────────────────
export async function getLeaveTypesController(req, res, next) {
  try {
    const leaveTypes = await hrRepo.getLeaveTypes(req.user.id, req.clubId);
    return res.status(200).json({ leaveTypes });
  } catch (error) {
    next(error);
  }
}

export async function createLeaveTypeController(req, res, next) {
  try {
    const { name, annual_quota_days, is_paid } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ message: "Leave type name is required" });
    }
    const leaveType = await hrRepo.createLeaveType(req.user.id, req.clubId, {
      name: name.trim(),
      annual_quota_days: Number(annual_quota_days || 12),
      is_paid: is_paid !== false,
    });
    return res.status(201).json({ message: "Leave type configured successfully", leaveType });
  } catch (error) {
    next(error);
  }
}

export async function getLeaveRequestsController(req, res, next) {
  try {
    const leaveRequests = await hrRepo.getLeaveRequests(req.user.id, req.clubId);
    return res.status(200).json({ leaveRequests });
  } catch (error) {
    next(error);
  }
}

export async function createLeaveRequestController(req, res, next) {
  try {
    const { employee_id, leave_type_id, from_date, to_date, days, reason } = req.body;
    if (!employee_id || !leave_type_id || !from_date || !to_date) {
      return res.status(400).json({ message: "Employee, leave type, start date, and end date are required" });
    }
    const calculatedDays = Number(days) > 0 ? Number(days) : 1;
    const leaveRequest = await hrRepo.createLeaveRequest(req.user.id, req.clubId, {
      employee_id,
      leave_type_id,
      from_date,
      to_date,
      days: calculatedDays,
      reason,
    });
    return res.status(201).json({ message: "Leave request submitted successfully", leaveRequest });
  } catch (error) {
    next(error);
  }
}

export async function updateLeaveStatusController(req, res, next) {
  try {
    const { id } = req.params;
    const { status, decision_note } = req.body;
    if (!['approved', 'rejected', 'cancelled'].includes(status)) {
      return res.status(400).json({ message: "Status must be 'approved', 'rejected', or 'cancelled'" });
    }
    const updated = await hrRepo.updateLeaveStatus(
      req.user.id,
      req.clubId,
      id,
      status,
      decision_note,
      req.user.id
    );
    if (!updated) {
      return res.status(404).json({ message: "Leave request not found" });
    }
    return res.status(200).json({ message: `Leave request ${status} successfully`, leaveRequest: updated });
  } catch (error) {
    next(error);
  }
}

// ─── Payroll Controllers ────────────────────────────────────────────────────
export async function getPayrollRunsController(req, res, next) {
  try {
    const payrollRuns = await hrRepo.getPayrollRuns(req.user.id, req.clubId);
    return res.status(200).json({ payrollRuns });
  } catch (error) {
    next(error);
  }
}

export async function getPayrollEntriesController(req, res, next) {
  try {
    const { runId } = req.params;
    const entries = await hrRepo.getPayrollEntries(req.user.id, req.clubId, runId);
    return res.status(200).json({ entries });
  } catch (error) {
    next(error);
  }
}

export async function generateMonthlyPayrollController(req, res, next) {
  try {
    const { period_month } = req.body;
    if (!period_month) {
      return res.status(400).json({ message: "Period month is required (YYYY-MM-01 format)" });
    }
    const result = await hrRepo.generateMonthlyPayroll(req.user.id, req.clubId, period_month);
    return res.status(201).json({ 
      message: `Payroll run generated for ${period_month} with ${result.entries.length} employee entries`,
      ...result 
    });
  } catch (error) {
    next(error);
  }
}

export async function approvePayrollRunController(req, res, next) {
  try {
    const { runId } = req.params;
    const { status } = req.body;
    const updated = await hrRepo.approvePayrollRun(req.user.id, req.clubId, runId, status || 'paid');
    return res.status(200).json({ message: "Payroll run marked as paid and disbursed", run: updated });
  } catch (error) {
    next(error);
  }
}

// ─── Diagnostics Controller ─────────────────────────────────────────────────
export async function getHRDiagnosticsController(req, res, next) {
  try {
    const diagnostics = await hrRepo.getHRDiagnostics(req.user.id, req.clubId);
    return res.status(200).json({ diagnostics });
  } catch (error) {
    next(error);
  }
}