import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AppLayout } from './components/AppLayout';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { CrmPage } from './pages/CrmPage';
import { InspectionsPage } from './pages/InspectionsPage';
import { QuotationsPage } from './pages/QuotationsPage';
import { ContractsPage } from './pages/ContractsPage';
import { CalendarPage } from './pages/CalendarPage';
import { JobCardsPage } from './pages/JobCardsPage';
import { InventoryPage } from './pages/InventoryPage';
import { BillingPage } from './pages/BillingPage';
import { ComplaintsPage } from './pages/ComplaintsPage';
import { HrPage } from './pages/HrPage';
import { ReportsPage } from './pages/ReportsPage';
import { IntegrationsPage } from './pages/IntegrationsPage';
import { ManagementPage } from './pages/ManagementPage';
import { ActivityPage } from './pages/ActivityPage';
import { ProcurementPage } from './pages/ProcurementPage';
import { BulkDataPage } from './pages/BulkDataPage';
export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path='/login' element={<LoginPage />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route index element={<DashboardPage />} />
              <Route path='crm' element={<CrmPage />} />
              <Route path='inspections' element={<InspectionsPage />} />
              <Route path='quotations' element={<QuotationsPage />} />
              <Route path='contracts' element={<ContractsPage />} />
              <Route path='calendar' element={<CalendarPage />} />
              <Route path='jobs' element={<JobCardsPage />} />
              <Route path='inventory' element={<InventoryPage />} />
              <Route path='billing' element={<BillingPage />} />
              <Route path='complaints' element={<ComplaintsPage />} />
              <Route path='hr' element={<HrPage />} />
              <Route path='reports' element={<ReportsPage />} />
              <Route path='integrations' element={<IntegrationsPage />} />
              <Route path='management' element={<ManagementPage />} />
              <Route path='activity' element={<ActivityPage />} />
              <Route path='procurement' element={<ProcurementPage />} />
              <Route path='data-tools' element={<BulkDataPage />} />
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
