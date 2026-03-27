import { Link } from 'react-router-dom';

const FEATURES = [
  {
    icon: '📅',
    title: 'Compliance Calendar',
    desc: 'Every DOT/FMCSA deadline in one place. Medicals, IFTA, UCR, IRP — never miss a date.',
  },
  {
    icon: '📁',
    title: 'Driver Qualification File',
    desc: 'Store your CDL, medical cert, MVR, and employment history digitally. Instant expiration alerts.',
  },
  {
    icon: '⛽',
    title: 'IFTA Tracker',
    desc: 'Log miles by state, track fuel purchases, and prep your quarterly filing in minutes.',
  },
  {
    icon: '🧪',
    title: 'Drug Testing',
    desc: 'Track your consortium enrollment, random test schedule, and pre-employment tests.',
  },
  {
    icon: '🔄',
    title: 'Renewal Alerts',
    desc: 'Operating authority, insurance, IRP, UCR, BOC-3 — get notified 90 days before expiry.',
  },
  {
    icon: '📱',
    title: 'Works Offline',
    desc: 'Install TruckGuard on your phone like an app. View deadlines anywhere, even without signal.',
  },
];

const PRICING_FEATURES = [
  'Compliance Calendar with recurring deadlines',
  'Driver Qualification File (DQF) management',
  'IFTA quarterly tracker + mileage log',
  'Drug testing + consortium enrollment tracking',
  'Renewal alerts (auth, insurance, IRP, UCR, BOC-3)',
  'Mobile PWA — works offline',
  'Email deadline reminders',
  '14-day free trial',
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-brand-800 text-white">
        <div className="max-w-5xl mx-auto px-4 py-4 flex justify-between items-center">
          <span className="font-bold text-xl">🛡️ TruckGuard</span>
          <div className="flex gap-3">
            <Link to="/login" className="text-brand-200 hover:text-white text-sm font-medium">
              Sign in
            </Link>
            <Link to="/register" className="btn-primary text-sm py-1.5 px-4">
              Start free trial
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-gradient-to-b from-brand-800 to-brand-700 text-white py-20 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">
            Stop piecing together your compliance.<br />
            One app covers it all.
          </h1>
          <p className="text-xl text-brand-200 mb-8 max-w-2xl mx-auto">
            TruckGuard replaces $114/month of compliance patchwork with a single $79/month subscription.
            Built for owner-operators and small fleets.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/register" className="btn bg-white text-brand-800 hover:bg-brand-50 font-semibold text-lg px-8 py-3">
              Start 14-day free trial
            </Link>
            <Link to="/login" className="btn border border-brand-300 text-white hover:bg-brand-600 text-lg px-8 py-3">
              Sign in
            </Link>
          </div>
          <p className="text-brand-300 text-sm mt-4">No credit card required for trial</p>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-4 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12 text-gray-900">
            Everything you need to stay compliant
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            {FEATURES.map((f) => (
              <div key={f.title} className="card">
                <div className="text-3xl mb-3">{f.icon}</div>
                <h3 className="font-semibold text-gray-900 mb-2">{f.title}</h3>
                <p className="text-gray-600 text-sm">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-20 px-4">
        <div className="max-w-lg mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4 text-gray-900">Simple pricing</h2>
          <p className="text-gray-600 mb-8">
            One plan. Everything included. Cancel anytime.
          </p>

          <div className="card border-2 border-brand-500">
            <div className="text-5xl font-bold text-brand-800 mb-1">$79</div>
            <div className="text-gray-500 mb-6">/month per driver</div>

            <ul className="text-left space-y-3 mb-8">
              {PRICING_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm">
                  <span className="text-green-500 font-bold mt-0.5">✓</span>
                  <span>{f}</span>
                </li>
              ))}
            </ul>

            <Link to="/register" className="btn-primary w-full py-3 text-base">
              Start 14-day free trial
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-8 px-4 text-center text-sm">
        <p>© 2026 TruckGuard. Built for truckers, by people who get it.</p>
        <p className="mt-2 text-xs">
          Not a substitute for legal or regulatory advice. Always verify requirements with FMCSA.
        </p>
      </footer>
    </div>
  );
}
