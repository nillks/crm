import type { ReactNode } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { theme } from './theme/theme';
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { DashboardPage } from './pages/DashboardPage';
import { ClientsPage } from './pages/clients/ClientsPage';
import { ClientCardPage } from './pages/clients/ClientCardPage';
import { TicketsPage } from './pages/tickets/TicketsPage';
import { TicketDetailPage } from './pages/tickets/TicketDetailPage';
import { ChatPage } from './pages/chat/ChatPage';
import { AISettingsPage } from './pages/settings/AISettingsPage';
import { CallsPage } from './pages/calls/CallsPage';
import { AnalyticsPage } from './pages/analytics/AnalyticsPage';
import { TasksPage } from './pages/tasks/TasksPage';
import { TemplatesPage } from './pages/templates/TemplatesPage';
import { WABAPage } from './pages/admin/WABAPage';
import { SupportLinesPage } from './pages/admin/SupportLinesPage';
import { ScheduledReportsPage } from './pages/admin/ScheduledReportsPage';
import { FunnelsPage } from './pages/admin/FunnelsPage';
import { ProfilePage } from './pages/profile/ProfilePage';
import { LimitsPage } from './pages/admin/LimitsPage';

// Компонент для редиректа авторизованных пользователей
const PublicRoute = ({ children }: { children: ReactNode }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return null;
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <HashRouter>
        <AuthProvider>
          <Routes>
            <Route
              path="/login"
              element={
                <PublicRoute>
                  <LoginPage />
                </PublicRoute>
              }
            />
            <Route
              path="/register"
              element={
                <PublicRoute>
                  <RegisterPage />
                </PublicRoute>
              }
            />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <DashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/clients"
              element={
                <ProtectedRoute>
                  <ClientsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/clients/:id"
              element={
                <ProtectedRoute>
                  <ClientCardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/tickets"
              element={
                <ProtectedRoute>
                  <TicketsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/tickets/:id"
              element={
                <ProtectedRoute>
                  <TicketDetailPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/chat"
              element={
                <ProtectedRoute>
                  <ChatPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings/ai"
              element={
                <ProtectedRoute>
                  <AISettingsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/calls"
              element={
                <ProtectedRoute>
                  <CallsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/analytics"
              element={
                <ProtectedRoute>
                  <AnalyticsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/tasks"
              element={
                <ProtectedRoute>
                  <TasksPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/templates"
              element={
                <ProtectedRoute>
                  <TemplatesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/waba"
              element={
                <ProtectedRoute>
                  <WABAPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/support-lines"
              element={
                <ProtectedRoute>
                  <SupportLinesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/scheduled-reports"
              element={
                <ProtectedRoute>
                  <ScheduledReportsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/funnels"
              element={
                <ProtectedRoute>
                  <FunnelsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/limits"
              element={
                <ProtectedRoute>
                  <LimitsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <ProfilePage />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthProvider>
      </HashRouter>
    </ThemeProvider>
  );
}

export default App;