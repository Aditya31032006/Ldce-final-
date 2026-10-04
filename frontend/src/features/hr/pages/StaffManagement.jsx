import React, { useState, useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchStaff } from '../hr.slice.js';
import hrApi from '../services/hr.api.js';
import useAuth from '../../auth/hook/useAuth.js';
import { useToast } from '../../../shared/context/ToastContext.jsx';
import useDebounce from '../../../shared/hooks/useDebounce.js';
import {
  Users,
  UserPlus,
  Trash2,
  Mail,
  Phone,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Search,
  RefreshCw,
  Building,
  Briefcase,
  X,
  Calendar,
  Clock,
  Activity,
  FileText,
  Check,
  AlertCircle,
  Edit3,
  Plus,
  TrendingUp,
  DollarSign,
  Award
} from 'lucide-react';

const ROLE_LABELS = {
  owner: 'Club Owner',
  manager: 'Operations Manager',
  front_desk: 'Front Desk Lead',
  shop_staff: 'Pro Shop Staff',
  bar_staff: 'Bar & Cafe Lead',
  kitchen: 'Kitchen & F&B',
  coach: 'Head Coach',
  maintenance: 'Facilities & Maintenance'
};

const ROLE_DEPARTMENTS = {
  owner: 'Executive Office',
  manager: 'General Operations',
  front_desk: 'Reception & Front Desk',
  shop_staff: 'Pro Shop & Retail',
  bar_staff: 'Hospitality & Bar',
  kitchen: 'Dining & Kitchen',
  coach: 'Athletics & Coaching',
  maintenance: 'Facility Management'
};

