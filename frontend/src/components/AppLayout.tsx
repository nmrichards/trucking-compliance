import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth';

const NAV_ITEMS = [
  { path: '/dashboard', label: 'Dashboard', icon: '🏠' },
  { path: '/compliance', label: 'Compliance', icon: '📅' },
  { path: '/dqf', label: 'DQF', icon: '📁' },
  { path: '/ifta', label: 'IFTA', icon: '⛽' },
  { path: '/drug-tests', label: 'Drug Tests', icon: '🧪' },
  { path: '/renewals', label: 'Renewals', icon: '🔄' },
  { path: '/settings', label: 'Settings', icon: '⚙️' },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top bar */}
      <header className="bg-brand-800 text-white px-4 py-3 flex items-center justify-between shadow-md">
        <Link to="/dashboard" className="font-bold text-lg tracking-tight">
          🛡️ TruckGuard
        </Link>
        <div className="flex items-center gap-3 text-sm">
          <span className="hidden sm:block text-brand-200">
            {user?.firstName} {user?.lastName}
          </span>
          <button
            onClick={handleLogout}
            className="text-brand-200 hover:text-white transition-colors"
          >
            Sign out
          </button>
        </div>
      </header>

      <div className="flex flex-1">
        {/* Sidebar (desktop) */}
        <nav className="hidden md:flex flex-col w-56 bg-white border-r border-gray-200 py-4">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors ${
                location.pathname === item.path
                  ? 'bg-brand-50 text-brand-700 border-r-2 border-brand-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <span>{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Main content */}
        <main className="flex-1 overflow-auto">
          <div className="max-w-4xl mx-auto px-4 py-6">{children}</div>
        </main>
      </div>

      {/* Bottom nav (mobile) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex">
        {NAV_ITEMS.slice(0, 6).map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`flex-1 flex flex-col items-center py-2 text-xs transition-colors ${
              location.pathname === item.path
                ? 'text-brand-700'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <span className="text-lg leading-none mb-0.5">{item.icon}</span>
            <span className="truncate">{item.label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
