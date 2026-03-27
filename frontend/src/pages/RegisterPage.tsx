import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth';

const schema = z.object({
  firstName: z.string().min(1, 'First name required'),
  lastName: z.string().min(1, 'Last name required'),
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  companyName: z.string().optional(),
  dotNumber: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

export default function RegisterPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [error, setError] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    setError('');
    try {
      const res = await api.post('/auth/register', data);
      setAuth(res.data.user, res.data.accessToken, res.data.refreshToken);
      navigate('/dashboard', { replace: true });
    } catch (err: any) {
      setError(err.response?.data?.error || 'Registration failed');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 px-4">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <Link to="/" className="flex justify-center text-3xl mb-6">🛡️</Link>
        <h1 className="text-center text-2xl font-bold text-gray-900">Start your free trial</h1>
        <p className="mt-2 text-center text-sm text-gray-600">
          14 days free. $79/month after.{' '}
          <Link to="/login" className="text-brand-700 font-medium hover:underline">
            Already have an account?
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="card">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">First name</label>
                <input {...register('firstName')} className="input" />
                {errors.firstName && <p className="mt-1 text-xs text-red-600">{errors.firstName.message}</p>}
              </div>
              <div>
                <label className="label">Last name</label>
                <input {...register('lastName')} className="input" />
                {errors.lastName && <p className="mt-1 text-xs text-red-600">{errors.lastName.message}</p>}
              </div>
            </div>

            <div>
              <label className="label">Email</label>
              <input {...register('email')} type="email" autoComplete="email" className="input" />
              {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
            </div>

            <div>
              <label className="label">Password</label>
              <input {...register('password')} type="password" autoComplete="new-password" className="input" />
              {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>}
            </div>

            <div>
              <label className="label">Company name <span className="text-gray-400 font-normal">(optional)</span></label>
              <input {...register('companyName')} className="input" />
            </div>

            <div>
              <label className="label">DOT number <span className="text-gray-400 font-normal">(optional)</span></label>
              <input {...register('dotNumber')} className="input" placeholder="US DOT #" />
            </div>

            <button type="submit" className="btn-primary w-full py-2.5 mt-2" disabled={isSubmitting}>
              {isSubmitting ? 'Creating account…' : 'Start free trial'}
            </button>

            <p className="text-xs text-gray-500 text-center">
              No credit card required. Cancel anytime.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
