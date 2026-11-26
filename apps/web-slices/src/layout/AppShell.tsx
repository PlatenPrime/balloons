import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.js';

const navClass = ({ isActive }: { isActive: boolean }) =>
  [
    'rounded px-2 py-1 text-sm transition-colors',
    isActive ? 'bg-slate-800 text-white' : 'text-slate-700 hover:bg-slate-200',
  ].join(' ');

const stubClass = 'cursor-not-allowed rounded px-2 py-1 text-sm text-slate-400';

export function AppShell() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-6">
            <span className="text-sm font-semibold tracking-wide text-slate-900">
              balloons / slices
            </span>
            <nav className="flex flex-wrap items-center gap-1">
              <NavLink to="/health" className={navClass}>
                Health
              </NavLink>
              <NavLink to="/konks" className={navClass}>
                Konks
              </NavLink>
              <span className={stubClass} title="Phase 5.2">
                Skugrs
              </span>
              <span className={stubClass} title="Phase 5.2">
                Skus
              </span>
              <span className={stubClass} title="Phase 5.2">
                Slices
              </span>
              <span className={stubClass} title="Phase 5.2">
                Jobs
              </span>
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
      <main className="mx-auto max-w-5xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
