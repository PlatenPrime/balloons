import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from './layout/AppShell.js';
import { ProtectedRoute } from './layout/ProtectedRoute.js';
import { LoginPage } from './pages/LoginPage.js';

const SalesPage = lazy(() =>
  import('./pages/SalesPage.js').then((m) => ({ default: m.SalesPage })),
);
const StockPage = lazy(() =>
  import('./pages/StockPage.js').then((m) => ({ default: m.StockPage })),
);
const StatisticsPage = lazy(() =>
  import('./pages/StatisticsPage.js').then((m) => ({ default: m.StatisticsPage })),
);
const StatisticsProdPage = lazy(() =>
  import('./pages/StatisticsProdPage.js').then((m) => ({ default: m.StatisticsProdPage })),
);
const StatisticsSkugrPage = lazy(() =>
  import('./pages/StatisticsSkugrPage.js').then((m) => ({ default: m.StatisticsSkugrPage })),
);
const ComparisonKonksPage = lazy(() =>
  import('./pages/ComparisonKonksPage.js').then((m) => ({ default: m.ComparisonKonksPage })),
);
const ComparisonSkusPage = lazy(() =>
  import('./pages/ComparisonSkusPage.js').then((m) => ({ default: m.ComparisonSkusPage })),
);
const ExcelPage = lazy(() =>
  import('./pages/ExcelPage.js').then((m) => ({ default: m.ExcelPage })),
);

function RouteFallback() {
  return <p className="text-sm text-slate-500">Loading…</p>;
}

export function App() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<AppShell />}>
            <Route index element={<Navigate to="/sales" replace />} />
            <Route path="sales" element={<SalesPage />} />
            <Route path="stock" element={<StockPage />} />
            <Route path="statistics" element={<StatisticsPage />} />
            <Route path="statistics/prod" element={<StatisticsProdPage />} />
            <Route path="statistics/skugr" element={<StatisticsSkugrPage />} />
            <Route path="comparison/konks" element={<ComparisonKonksPage />} />
            <Route path="comparison/skus" element={<ComparisonSkusPage />} />
            <Route path="excel" element={<ExcelPage />} />
            <Route path="*" element={<Navigate to="/sales" replace />} />
          </Route>
        </Route>
      </Routes>
    </Suspense>
  );
}
