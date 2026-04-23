import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';
import Layout from './components/Layout';
import { isAuthenticated, getUserRole, isServiceProvider } from './utils/auth';
import FeatureGate from './components/FeatureGate';

const LoginPage = lazy(() => import('./pages/LoginPage'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const LeaveApproval = lazy(() => import('./pages/LeaveApproval'));

const ManagerEmployeeList = lazy(() => import('./pages/ManagerEmployeeList'));
const DailyAttendanceView = lazy(() => import('./pages/DailyAttendanceView'));
const OutletSelector = lazy(() => import('./pages/OutletSelector'));
const ManagerAttendanceReport = lazy(() => import('./pages/ManagerAttendanceReport'));
const DailyOutletAttendance = lazy(() => import('./pages/DailyOutletAttendance'));
const OutletLeaveHistory = lazy(() => import('./pages/OutletLeaveHistory'));
const AttendanceEditor = lazy(() => import('./pages/AttendanceEditor'));
const BulkLeaveAssignment = lazy(() => import('./pages/BulkLeaveAssignment'));
const ManagerDailyAttendance = lazy(() => import('./pages/manager/ManagerDailyAttendance'));
const DatabaseBackup = lazy(() => import('./pages/manager/DatabaseBackup'));

const CreateEmployee = lazy(() => import('./pages/admin/create/CreateEmployee'));
const CreateRole = lazy(() => import('./pages/admin/create/CreateRole'));
const CreateOutlet = lazy(() => import('./pages/admin/create/CreateOutlet'));
const CreateAgency = lazy(() => import('./pages/admin/create/CreateAgency'));
const TimeOffManager = lazy(() => import('./pages/admin/create/TimeOffManager'));

const AdminAttendanceReport = lazy(() => import('./pages/admin/AdminAttendanceReport'));
const AttendanceManagement = lazy(() => import('./pages/admin/attendance/AttendanceManagement'));
const AttendanceLockPeriods = lazy(() => import('./pages/admin/AttendanceLockPeriods'));
const AdminEmployeeEditor = lazy(() => import('./pages/admin/AdminEmployeeEditor'));
const OutletManager = lazy(() => import('./pages/admin/OutletManager'));
const AdminOutletSummary = lazy(() => import('./pages/admin/AdminOutletSummary'));

const AdminLeaveApproval = lazy(() => import('./pages/admin/assign/AdminLeaveApproval'));
const DeviceOutletAssignment = lazy(() => import('./pages/admin/assign/DeviceOutletAssignment'));
const AttendanceEditRequests = lazy(() => import('./pages/admin/AttendanceEditRequests'));
const UserStatusManager = lazy(() => import('./pages/admin/UserStatusManager'));

// Reports section
const ReportsHub = lazy(() => import('./pages/reports/ReportsHub'));
const MonthlySheetReport = lazy(() => import('./pages/reports/MonthlySheetReport'));
const LateComersReport = lazy(() => import('./pages/reports/LateComersReport'));
const AbsenteeismReport = lazy(() => import('./pages/reports/AbsenteeismReport'));
const BlankDatesReport = lazy(() => import('./pages/reports/BlankDatesReport'));
const OvertimeReport = lazy(() => import('./pages/reports/OvertimeReport'));
const ModificationAuditReport = lazy(() => import('./pages/reports/ModificationAuditReport'));
const EmployeeReport = lazy(() => import('./pages/reports/EmployeeReport'));
const LocationVerificationReport = lazy(() => import('./pages/reports/LocationVerificationReport'));

// Payroll / Calculation
const PayrollHub = lazy(() => import('./pages/payroll/PayrollHub'));
const EmployeeCalculation = lazy(() => import('./pages/payroll/EmployeeCalculation'));
const OutletAllocations = lazy(() => import('./pages/payroll/OutletAllocations'));
const PayrollReport = lazy(() => import('./pages/payroll/PayrollReport'));
const AllowanceTypes = lazy(() => import('./pages/payroll/AllowanceTypes'));
const BonusTiers = lazy(() => import('./pages/payroll/BonusTiers'));
const WorkSchedules = lazy(() => import('./pages/payroll/WorkSchedules'));
const EmployeeSalaryCompliance = lazy(() => import('./pages/payroll/EmployeeSalaryCompliance'));
const EmployeeBankDetails = lazy(() => import('./pages/payroll/EmployeeBankDetails'));
const PayrollCompanyConfig = lazy(() => import('./pages/payroll/PayrollCompanyConfig'));
const ApitSlabs = lazy(() => import('./pages/payroll/ApitSlabs'));
const GratuityReport = lazy(() => import('./pages/payroll/GratuityReport'));

// Fingerprint Import
const FingerprintHub = lazy(() => import('./pages/fingerprint/FingerprintHub'));
const FingerprintUploadDetail = lazy(() => import('./pages/fingerprint/FingerprintUploadDetail'));

// License
const LicenseSetupRequired = lazy(() => import('./pages/LicenseSetupRequired'));
const LicenseConfiguration = lazy(() => import('./pages/admin/LicenseConfiguration'));


const ProtectedRoute = ({ role, children, requiredRole }) => {
  if (!isAuthenticated()) return <Navigate to="/" />;
  if (role === requiredRole) return children;
  if (role === 'ServiceProvider' && (requiredRole === 'Admin' || requiredRole === 'Manager')) return children;
  return <Navigate to="/" />;
};

const PageFallback = () => (
  <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
    <CircularProgress />
  </Box>
);

function App() {
  const role = getUserRole();

  return (
    <BrowserRouter>
      <Suspense fallback={<PageFallback />}>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<LoginPage />} />
          <Route path="/license-setup-required" element={<LicenseSetupRequired />} />

          {/* Admin Dashboard — redirected to Outlet Summary */}
          <Route path="/admin/dashboard" element={<Navigate to="/admin/reports/outlet-summary" replace />} />

          {/* Manager Dashboard */}
          <Route
            path="/manager/dashboard"
            element={
              <ProtectedRoute role={role} requiredRole="Manager">
                <Layout>
                  <Dashboard />
                </Layout>
              </ProtectedRoute>
            }
          />

          {/* Manager Routes */}
          <Route path="/manager/outlet-selector" element={
            <ProtectedRoute role={role} requiredRole="Manager">
              <Layout><OutletSelector /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/manager/employees" element={
            <ProtectedRoute role={role} requiredRole="Manager">
              <Layout><ManagerEmployeeList /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/manager/daily-attendance-view" element={
            <ProtectedRoute role={role} requiredRole="Manager">
              <Layout><DailyAttendanceView /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/manager/leave-approval" element={
            <ProtectedRoute role={role} requiredRole="Manager">
              <Layout><LeaveApproval /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/manager/reports" element={
            <ProtectedRoute role={role} requiredRole="Manager">
              <Layout><ManagerAttendanceReport /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/manager/daily-outlet-attendance" element={
            <ProtectedRoute role={role} requiredRole="Manager">
              <Layout><DailyOutletAttendance /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/manager/outlet-leave-summary" element={
            <ProtectedRoute role={role} requiredRole="Manager">
              <Layout><OutletLeaveHistory /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/manager/attendance-editor" element={
            <ProtectedRoute role={role} requiredRole="Manager">
              <Layout><AttendanceEditor /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/manager/bulk-leave-assignment" element={
            <ProtectedRoute role={role} requiredRole="Manager">
              <Layout><BulkLeaveAssignment /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/manager/daily-attendance" element={
            <ProtectedRoute role={role} requiredRole="Manager">
              <Layout><ManagerDailyAttendance /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/manager/database-backup" element={
            <ProtectedRoute role={role} requiredRole="Manager">
              <Layout><FeatureGate feature="database_backup"><DatabaseBackup /></FeatureGate></Layout>
            </ProtectedRoute>
          } />

          {/* License Configuration — ServiceProvider only */}
          <Route path="/admin/license-configuration" element={
            isAuthenticated() && isServiceProvider()
              ? <Layout><LicenseConfiguration /></Layout>
              : <Navigate to="/" />
          } />

          {/* Admin Routes */}
          <Route path="/admin/outlets" element={
            <ProtectedRoute role={role} requiredRole="Admin">
              <Layout><OutletManager /></Layout>
            </ProtectedRoute>
          } />

          {/* Admin: Create Section */}
          <Route path="/admin/create" element={
            <ProtectedRoute role={role} requiredRole="Admin">
              <Layout><CreateRole /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/admin/create/employee" element={
            <ProtectedRoute role={role} requiredRole="Admin">
              <Layout><CreateEmployee /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/admin/create/outlet" element={
            <ProtectedRoute role={role} requiredRole="Admin">
              <Layout><CreateOutlet /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/admin/create/agency" element={
            <ProtectedRoute role={role} requiredRole="Admin">
              <Layout><CreateAgency /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/admin/create/leave" element={
            <ProtectedRoute role={role} requiredRole="Admin">
              <Layout><TimeOffManager /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/admin/create/holidays" element={
            <ProtectedRoute role={role} requiredRole="Admin">
              <Layout><TimeOffManager /></Layout>
            </ProtectedRoute>
          } />

          {/* Admin: Assign Section */}
          <Route path="/admin/assign/leave" element={
            <ProtectedRoute role={role} requiredRole="Admin">
              <Layout><AdminLeaveApproval /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/admin/assign/workshift" element={
            <ProtectedRoute role={role} requiredRole="Admin">
              <Layout><DeviceOutletAssignment /></Layout>
            </ProtectedRoute>
          } />

          {/* Admin Reports */}
          <Route path="/admin/reports/attendance" element={<Navigate to="/admin/reports/attendance-detail" replace />} />
          <Route path="/admin/reports/attendance-detail" element={
            <ProtectedRoute role={role} requiredRole="Admin">
              <Layout><AdminAttendanceReport /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/manager/reports/attendance-detail" element={
            <ProtectedRoute role={role} requiredRole="Manager">
              <Layout><AdminAttendanceReport /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/admin/reports/outlet-summary" element={
            <ProtectedRoute role={role} requiredRole="Admin">
              <Layout><AdminOutletSummary /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/admin/attendance" element={
            <ProtectedRoute role={role} requiredRole="Admin">
              <Layout><AttendanceManagement /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/admin/attendance-locks" element={
            <ProtectedRoute role={role} requiredRole="Admin">
              <Layout><AttendanceLockPeriods /></Layout>
            </ProtectedRoute>
          } />

          {/* Admin: Employee Management */}
          <Route path="/admin/employees/editor" element={
            <ProtectedRoute role={role} requiredRole="Admin">
              <Layout><AdminEmployeeEditor /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/admin/attendance-edit-requests" element={
            <ProtectedRoute role={role} requiredRole="Admin">
              <Layout><FeatureGate feature="attendance_edit_requests"><AttendanceEditRequests /></FeatureGate></Layout>
            </ProtectedRoute>
          } />
          <Route path="/admin/employees/status" element={
            <ProtectedRoute role={role} requiredRole="Admin">
              <Layout><UserStatusManager /></Layout>
            </ProtectedRoute>
          } />

          {/* Reports section — admin */}
          <Route path="/admin/reports" element={
            <ProtectedRoute role={role} requiredRole="Admin"><Layout><FeatureGate feature="reports_advanced"><ReportsHub /></FeatureGate></Layout></ProtectedRoute>
          } />
          <Route path="/admin/reports/monthly-sheet" element={
            <ProtectedRoute role={role} requiredRole="Admin"><Layout><MonthlySheetReport /></Layout></ProtectedRoute>
          } />
          <Route path="/admin/reports/late-comers" element={
            <ProtectedRoute role={role} requiredRole="Admin"><Layout><LateComersReport /></Layout></ProtectedRoute>
          } />
          <Route path="/admin/reports/absenteeism" element={
            <ProtectedRoute role={role} requiredRole="Admin"><Layout><AbsenteeismReport /></Layout></ProtectedRoute>
          } />
          <Route path="/admin/reports/blank-dates" element={
            <ProtectedRoute role={role} requiredRole="Admin"><Layout><BlankDatesReport /></Layout></ProtectedRoute>
          } />
          <Route path="/admin/reports/overtime" element={
            <ProtectedRoute role={role} requiredRole="Admin"><Layout><OvertimeReport /></Layout></ProtectedRoute>
          } />
          <Route path="/admin/reports/modification-audit" element={
            <ProtectedRoute role={role} requiredRole="Admin"><Layout><ModificationAuditReport /></Layout></ProtectedRoute>
          } />
          <Route path="/admin/reports/employee" element={
            <ProtectedRoute role={role} requiredRole="Admin"><Layout><EmployeeReport /></Layout></ProtectedRoute>
          } />
          <Route path="/admin/reports/location-verification" element={
            <ProtectedRoute role={role} requiredRole="Admin"><Layout><FeatureGate feature="reports_advanced"><LocationVerificationReport /></FeatureGate></Layout></ProtectedRoute>
          } />

          {/* Payroll / Calculation — admin only */}
          <Route path="/admin/payroll" element={
            <ProtectedRoute role={role} requiredRole="Admin"><Layout><FeatureGate feature="payroll"><PayrollHub /></FeatureGate></Layout></ProtectedRoute>
          } />
          <Route path="/admin/payroll/employee/:employeeId" element={
            <ProtectedRoute role={role} requiredRole="Admin"><Layout><FeatureGate feature="payroll"><EmployeeCalculation /></FeatureGate></Layout></ProtectedRoute>
          } />
          <Route path="/admin/payroll/outlet-allocations" element={
            <ProtectedRoute role={role} requiredRole="Admin"><Layout><FeatureGate feature="payroll"><OutletAllocations /></FeatureGate></Layout></ProtectedRoute>
          } />
          <Route path="/admin/payroll/report" element={
            <ProtectedRoute role={role} requiredRole="Admin"><Layout><FeatureGate feature="payroll"><PayrollReport /></FeatureGate></Layout></ProtectedRoute>
          } />
          <Route path="/admin/payroll/allowance-types" element={
            <ProtectedRoute role={role} requiredRole="Admin"><Layout><FeatureGate feature="payroll"><AllowanceTypes /></FeatureGate></Layout></ProtectedRoute>
          } />
          <Route path="/admin/payroll/bonus-tiers" element={
            <ProtectedRoute role={role} requiredRole="Admin"><Layout><FeatureGate feature="payroll"><BonusTiers /></FeatureGate></Layout></ProtectedRoute>
          } />
          <Route path="/admin/payroll/work-schedules" element={
            <ProtectedRoute role={role} requiredRole="Admin"><Layout><FeatureGate feature="payroll"><WorkSchedules /></FeatureGate></Layout></ProtectedRoute>
          } />
          <Route path="/admin/payroll/apit-slabs" element={
            <ProtectedRoute role={role} requiredRole="Admin"><Layout><FeatureGate feature="payroll"><ApitSlabs /></FeatureGate></Layout></ProtectedRoute>
          } />
          <Route path="/admin/payroll/gratuity" element={
            <ProtectedRoute role={role} requiredRole="Admin"><Layout><FeatureGate feature="payroll"><GratuityReport /></FeatureGate></Layout></ProtectedRoute>
          } />
          <Route path="/admin/payroll/employee-salary" element={
            <ProtectedRoute role={role} requiredRole="Admin"><Layout><FeatureGate feature="payroll"><EmployeeSalaryCompliance /></FeatureGate></Layout></ProtectedRoute>
          } />
          <Route path="/admin/payroll/employee-bank" element={
            <ProtectedRoute role={role} requiredRole="Admin"><Layout><FeatureGate feature="payroll"><EmployeeBankDetails /></FeatureGate></Layout></ProtectedRoute>
          } />
          <Route path="/admin/payroll/company-config" element={
            <ProtectedRoute role={role} requiredRole="Admin"><Layout><FeatureGate feature="payroll"><PayrollCompanyConfig /></FeatureGate></Layout></ProtectedRoute>
          } />

          {/* Fingerprint Import — admin + manager */}
          <Route path="/admin/fingerprint" element={
            <ProtectedRoute role={role} requiredRole="Admin"><Layout><FeatureGate feature="fingerprint_import"><FingerprintHub /></FeatureGate></Layout></ProtectedRoute>
          } />
          <Route path="/admin/fingerprint/:uploadId" element={
            <ProtectedRoute role={role} requiredRole="Admin"><Layout><FeatureGate feature="fingerprint_import"><FingerprintUploadDetail /></FeatureGate></Layout></ProtectedRoute>
          } />
          <Route path="/manager/fingerprint" element={
            <ProtectedRoute role={role} requiredRole="Manager"><Layout><FeatureGate feature="fingerprint_import"><FingerprintHub /></FeatureGate></Layout></ProtectedRoute>
          } />
          <Route path="/manager/fingerprint/:uploadId" element={
            <ProtectedRoute role={role} requiredRole="Manager"><Layout><FeatureGate feature="fingerprint_import"><FingerprintUploadDetail /></FeatureGate></Layout></ProtectedRoute>
          } />

          {/* Reports section — manager */}
          <Route path="/manager/reports" element={
            <ProtectedRoute role={role} requiredRole="Manager"><Layout><ReportsHub /></Layout></ProtectedRoute>
          } />
          <Route path="/manager/reports/monthly-sheet" element={
            <ProtectedRoute role={role} requiredRole="Manager"><Layout><MonthlySheetReport /></Layout></ProtectedRoute>
          } />
          <Route path="/manager/reports/late-comers" element={
            <ProtectedRoute role={role} requiredRole="Manager"><Layout><LateComersReport /></Layout></ProtectedRoute>
          } />
          <Route path="/manager/reports/absenteeism" element={
            <ProtectedRoute role={role} requiredRole="Manager"><Layout><AbsenteeismReport /></Layout></ProtectedRoute>
          } />
          <Route path="/manager/reports/blank-dates" element={
            <ProtectedRoute role={role} requiredRole="Manager"><Layout><BlankDatesReport /></Layout></ProtectedRoute>
          } />
          <Route path="/manager/reports/overtime" element={
            <ProtectedRoute role={role} requiredRole="Manager"><Layout><OvertimeReport /></Layout></ProtectedRoute>
          } />
          <Route path="/manager/reports/modification-audit" element={
            <ProtectedRoute role={role} requiredRole="Manager"><Layout><ModificationAuditReport /></Layout></ProtectedRoute>
          } />
          <Route path="/manager/reports/employee" element={
            <ProtectedRoute role={role} requiredRole="Manager"><Layout><EmployeeReport /></Layout></ProtectedRoute>
          } />
          <Route path="/manager/reports/location-verification" element={
            <ProtectedRoute role={role} requiredRole="Manager"><Layout><FeatureGate feature="reports_advanced"><LocationVerificationReport /></FeatureGate></Layout></ProtectedRoute>
          } />

        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
