import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth';
import { format, differenceInDays } from 'date-fns';

export default function SettingsPage() {
  const { user } = useAuthStore();

  const { data: me } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: () => api.get('/auth/me').then((r) => r.data),
  });

  const checkoutMutation = useMutation({
    mutationFn: () => api.post('/auth/create-checkout-session').then((r) => r.data),
    onSuccess: (data) => { window.location.href = data.url; },
  });

  const portalMutation = useMutation({
    mutationFn: () => api.post('/stripe/portal').then((r) => r.data),
    onSuccess: (data) => { window.location.href = data.url; },
  });

  const profile = me ?? user;
  const trialDaysLeft = profile?.trialEndsAt
    ? differenceInDays(new Date(profile.trialEndsAt), new Date())
    : null;

  const isActive = profile?.subscriptionStatus === 'ACTIVE';
  const isTrialing = profile?.subscriptionStatus === 'TRIAL';
  const isPastDue = profile?.subscriptionStatus === 'PAST_DUE';

  return (
    <div className="space-y-6 pb-20 md:pb-0 max-w-xl">
      <h1 className="text-2xl font-bold text-gray-900">Settings</h1>

      {/* Profile */}
      <div className="card space-y-3">
        <h2 className="font-semibold text-gray-800">Account</h2>
        <div className="grid grid-cols-2 gap-y-2 text-sm">
          <span className="text-gray-500">Name</span>
          <span>{profile?.firstName} {profile?.lastName}</span>
          <span className="text-gray-500">Email</span>
          <span>{profile?.email}</span>
          {profile?.companyName && (
            <>
              <span className="text-gray-500">Company</span>
              <span>{profile.companyName}</span>
            </>
          )}
          {profile?.dotNumber && (
            <>
              <span className="text-gray-500">DOT #</span>
              <span>{profile.dotNumber}</span>
            </>
          )}
        </div>
      </div>

      {/* Subscription */}
      <div className="card space-y-4">
        <h2 className="font-semibold text-gray-800">Subscription</h2>

        <div className="flex items-center gap-3">
          <div className={`px-3 py-1 rounded-full text-sm font-medium ${
            isActive ? 'bg-green-100 text-green-800' :
            isTrialing ? 'bg-blue-100 text-blue-800' :
            isPastDue ? 'bg-red-100 text-red-800' :
            'bg-gray-100 text-gray-700'
          }`}>
            {profile?.subscriptionStatus?.replace('_', ' ')}
          </div>
          <span className="text-sm text-gray-500">TruckGuard · $79/month</span>
        </div>

        {isTrialing && trialDaysLeft !== null && (
          <div className="text-sm text-gray-600">
            {trialDaysLeft > 0
              ? `Free trial ends in ${trialDaysLeft} day${trialDaysLeft !== 1 ? 's' : ''} (${format(new Date(profile.trialEndsAt!), 'MMM d, yyyy')})`
              : 'Your free trial has ended.'}
          </div>
        )}

        {isPastDue && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
            Your last payment failed. Update your payment method to keep access.
          </div>
        )}

        {profile?.subscriptionEndsAt && isActive && (
          <p className="text-sm text-gray-500">
            Renews {format(new Date(profile.subscriptionEndsAt), 'MMMM d, yyyy')}
          </p>
        )}

        <div className="flex gap-3 flex-wrap">
          {(isTrialing || !isActive) && (
            <button
              onClick={() => checkoutMutation.mutate()}
              disabled={checkoutMutation.isPending}
              className="btn-primary"
            >
              {checkoutMutation.isPending ? 'Redirecting…' : 'Subscribe — $79/month'}
            </button>
          )}
          {isActive && (
            <button
              onClick={() => portalMutation.mutate()}
              disabled={portalMutation.isPending}
              className="btn-secondary"
            >
              {portalMutation.isPending ? 'Opening…' : 'Manage subscription'}
            </button>
          )}
          {isPastDue && (
            <button
              onClick={() => portalMutation.mutate()}
              disabled={portalMutation.isPending}
              className="btn-danger"
            >
              {portalMutation.isPending ? 'Opening…' : 'Update payment method'}
            </button>
          )}
        </div>
      </div>

      {/* Legal */}
      <div className="card space-y-2">
        <h2 className="font-semibold text-gray-800">Legal</h2>
        <p className="text-xs text-gray-500 leading-relaxed">
          TruckGuard is a compliance tracking tool only. It does not provide legal, regulatory, or
          tax advice. Always verify requirements directly with FMCSA, your base state IFTA office,
          and your legal counsel. TruckGuard is not liable for missed deadlines, fines, or regulatory
          violations.
        </p>
      </div>
    </div>
  );
}
