import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.js';

const navClass = ({ isActive }: { isActive: boolean }) =>
  [
    'rounded px-2 py-1 text-sm transition-colors',
    isActive ? 'bg-slate-800 text-white' : 'text-slate-700 hover:bg-slate-200',
  ].join(' ');

export function AppShell() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-6">
            <span className="text-sm font-semibold tracking-wide text-slate-900">
              balloons / analytics
            </span>
            <nav className="flex flex-wrap items-center gap-1">
              <NavLink to="/sales" className={navClass}>
                Sales
              </NavLink>
              <NavLink to="/stock" className={navClass}>
                Stock
              </NavLink>
              <NavLink to="/statistics" className={navClass}>
                Statistics
              </NavLink>
              <NavLink to="/comparison/konks" className={navClass}>
                Comparison
              </NavLink>
              <NavLink to="/excel" className={navClass}>
                Excel
              </NavLink>
            </nav>
          </div>
          <button
            type="button"
            onClick={() => {
              logout();
              void navigate('/login', { replace: true });
            }}
            className="rounded border border-slate-300 bg-white px-3 py-1 text-sm text-slate-700 hover:bg-slate-50"
          >
            Log out
          </button>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
