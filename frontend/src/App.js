import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import AdminDashboard from './pages/AdminDashboard';
import Employees from './pages/Employees';
import LeaveApproval from './pages/LeaveApproval';
import Reports from './pages/Reports';
import ManageUsers from './pages/ManageUsers';
import Layout from './components/Layout';
import { isAuthenticated, getUserRole } from './utils/auth';
import ManEmp from './pages/EmpMan';
import ManEmp2 from './pages/EmpMan2.js';

// Import all new pages
import CreateEmployee from './pages/admin/create/CreateEmployee.js';
import CreateRole from './pages/admin/create/CreateRole.js';
import CreateOutlet from './pages/admin/create/CreateOutlet.js';
import CreateAgency from './pages/admin/create/CreateAgency.js';
import CreateLeave from './pages/admin/create/CreateLeave.js';
import CreateWorkShift from './pages/admin/create/CreateWorkShift.js';
import CreateManager from './pages/admin/create/CreateHoliday.js';
import AdminReport from './pages/admin/AdminReport.js';  // Import Admin Report
import AdminReport2 from './pages/admin/AdminReportStanded';  // Import Admin Report
import EmployeeStatus from './pages/admin/EmployeeStatus.js';
import Outlets from './pages/admin/outlets.js';
import DeviceMangemnt from './pages/admin/assign/DeviceMangemnt.js';
import AdminATTM from './pages/admin/assign/AdminATTM.js'; // Import Admin ATTM
import ManagerATTM from './pages/manager/ManagerATTM.js'; // Import Manager ATTM
import DatabaseBackup from './pages/manager/DatabaseBackup.js';
import AssignEmployeeOutlet from './pages/admin/assign/AssignEmployeeOutlet.js';
import AssignManagerOutlet from './pages/admin/assign/AssignManagerOutlet.js';
import AssignLeave from './pages/admin/assign/LeaveManagment.js';
import AssignWorkShift from './pages/admin/assign/AssignWorkShift.js';
import TEST from './pages/admin/assign/test.js';
import DailyOutletAttadace from './pages/DailyOutletAttadace.js';
import OutletLeaveSummary from 'pages/OutletLeaveSummary.js';
import Attandancemodify from './pages/AttandanceModify.js';
import Leavemodify from 'pages/LeaveModify.js';
import DeactiveEmplooyee from 'pages/DeactiveEmployee.js';
import MANReports from 'pages/MANReports';
import ReffaranceImage from 'pages/ReffranceImage';
import OutletSummary from 'pages/admin/OutletSummary.js';

