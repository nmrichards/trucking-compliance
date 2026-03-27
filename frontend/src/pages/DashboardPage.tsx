import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth';
import { format, differenceInDays } from 'date-fns';

interface Deadline {
  id: string;
  title: string;
  category: string;
  dueDate: string;
  completed: boolean;
}

interface RenewalItem {
  id: string;
  title: string;
  itemType: string;
  expiresAt: string;
}

interface DQFDoc {
  id: string;
  title: string;
  docType: string;
  expiresAt: string;
}

function urgencyClass(daysLeft: number) {
  if (daysLeft < 0) return 'badge-red';
  if (daysLeft <= 7) return 'badge-red';
  if (daysLeft <= 30) return 'badge-yellow';
  return 'badge-blue';
}

function urgencyLabel(daysLeft: number) {
  if (daysLeft < 0) return `${Math.abs(daysLeft)}d overdue`;
  if (daysLeft === 0) return 'Due today';
  if (daysLeft === 1) return 'Due tomorrow';
  return `${daysLeft}d left`;
}

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);

  const { data: upcomingDeadlines = [] } = useQuery<Deadline[]>({
    queryKey: ['compliance', 'upcoming'],
    queryFn: () => api.get('/compliance/upcoming?days=30').then((r) => r.data),
  });

  const { data: expiringRenewals = [] } = useQuery<RenewalItem[]>({
    queryKey: ['renewals', 'expiring'],
    queryFn: () => api.get('/renewals/expiring?days=90').then((r) => r.data),
  });

  const { data: expiringDQF = [] } = useQuery<DQFDoc[]>({
    queryKey: ['dqf', 'expiring'],
    queryFn: () => api.get('/dqf/expiring?days=60').then((r) => r.data),
  });

  const isTrialing = user?.subscriptionStatus === 'TRIAL';
  const trialDaysLeft = user?.trialEndsAt
    ? differenceInDays(new Date(user.trialEndsAt), new Date())
    : null;

  const totalAlerts = upcomingDeadlines.length + expiringRenewals.length + expiringDQF.length;

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Hey {user?.firstName} 👋
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          {totalAlerts > 0
            ? `You have ${totalAlerts} item${totalAlerts > 1 ? 's' : ''} needing attention`
            : 'Everything looks good. Stay compliant!'}
        </p>
      </div>

      {/* Trial banner */}
      {isTrialing && trialDaysLeft !== null && trialDaysLeft <= 7 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="font-medium text-yellow-800">
              {trialDaysLeft <= 0 ? 'Trial expired' : `Trial ends in ${trialDaysLeft} day${trialDaysLeft !== 1 ? 's' : ''}`}
            </p>
            <p className="text-sm text-yellow-700 mt-0.5">Add a payment method to keep your data.</p>
          </div>
          <Link to="/settings" className="btn-primary text-sm py-1.5 px-3">
            Subscribe
          </Link>
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Upcoming deadlines', count: upcomingDeadlines.length, to: '/compliance', color: 'brand' },
          { label: 'Renewals expiring', count: expiringRenewals.length, to: '/renewals', color: 'orange' },
          { label: 'DQF expiring', count: expiringDQF.length, to: '/dqf', color: 'purple' },
          { label: 'Total alerts', count: totalAlerts, to: '/compliance', color: 'red' },
        ].map((card) => (
          <Link key={card.label} to={card.to} className="card hover:shadow-md transition-shadow text-center">
            <div className="text-3xl font-bold text-gray-900">{card.count}</div>
            <div className="text-xs text-gray-500 mt-1">{card.label}</div>
          </Link>
        ))}
      </div>

      {/* Upcoming deadlines */}
      {upcomingDeadlines.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-900">Upcoming deadlines (30 days)</h2>
            <Link to="/compliance" className="text-sm text-brand-700 hover:underline">View all</Link>
          </div>
          <div className="space-y-2">
            {upcomingDeadlines.slice(0, 5).map((d) => {
              const daysLeft = differenceInDays(new Date(d.dueDate), new Date());
              return (
                <div key={d.id} className="card py-3 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm text-gray-900">{d.title}</p>
                    <p className="text-xs text-gray-500">{format(new Date(d.dueDate), 'MMM d, yyyy')}</p>
                  </div>
                  <span className={urgencyClass(daysLeft)}>{urgencyLabel(daysLeft)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Expiring renewals */}
      {expiringRenewals.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-900">Renewals expiring (90 days)</h2>
            <Link to="/renewals" className="text-sm text-brand-700 hover:underline">View all</Link>
          </div>
          <div className="space-y-2">
            {expiringRenewals.slice(0, 3).map((r) => {
              const daysLeft = differenceInDays(new Date(r.expiresAt), new Date());
              return (
                <div key={r.id} className="card py-3 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm text-gray-900">{r.title}</p>
                    <p className="text-xs text-gray-500">{format(new Date(r.expiresAt), 'MMM d, yyyy')}</p>
                  </div>
                  <span className={urgencyClass(daysLeft)}>{urgencyLabel(daysLeft)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty state */}
      {totalAlerts === 0 && (
        <div className="card text-center py-12">
          <div className="text-5xl mb-4">✅</div>
          <h3 className="font-semibold text-gray-900 mb-2">All clear!</h3>
          <p className="text-gray-500 text-sm max-w-sm mx-auto">
            No upcoming deadlines or expiring items in the next 30 days. Keep it up.
          </p>
          <Link to="/compliance" className="btn-primary mt-4">Add a deadline</Link>
        </div>
      )}
    </div>
  );
}
