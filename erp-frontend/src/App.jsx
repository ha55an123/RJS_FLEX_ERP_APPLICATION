import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';

import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import InventoryPage from './pages/InventoryPage';
import OrdersPage from './pages/OrdersPage';
import InvoicesPage from './pages/InvoicesPage';
import EmployeesPage from './pages/EmployeesPage';
import PurchasesPage from './pages/PurchasesPage';
import OutletsPage from './pages/OutletsPage';
import OutletPOSPage from './pages/OutletPOSPage';
import AttendancePage from './pages/AttendancePage';
import PayrollPage from './pages/PayrollPage';
import ProductionPayrollPage from './pages/ProductionPayrollPage';
import ProductionLoansPage from './pages/ProductionLoansPage';
import ProductionAdvancesPage from './pages/ProductionAdvancesPage';
import ProductionDepartmentsPage from './pages/ProductionDepartmentsPage';
import ProductionTechnologiesPage from './pages/ProductionTechnologiesPage';
import ProductionAssignmentsPage from './pages/ProductionAssignmentsPage';
import ProductionEntriesPage from './pages/ProductionEntriesPage';
import UsersPage from './pages/UsersPage';
import LedgersPage from './pages/LedgersPage';
import ExpensesPage from './pages/ExpensesPage';
import UtilityBillsPage from './pages/UtilityBillsPage';
import PurchaseRequestsPage from './pages/PurchaseRequestsPage';

// Gym Pages (placeholder imports - will create actual pages)
import GymDashboardPage from './pages/GymDashboardPage';
import MembersPage from './pages/MembersPage';
import MembershipsPage from './pages/MembershipsPage';
import GymStaffPage from './pages/GymStaffPage';
import GymAttendancePage from './pages/GymAttendancePage';
import BiometricDevicesPage from './pages/BiometricDevicesPage';
import WorkoutsPage from './pages/WorkoutsPage';
import DietPlansPage from './pages/DietPlansPage';
import GymPaymentsPage from './pages/GymPaymentsPage';
import EquipmentPage from './pages/EquipmentPage';
import GymInventoryPage from './pages/GymInventoryPage';
import BranchesPage from './pages/BranchesPage';
import ReportsPage from './pages/ReportsPage';
import SettingsPage from './pages/SettingsPage';
import FaceRegistrationPage from './pages/FaceRegistrationPage';
import FaceAttendancePage from './pages/FaceAttendancePage';