import SelectOutlet from 'pages/SelectOutlet';


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
          path="/test"
          element={
            <ProtectedRoute role={role} requiredRole="Admin">
              <Layout>
                <TEST />
              </Layout>
            </ProtectedRoute>
          }
        />
                <Route
          path="/ManEmp2"
          element={
            <ProtectedRoute role={role} requiredRole="Manager">
              <Layout>
                <ManEmp2 />
              </Layout>
            </ProtectedRoute>
          }
        />

        {/* Admin Dashboard */}
        <Route
          path="/Admindashboard"
          element={
            <ProtectedRoute role={role} requiredRole="Admin">
              <Layout>
                <AdminDashboard />
              </Layout>
            </ProtectedRoute>
          }
        />
                <Route
          path="/admin/DeactiveEmployee"
          element={
            <ProtectedRoute role={role} requiredRole="Admin">
              <Layout>
                <DeactiveEmplooyee />
              </Layout>
            </ProtectedRoute>
          }
        />

        {/* Manager Dashboard */}
        <Route
          path="/Dashboard"
          element={
            <ProtectedRoute role={role} requiredRole="Manager">
              <Layout>
                <Dashboard />
              </Layout>
            </ProtectedRoute>
          }
        />

        {/* Manager Routes */}
        <Route path="/employees" element={
          <ProtectedRoute role={role} requiredRole="Manager">
            <Layout><Employees /></Layout>
          </ProtectedRoute>
        } />
        <Route path="/empman" element={
          <ProtectedRoute role={role} requiredRole="Manager">
            <Layout><ManEmp /></Layout>
          </ProtectedRoute>

        }/>

        <Route path="/select-outlet" element={
          <ProtectedRoute role={role} requiredRole="Manager">
            <Layout><SelectOutlet /></Layout>
          </ProtectedRoute>
        } />
        <Route path="/leave-approval" element={
          <ProtectedRoute role={role} requiredRole="Manager">
            <Layout><LeaveApproval /></Layout>
          </ProtectedRoute>
        } />
        <Route path="/reports" element={
          <ProtectedRoute role={role} requiredRole="Manager">
            <Layout><Reports /></Layout>
          </ProtectedRoute>
        } />

        {/* Admin Routes */}
        <Route path="/manage-users" element={
          <ProtectedRoute role={role} requiredRole="Admin">
            <Layout><ManageUsers /></Layout>
          </ProtectedRoute>
        } />

        <Route path="/Admin/outlets" element={
          <ProtectedRoute role={role} requiredRole="Admin">
            <Layout><Outlets /></Layout>
          </ProtectedRoute>
        } />

        {/* Admin: Create Section */}
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
        <Route path="/admin/create/workshift" element={
          <ProtectedRoute role={role} requiredRole="Admin">
            <Layout><CreateWorkShift /></Layout>
          </ProtectedRoute>
        } />
        <Route path="/admin/create/holidays" element={
          <ProtectedRoute role={role} requiredRole="Admin">
            <Layout><CreateManager /></Layout>
          </ProtectedRoute>
        } />

        {/* Admin: Assign Section */}
        <Route path="/admin/assign/employee-outlet" element={
          <ProtectedRoute role={role} requiredRole="Admin">
            <Layout><AssignEmployeeOutlet /></Layout>
          </ProtectedRoute>
        } />
        <Route path="/admin/assign/Manager-outlet" element={
          <ProtectedRoute role={role} requiredRole="Admin">
            <Layout><AssignManagerOutlet /></Layout>
          </ProtectedRoute>
        } />
        <Route path="/admin/assign/leave" element={
          <ProtectedRoute role={role} requiredRole="Admin">
            <Layout><AssignLeave /></Layout>
          </ProtectedRoute>
        } />
        <Route path="/admin/assign/workshift" element={
          <ProtectedRoute role={role} requiredRole="Admin">
            <Layout><AssignWorkShift /></Layout>
          </ProtectedRoute>
        } />

        {/* Admin Reports */}
        <Route path="/admin/reports" element={
          <ProtectedRoute role={role} requiredRole="Admin">
            <Layout><AdminReport /></Layout>  {/* Add the AdminReport component here */}
          </ProtectedRoute>
        } />
        {/* Admin Reports standard */}
        <Route path="/admin/reports2" element={
          <ProtectedRoute role={role} requiredRole="Admin">
            <Layout><AdminReport2 /></Layout>  {/* Add the AdminReport component here */}
          </ProtectedRoute>
        } />
        <Route path="/OutletSummary" element={
          <ProtectedRoute role={role} requiredRole="Admin">
            <Layout><OutletSummary /></Layout>  {/* Use OutletSummary component instead of AdminReport */}
          </ProtectedRoute>
        } />
         {/* Role Management */}
        <Route path="/admin/create" element={
          <ProtectedRoute role={role} requiredRole="Admin">
            <Layout><CreateRole/></Layout>
          </ProtectedRoute>
        } />
        {/* Employee-status */}
        <Route path="/admin/employee-status" element={
          <ProtectedRoute role={role} requiredRole="Admin">
            <Layout><EmployeeStatus /></Layout>
          </ProtectedRoute>
        } />
          {/* Device Management */}
        <Route path="/admin/Employee/PasswordChange" element={
          <ProtectedRoute role={role} requiredRole="Admin">
            <Layout><DeviceMangemnt/></Layout>
          </ProtectedRoute>
        } />

         {/* ATT Management */}
        <Route path="/admin/assign/AdminATTM" element={
          <ProtectedRoute role={role} requiredRole="Admin">
            <Layout><AdminATTM/></Layout>
          </ProtectedRoute>
        } />

         {/* Device Management */}
        <Route path="/manager/ManagerATTM" element={
          <ProtectedRoute role={role} requiredRole="Manager">
            <Layout><ManagerATTM/></Layout>
          </ProtectedRoute>
        } />

               {/* Daily attadace outlet */}
        <Route path="/manager/DAO" element={
          <ProtectedRoute role={role} requiredRole="Manager">
            <Layout><DailyOutletAttadace/></Layout>
          </ProtectedRoute>
        } />

        
               {/* Leave Summary outlet */}
        <Route path="/manager/OLS" element={
          <ProtectedRoute role={role} requiredRole="Manager">
            <Layout><OutletLeaveSummary/></Layout>
          </ProtectedRoute>
        } />
        <Route path="/Attandancemodify" element={
          <ProtectedRoute role={role} requiredRole="Manager">
            <Layout><Attandancemodify/></Layout>
          </ProtectedRoute>
        } />

          <Route path="/Leavemodify" element={
          <ProtectedRoute role={role} requiredRole="Manager">
            <Layout><Leavemodify/></Layout>
          </ProtectedRoute>
        } />
          <Route path="/Manager/Reports" element={
          <ProtectedRoute role={role} requiredRole="Manager">
            <Layout><MANReports/></Layout>
          </ProtectedRoute>
        } />
        <Route path="/manager/database-backup" element={
          <ProtectedRoute role={role} requiredRole="Manager">
            <Layout><DatabaseBackup/></Layout>
          </ProtectedRoute>
        } />

        <Route path="/employees/modify-reference-image" element={
          <ProtectedRoute role={role} requiredRole="Admin">
            <Layout><ReffaranceImage/></Layout>
          </ProtectedRoute>
        } />

      </Routes> 
    </BrowserRouter>
  );
}

export default App;
