import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';

import LoginPage from './pages/LoginPage';
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


export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<Navigate to="/login" replace />} />

            <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/inventory" element={
              <ProtectedRoute roles={['admin', 'company_manager']}><InventoryPage /></ProtectedRoute>
            } />
            <Route path="/purchases" element={
              <ProtectedRoute roles={['admin', 'company_manager']}><PurchasesPage /></ProtectedRoute>
            } />
            <Route path="/orders" element={<OrdersPage />} />
            <Route path="/invoices" element={<InvoicesPage />} />
            <Route path="/employees" element={
              <ProtectedRoute roles={['admin', 'company_manager']}><EmployeesPage /></ProtectedRoute>
            } />
            <Route path="/users" element={
              <ProtectedRoute roles={['admin']}><UsersPage /></ProtectedRoute>
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
              <ProtectedRoute roles={['admin', 'company_manager']}><LedgersPage /></ProtectedRoute>
            } />
            <Route path="/expenses" element={
              <ProtectedRoute roles={['admin', 'company_manager']}><ExpensesPage /></ProtectedRoute>
            } />
            <Route path="/utility-bills" element={
              <ProtectedRoute roles={['admin', 'company_manager']}><UtilityBillsPage /></ProtectedRoute>
            } />
            <Route path="/purchase-requests" element={<PurchaseRequestsPage />} />
          </Route>


          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
    </ThemeProvider>
  );
}
