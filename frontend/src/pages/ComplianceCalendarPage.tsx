import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format, differenceInDays } from 'date-fns';
import { api } from '@/lib/api';

const CATEGORIES = [
  { value: 'MEDICAL', label: 'Medical Certificate' },
  { value: 'CDL_RENEWAL', label: 'CDL Renewal' },
  { value: 'DRUG_TEST', label: 'Drug Test' },
  { value: 'CLEARINGHOUSE', label: 'Clearinghouse' },
  { value: 'IFTA_FILING', label: 'IFTA Filing' },
  { value: 'IRP_RENEWAL', label: 'IRP Renewal' },
  { value: 'UCR_RENEWAL', label: 'UCR Renewal' },
  { value: 'OPERATING_AUTHORITY', label: 'Operating Authority' },
  { value: 'INSURANCE', label: 'Insurance' },
  { value: 'BOC3', label: 'BOC-3' },
  { value: 'ANNUAL_INSPECTION', label: 'Annual Inspection' },
  { value: 'OTHER', label: 'Other' },
];

const RECURRENCES = [
  { value: 'NONE', label: 'One-time' },
  { value: 'MONTHLY', label: 'Monthly' },
  { value: 'QUARTERLY', label: 'Quarterly' },
  { value: 'SEMI_ANNUAL', label: 'Every 6 months' },
  { value: 'ANNUAL', label: 'Annual' },
];

const schema = z.object({
  title: z.string().min(1, 'Title required'),
  category: z.string(),
  dueDate: z.string().min(1, 'Due date required'),
  recurrence: z.string().default('NONE'),
  notes: z.string().optional(),
  externalUrl: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

interface Deadline {
  id: string;
  title: string;
  category: string;
  dueDate: string;
  recurrence: string;
  completed: boolean;
  notes?: string;
  externalUrl?: string;
}

function statusBadge(daysLeft: number, completed: boolean) {
  if (completed) return <span className="badge-green">Done</span>;
  if (daysLeft < 0) return <span className="badge-red">Overdue</span>;
  if (daysLeft <= 7) return <span className="badge-red">{daysLeft}d left</span>;
  if (daysLeft <= 30) return <span className="badge-yellow">{daysLeft}d left</span>;
  return <span className="badge-blue">{daysLeft}d left</span>;
}

export default function ComplianceCalendarPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [filterCompleted, setFilterCompleted] = useState(false);

  const { data: deadlines = [], isLoading } = useQuery<Deadline[]>({
    queryKey: ['compliance', filterCompleted],
    queryFn: () =>
      api.get(`/compliance?completed=${filterCompleted}`).then((r) => r.data),
  });

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } =
    useForm<FormData>({ resolver: zodResolver(schema), defaultValues: { recurrence: 'NONE', category: 'OTHER' } });

  const createMutation = useMutation({
    mutationFn: (data: FormData) =>
      api.post('/compliance', { ...data, dueDate: new Date(data.dueDate).toISOString() }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['compliance'] });
      reset();
      setShowForm(false);
    },
  });

  const completeMutation = useMutation({
    mutationFn: (id: string) => api.post(`/compliance/${id}/complete`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['compliance'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/compliance/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['compliance'] }),
  });

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Compliance Calendar</h1>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary text-sm">
          {showForm ? 'Cancel' : '+ Add deadline'}
        </button>
      </div>

      {/* Add form */}
      {showForm && (
        <div className="card">
          <h2 className="font-semibold mb-4">New deadline</h2>
          <form onSubmit={handleSubmit((d) => createMutation.mutate(d))} className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="label">Title</label>
                <input {...register('title')} className="input" placeholder="e.g. Medical certificate renewal" />
                {errors.title && <p className="mt-1 text-xs text-red-600">{errors.title.message}</p>}
              </div>
              <div>
                <label className="label">Category</label>
                <select {...register('category')} className="input">
                  {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Due date</label>
                <input {...register('dueDate')} type="date" className="input" />
                {errors.dueDate && <p className="mt-1 text-xs text-red-600">{errors.dueDate.message}</p>}
              </div>
              <div>
                <label className="label">Recurrence</label>
                <select {...register('recurrence')} className="input">
                  {RECURRENCES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="label">Notes <span className="text-gray-400 font-normal">(optional)</span></label>
                <textarea {...register('notes')} className="input h-20 resize-none" />
              </div>
              <div className="md:col-span-2">
                <label className="label">External link <span className="text-gray-400 font-normal">(optional)</span></label>
                <input {...register('externalUrl')} type="url" className="input" placeholder="https://..." />
              </div>
            </div>
            <button type="submit" disabled={isSubmitting} className="btn-primary">
              {isSubmitting ? 'Saving…' : 'Add deadline'}
            </button>
          </form>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-2">
        <button
          onClick={() => setFilterCompleted(false)}
          className={`btn text-sm py-1.5 ${!filterCompleted ? 'btn-primary' : 'btn-secondary'}`}
        >
          Upcoming
        </button>
        <button
          onClick={() => setFilterCompleted(true)}
          className={`btn text-sm py-1.5 ${filterCompleted ? 'btn-primary' : 'btn-secondary'}`}
        >
          Completed
        </button>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="text-center py-12 text-gray-400">Loading…</div>
      ) : deadlines.length === 0 ? (
        <div className="card text-center py-12">
          <div className="text-4xl mb-3">📅</div>
          <p className="text-gray-500">No deadlines yet. Add your first one above.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {deadlines.map((d) => {
            const daysLeft = differenceInDays(new Date(d.dueDate), new Date());
            const cat = CATEGORIES.find((c) => c.value === d.category);
            return (
              <div key={d.id} className={`card py-3 ${d.completed ? 'opacity-60' : ''}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm text-gray-900 truncate">{d.title}</span>
                      <span className="badge-gray text-xs">{cat?.label ?? d.category}</span>
                      {d.recurrence !== 'NONE' && (
                        <span className="text-xs text-gray-400">
                          ({RECURRENCES.find(r => r.value === d.recurrence)?.label})
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">{format(new Date(d.dueDate), 'MMMM d, yyyy')}</p>
                    {d.notes && <p className="text-xs text-gray-500 mt-1 truncate">{d.notes}</p>}
                    {d.externalUrl && (
                      <a href={d.externalUrl} target="_blank" rel="noreferrer" className="text-xs text-brand-600 hover:underline">
                        Open link →
                      </a>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {statusBadge(daysLeft, d.completed)}
                    {!d.completed && (
                      <button
                        onClick={() => completeMutation.mutate(d.id)}
                        className="text-xs text-green-600 hover:underline"
                      >
                        ✓ Done
                      </button>
                    )}
                    <button
                      onClick={() => deleteMutation.mutate(d.id)}
                      className="text-xs text-red-400 hover:text-red-600"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
