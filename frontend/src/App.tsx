import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth';

import LandingPage from '@/pages/LandingPage';
import LoginPage from '@/pages/LoginPage';
import RegisterPage from '@/pages/RegisterPage';
import DashboardPage from '@/pages/DashboardPage';
import ComplianceCalendarPage from '@/pages/ComplianceCalendarPage';
import DQFPage from '@/pages/DQFPage';
import IFTAPage from '@/pages/IFTAPage';
import DrugTestPage from '@/pages/DrugTestPage';
import RenewalPage from '@/pages/RenewalPage';
import SettingsPage from '@/pages/SettingsPage';
import AppLayout from '@/components/AppLayout';

function RequireAuth({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user);
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      <Route
        path="/dashboard"
        element={
          <RequireAuth>
            <AppLayout>
              <DashboardPage />
            </AppLayout>
          </RequireAuth>
        }
      />
      <Route
        path="/compliance"
        element={
          <RequireAuth>
            <AppLayout>
              <ComplianceCalendarPage />
            </AppLayout>
          </RequireAuth>
        }
      />
      <Route
        path="/dqf"
        element={
          <RequireAuth>
            <AppLayout>
              <DQFPage />
            </AppLayout>
          </RequireAuth>
        }
      />
      <Route
        path="/ifta"
        element={
          <RequireAuth>
            <AppLayout>
              <IFTAPage />
            </AppLayout>
          </RequireAuth>
        }
      />
      <Route
        path="/drug-tests"
        element={
          <RequireAuth>
            <AppLayout>
              <DrugTestPage />
            </AppLayout>
          </RequireAuth>
        }
      />
      <Route
        path="/renewals"
        element={
          <RequireAuth>
            <AppLayout>
              <RenewalPage />
            </AppLayout>
          </RequireAuth>
        }
      />
      <Route
        path="/settings"
        element={
          <RequireAuth>
            <AppLayout>
              <SettingsPage />
            </AppLayout>
          </RequireAuth>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
