import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format, differenceInDays } from 'date-fns';
import { api } from '@/lib/api';

const ITEM_TYPES = [
  { value: 'OPERATING_AUTHORITY', label: 'Operating Authority (MC/FF number)', icon: '🚛' },
  { value: 'INSURANCE_LIABILITY', label: 'Liability Insurance', icon: '🛡️' },
  { value: 'INSURANCE_CARGO', label: 'Cargo Insurance', icon: '📦' },
  { value: 'IRP', label: 'IRP (Apportioned Registration)', icon: '🪪' },
  { value: 'UCR', label: 'UCR (Unified Carrier Registration)', icon: '📋' },
  { value: 'BOC3', label: 'BOC-3 (Process Agent)', icon: '⚖️' },
  { value: 'OTHER', label: 'Other', icon: '📄' },
];

const schema = z.object({
  itemType: z.string(),
  title: z.string().min(1, 'Title required'),
  expiresAt: z.string().min(1, 'Expiry date required'),
  policyNumber: z.string().optional(),
  vendor: z.string().optional(),
  cost: z.coerce.number().positive().optional(),
  notes: z.string().optional(),
});

const renewSchema = z.object({ newExpiresAt: z.string().min(1, 'New expiry date required') });

type FormData = z.infer<typeof schema>;

interface RenewalItem {
  id: string;
  itemType: string;
  title: string;
  expiresAt: string;
  renewedAt?: string;
  policyNumber?: string;
  vendor?: string;
  cost?: number;
  notes?: string;
}

function expiryBadge(expiresAt: string) {
  const days = differenceInDays(new Date(expiresAt), new Date());
  if (days < 0) return <span className="badge-red">Expired {Math.abs(days)}d ago</span>;
  if (days <= 14) return <span className="badge-red">{days}d left</span>;
  if (days <= 30) return <span className="badge-yellow">{days}d left</span>;
  if (days <= 90) return <span className="badge-yellow">{days}d left</span>;
  return <span className="badge-green">{days}d left</span>;
}

export default function RenewalPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [renewingId, setRenewingId] = useState<string | null>(null);

  const { data: items = [], isLoading } = useQuery<RenewalItem[]>({
    queryKey: ['renewals'],
    queryFn: () => api.get('/renewals').then((r) => r.data),
  });

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } =
    useForm<FormData>({ resolver: zodResolver(schema), defaultValues: { itemType: 'OPERATING_AUTHORITY' } });

  const renewForm = useForm({ resolver: zodResolver(renewSchema) });

  const createMutation = useMutation({
    mutationFn: (d: FormData) =>
      api.post('/renewals', { ...d, expiresAt: new Date(d.expiresAt).toISOString() }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['renewals'] }); reset(); setShowForm(false); },
  });

  const renewMutation = useMutation({
    mutationFn: ({ id, newExpiresAt }: { id: string; newExpiresAt: string }) =>
      api.post(`/renewals/${id}/renew`, { newExpiresAt: new Date(newExpiresAt).toISOString() }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['renewals'] }); setRenewingId(null); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/renewals/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['renewals'] }),
  });

  // Group by type
  const grouped = ITEM_TYPES.map((t) => ({
    ...t,
    items: items.filter((i) => i.itemType === t.value),
  })).filter((g) => g.items.length > 0);

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Renewal Alerts</h1>
          <p className="text-sm text-gray-500 mt-1">Operating authority, insurance, IRP, UCR, BOC-3</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary text-sm">
          {showForm ? 'Cancel' : '+ Add item'}
        </button>
      </div>

      {/* Add form */}
      {showForm && (
        <div className="card">
          <h2 className="font-semibold mb-4">Add renewal item</h2>
          <form onSubmit={handleSubmit((d) => createMutation.mutate(d))} className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="label">Item type</label>
                <select {...register('itemType')} className="input">
                  {ITEM_TYPES.map((t) => <option key={t.value} value={t.value}>{t.icon} {t.label}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Title / description</label>
                <input {...register('title')} className="input" placeholder="e.g. Primary liability policy" />
                {errors.title && <p className="mt-1 text-xs text-red-600">{errors.title.message}</p>}
              </div>
              <div>
                <label className="label">Expiry date</label>
                <input {...register('expiresAt')} type="date" className="input" />
                {errors.expiresAt && <p className="mt-1 text-xs text-red-600">{errors.expiresAt.message}</p>}
              </div>
              <div>
                <label className="label">Policy / permit number <span className="text-gray-400 font-normal">(optional)</span></label>
                <input {...register('policyNumber')} className="input" />
              </div>
              <div>
                <label className="label">Vendor / carrier <span className="text-gray-400 font-normal">(optional)</span></label>
                <input {...register('vendor')} className="input" />
              </div>
              <div>
                <label className="label">Annual cost <span className="text-gray-400 font-normal">(optional)</span></label>
                <input {...register('cost')} type="number" step="0.01" className="input" placeholder="0.00" />
              </div>
              <div className="md:col-span-2">
                <label className="label">Notes <span className="text-gray-400 font-normal">(optional)</span></label>
                <textarea {...register('notes')} className="input h-16 resize-none" />
              </div>
            </div>
            <button type="submit" disabled={isSubmitting} className="btn-primary">
              {isSubmitting ? 'Saving…' : 'Add item'}
            </button>
          </form>
        </div>
      )}

      {isLoading ? (
        <div className="text-center py-12 text-gray-400">Loading…</div>
      ) : items.length === 0 ? (
        <div className="card text-center py-12">
          <div className="text-4xl mb-3">🔄</div>
          <p className="text-gray-500 mb-1">No renewal items yet.</p>
          <p className="text-sm text-gray-400">Track your operating authority, insurance, IRP, UCR, and BOC-3 renewals.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {grouped.map((group) => (
            <div key={group.value}>
              <h3 className="text-sm font-semibold text-gray-600 mb-2">{group.icon} {group.label}</h3>
              <div className="space-y-2">
                {group.items.map((item) => (
                  <div key={item.id} className="card py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-gray-900">{item.title}</p>
                        <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-0.5 text-xs text-gray-500">
                          <span>Expires {format(new Date(item.expiresAt), 'MMM d, yyyy')}</span>
                          {item.policyNumber && <span>#{item.policyNumber}</span>}
                          {item.vendor && <span>{item.vendor}</span>}
                          {item.cost && <span>${item.cost.toLocaleString()}/yr</span>}
                        </div>

                        {/* Renew form inline */}
                        {renewingId === item.id && (
                          <form
                            onSubmit={renewForm.handleSubmit((d) => renewMutation.mutate({ id: item.id, newExpiresAt: d.newExpiresAt }))}
                            className="mt-2 flex gap-2 items-end"
                          >
                            <div>
                              <label className="label text-xs">New expiry date</label>
                              <input {...renewForm.register('newExpiresAt')} type="date" className="input text-sm" />
                            </div>
                            <button type="submit" className="btn-primary text-xs py-2">Save renewal</button>
                            <button type="button" onClick={() => setRenewingId(null)} className="btn-secondary text-xs py-2">Cancel</button>
                          </form>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {expiryBadge(item.expiresAt)}
                        <button onClick={() => setRenewingId(renewingId === item.id ? null : item.id)} className="text-xs text-brand-700 hover:underline">
                          Renew
                        </button>
                        <button onClick={() => deleteMutation.mutate(item.id)} className="text-xs text-red-400 hover:text-red-600">✕</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
