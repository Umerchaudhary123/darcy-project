import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { useAuthStore } from './context/authStore';
import { LoadingScreen } from './components/ui';

// Public pages
import { LandingPage } from './pages/Public/Landing';
import { AboutPage, ContactPage, ForgotPasswordPage, ResetPasswordPage } from './pages/Public/About';
import { SignupPage } from './pages/Public/Signup';
import { LoginPage } from './pages/Public/Login';
import { AdminLoginPage } from './pages/Public/AdminLogin';
import { StripeCheckoutPage, AccountSetupPage } from './pages/Public/StripeCheckout';

// Client portal
import { ClientLayout } from './pages/ClintDashboard/ClientLayout';
import { ClientDashboard } from './pages/ClintDashboard/Dashboard';
import { ClientPipeline } from './pages/ClintDashboard/Pipeline';
import { ClientCalendar, ClientDocuments, ClientMessages, ClientNotifications, ClientSubscription, ClientSecurity } from './pages/ClintDashboard/Calendar';

// Admin portal
import { AdminLayout } from './pages/AdminDashboard/AdminLayout';
import { AdminDashboard } from './pages/AdminDashboard/Dashboard';
import { AdminPipeline } from './pages/AdminDashboard/Pipeline';
import { AdminCalendar, AdminDocuments, AdminMessages, AdminNotifications, AdminClientDetails } from './pages/AdminDashboard/Calendar';

// Super Admin
import { SuperAdminLayout, SuperAdminClients } from './pages/SuperAdmin/SuperAdminLayout';

import { ProtectedRoute } from './components/shared/ProtectedRoute';

const App: React.FC = () => {
  const { loadUser, isLoading, isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (isAuthenticated) {
      loadUser();
    }
  }, [isAuthenticated, loadUser]);

  if (isLoading) return <LoadingScreen />;

  return (
    <BrowserRouter>
      <Toaster position="top-right" theme="dark" richColors closeButton />
      <Routes>
        {/* Public */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/admin/login" element={<AdminLoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/stripe-checkout" element={<StripeCheckoutPage />} />
        <Route path="/account-setup" element={<AccountSetupPage />} />

        {/* Client Portal */}
        <Route path="/portal" element={<ProtectedRoute allowedRoles={['client']}><ClientLayout /></ProtectedRoute>}>
          <Route index element={<ClientDashboard />} />
          <Route path="security" element={<ClientSecurity />} />
        </Route>
        <Route path="/pipeline" element={<ProtectedRoute allowedRoles={['client']}><ClientLayout><ClientPipeline /></ClientLayout></ProtectedRoute>} />
        <Route path="/calendar" element={<ProtectedRoute allowedRoles={['client']}><ClientLayout><ClientCalendar /></ClientLayout></ProtectedRoute>} />
        <Route path="/documents" element={<ProtectedRoute allowedRoles={['client']}><ClientLayout><ClientDocuments /></ClientLayout></ProtectedRoute>} />
        <Route path="/messages" element={<ProtectedRoute allowedRoles={['client']}><ClientLayout><ClientMessages /></ClientLayout></ProtectedRoute>} />
        <Route path="/notifications" element={<ProtectedRoute allowedRoles={['client']}><ClientLayout><ClientNotifications /></ClientLayout></ProtectedRoute>} />
        <Route path="/subscription" element={<ProtectedRoute allowedRoles={['client']}><ClientLayout><ClientSubscription /></ClientLayout></ProtectedRoute>} />

        {/* Admin Portal */}
        <Route path="/admin" element={<ProtectedRoute allowedRoles={['admin', 'super_admin']}><AdminLayout /></ProtectedRoute>}>
          <Route index element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="pipeline" element={<AdminPipeline />} />
          <Route path="calendar" element={<AdminCalendar />} />
          <Route path="documents" element={<AdminDocuments />} />
          <Route path="messages" element={<AdminMessages />} />
          <Route path="notifications" element={<AdminNotifications />} />
          <Route path="client/:id" element={<AdminClientDetails />} />
        </Route>

        {/* Super Admin */}
        <Route path="/admin/super-admin" element={
          <ProtectedRoute allowedRoles={['super_admin']}>
            <SuperAdminLayout><SuperAdminClients /></SuperAdminLayout>
          </ProtectedRoute>
        } />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
