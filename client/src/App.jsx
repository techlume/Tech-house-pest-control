import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AppLayout } from './components/AppLayout';
import { StorefrontPage } from './pages/StorefrontPage';
import { SiteSettingsPage } from './pages/SiteSettingsPage';
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

// Public Service & Corporate Pages
import { CockroachServicePage } from './pages/services/CockroachServicePage';
import { TermiteServicePage } from './pages/services/TermiteServicePage';
import { RodentServicePage } from './pages/services/RodentServicePage';
import { MosquitoServicePage } from './pages/services/MosquitoServicePage';
import { BedBugServicePage } from './pages/services/BedBugServicePage';
import { BirdControlServicePage } from './pages/services/BirdControlServicePage';
import { AboutPage } from './pages/AboutPage';
import { ContactPage } from './pages/ContactPage';
import { BlogPage } from './pages/BlogPage';
import { PrivacyPolicyPage } from './pages/PrivacyPolicyPage';
import { LegalStatementPage } from './pages/LegalStatementPage';
import { CookiePolicyPage } from './pages/CookiePolicyPage';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Main D2C Customer Storefront Routes */}
          <Route path="/" element={<StorefrontPage />} />
          <Route path="/login" element={<LoginPage />} />

          {/* Treatment & Service Pages */}
          <Route path="/services/cockroach" element={<CockroachServicePage />} />
          <Route path="/services/termite" element={<TermiteServicePage />} />
          <Route path="/services/rodent" element={<RodentServicePage />} />
          <Route path="/services/mosquito" element={<MosquitoServicePage />} />
          <Route path="/services/bed-bug" element={<BedBugServicePage />} />
          <Route path="/services/bird-control" element={<BirdControlServicePage />} />

          {/* Corporate, Content & Policy Pages */}
          <Route path="/about" element={<AboutPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/blog" element={<BlogPage />} />
          <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
          <Route path="/legal-statement" element={<LegalStatementPage />} />
          <Route path="/cookie-policy" element={<CookiePolicyPage />} />

          {/* Staff & Admin Protected ERP Portal */}
          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route path="/admin" element={<DashboardPage />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/crm" element={<CrmPage />} />
              <Route path="/inspections" element={<InspectionsPage />} />
              <Route path="/quotations" element={<QuotationsPage />} />
              <Route path="/contracts" element={<ContractsPage />} />
              <Route path="/calendar" element={<CalendarPage />} />
              <Route path="/jobs" element={<JobCardsPage />} />
              <Route path="/inventory" element={<InventoryPage />} />
              <Route path="/billing" element={<BillingPage />} />
              <Route path="/complaints" element={<ComplaintsPage />} />
              <Route path="/hr" element={<HrPage />} />
              <Route path="/reports" element={<ReportsPage />} />
              <Route path="/integrations" element={<IntegrationsPage />} />
              <Route path="/management" element={<ManagementPage />} />
              <Route path="/activity" element={<ActivityPage />} />
              <Route path="/procurement" element={<ProcurementPage />} />
              <Route path="/data-tools" element={<BulkDataPage />} />
              <Route path="/site-settings" element={<SiteSettingsPage />} />
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
