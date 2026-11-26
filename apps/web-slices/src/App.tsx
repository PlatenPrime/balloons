import { Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from './layout/AppShell.js';
import { ProtectedRoute } from './layout/ProtectedRoute.js';
import { BandSpikePage } from './pages/BandSpikePage.js';
import { HealthPage } from './pages/HealthPage.js';
import { JobsPage } from './pages/JobsPage.js';
import { KonkDetailPage } from './pages/KonkDetailPage.js';
import { KonksPage } from './pages/KonksPage.js';
import { LoginPage } from './pages/LoginPage.js';
import { PackFlipsPage } from './pages/PackFlipsPage.js';
import { SkuDetailPage } from './pages/SkuDetailPage.js';
import { SkugrDetailPage } from './pages/SkugrDetailPage.js';
import { SkugrsPage } from './pages/SkugrsPage.js';
import { SkusPage } from './pages/SkusPage.js';
import { SlicesPage } from './pages/SlicesPage.js';
import { StockBandDetailPage } from './pages/StockBandDetailPage.js';
import { StockBandsPage } from './pages/StockBandsPage.js';

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppShell />}>
          <Route index element={<Navigate to="/konks" replace />} />
          <Route path="/health" element={<HealthPage />} />
          <Route path="/konks" element={<KonksPage />} />
          <Route path="/konks/:name" element={<KonkDetailPage />} />
          <Route path="/skugrs" element={<SkugrsPage />} />
          <Route path="/skugrs/:id" element={<SkugrDetailPage />} />
          <Route path="/skus" element={<SkusPage />} />
          <Route path="/skus/:id" element={<SkuDetailPage />} />
          <Route path="/slices" element={<SlicesPage />} />
          <Route path="/jobs" element={<JobsPage />} />
          <Route path="/pack-flips" element={<PackFlipsPage />} />
          <Route path="/band-spike" element={<BandSpikePage />} />
          <Route path="/stock-bands" element={<StockBandsPage />} />
          <Route path="/stock-bands/:id" element={<StockBandDetailPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/konks" replace />} />
    </Routes>
  );
}
