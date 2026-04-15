import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import AdminDashboard from './pages/AdminDashboard';
import LeaveApproval from './pages/LeaveApproval';
import Layout from './components/Layout';
import { isAuthenticated, getUserRole } from './utils/auth';

// Pages - Manager routes
import ManagerEmployeeList from './pages/ManagerEmployeeList';
import DailyAttendanceView from './pages/DailyAttendanceView';
import OutletSelector from './pages/OutletSelector';
import ManagerAttendanceReport from './pages/ManagerAttendanceReport';
import DailyOutletAttendance from './pages/DailyOutletAttendance';
import OutletLeaveHistory from './pages/OutletLeaveHistory';
import AttendanceEditor from './pages/AttendanceEditor';
import BulkLeaveAssignment from './pages/BulkLeaveAssignment';
import ManagerDailyAttendance from './pages/manager/ManagerDailyAttendance';
import DatabaseBackup from './pages/manager/DatabaseBackup';
import FaceReferenceImages from './pages/FaceReferenceImages';

// Admin create section
import CreateEmployee from './pages/admin/create/CreateEmployee';
import CreateRole from './pages/admin/create/CreateRole';
import CreateOutlet from './pages/admin/create/CreateOutlet';
import CreateAgency from './pages/admin/create/CreateAgency';
import CreateLeave from './pages/admin/create/CreateLeave';
import HolidayManager from './pages/admin/create/HolidayManager';

// Admin management section
import AdminAttendanceReport from './pages/admin/AdminAttendanceReport';
import AdminEmployeeEditor from './pages/admin/AdminEmployeeEditor';
import OutletManager from './pages/admin/OutletManager';
import AdminOutletSummary from './pages/admin/AdminOutletSummary';

// Admin assign section
import EmployeePasswordReset from './pages/admin/assign/EmployeePasswordReset';
import AdminLeaveApproval from './pages/admin/assign/AdminLeaveApproval';
import DeviceOutletAssignment from './pages/admin/assign/DeviceOutletAssignment';
import AttendanceEditRequests from './pages/admin/AttendanceEditRequests';
import UserStatusManager from './pages/admin/UserStatusManager';


const ProtectedRoute = ({ role, children, requiredRole }) => {
  return isAuthenticated() && role === requiredRole ? children : <Navigate to="/" />;
};

function App() {
  const role = getUserRole();

  return (
    <BrowserRouter>
      <Routes>
        {/* Public Route */}
        <Route path="/" element={<LoginPage />} />

        {/* Admin Dashboard */}
        <Route
          path="/admin/dashboard"
          element={
            <ProtectedRoute role={role} requiredRole="Admin">
              <Layout>
                <AdminDashboard />
              </Layout>
            </ProtectedRoute>
          }
        />

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
            <Layout><CreateLeave /></Layout>
          </ProtectedRoute>
        } />
        <Route path="/admin/create/holidays" element={
          <ProtectedRoute role={role} requiredRole="Admin">
            <Layout><HolidayManager /></Layout>
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
        <Route path="/admin/reports/attendance" element={
          <ProtectedRoute role={role} requiredRole="Admin">
            <Layout><AdminAttendanceReport /></Layout>
          </ProtectedRoute>
        } />
        <Route path="/admin/reports/outlet-summary" element={
          <ProtectedRoute role={role} requiredRole="Admin">
            <Layout><AdminOutletSummary /></Layout>
          </ProtectedRoute>
        } />

        {/* Admin: Employee Management */}
        <Route path="/admin/employees/editor" element={
          <ProtectedRoute role={role} requiredRole="Admin">
            <Layout><AdminEmployeeEditor /></Layout>
          </ProtectedRoute>
        } />
        <Route path="/admin/employees/password-reset" element={
          <ProtectedRoute role={role} requiredRole="Admin">
            <Layout><EmployeePasswordReset /></Layout>
          </ProtectedRoute>
        } />
        <Route path="/admin/employees/face-reference" element={
          <ProtectedRoute role={role} requiredRole="Admin">
            <Layout><FaceReferenceImages /></Layout>
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

      </Routes> 
    </BrowserRouter>
  );
}

export default App;