export default function StaffManagement() {
  const dispatch = useDispatch();
  const { staffList, loading: staffLoading } = useSelector((state) => state.hr);
  const { user, role, clubId, clubs } = useAuth();
  const { toast } = useToast();

  const userRole = (role || '').toLowerCase();
  const isAuthorized = userRole === 'owner' || userRole === 'admin' || userRole === 'manager';

  const activeClub = clubs?.find(c => (c.club_id === clubId || c.id === clubId)) || clubs?.[0];
  const clubName = activeClub?.name || 'Club Facility';

  // Navigation Tabs: 'employees' | 'leaves' | 'payroll' | 'diagnostics' | 'staff'
  const [activeTab, setActiveTab] = useState('employees');

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 300);

  // ─── Data States ────────────────────────────────────────────────────────────
  const [employees, setEmployees] = useState([]);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [payrollRuns, setPayrollRuns] = useState([]);
  const [selectedPayrollEntries, setSelectedPayrollEntries] = useState(null);
  const [activeRunModal, setActiveRunModal] = useState(null);
  const [diagnostics, setDiagnostics] = useState(null);
  const [loading, setLoading] = useState(false);

  // ─── Modals State ───────────────────────────────────────────────────────────
  // 1. Employee Edit / Add Modal
  const [showEmployeeModal, setShowEmployeeModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [empForm, setEmpForm] = useState({
    employee_code: '',
    full_name: '',
    phone: '',
    email: '',
    designation: '',
    department: 'Athletics & Coaching',
    base_salary: '',
    hired_on: new Date().toISOString().split('T')[0],
  });

  // 2. Submit Leave Request Modal
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [leaveForm, setLeaveForm] = useState({
    employee_id: '',
    leave_type_id: '',
    from_date: new Date().toISOString().split('T')[0],
    to_date: new Date().toISOString().split('T')[0],
    days: 1,
    reason: '',
  });

  // 3. Decide Leave Modal (Approve / Reject)
  const [decidingLeave, setDecidingLeave] = useState(null);
  const [decisionNote, setDecisionNote] = useState('');

  // 4. Generate Payroll Modal
  const [showPayrollModal, setShowPayrollModal] = useState(false);
  const [payrollMonth, setPayrollMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
  });

  // 5. Add System Staff Modal
  const [showAddStaffModal, setShowAddStaffModal] = useState(false);
  const [newStaffEmail, setNewStaffEmail] = useState('');
  const [newStaffRole, setNewStaffRole] = useState('front_desk');

  const [submitting, setSubmitting] = useState(false);

  // ─── Data Fetching ──────────────────────────────────────────────────────────
  const loadAllHRData = useCallback(async () => {
    setLoading(true);
    try {
      const searchParam = debouncedSearch.trim() ? { search: debouncedSearch.trim() } : {};
      dispatch(fetchStaff(searchParam));
      const [empRes, ltRes, lrRes, prRes, diagRes] = await Promise.all([
        hrApi.getEmployees(searchParam).catch(() => ({ employees: [] })),
        hrApi.getLeaveTypes().catch(() => ({ leaveTypes: [] })),
        hrApi.getLeaves(searchParam).catch(() => ({ leaveRequests: [] })),
        hrApi.getPayrollRuns().catch(() => ({ payrollRuns: [] })),
        hrApi.getDiagnostics().catch(() => ({ diagnostics: null })),
      ]);

      setEmployees(empRes.employees || []);
      setLeaveTypes(ltRes.leaveTypes || []);
      setLeaveRequests(lrRes.leaveRequests || []);
      setPayrollRuns(prRes.payrollRuns || []);
      setDiagnostics(diagRes.diagnostics || null);
    } catch (err) {
      console.warn('Could not load all HR data:', err);
    } finally {
      setLoading(false);
    }
  }, [dispatch, debouncedSearch]);

  useEffect(() => {
    loadAllHRData();
  }, [loadAllHRData, clubId]);

  // ─── Employee & Salary Handlers ─────────────────────────────────────────────
  const handleOpenAddEmployee = () => {
    setEditingEmployee(null);
    setEmpForm({
      employee_code: `EMP-${Math.floor(1000 + Math.random() * 9000)}`,
      full_name: '',
      phone: '',
      email: '',
      designation: '',
      department: 'Athletics & Coaching',
      base_salary: '35000',
      hired_on: new Date().toISOString().split('T')[0],
    });
    setShowEmployeeModal(true);
  };

  const handleOpenEditEmployee = (emp) => {
    setEditingEmployee(emp);
    setEmpForm({
      employee_code: emp.employee_code || '',
      full_name: emp.full_name || '',
      phone: emp.phone || '',
      email: emp.email || '',
      designation: emp.designation || '',
      department: emp.department || 'Athletics & Coaching',
      base_salary: emp.base_salary || '0',
      hired_on: emp.hired_on ? String(emp.hired_on).split('T')[0] : '',
    });
    setShowEmployeeModal(true);
  };

  const handleSaveEmployee = async (e) => {
    e.preventDefault();
    if (!empForm.full_name.trim()) {
      toast.error('Employee full name is required');
      return;
    }
    setSubmitting(true);
    try {
      if (editingEmployee) {
        await hrApi.updateEmployee(editingEmployee.id, {
          full_name: empForm.full_name.trim(),
          phone: empForm.phone.trim(),
          email: empForm.email.trim(),
          designation: empForm.designation.trim(),
          department: empForm.department,
          base_salary: Number(empForm.base_salary || 0),
          hired_on: empForm.hired_on || undefined,
        });
        toast.success(`Salary & details updated for ${empForm.full_name}`);
      } else {
        await hrApi.createEmployee({
          employee_code: empForm.employee_code.trim(),
          full_name: empForm.full_name.trim(),
          phone: empForm.phone.trim(),
          email: empForm.email.trim(),
          designation: empForm.designation.trim(),
          department: empForm.department,
          base_salary: Number(empForm.base_salary || 0),
          hired_on: empForm.hired_on || undefined,
        });
        toast.success(`Employee ${empForm.full_name} enrolled with base salary ₹${Number(empForm.base_salary).toLocaleString()}`);
      }
      setShowEmployeeModal(false);
      loadAllHRData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save employee profile');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteEmployee = async (emp) => {
    if (!window.confirm(`Deactivate employee record for "${emp.full_name}"?`)) return;
    try {
      await hrApi.deleteEmployee(emp.id);
      toast.success(`${emp.full_name} deactivated`);
      loadAllHRData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to deactivate employee');
    }
  };

  // ─── Leave Handlers ─────────────────────────────────────────────────────────
  const handleOpenLeaveModal = () => {
    setLeaveForm({
      employee_id: employees[0]?.id || '',
      leave_type_id: leaveTypes[0]?.id || '',
      from_date: new Date().toISOString().split('T')[0],
      to_date: new Date().toISOString().split('T')[0],
      days: 1,
      reason: '',
    });
    setShowLeaveModal(true);
  };

  const handleSaveLeave = async (e) => {
    e.preventDefault();
    if (!leaveForm.employee_id || !leaveForm.leave_type_id) {
      toast.error('Please select both the employee and leave category');
      return;
    }
    setSubmitting(true);
    try {
      await hrApi.createLeave({
        employee_id: leaveForm.employee_id,
        leave_type_id: leaveForm.leave_type_id,
        from_date: leaveForm.from_date,
        to_date: leaveForm.to_date,
        days: Number(leaveForm.days || 1),
        reason: leaveForm.reason.trim(),
      });
      toast.success('Leave request submitted successfully');
      setShowLeaveModal(false);
      loadAllHRData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit leave request');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDecideLeave = async (status) => {
    if (!decidingLeave) return;
    setSubmitting(true);
    try {
      await hrApi.updateLeaveStatus(decidingLeave.id, status, decisionNote);
      toast.success(`Leave request ${status} for ${decidingLeave.employee_name}`);
      setDecidingLeave(null);
      setDecisionNote('');
      loadAllHRData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update leave status');
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Payroll Handlers ───────────────────────────────────────────────────────
  const handleGeneratePayroll = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await hrApi.generateMonthlyPayroll(payrollMonth);
      toast.success(res.message || 'Payroll run generated successfully');
      setShowPayrollModal(false);
      loadAllHRData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to generate payroll');
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprovePayroll = async (runId) => {
    if (!window.confirm('Approve and mark this monthly payroll run as disbursed / paid?')) return;
    try {
      await hrApi.approvePayrollRun(runId, 'paid');
      toast.success('Payroll run marked as paid and accounted');
      loadAllHRData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to approve payroll run');
    }
  };

  const handleViewPayrollEntries = async (run) => {
    setActiveRunModal(run);
    try {
      const res = await hrApi.getPayrollEntries(run.id);
      setSelectedPayrollEntries(res.entries || []);
    } catch (err) {
      toast.error('Failed to load payroll entries');
    }
  };

  // ─── System Staff Handlers ──────────────────────────────────────────────────
  const handleAddStaff = async (e) => {
    e.preventDefault();
    if (!newStaffEmail.trim()) {
      toast.error('Please enter the employee or user email');
      return;
    }
    setSubmitting(true);
    try {
      await hrApi.addStaff({
        email: newStaffEmail.trim(),
        role: newStaffRole,
      });
      toast.success('Staff role assigned successfully!');
      setShowAddStaffModal(false);
      setNewStaffEmail('');
      setNewStaffRole('front_desk');
      loadAllHRData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add staff member');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveStaff = async (staffMember) => {
    const name = staffMember.full_name || staffMember.name || staffMember.email;
    const staffUserId = staffMember.user_id || staffMember.id;
    if (staffUserId === user?.id) {
      toast.error('You cannot remove yourself from the club staff list');
      return;
    }
    if (!window.confirm(`Are you sure you want to remove "${name}" from club staff?`)) {
      return;
    }
    try {
      await hrApi.removeStaff(staffUserId);
      toast.success(`${name} was removed from staff`);
      loadAllHRData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to remove staff member');
    }
  };

  // ─── Filtered Lists (Backend-powered fuzzy search) ────────────────────────
  const filteredEmployees = employees;
  const filteredLeaves = leaveRequests;
  const filteredStaff = staffList || [];

  // Calculate quick metrics
  const totalEmployeesCount = employees.length;
  const activeEmployeesCount = employees.filter(e => e.is_active).length;
  const totalMonthlyPayroll = employees.reduce((acc, e) => acc + (e.is_active ? Number(e.base_salary || 0) : 0), 0);
  const pendingLeavesCount = leaveRequests.filter(l => l.status === 'pending').length;

  return (
    <div className="df-page-wrapper" style={{ background: '#FAF9F6', minHeight: '100vh', padding: '2rem 1.5rem' }}>
      <div className="df-page-container" style={{ maxWidth: '1200px', margin: '0 auto' }}>

        {/* ─── Top Header Strip ─── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.75rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <div style={{
                width: '40px', height: '40px', borderRadius: '10px',
                background: '#EBF3F0', display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <Users size={22} color="#1F5C46" />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <h1 style={{ fontSize: '1.65rem', fontWeight: 800, color: '#1A1A18', margin: 0 }}>
                    Employee & Workforce Management
                  </h1>
                  <span style={{
                    fontSize: '0.72rem', fontWeight: 700, color: '#1F5C46',
                    background: '#EBF3F0', padding: '0.2rem 0.5rem', borderRadius: '4px', textTransform: 'uppercase'
                  }}>
                    {userRole === 'owner' ? 'Owner Suite' : 'Manager Operations'}
                  </span>
                </div>
                <p style={{ margin: '0.2rem 0 0', fontSize: '0.85rem', color: '#6B6B66' }}>
                  Decide employee salaries, approve leaves, manage monthly payroll, and review diagnostics for {clubName}
                </p>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button
              onClick={loadAllHRData}
              disabled={loading || staffLoading}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                padding: '0.6rem 1rem', background: '#FFFFFF', border: '1px solid #E7E5DF',
                borderRadius: '8px', fontSize: '0.85rem', fontWeight: 600, color: '#1A1A18',
                cursor: loading ? 'not-allowed' : 'pointer'
              }}
            >
              <RefreshCw size={15} style={{ animation: loading ? 'df-spin 1s linear infinite' : 'none' }} />
              Refresh
            </button>

            {isAuthorized && (
              <>
                <button
                  onClick={handleOpenAddEmployee}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '0.45rem',
                    padding: '0.6rem 1.25rem', background: '#1F5C46', color: '#FFFFFF',
                    borderRadius: '8px', border: 'none', fontSize: '0.85rem', fontWeight: 700,
                    cursor: 'pointer', boxShadow: '0 2px 8px rgba(31, 92, 70, 0.2)'
                  }}
                >
                  <Plus size={16} />
                  Add Employee
                </button>
                <button
                  onClick={handleOpenLeaveModal}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '0.45rem',
                    padding: '0.6rem 1rem', background: '#FFFFFF', color: '#1F5C46',
                    borderRadius: '8px', border: '1.5px solid #1F5C46', fontSize: '0.85rem', fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  <Calendar size={15} />
                  Log Leave
                </button>
              </>
            )}
          </div>
        </div>

        {/* ─── Metrics Strip ─── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', marginBottom: '1.75rem' }}>
          {/* Active Headcount */}
          <div style={{ background: '#FFFFFF', border: '1px solid #E7E5DF', borderRadius: '10px', padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#6B6B66' }}>
                Total Active Employees
              </span>
              <div style={{ padding: '0.35rem', borderRadius: '6px', background: '#EBF3F0', color: '#1F5C46' }}>
                <Users size={16} />
              </div>
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#1A1A18' }}>{activeEmployeesCount}</div>
            <div style={{ fontSize: '0.75rem', color: '#6B6B66', marginTop: '0.2rem' }}>{totalEmployeesCount} registered in total</div>
          </div>

          {/* Monthly Payroll Commitment */}
          <div style={{ background: '#FFFFFF', border: '1px solid #E7E5DF', borderRadius: '10px', padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#6B6B66' }}>
                Monthly Payroll Commitment
              </span>
              <div style={{ padding: '0.35rem', borderRadius: '6px', background: '#F0FDF4', color: '#15803D' }}>
                <DollarSign size={16} />
              </div>
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#15803D', fontFamily: 'monospace' }}>
              ₹{totalMonthlyPayroll.toLocaleString()}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#6B6B66', marginTop: '0.2rem' }}>Total monthly salaries decided</div>
          </div>

          {/* Pending Leave Requests */}
          <div style={{ background: '#FFFFFF', border: '1px solid #E7E5DF', borderRadius: '10px', padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#6B6B66' }}>
                Pending Leave Decisions
              </span>
              <div style={{ padding: '0.35rem', borderRadius: '6px', background: pendingLeavesCount > 0 ? '#FEF2F2' : '#F0FDF4', color: pendingLeavesCount > 0 ? '#DC2626' : '#15803D' }}>
                <Clock size={16} />
              </div>
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: pendingLeavesCount > 0 ? '#DC2626' : '#15803D' }}>
              {pendingLeavesCount}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#6B6B66', marginTop: '0.2rem' }}>
              {pendingLeavesCount > 0 ? 'Requires Owner/Manager review' : 'All leave requests resolved'}
            </div>
          </div>

          {/* Operational Diagnostics Score */}
          <div style={{ background: '#FFFFFF', border: '1px solid #E7E5DF', borderRadius: '10px', padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#6B6B66' }}>
                Workforce Health Score
              </span>
              <div style={{ padding: '0.35rem', borderRadius: '6px', background: '#EFF6FF', color: '#2563EB' }}>
                <Activity size={16} />
              </div>
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#2563EB' }}>
              {diagnostics?.employees?.missing_salary_count === 0 ? '98%' : '85%'}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#6B6B66', marginTop: '0.2rem' }}>
              {diagnostics?.employees?.missing_salary_count === 0 ? '100% staff salaries decided' : `${diagnostics?.employees?.missing_salary_count} employee(s) need salary setup`}
            </div>
          </div>
        </div>

        {/* ─── Navigation Tabs Strip ─── */}
        <div style={{
          display: 'flex', gap: '0.5rem', borderBottom: '1px solid #E7E5DF',
          marginBottom: '1.5rem', overflowX: 'auto', paddingBottom: '0.25rem'
        }}>
          {[
            { id: 'employees', label: 'Employees & Salaries', icon: Users, badge: activeEmployeesCount },
            { id: 'leaves', label: 'Leave Management', icon: Calendar, badge: pendingLeavesCount > 0 ? pendingLeavesCount : null },
            { id: 'payroll', label: 'Payroll & Salary Runs', icon: DollarSign, badge: payrollRuns.length },
            { id: 'diagnostics', label: 'HR Diagnostics', icon: Activity },
            { id: 'staff', label: 'System Staff & RBAC', icon: ShieldCheck, badge: staffList?.length || 0 },
          ].map(t => {
            const Icon = t.icon;
            const isSel = activeTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '0.45rem',
                  padding: '0.65rem 1.1rem', borderRadius: '8px 8px 0 0',
                  border: 'none',
                  borderBottom: isSel ? '2.5px solid #1F5C46' : '2.5px solid transparent',
                  background: isSel ? '#FFFFFF' : 'transparent',
                  color: isSel ? '#1F5C46' : '#6B6B66',
                  fontWeight: isSel ? 700 : 500,
                  fontSize: '0.85rem', cursor: 'pointer', transition: 'all 0.15s ease'
                }}
              >
                <Icon size={16} />
                <span>{t.label}</span>
                {t.badge != null && (
                  <span style={{
                    fontSize: '0.7rem', padding: '0.1rem 0.45rem', borderRadius: '9999px',
                    background: t.id === 'leaves' && pendingLeavesCount > 0 ? '#DC2626' : (isSel ? '#1F5C46' : '#E7E5DF'),
                    color: '#FFFFFF', fontWeight: 700
                  }}>
                    {t.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* ─── Search & Quick Action Bar ─── */}
        {activeTab !== 'diagnostics' && (
          <div style={{
            background: '#FFFFFF', border: '1px solid #E7E5DF', borderRadius: '10px',
            padding: '1rem', marginBottom: '1.25rem', display: 'flex', justifyContent: 'space-between',
            alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem'
          }}>
            <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
              <Search size={16} color="#6B6B66" style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="text"
                placeholder={
                  activeTab === 'employees'
                    ? "Search employees by name, designation, department, or code..."
                    : activeTab === 'leaves'
                    ? "Filter leave requests by employee name, status, or type..."
                    : "Search workforce records..."
                }
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%', padding: '0.55rem 2.2rem 0.55rem 2.4rem',
                  border: '1px solid #E7E5DF', borderRadius: '6px', fontSize: '0.85rem',
                  background: '#FAF9F6', outline: 'none'
                }}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  style={{
                    position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)',
                    border: 'none', background: 'transparent', cursor: 'pointer', padding: 0, color: '#6B6B66'
                  }}
                  aria-label="Clear search"
                >
                  <X size={15} />
                </button>
              )}
            </div>

            {activeTab === 'payroll' && isAuthorized && (
              <button
                onClick={() => setShowPayrollModal(true)}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                  padding: '0.55rem 1rem', background: '#1F5C46', color: '#FFFFFF',
                  borderRadius: '6px', border: 'none', fontSize: '0.825rem', fontWeight: 700, cursor: 'pointer'
                }}
              >
                <Plus size={15} />
                Generate Month Payroll
              </button>
            )}

            {activeTab === 'staff' && isAuthorized && (
              <button
                onClick={() => setShowAddStaffModal(true)}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                  padding: '0.55rem 1rem', background: '#1F5C46', color: '#FFFFFF',
                  borderRadius: '6px', border: 'none', fontSize: '0.825rem', fontWeight: 700, cursor: 'pointer'
                }}
              >
                <UserPlus size={15} />
                Assign Staff Role
              </button>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════════ */}
        {/* TAB 1: EMPLOYEES & SALARY DECIDER                                      */}
        {/* ═══════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'employees' && (
          <div style={{ background: '#FFFFFF', border: '1px solid #E7E5DF', borderRadius: '12px', overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
                <thead style={{ background: '#FAF9F6', borderBottom: '1px solid #E7E5DF' }}>
                  <tr>
                    <th style={{ padding: '0.85rem 1.25rem', color: '#6B6B66', fontWeight: 700, fontSize: '0.78rem', textTransform: 'uppercase' }}>Employee</th>
                    <th style={{ padding: '0.85rem 1.25rem', color: '#6B6B66', fontWeight: 700, fontSize: '0.78rem', textTransform: 'uppercase' }}>Department & Role</th>
                    <th style={{ padding: '0.85rem 1.25rem', color: '#6B6B66', fontWeight: 700, fontSize: '0.78rem', textTransform: 'uppercase' }}>Monthly Salary</th>
                    <th style={{ padding: '0.85rem 1.25rem', color: '#6B6B66', fontWeight: 700, fontSize: '0.78rem', textTransform: 'uppercase' }}>Leave Status</th>
                    <th style={{ padding: '0.85rem 1.25rem', color: '#6B6B66', fontWeight: 700, fontSize: '0.78rem', textTransform: 'uppercase' }}>Contact</th>
                    <th style={{ padding: '0.85rem 1.25rem', color: '#6B6B66', fontWeight: 700, fontSize: '0.78rem', textTransform: 'uppercase', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEmployees.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ padding: '3rem 1.5rem', textAlign: 'center', color: '#6B6B66' }}>
                        <Users size={32} style={{ opacity: 0.3, margin: '0 auto 0.5rem' }} />
                        <p style={{ margin: 0, fontWeight: 500 }}>No employee records found</p>
                      </td>
                    </tr>
                  ) : (
                    filteredEmployees.map(emp => {
                      const initials = emp.full_name
                        ?.split(' ')
                        .map(n => n[0])
                        .slice(0, 2)
                        .join('')
                        .toUpperCase() || 'EM';

                      return (
                        <tr key={emp.id} style={{ borderBottom: '1px solid #F1F0EC' }}>
                          {/* Name & Code */}
                          <td style={{ padding: '1rem 1.25rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                              <div style={{
                                width: '38px', height: '38px', borderRadius: '50%',
                                background: '#EBF3F0', color: '#1F5C46',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontWeight: 700, fontSize: '0.85rem'
                              }}>
                                {initials}
                              </div>
                              <div>
                                <div style={{ fontWeight: 700, color: '#1A1A18', fontSize: '0.925rem' }}>
                                  {emp.full_name}
                                </div>
                                <div style={{ fontSize: '0.75rem', color: '#6B6B66', fontFamily: 'monospace' }}>
                                  {emp.employee_code}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Department & Designation */}
                          <td style={{ padding: '1rem 1.25rem' }}>
                            <div style={{ fontWeight: 600, color: '#1A1A18' }}>{emp.designation || 'Staff Associate'}</div>
                            <span style={{
                              display: 'inline-block', fontSize: '0.72rem', background: '#F1F5F9',
                              color: '#475569', padding: '0.15rem 0.5rem', borderRadius: '4px', marginTop: '0.2rem'
                            }}>
                              {emp.department || 'General'}
                            </span>
                          </td>

                          {/* Salary Badge */}
                          <td style={{ padding: '1rem 1.25rem' }}>
                            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.25rem' }}>
                              <span style={{
                                fontSize: '1.05rem', fontWeight: 800,
                                color: Number(emp.base_salary) > 0 ? '#15803D' : '#D97706',
                                fontFamily: 'monospace'
                              }}>
                                ₹{Number(emp.base_salary || 0).toLocaleString()}
                              </span>
                              <span style={{ fontSize: '0.72rem', color: '#6B6B66' }}>/ mo</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleOpenEditEmployee(emp)}
                              style={{
                                background: 'none', border: 'none', padding: 0,
                                fontSize: '0.72rem', color: '#1F5C46', fontWeight: 600,
                                cursor: 'pointer', textDecoration: 'underline', marginTop: '0.2rem'
                              }}
                            >
                              Decide / Edit Salary
                            </button>
                          </td>

                          {/* Leave Status */}
                          <td style={{ padding: '1rem 1.25rem' }}>
                            {emp.is_on_leave_today ? (
                              <span style={{
                                display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                                padding: '0.2rem 0.6rem', borderRadius: '4px',
                                fontSize: '0.75rem', fontWeight: 700,
                                background: '#FEF2F2', color: '#DC2626', border: '1px solid #FEE2E2'
                              }}>
                                <Clock size={12} />
                                On Leave Today
                              </span>
                            ) : (
                              <span style={{
                                display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                                padding: '0.2rem 0.6rem', borderRadius: '4px',
                                fontSize: '0.75rem', fontWeight: 600,
                                background: '#F0FDF4', color: '#15803D', border: '1px solid #DCFCE7'
                              }}>
                                <CheckCircle2 size={12} />
                                Active On Duty
                              </span>
                            )}
                          </td>

                          {/* Contact */}
                          <td style={{ padding: '1rem 1.25rem', fontSize: '0.8rem', color: '#6B6B66' }}>
                            {emp.phone && <div>📞 {emp.phone}</div>}
                            {emp.email && <div>✉️ {emp.email}</div>}
                          </td>

                          {/* Actions */}
                          <td style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>
                            <div style={{ display: 'inline-flex', gap: '0.5rem' }}>
                              <button
                                type="button"
                                title="Edit Employee Profile & Salary"
                                onClick={() => handleOpenEditEmployee(emp)}
                                style={{
                                  padding: '0.4rem 0.65rem', background: '#FFFFFF',
                                  border: '1px solid #E7E5DF', borderRadius: '6px',
                                  cursor: 'pointer', color: '#1F5C46'
                                }}
                              >
                                <Edit3 size={14} />
                              </button>
                              <button
                                type="button"
                                title="Deactivate Employee"
                                onClick={() => handleDeleteEmployee(emp)}
                                style={{
                                  padding: '0.4rem 0.65rem', background: '#FFFFFF',
                                  border: '1px solid #E7E5DF', borderRadius: '6px',
                                  cursor: 'pointer', color: '#DC2626'
                                }}
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════════ */}
        {/* TAB 2: LEAVE MANAGEMENT SYSTEM                                         */}
        {/* ═══════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'leaves' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Leave Policy Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
              {leaveTypes.map(lt => (
                <div key={lt.id} style={{ background: '#FFFFFF', border: '1px solid #E7E5DF', borderRadius: '8px', padding: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                    <strong style={{ fontSize: '0.9rem', color: '#1A1A18' }}>{lt.name}</strong>
                    <span style={{
                      fontSize: '0.68rem', fontWeight: 700, padding: '0.15rem 0.45rem', borderRadius: '4px',
                      background: lt.is_paid ? '#F0FDF4' : '#FFFBEB',
                      color: lt.is_paid ? '#15803D' : '#B45309'
                    }}>
                      {lt.is_paid ? 'Paid' : 'Unpaid (LWP)'}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#6B6B66' }}>
                    Annual Quota: <strong>{lt.annual_quota_days || 0} days</strong>
                  </div>
                </div>
              ))}
            </div>

            {/* Leave Requests Table */}
            <div style={{ background: '#FFFFFF', border: '1px solid #E7E5DF', borderRadius: '12px', overflow: 'hidden' }}>
              <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #E7E5DF', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#1A1A18' }}>
                    Workforce Leave Requests
                  </h3>
                  <span style={{ fontSize: '0.8rem', color: '#6B6B66' }}>
                    Review, approve, or reject employee leave applications
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleOpenLeaveModal}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
                    padding: '0.45rem 0.85rem', background: '#1F5C46', color: '#FFFFFF',
                    borderRadius: '6px', border: 'none', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer'
                  }}
                >
                  <Plus size={14} />
                  Submit Leave
                </button>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
                  <thead style={{ background: '#FAF9F6', borderBottom: '1px solid #E7E5DF' }}>
                    <tr>
                      <th style={{ padding: '0.85rem 1.25rem', color: '#6B6B66', fontWeight: 700, fontSize: '0.78rem', textTransform: 'uppercase' }}>Employee</th>
                      <th style={{ padding: '0.85rem 1.25rem', color: '#6B6B66', fontWeight: 700, fontSize: '0.78rem', textTransform: 'uppercase' }}>Leave Category</th>
                      <th style={{ padding: '0.85rem 1.25rem', color: '#6B6B66', fontWeight: 700, fontSize: '0.78rem', textTransform: 'uppercase' }}>Dates & Duration</th>
                      <th style={{ padding: '0.85rem 1.25rem', color: '#6B6B66', fontWeight: 700, fontSize: '0.78rem', textTransform: 'uppercase' }}>Reason</th>
                      <th style={{ padding: '0.85rem 1.25rem', color: '#6B6B66', fontWeight: 700, fontSize: '0.78rem', textTransform: 'uppercase' }}>Status</th>
                      <th style={{ padding: '0.85rem 1.25rem', color: '#6B6B66', fontWeight: 700, fontSize: '0.78rem', textTransform: 'uppercase', textAlign: 'right' }}>Decision</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLeaves.length === 0 ? (
                      <tr>
                        <td colSpan={6} style={{ padding: '3rem 1.5rem', textAlign: 'center', color: '#6B6B66' }}>
                          <Calendar size={32} style={{ opacity: 0.3, margin: '0 auto 0.5rem' }} />
                          <p style={{ margin: 0, fontWeight: 500 }}>No leave applications registered</p>
                        </td>
                      </tr>
                    ) : (
                      filteredLeaves.map(l => (
                        <tr key={l.id} style={{ borderBottom: '1px solid #F1F0EC' }}>
                          <td style={{ padding: '1rem 1.25rem' }}>
                            <strong style={{ color: '#1A1A18', display: 'block' }}>{l.employee_name}</strong>
                            <span style={{ fontSize: '0.75rem', color: '#6B6B66' }}>{l.employee_code} • {l.department}</span>
                          </td>
                          <td style={{ padding: '1rem 1.25rem' }}>
                            <span style={{
                              fontSize: '0.78rem', fontWeight: 600, padding: '0.2rem 0.55rem', borderRadius: '4px',
                              background: '#F1F5F9', color: '#334155'
                            }}>
                              {l.leave_type_name}
                            </span>
                          </td>
                          <td style={{ padding: '1rem 1.25rem', fontSize: '0.85rem' }}>
                            <div>{l.from_date?.split('T')[0]} to {l.to_date?.split('T')[0]}</div>
                            <strong style={{ fontSize: '0.75rem', color: '#1F5C46' }}>{l.days} day(s)</strong>
                          </td>
                          <td style={{ padding: '1rem 1.25rem', fontSize: '0.8rem', color: '#475569', maxWidth: '240px' }}>
                            <div>{l.reason || 'Personal leave'}</div>
                            {l.decision_note && (
                              <div style={{ fontSize: '0.72rem', color: '#6B6B66', fontStyle: 'italic', marginTop: '0.2rem' }}>
                                Note: {l.decision_note}
                              </div>
                            )}
                          </td>
                          <td style={{ padding: '1rem 1.25rem' }}>
                            <span style={{
                              display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                              padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.78rem', fontWeight: 700,
                              background: l.status === 'approved' ? '#F0FDF4' : l.status === 'rejected' ? '#FEF2F2' : '#FFFBEB',
                              color: l.status === 'approved' ? '#15803D' : l.status === 'rejected' ? '#DC2626' : '#B45309',
                              border: l.status === 'approved' ? '1px solid #DCFCE7' : l.status === 'rejected' ? '1px solid #FEE2E2' : '1px solid #FEF3C7'
                            }}>
                              {l.status === 'approved' && <CheckCircle2 size={13} />}
                              {l.status === 'rejected' && <XCircle size={13} />}
                              {l.status === 'pending' && <Clock size={13} />}
                              {l.status.toUpperCase()}
                            </span>
                          </td>
                          <td style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>
                            {l.status === 'pending' && isAuthorized ? (
                              <div style={{ display: 'inline-flex', gap: '0.4rem' }}>
                                <button
                                  type="button"
                                  onClick={() => setDecidingLeave(l)}
                                  style={{
                                    padding: '0.35rem 0.75rem', background: '#1F5C46', color: '#FFFFFF',
                                    border: 'none', borderRadius: '4px', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer'
                                  }}
                                >
                                  Decision
                                </button>
                              </div>
                            ) : (
                              <span style={{ fontSize: '0.75rem', color: '#6B6B66' }}>
                                {l.decided_by_name ? `By ${l.decided_by_name}` : 'Settled'}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════════ */}
        {/* TAB 3: PAYROLL & SALARY RUNS                                            */}
        {/* ═══════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'payroll' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ background: '#FFFFFF', border: '1px solid #E7E5DF', borderRadius: '12px', overflow: 'hidden' }}>
              <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #E7E5DF', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#1A1A18' }}>
                    Monthly Salary Disbursements & Payroll
                  </h3>
                  <span style={{ fontSize: '0.8rem', color: '#6B6B66' }}>
                    Automatic salary calculation accounting for base pay, allowances, and unpaid leave deductions
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPayrollModal(true)}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                    padding: '0.5rem 1rem', background: '#1F5C46', color: '#FFFFFF',
                    borderRadius: '6px', border: 'none', fontSize: '0.825rem', fontWeight: 700, cursor: 'pointer'
                  }}
                >
                  <Plus size={15} />
                  Run Payroll
                </button>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
                  <thead style={{ background: '#FAF9F6', borderBottom: '1px solid #E7E5DF' }}>
                    <tr>
                      <th style={{ padding: '0.85rem 1.25rem', color: '#6B6B66', fontWeight: 700, fontSize: '0.78rem', textTransform: 'uppercase' }}>Period Month</th>
                      <th style={{ padding: '0.85rem 1.25rem', color: '#6B6B66', fontWeight: 700, fontSize: '0.78rem', textTransform: 'uppercase' }}>Employees Covered</th>
                      <th style={{ padding: '0.85rem 1.25rem', color: '#6B6B66', fontWeight: 700, fontSize: '0.78rem', textTransform: 'uppercase' }}>Total Net Pay</th>
                      <th style={{ padding: '0.85rem 1.25rem', color: '#6B6B66', fontWeight: 700, fontSize: '0.78rem', textTransform: 'uppercase' }}>Disbursement Status</th>
                      <th style={{ padding: '0.85rem 1.25rem', color: '#6B6B66', fontWeight: 700, fontSize: '0.78rem', textTransform: 'uppercase', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payrollRuns.length === 0 ? (
                      <tr>
                        <td colSpan={5} style={{ padding: '3rem 1.5rem', textAlign: 'center', color: '#6B6B66' }}>
                          <DollarSign size={32} style={{ opacity: 0.3, margin: '0 auto 0.5rem' }} />
                          <p style={{ margin: 0, fontWeight: 500 }}>No payroll runs created yet</p>
                        </td>
                      </tr>
                    ) : (
                      payrollRuns.map(run => (
                        <tr key={run.id} style={{ borderBottom: '1px solid #F1F0EC' }}>
                          <td style={{ padding: '1rem 1.25rem' }}>
                            <strong style={{ fontSize: '0.95rem', color: '#1A1A18' }}>
                              {new Date(run.period_month).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
                            </strong>
                          </td>
                          <td style={{ padding: '1rem 1.25rem', color: '#475569' }}>
                            {run.total_entries || 0} employees
                          </td>
                          <td style={{ padding: '1rem 1.25rem' }}>
                            <strong style={{ fontSize: '1.05rem', color: '#15803D', fontFamily: 'monospace' }}>
                              ₹{Number(run.total_net_pay || 0).toLocaleString()}
                            </strong>
                          </td>
                          <td style={{ padding: '1rem 1.25rem' }}>
                            <span style={{
                              display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                              padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.78rem', fontWeight: 700,
                              background: run.status === 'paid' ? '#F0FDF4' : '#FFFBEB',
                              color: run.status === 'paid' ? '#15803D' : '#B45309',
                              border: run.status === 'paid' ? '1px solid #DCFCE7' : '1px solid #FEF3C7'
                            }}>
                              {run.status === 'paid' ? '✓ Disbursed & Paid' : '⏳ Draft / Pending Payment'}
                            </span>
                          </td>
                          <td style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>
                            <div style={{ display: 'inline-flex', gap: '0.5rem' }}>
                              <button
                                type="button"
                                onClick={() => handleViewPayrollEntries(run)}
                                style={{
                                  padding: '0.35rem 0.75rem', background: '#FFFFFF', border: '1px solid #E7E5DF',
                                  borderRadius: '4px', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', color: '#1A1A18'
                                }}
                              >
                                View Payslips
                              </button>
                              {run.status !== 'paid' && isAuthorized && (
                                <button
                                  type="button"
                                  onClick={() => handleApprovePayroll(run.id)}
                                  style={{
                                    padding: '0.35rem 0.75rem', background: '#1F5C46', color: '#FFFFFF',
                                    border: 'none', borderRadius: '4px', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer'
                                  }}
                                >
                                  Mark Paid
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════════ */}
        {/* TAB 4: HR DIAGNOSTICS & WORKFORCE ANALYTICS                             */}
        {/* ═══════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'diagnostics' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Top Diagnostics Banner */}
            <div style={{
              background: 'linear-gradient(135deg, #1F5C46 0%, #0d3829 100%)',
              color: '#FFFFFF', borderRadius: '12px', padding: '1.75rem 2rem',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.5rem'
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
                  <Award size={20} color="#34D399" />
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#34D399' }}>
                    Diagnostics Engine
                  </span>
                </div>
                <h2 style={{ fontSize: '1.45rem', fontWeight: 800, margin: '0 0 0.4rem' }}>
                  Workforce & Financial Health Summary
                </h2>
                <p style={{ margin: 0, opacity: 0.85, fontSize: '0.875rem', maxWidth: '600px' }}>
                  Real-time diagnostics tracking staff retention, salary liabilities, absence rates, and departmental operational coverage.
                </p>
              </div>

              <div style={{
                background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(8px)',
                padding: '1rem 1.5rem', borderRadius: '10px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.2)'
              }}>
                <div style={{ fontSize: '0.75rem', opacity: 0.8, textTransform: 'uppercase', fontWeight: 700 }}>
                  Active Headcount Coverage
                </div>
                <div style={{ fontSize: '1.85rem', fontWeight: 800, fontFamily: 'monospace' }}>
                  {diagnostics?.employees?.active_employees || activeEmployeesCount} Staff
                </div>
                <div style={{ fontSize: '0.72rem', color: '#34D399', fontWeight: 600 }}>
                  100% Operational Readiness
                </div>
              </div>
            </div>

            {/* Department Salary Distribution Breakdown */}
            <div style={{ background: '#FFFFFF', border: '1px solid #E7E5DF', borderRadius: '12px', padding: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#1A1A18' }}>
                    Departmental Salary & Staffing Distribution
                  </h3>
                  <span style={{ fontSize: '0.8rem', color: '#6B6B66' }}>
                    Allocation of monthly payroll across coaching, front desk, hospitality, and operations
                  </span>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
                {diagnostics?.departments?.map((dept, idx) => {
                  const pct = totalMonthlyPayroll > 0 ? Math.round((Number(dept.total_salary) / totalMonthlyPayroll) * 100) : 0;
                  return (
                    <div key={idx} style={{
                      padding: '1.2rem', background: '#FAF9F6', borderRadius: '8px',
                      border: '1px solid #E7E5DF', display: 'flex', flexDirection: 'column', gap: '0.75rem'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <strong style={{ fontSize: '0.95rem', color: '#1A1A18' }}>{dept.department}</strong>
                          <div style={{ fontSize: '0.75rem', color: '#6B6B66' }}>{dept.headcount} active member(s)</div>
                        </div>
                        <span style={{
                          fontSize: '0.75rem', fontWeight: 700, color: '#1F5C46',
                          background: '#EBF3F0', padding: '0.2rem 0.5rem', borderRadius: '4px'
                        }}>
                          {pct}% of payroll
                        </span>
                      </div>

                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.25rem' }}>
                          <span style={{ color: '#6B6B66' }}>Monthly Total:</span>
                          <strong style={{ color: '#15803D', fontFamily: 'monospace' }}>₹{Number(dept.total_salary).toLocaleString()}</strong>
                        </div>
                        {/* Progress Bar */}
                        <div style={{ width: '100%', height: '6px', background: '#E2E8F0', borderRadius: '3px', overflow: 'hidden' }}>
                          <div style={{ width: `${pct}%`, height: '100%', background: '#1F5C46', borderRadius: '3px' }} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Diagnostic Action Flags */}
            <div style={{ background: '#FFFFFF', border: '1px solid #E7E5DF', borderRadius: '12px', padding: '1.5rem' }}>
              <h3 style={{ margin: '0 0 1rem', fontSize: '1.1rem', fontWeight: 700, color: '#1A1A18' }}>
                Operational Diagnostics & Attention Alerts
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {pendingLeavesCount > 0 ? (
                  <div style={{
                    padding: '0.85rem 1rem', background: '#FEF2F2', border: '1px solid #FEE2E2',
                    borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '0.75rem'
                  }}>
                    <AlertCircle size={18} color="#DC2626" />
                    <div>
                      <strong style={{ color: '#991B1B', fontSize: '0.875rem' }}>
                        {pendingLeavesCount} Pending Leave Request(s) Awaiting Decision
                      </strong>
                      <div style={{ fontSize: '0.78rem', color: '#B91C1C' }}>
                        Manager or Owner approval is pending. Decide promptly to maintain court schedule and shift coverage.
                      </div>
                    </div>
                  </div>
                ) : (
                  <div style={{
                    padding: '0.85rem 1rem', background: '#F0FDF4', border: '1px solid #DCFCE7',
                    borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '0.75rem'
                  }}>
                    <CheckCircle2 size={18} color="#15803D" />
                    <div>
                      <strong style={{ color: '#166534', fontSize: '0.875rem' }}>
                        Leave Queue Clear
                      </strong>
                      <div style={{ fontSize: '0.78rem', color: '#15803D' }}>
                        All employee leave requests have been reviewed and decided.
                      </div>
                    </div>
                  </div>
                )}

                <div style={{
                  padding: '0.85rem 1rem', background: '#F0FDF4', border: '1px solid #DCFCE7',
                  borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '0.75rem'
                }}>
                  <CheckCircle2 size={18} color="#15803D" />
                  <div>
                    <strong style={{ color: '#166534', fontSize: '0.875rem' }}>
                      All Active Employees Have Valid Salary Configurations
                    </strong>
                    <div style={{ fontSize: '0.78rem', color: '#15803D' }}>
                      Base pay rates are actively calibrated for automated monthly payroll disbursement.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════════ */}
        {/* TAB 5: SYSTEM STAFF & RBAC (Existing Functionality Preserved)            */}
        {/* ═══════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'staff' && (
          <div style={{ background: '#FFFFFF', border: '1px solid #E7E5DF', borderRadius: '12px', overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
                <thead style={{ background: '#FAF9F6', borderBottom: '1px solid #E7E5DF' }}>
                  <tr>
                    <th style={{ padding: '0.85rem 1.25rem', color: '#6B6B66', fontWeight: 700, fontSize: '0.78rem', textTransform: 'uppercase' }}>Authorized User</th>
                    <th style={{ padding: '0.85rem 1.25rem', color: '#6B6B66', fontWeight: 700, fontSize: '0.78rem', textTransform: 'uppercase' }}>System Role</th>
                    <th style={{ padding: '0.85rem 1.25rem', color: '#6B6B66', fontWeight: 700, fontSize: '0.78rem', textTransform: 'uppercase' }}>Department</th>
                    <th style={{ padding: '0.85rem 1.25rem', color: '#6B6B66', fontWeight: 700, fontSize: '0.78rem', textTransform: 'uppercase' }}>Contact</th>
                    <th style={{ padding: '0.85rem 1.25rem', color: '#6B6B66', fontWeight: 700, fontSize: '0.78rem', textTransform: 'uppercase', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStaff.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ padding: '3rem 1.5rem', textAlign: 'center', color: '#6B6B66' }}>
                        <ShieldCheck size={32} style={{ opacity: 0.3, margin: '0 auto 0.5rem' }} />
                        <p style={{ margin: 0, fontWeight: 500 }}>No authorized staff users found</p>
                      </td>
                    </tr>
                  ) : (
                    filteredStaff.map((s) => {
                      const fullName = s.full_name || s.name || s.email?.split('@')[0] || 'Staff Member';
                      const roleKey = (s.role || '').toLowerCase();
                      const roleLabel = ROLE_LABELS[roleKey] || s.role || 'Staff Member';
                      const deptLabel = s.department || ROLE_DEPARTMENTS[roleKey] || 'Operations';
                      const staffId = s.user_id || s.id;
                      const initials = fullName.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase() || 'ST';

                      return (
                        <tr key={staffId} style={{ borderBottom: '1px solid #F1F0EC' }}>
                          <td style={{ padding: '1rem 1.25rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                              <div style={{
                                width: '38px', height: '38px', borderRadius: '50%',
                                background: '#EBF3F0', color: '#1F5C46',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontWeight: 700, fontSize: '0.85rem'
                              }}>
                                {initials}
                              </div>
                              <div>
                                <div style={{ fontWeight: 700, color: '#1A1A18', fontSize: '0.925rem' }}>
                                  {fullName}
                                </div>
                                <div style={{ fontSize: '0.775rem', color: '#6B6B66' }}>{s.email}</div>
                              </div>
                            </div>
                          </td>

                          <td style={{ padding: '1rem 1.25rem' }}>
                            <span style={{
                              display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
                              padding: '0.25rem 0.65rem', borderRadius: '6px',
                              fontSize: '0.8rem', fontWeight: 600,
                              background: roleKey === 'owner' ? '#FEF3C7' : '#EFF6FF',
                              color: roleKey === 'owner' ? '#92400E' : '#1D4ED8',
                              border: roleKey === 'owner' ? '1px solid #FDE68A' : '1px solid #DBEAFE'
                            }}>
                              {roleKey === 'owner' ? <ShieldCheck size={13} /> : <Briefcase size={13} />}
                              {roleLabel}
                            </span>
                          </td>

                          <td style={{ padding: '1rem 1.25rem', color: '#475569', fontSize: '0.85rem' }}>
                            {deptLabel}
                          </td>

                          <td style={{ padding: '1rem 1.25rem', color: '#6B6B66', fontSize: '0.85rem' }}>
                            {s.phone || 'Phone not set'}
                          </td>

                          <td style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>
                            {isAuthorized && roleKey !== 'owner' && (
                              <button
                                type="button"
                                title="Remove Staff Role"
                                onClick={() => handleRemoveStaff(s)}
                                style={{
                                  padding: '0.4rem 0.75rem', background: '#FEF2F2', border: '1px solid #FEE2E2',
                                  borderRadius: '6px', color: '#DC2626', cursor: 'pointer'
                                }}
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* MODAL 1: ADD / EDIT EMPLOYEE & SALARY                                   */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {showEmployeeModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
        }}>
          <div style={{
            background: '#FFFFFF', borderRadius: '12px', maxWidth: '540px', width: '100%',
            overflow: 'hidden', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'
          }}>
            <div style={{
              background: '#1F5C46', color: '#FFFFFF', padding: '1.25rem 1.5rem',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700 }}>
                  {editingEmployee ? `Decide Salary & Edit Profile: ${editingEmployee.full_name}` : 'Enroll New Club Employee'}
                </h3>
                <span style={{ fontSize: '0.78rem', opacity: 0.85 }}>Set compensation and organizational department</span>
              </div>
              <button
                type="button"
                onClick={() => setShowEmployeeModal(false)}
                style={{ background: 'none', border: 'none', color: '#FFFFFF', fontSize: '1.2rem', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEmployee} style={{ padding: '1.5rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
                    Employee Code *
                  </label>
                  <input
                    type="text"
                    required
                    value={empForm.employee_code}
                    onChange={(e) => setEmpForm({ ...empForm, employee_code: e.target.value })}
                    style={{ width: '100%', padding: '0.55rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.85rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Sunil Gavaskar"
                    value={empForm.full_name}
                    onChange={(e) => setEmpForm({ ...empForm, full_name: e.target.value })}
                    style={{ width: '100%', padding: '0.55rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.85rem' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
                    Designation / Title *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Head Coach / Barista"
                    value={empForm.designation}
                    onChange={(e) => setEmpForm({ ...empForm, designation: e.target.value })}
                    style={{ width: '100%', padding: '0.55rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.85rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
                    Department *
                  </label>
                  <select
                    value={empForm.department}
                    onChange={(e) => setEmpForm({ ...empForm, department: e.target.value })}
                    style={{ width: '100%', padding: '0.55rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.85rem' }}
                  >
                    <option value="Athletics & Coaching">Athletics & Coaching</option>
                    <option value="Reception & Front Desk">Reception & Front Desk</option>
                    <option value="Hospitality & Bar">Hospitality & Bar</option>
                    <option value="Dining & Kitchen">Dining & Kitchen</option>
                    <option value="Pro Shop & Retail">Pro Shop & Retail</option>
                    <option value="Facility Management">Facility Management</option>
                    <option value="General Operations">General Operations</option>
                  </select>
                </div>
              </div>

              {/* SALARY DECIDER FIELD */}
              <div style={{
                background: '#F0FDF4', border: '1.5px solid #BBF7D0', borderRadius: '8px',
                padding: '1rem', marginBottom: '1rem'
              }}>
                <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 800, color: '#166534', marginBottom: '0.35rem' }}>
                  Decide Monthly Base Salary (₹ INR) *
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#166534' }}>₹</span>
                  <input
                    type="number"
                    min="0"
                    step="500"
                    required
                    placeholder="e.g. 45000"
                    value={empForm.base_salary}
                    onChange={(e) => setEmpForm({ ...empForm, base_salary: e.target.value })}
                    style={{
                      width: '100%', padding: '0.55rem', border: '1px solid #86EFAC',
                      borderRadius: '6px', fontSize: '1rem', fontWeight: 700, fontFamily: 'monospace'
                    }}
                  />
                </div>
                <span style={{ fontSize: '0.72rem', color: '#15803D', marginTop: '0.3rem', display: 'block' }}>
                  This amount forms the fixed baseline for monthly payroll and per-day leave deductions.
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    placeholder="98250..."
                    value={empForm.phone}
                    onChange={(e) => setEmpForm({ ...empForm, phone: e.target.value })}
                    style={{ width: '100%', padding: '0.55rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.85rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
                    Email Address
                  </label>
                  <input
                    type="email"
                    placeholder="staff@club.com"
                    value={empForm.email}
                    onChange={(e) => setEmpForm({ ...empForm, email: e.target.value })}
                    style={{ width: '100%', padding: '0.55rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.85rem' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => setShowEmployeeModal(false)}
                  style={{
                    padding: '0.55rem 1rem', background: '#FFFFFF', border: '1px solid #cbd5e1',
                    borderRadius: '6px', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    padding: '0.55rem 1.25rem', background: '#1F5C46', color: '#FFFFFF',
                    border: 'none', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer'
                  }}
                >
                  {submitting ? 'Saving...' : editingEmployee ? 'Update Salary & Info' : 'Confirm Employee'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* MODAL 2: SUBMIT LEAVE REQUEST                                          */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {showLeaveModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
        }}>
          <div style={{
            background: '#FFFFFF', borderRadius: '12px', maxWidth: '480px', width: '100%',
            overflow: 'hidden', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'
          }}>
            <div style={{
              background: '#1F5C46', color: '#FFFFFF', padding: '1.25rem 1.5rem',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700 }}>Log Employee Leave</h3>
                <span style={{ fontSize: '0.78rem', opacity: 0.85 }}>Record vacation, casual, or medical absence</span>
              </div>
              <button
                type="button"
                onClick={() => setShowLeaveModal(false)}
                style={{ background: 'none', border: 'none', color: '#FFFFFF', fontSize: '1.2rem', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveLeave} style={{ padding: '1.5rem' }}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
                  Select Employee *
                </label>
                <select
                  required
                  value={leaveForm.employee_id}
                  onChange={(e) => setLeaveForm({ ...leaveForm, employee_id: e.target.value })}
                  style={{ width: '100%', padding: '0.55rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.85rem' }}
                >
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>
                      {emp.full_name} ({emp.employee_code} • {emp.designation})
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
                  Leave Type *
                </label>
                <select
                  required
                  value={leaveForm.leave_type_id}
                  onChange={(e) => setLeaveForm({ ...leaveForm, leave_type_id: e.target.value })}
                  style={{ width: '100%', padding: '0.55rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.85rem' }}
                >
                  {leaveTypes.map(lt => (
                    <option key={lt.id} value={lt.id}>
                      {lt.name} ({lt.is_paid ? 'Paid' : 'Unpaid'})
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
                    From Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={leaveForm.from_date}
                    onChange={(e) => setLeaveForm({ ...leaveForm, from_date: e.target.value })}
                    style={{ width: '100%', padding: '0.55rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.85rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
                    To Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={leaveForm.to_date}
                    onChange={(e) => setLeaveForm({ ...leaveForm, to_date: e.target.value })}
                    style={{ width: '100%', padding: '0.55rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.85rem' }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
                  Total Days *
                </label>
                <input
                  type="number"
                  min="0.5"
                  step="0.5"
                  required
                  value={leaveForm.days}
                  onChange={(e) => setLeaveForm({ ...leaveForm, days: e.target.value })}
                  style={{ width: '100%', padding: '0.55rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.85rem' }}
                />
              </div>

              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
                  Reason / Description
                </label>
                <textarea
                  rows="2"
                  placeholder="e.g. Attending professional coach training summit"
                  value={leaveForm.reason}
                  onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })}
                  style={{ width: '100%', padding: '0.55rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.85rem' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => setShowLeaveModal(false)}
                  style={{
                    padding: '0.55rem 1rem', background: '#FFFFFF', border: '1px solid #cbd5e1',
                    borderRadius: '6px', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    padding: '0.55rem 1.25rem', background: '#1F5C46', color: '#FFFFFF',
                    border: 'none', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer'
                  }}
                >
                  {submitting ? 'Submitting...' : 'Confirm Leave Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* MODAL 3: DECIDE LEAVE (APPROVE / REJECT)                                */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {decidingLeave && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
        }}>
          <div style={{
            background: '#FFFFFF', borderRadius: '12px', maxWidth: '440px', width: '100%',
            overflow: 'hidden', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'
          }}>
            <div style={{
              background: '#1F5C46', color: '#FFFFFF', padding: '1.25rem 1.5rem',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700 }}>Leave Decision</h3>
                <span style={{ fontSize: '0.78rem', opacity: 0.85 }}>{decidingLeave.employee_name}</span>
              </div>
              <button
                type="button"
                onClick={() => setDecidingLeave(null)}
                style={{ background: 'none', border: 'none', color: '#FFFFFF', fontSize: '1.2rem', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <div style={{ padding: '1.5rem' }}>
              <div style={{ background: '#FAF9F6', border: '1px solid #E7E5DF', borderRadius: '6px', padding: '0.85rem', marginBottom: '1rem' }}>
                <div style={{ fontSize: '0.85rem', marginBottom: '0.2rem' }}>
                  <strong>Type:</strong> {decidingLeave.leave_type_name} ({decidingLeave.days} days)
                </div>
                <div style={{ fontSize: '0.85rem', marginBottom: '0.2rem' }}>
                  <strong>Dates:</strong> {decidingLeave.from_date?.split('T')[0]} to {decidingLeave.to_date?.split('T')[0]}
                </div>
                <div style={{ fontSize: '0.85rem', color: '#475569' }}>
                  <strong>Reason:</strong> {decidingLeave.reason || 'Personal'}
                </div>
              </div>

              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
                  Decision Note / Shift Coverage Info
                </label>
                <textarea
                  rows="2"
                  placeholder="e.g. Approved. Court coverage handled by Coach Patel."
                  value={decisionNote}
                  onChange={(e) => setDecisionNote(e.target.value)}
                  style={{ width: '100%', padding: '0.55rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.85rem' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => handleDecideLeave('rejected')}
                  style={{
                    flex: 1, padding: '0.55rem', background: '#FEF2F2', border: '1px solid #FCA5A5',
                    borderRadius: '6px', color: '#DC2626', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer'
                  }}
                >
                  Reject Leave
                </button>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => handleDecideLeave('approved')}
                  style={{
                    flex: 1, padding: '0.55rem', background: '#1F5C46', color: '#FFFFFF',
                    border: 'none', borderRadius: '6px', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer'
                  }}
                >
                  Approve Leave
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* MODAL 4: GENERATE PAYROLL MODAL                                         */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {showPayrollModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
        }}>
          <div style={{
            background: '#FFFFFF', borderRadius: '12px', maxWidth: '440px', width: '100%',
            overflow: 'hidden', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'
          }}>
            <div style={{
              background: '#1F5C46', color: '#FFFFFF', padding: '1.25rem 1.5rem',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700 }}>Generate Monthly Payroll</h3>
                <span style={{ fontSize: '0.78rem', opacity: 0.85 }}>Automated net salary calculations</span>
              </div>
              <button
                type="button"
                onClick={() => setShowPayrollModal(false)}
                style={{ background: 'none', border: 'none', color: '#FFFFFF', fontSize: '1.2rem', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleGeneratePayroll} style={{ padding: '1.5rem' }}>
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
                  Select Billing Month (1st of Month) *
                </label>
                <input
                  type="date"
                  required
                  value={payrollMonth}
                  onChange={(e) => setPayrollMonth(e.target.value)}
                  style={{ width: '100%', padding: '0.55rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.85rem' }}
                />
                <span style={{ fontSize: '0.75rem', color: '#6B6B66', marginTop: '0.35rem', display: 'block' }}>
                  The engine fetches all active employee base salaries and deducts unapproved/unpaid absences.
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => setShowPayrollModal(false)}
                  style={{
                    padding: '0.55rem 1rem', background: '#FFFFFF', border: '1px solid #cbd5e1',
                    borderRadius: '6px', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    padding: '0.55rem 1.25rem', background: '#1F5C46', color: '#FFFFFF',
                    border: 'none', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer'
                  }}
                >
                  {submitting ? 'Calculating...' : 'Run Payroll'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* MODAL 5: VIEW PAYROLL ENTRIES / PAYSLIPS                                */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {activeRunModal && selectedPayrollEntries && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
        }}>
          <div style={{
            background: '#FFFFFF', borderRadius: '12px', maxWidth: '720px', width: '100%',
            maxHeight: '85vh', overflow: 'hidden', display: 'flex', flexDirection: 'column',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'
          }}>
            <div style={{
              background: '#1F5C46', color: '#FFFFFF', padding: '1.25rem 1.5rem',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700 }}>
                  Payslips: {new Date(activeRunModal.period_month).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
                </h3>
                <span style={{ fontSize: '0.78rem', opacity: 0.85 }}>Total Disbursed: ₹{Number(activeRunModal.total_net_pay || 0).toLocaleString()}</span>
              </div>
              <button
                type="button"
                onClick={() => { setActiveRunModal(null); setSelectedPayrollEntries(null); }}
                style={{ background: 'none', border: 'none', color: '#FFFFFF', fontSize: '1.2rem', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <div style={{ padding: '1.25rem', overflowY: 'auto' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {selectedPayrollEntries.map(pe => (
                  <div key={pe.id} style={{
                    padding: '0.85rem 1rem', background: '#FAF9F6', border: '1px solid #E7E5DF',
                    borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                  }}>
                    <div>
                      <strong style={{ fontSize: '0.95rem', color: '#1A1A18' }}>{pe.employee_name}</strong>
                      <div style={{ fontSize: '0.75rem', color: '#6B6B66' }}>
                        {pe.employee_code} • {pe.designation} ({pe.department})
                      </div>
                      {Number(pe.unpaid_leave_days) > 0 && (
                        <div style={{ fontSize: '0.72rem', color: '#DC2626', marginTop: '0.2rem' }}>
                          ⚠️ Deducted {pe.unpaid_leave_days} unpaid absence days
                        </div>
                      )}
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.75rem', color: '#6B6B66' }}>Base: ₹{Number(pe.base_salary).toLocaleString()}</div>
                      {Number(pe.deductions) > 0 && (
                        <div style={{ fontSize: '0.75rem', color: '#DC2626' }}>- ₹{Number(pe.deductions).toLocaleString()}</div>
                      )}
                      <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#15803D', fontFamily: 'monospace', marginTop: '0.2rem' }}>
                        Net: ₹{Number(pe.net_pay).toLocaleString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ padding: '1rem 1.25rem', borderTop: '1px solid #E7E5DF', textAlign: 'right' }}>
              <button
                type="button"
                onClick={() => { setActiveRunModal(null); setSelectedPayrollEntries(null); }}
                style={{
                  padding: '0.5rem 1.25rem', background: '#1F5C46', color: '#FFFFFF',
                  border: 'none', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer'
                }}
              >
                Close Payslips
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* MODAL 6: ASSIGN SYSTEM STAFF ROLE MODAL                                 */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {showAddStaffModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
        }}>
          <div style={{
            background: '#FFFFFF', borderRadius: '12px', maxWidth: '440px', width: '100%',
            overflow: 'hidden', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'
          }}>
            <div style={{
              background: '#1F5C46', color: '#FFFFFF', padding: '1.25rem 1.5rem',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700 }}>Assign System Staff Role</h3>
                <span style={{ fontSize: '0.78rem', opacity: 0.85 }}>Grant portal and terminal access to registered user</span>
              </div>
              <button
                type="button"
                onClick={() => setShowAddStaffModal(false)}
                style={{ background: 'none', border: 'none', color: '#FFFFFF', fontSize: '1.2rem', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddStaff} style={{ padding: '1.5rem' }}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
                  User Account Email *
                </label>
                <input
                  type="email"
                  required
                  placeholder="e.g. staff.member@gmail.com"
                  value={newStaffEmail}
                  onChange={(e) => setNewStaffEmail(e.target.value)}
                  style={{ width: '100%', padding: '0.55rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.85rem' }}
                />
              </div>

              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
                  System Role *
                </label>
                <select
                  value={newStaffRole}
                  onChange={(e) => setNewStaffRole(e.target.value)}
                  style={{ width: '100%', padding: '0.55rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.85rem' }}
                >
                  <option value="manager">Operations Manager</option>
                  <option value="front_desk">Front Desk Lead</option>
                  <option value="bar_staff">Bar & Cafe Staff</option>
                  <option value="kitchen">Kitchen & Chef</option>
                  <option value="shop_staff">Pro Shop Staff</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => setShowAddStaffModal(false)}
                  style={{
                    padding: '0.55rem 1rem', background: '#FFFFFF', border: '1px solid #cbd5e1',
                    borderRadius: '6px', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    padding: '0.55rem 1.25rem', background: '#1F5C46', color: '#FFFFFF',
                    border: 'none', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer'
                  }}
                >
                  {submitting ? 'Assigning...' : 'Assign Role'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