export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

            <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route index element={<Navigate to="/gym-dashboard" replace />} />
            
            {/* Gym Routes */}
            <Route path="/gym-dashboard" element={<GymDashboardPage />} />
            <Route path="/members" element={
              <ProtectedRoute roles={['super_admin', 'gym_owner', 'manager', 'receptionist']}><MembersPage /></ProtectedRoute>
            } />
            <Route path="/memberships" element={
              <ProtectedRoute roles={['super_admin', 'gym_owner', 'manager', 'receptionist', 'member']}><MembershipsPage /></ProtectedRoute>
            } />
            <Route path="/trainers" element={
              <ProtectedRoute roles={['super_admin', 'gym_owner', 'manager']}><GymStaffPage /></ProtectedRoute>
            } />
            <Route path="/gym-attendance" element={
              <ProtectedRoute roles={['super_admin', 'gym_owner', 'manager', 'receptionist']}><GymAttendancePage /></ProtectedRoute>
            } />
            <Route path="/biometric-devices" element={
              <ProtectedRoute roles={['super_admin', 'gym_owner', 'manager']}><BiometricDevicesPage /></ProtectedRoute>
            } />
            <Route path="/workouts" element={
              <ProtectedRoute roles={['super_admin', 'gym_owner', 'manager', 'trainer']}><WorkoutsPage /></ProtectedRoute>
            } />
            <Route path="/diet-plans" element={
              <ProtectedRoute roles={['super_admin', 'gym_owner', 'manager', 'trainer']}><DietPlansPage /></ProtectedRoute>
            } />
            <Route path="/gym-payments" element={
              <ProtectedRoute roles={['super_admin', 'gym_owner', 'manager', 'receptionist', 'accountant']}><GymPaymentsPage /></ProtectedRoute>
            } />
            <Route path="/equipment" element={
              <ProtectedRoute roles={['super_admin', 'gym_owner', 'manager']}><EquipmentPage /></ProtectedRoute>
            } />
            <Route path="/gym-inventory" element={
              <ProtectedRoute roles={['super_admin', 'gym_owner', 'manager', 'inventory_manager']}><GymInventoryPage /></ProtectedRoute>
            } />
            <Route path="/branches" element={
              <ProtectedRoute roles={['super_admin', 'gym_owner', 'manager']}><BranchesPage /></ProtectedRoute>
            } />
            <Route path="/reports" element={
              <ProtectedRoute roles={['super_admin', 'gym_owner', 'manager', 'accountant']}><ReportsPage /></ProtectedRoute>
            } />
            <Route path="/settings" element={
              <ProtectedRoute roles={['super_admin', 'gym_owner']}><SettingsPage /></ProtectedRoute>
            } />
            <Route path="/face-registration" element={
              <ProtectedRoute roles={['super_admin', 'gym_owner', 'manager', 'receptionist']}><FaceRegistrationPage /></ProtectedRoute>
            } />
            <Route path="/face-attendance" element={
              <ProtectedRoute roles={['super_admin', 'gym_owner', 'manager', 'receptionist']}><FaceAttendancePage /></ProtectedRoute>
            } />

            {/* Legacy Routes (Preserved) */}
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/inventory" element={
              <ProtectedRoute roles={['admin', 'company_manager']}><InventoryPage /></ProtectedRoute>
            } />
            <Route path="/purchases" element={
              <ProtectedRoute roles={['super_admin', 'gym_owner', 'manager']}><PurchasesPage /></ProtectedRoute>
            } />
            <Route path="/orders" element={<OrdersPage />} />
            <Route path="/invoices" element={
              <ProtectedRoute roles={['super_admin', 'gym_owner', 'manager', 'accountant']}><InvoicesPage /></ProtectedRoute>
            } />
            <Route path="/employees" element={
              <ProtectedRoute roles={['admin', 'company_manager']}><EmployeesPage /></ProtectedRoute>
            } />
            <Route path="/users" element={
              <ProtectedRoute roles={['super_admin']}><UsersPage /></ProtectedRoute>
            } />
            <Route path="/outlets" element={
              <ProtectedRoute roles={['admin', 'company_manager']}><OutletsPage /></ProtectedRoute>
            } />
            <Route path="/attendance" element={
              <ProtectedRoute roles={['admin', 'company_manager']}><AttendancePage /></ProtectedRoute>
            } />
            <Route path="/payroll" element={
              <ProtectedRoute roles={['admin', 'company_manager']}><PayrollPage /></ProtectedRoute>
            } />
            <Route path="/production-payroll" element={
              <ProtectedRoute roles={['admin', 'company_manager']}><ProductionPayrollPage /></ProtectedRoute>
            } />
            <Route path="/production-loans" element={
              <ProtectedRoute roles={['admin', 'company_manager']}><ProductionLoansPage /></ProtectedRoute>
            } />
            <Route path="/production-advances" element={
              <ProtectedRoute roles={['admin', 'company_manager']}><ProductionAdvancesPage /></ProtectedRoute>
            } />
            <Route path="/production-departments" element={
              <ProtectedRoute roles={['admin', 'company_manager']}><ProductionDepartmentsPage /></ProtectedRoute>
            } />
            <Route path="/production-technologies" element={
              <ProtectedRoute roles={['admin', 'company_manager']}><ProductionTechnologiesPage /></ProtectedRoute>
            } />
            <Route path="/production-assignments" element={
              <ProtectedRoute roles={['admin', 'company_manager']}><ProductionAssignmentsPage /></ProtectedRoute>
            } />
            <Route path="/production-entries" element={
              <ProtectedRoute roles={['admin', 'company_manager']}><ProductionEntriesPage /></ProtectedRoute>
            } />
            <Route path="/outlet-pos" element={<OutletPOSPage />} />
            <Route path="/ledgers" element={
              <ProtectedRoute roles={['super_admin', 'gym_owner', 'manager', 'accountant']}><LedgersPage /></ProtectedRoute>
            } />
            <Route path="/expenses" element={
              <ProtectedRoute roles={['super_admin', 'gym_owner', 'manager', 'accountant']}><ExpensesPage /></ProtectedRoute>
            } />
            <Route path="/utility-bills" element={
              <ProtectedRoute roles={['super_admin', 'gym_owner', 'manager', 'accountant']}><UtilityBillsPage /></ProtectedRoute>
            } />
            <Route path="/purchase-requests" element={
              <ProtectedRoute roles={['super_admin', 'gym_owner', 'manager']}><PurchaseRequestsPage /></ProtectedRoute>
            } />
          </Route>


          <Route path="*" element={<Navigate to="/gym-dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
    </ThemeProvider>
  );
}
