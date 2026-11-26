import { Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from './layout/AppShell.js';
import { ProtectedRoute } from './layout/ProtectedRoute.js';
import { HealthPage } from './pages/HealthPage.js';
import { KonksPage } from './pages/KonksPage.js';
import { LoginPage } from './pages/LoginPage.js';

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppShell />}>
          <Route index element={<Navigate to="/konks" replace />} />
          <Route path="/health" element={<HealthPage />} />
          <Route path="/konks" element={<KonksPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/konks" replace />} />
    </Routes>
  );
}
