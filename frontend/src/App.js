import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';
import Layout from './components/Layout';
import { isAuthenticated, getUserRole } from './utils/auth';

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
const OvertimeReport = lazy(() => import('./pages/reports/OvertimeReport'));
const ModificationAuditReport = lazy(() => import('./pages/reports/ModificationAuditReport'));
const EmployeeReport = lazy(() => import('./pages/reports/EmployeeReport'));

// Payroll / Calculation
const PayrollHub = lazy(() => import('./pages/payroll/PayrollHub'));
const EmployeeCalculation = lazy(() => import('./pages/payroll/EmployeeCalculation'));

// Fingerprint Import
const FingerprintHub = lazy(() => import('./pages/fingerprint/FingerprintHub'));
const FingerprintUploadDetail = lazy(() => import('./pages/fingerprint/FingerprintUploadDetail'));


const ProtectedRoute = ({ role, children, requiredRole }) => {
  return isAuthenticated() && role === requiredRole ? children : <Navigate to="/" />;
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
          {/* Public Route */}
          <Route path="/" element={<LoginPage />} />

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
              <Layout><DatabaseBackup /></Layout>
            </ProtectedRoute>
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
              <Layout><AttendanceEditRequests /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/admin/employees/status" element={
            <ProtectedRoute role={role} requiredRole="Admin">
              <Layout><UserStatusManager /></Layout>
            </ProtectedRoute>
          } />

          {/* Reports section — admin */}
          <Route path="/admin/reports" element={
            <ProtectedRoute role={role} requiredRole="Admin"><Layout><ReportsHub /></Layout></ProtectedRoute>
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
          <Route path="/admin/reports/overtime" element={
            <ProtectedRoute role={role} requiredRole="Admin"><Layout><OvertimeReport /></Layout></ProtectedRoute>
          } />
          <Route path="/admin/reports/modification-audit" element={
            <ProtectedRoute role={role} requiredRole="Admin"><Layout><ModificationAuditReport /></Layout></ProtectedRoute>
          } />
          <Route path="/admin/reports/employee" element={
            <ProtectedRoute role={role} requiredRole="Admin"><Layout><EmployeeReport /></Layout></ProtectedRoute>
          } />

          {/* Payroll / Calculation — admin only */}
          <Route path="/admin/payroll" element={
            <ProtectedRoute role={role} requiredRole="Admin"><Layout><PayrollHub /></Layout></ProtectedRoute>
          } />
          <Route path="/admin/payroll/employee/:employeeId" element={
            <ProtectedRoute role={role} requiredRole="Admin"><Layout><EmployeeCalculation /></Layout></ProtectedRoute>
          } />

          {/* Fingerprint Import — admin + manager */}
          <Route path="/admin/fingerprint" element={
            <ProtectedRoute role={role} requiredRole="Admin"><Layout><FingerprintHub /></Layout></ProtectedRoute>
          } />
          <Route path="/admin/fingerprint/:uploadId" element={
            <ProtectedRoute role={role} requiredRole="Admin"><Layout><FingerprintUploadDetail /></Layout></ProtectedRoute>
          } />
          <Route path="/manager/fingerprint" element={
            <ProtectedRoute role={role} requiredRole="Manager"><Layout><FingerprintHub /></Layout></ProtectedRoute>
          } />
          <Route path="/manager/fingerprint/:uploadId" element={
            <ProtectedRoute role={role} requiredRole="Manager"><Layout><FingerprintUploadDetail /></Layout></ProtectedRoute>
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
          <Route path="/manager/reports/overtime" element={
            <ProtectedRoute role={role} requiredRole="Manager"><Layout><OvertimeReport /></Layout></ProtectedRoute>
          } />
          <Route path="/manager/reports/modification-audit" element={
            <ProtectedRoute role={role} requiredRole="Manager"><Layout><ModificationAuditReport /></Layout></ProtectedRoute>
          } />
          <Route path="/manager/reports/employee" element={
            <ProtectedRoute role={role} requiredRole="Manager"><Layout><EmployeeReport /></Layout></ProtectedRoute>
          } />

        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
