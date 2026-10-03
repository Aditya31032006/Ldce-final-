import apiClient from '../../../shared/services/api.js';

export const hrApi = {
  // ─── Staff Access ──────────────────────────────────────────────────────────
  async getStaff() {
    const res = await apiClient.get('/hr');
    return res.data;
  },
  async addStaff(staffData) {
    const res = await apiClient.post('/hr', staffData);
    return res.data;
  },
  async removeStaff(userId) {
    const res = await apiClient.delete(`/hr/${userId}`);
    return res.data;
  },

  // ─── Employees & Salary Decider ───────────────────────────────────────────
  async getEmployees() {
    const res = await apiClient.get('/hr/employees');
    return res.data;
  },
  async createEmployee(employeeData) {
    const res = await apiClient.post('/hr/employees', employeeData);
    return res.data;
  },
  async updateEmployee(id, employeeData) {
    const res = await apiClient.put(`/hr/employees/${id}`, employeeData);
    return res.data;
  },
  async deleteEmployee(id) {
    const res = await apiClient.delete(`/hr/employees/${id}`);
    return res.data;
  },

  // ─── Leave Management ─────────────────────────────────────────────────────
  async getLeaveTypes() {
    const res = await apiClient.get('/hr/leave-types');
    return res.data;
  },
  async createLeaveType(leaveTypeData) {
    const res = await apiClient.post('/hr/leave-types', leaveTypeData);
    return res.data;
  },
  async getLeaves() {
    const res = await apiClient.get('/hr/leaves');
    return res.data;
  },
  async createLeave(leaveData) {
    const res = await apiClient.post('/hr/leaves', leaveData);
    return res.data;
  },
  async updateLeaveStatus(id, status, decisionNote = '') {
    const res = await apiClient.put(`/hr/leaves/${id}/status`, {
      status,
      decision_note: decisionNote,
    });
    return res.data;
  },

  // ─── Payroll & Salary Runs ────────────────────────────────────────────────
  async getPayrollRuns() {
    const res = await apiClient.get('/hr/payroll');
    return res.data;
  },
  async getPayrollEntries(runId) {
    const res = await apiClient.get(`/hr/payroll/${runId}/entries`);
    return res.data;
  },
  async generateMonthlyPayroll(periodMonth) {
    const res = await apiClient.post('/hr/payroll/run', { period_month: periodMonth });
    return res.data;
  },
  async approvePayrollRun(runId, status = 'paid') {
    const res = await apiClient.put(`/hr/payroll/${runId}/pay`, { status });
    return res.data;
  },

  // ─── HR & Diagnostics ─────────────────────────────────────────────────────
  async getDiagnostics() {
    const res = await apiClient.get('/hr/diagnostics');
    return res.data;
  },
};

export default hrApi;
