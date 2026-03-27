import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format, differenceInDays } from 'date-fns';
import { api } from '@/lib/api';

const DOC_TYPES = [
  { value: 'CDL', label: 'Commercial Driver License (CDL)' },
  { value: 'MEDICAL_CERTIFICATE', label: 'Medical Certificate (DOT Physical)' },
  { value: 'MVR', label: 'Motor Vehicle Record (MVR)' },
  { value: 'EMPLOYMENT_HISTORY', label: 'Employment History (3-year)' },
  { value: 'ROAD_TEST', label: 'Road Test Certificate' },
  { value: 'DRUG_TEST_PRE_EMPLOYMENT', label: 'Pre-employment Drug Test' },
  { value: 'BACKGROUND_CHECK', label: 'Background Check' },
  { value: 'CLEARINGHOUSE_QUERY', label: 'Clearinghouse Query' },
  { value: 'OTHER', label: 'Other' },
];

const schema = z.object({
  docType: z.string(),
  title: z.string().min(1, 'Title required'),
  issuedAt: z.string().optional(),
  expiresAt: z.string().optional(),
  notes: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

interface DQFDoc {
  id: string;
  docType: string;
  title: string;
  issuedAt?: string;
  expiresAt?: string;
  notes?: string;
}

function expiryBadge(expiresAt?: string) {
  if (!expiresAt) return <span className="badge-gray">No expiry</span>;
  const days = differenceInDays(new Date(expiresAt), new Date());
  if (days < 0) return <span className="badge-red">Expired {Math.abs(days)}d ago</span>;
  if (days <= 14) return <span className="badge-red">{days}d left</span>;
  if (days <= 60) return <span className="badge-yellow">{days}d left</span>;
  return <span className="badge-green">Valid {days}d</span>;
}

export default function DQFPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);

  const { data: docs = [], isLoading } = useQuery<DQFDoc[]>({
    queryKey: ['dqf'],
    queryFn: () => api.get('/dqf').then((r) => r.data),
  });

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } =
    useForm<FormData>({ resolver: zodResolver(schema), defaultValues: { docType: 'CDL' } });

  const createMutation = useMutation({
    mutationFn: (data: FormData) =>
      api.post('/dqf', {
        ...data,
        issuedAt: data.issuedAt ? new Date(data.issuedAt).toISOString() : undefined,
        expiresAt: data.expiresAt ? new Date(data.expiresAt).toISOString() : undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['dqf'] });
      reset();
      setShowForm(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/dqf/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['dqf'] }),
  });

  // Group by doc type
  const grouped = DOC_TYPES.map((t) => ({
    ...t,
    docs: docs.filter((d) => d.docType === t.value),
  })).filter((g) => g.docs.length > 0);

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Driver Qualification File</h1>
          <p className="text-sm text-gray-500 mt-1">Store and track all required DOT documents</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary text-sm">
          {showForm ? 'Cancel' : '+ Add document'}
        </button>
      </div>

      {/* Clearinghouse reminder */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <p className="text-sm text-blue-800">
          <strong>Clearinghouse reminder:</strong> FMCSA requires an annual self-query.{' '}
          <a
            href="https://clearinghouse.fmcsa.dot.gov"
            target="_blank"
            rel="noreferrer"
            className="underline font-medium"
          >
            Query now →
          </a>
        </p>
      </div>

      {/* Add form */}
      {showForm && (
        <div className="card">
          <h2 className="font-semibold mb-4">Add document</h2>
          <form onSubmit={handleSubmit((d) => createMutation.mutate(d))} className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="label">Document type</label>
                <select {...register('docType')} className="input">
                  {DOC_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Title / description</label>
                <input {...register('title')} className="input" placeholder="e.g. DOT Physical — Dr. Smith" />
                {errors.title && <p className="mt-1 text-xs text-red-600">{errors.title.message}</p>}
              </div>
              <div>
                <label className="label">Issue date <span className="text-gray-400 font-normal">(optional)</span></label>
                <input {...register('issuedAt')} type="date" className="input" />
              </div>
              <div>
                <label className="label">Expiry date <span className="text-gray-400 font-normal">(optional)</span></label>
                <input {...register('expiresAt')} type="date" className="input" />
              </div>
              <div className="md:col-span-2">
                <label className="label">Notes <span className="text-gray-400 font-normal">(optional)</span></label>
                <textarea {...register('notes')} className="input h-20 resize-none" />
              </div>
            </div>
            <button type="submit" disabled={isSubmitting} className="btn-primary">
              {isSubmitting ? 'Saving…' : 'Add document'}
            </button>
          </form>
        </div>
      )}

      {/* Document list */}
      {isLoading ? (
        <div className="text-center py-12 text-gray-400">Loading…</div>
      ) : docs.length === 0 ? (
        <div className="card text-center py-12">
          <div className="text-4xl mb-3">📁</div>
          <p className="text-gray-500 mb-1">No documents yet.</p>
          <p className="text-sm text-gray-400">Add your CDL, medical cert, MVR, and other required docs.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {grouped.map((group) => (
            <div key={group.value}>
              <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-2">{group.label}</h3>
              <div className="space-y-2">
                {group.docs.map((doc) => (
                  <div key={doc.id} className="card py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-gray-900">{doc.title}</p>
                        <div className="flex gap-3 mt-0.5 text-xs text-gray-500">
                          {doc.issuedAt && <span>Issued {format(new Date(doc.issuedAt), 'MMM d, yyyy')}</span>}
                          {doc.expiresAt && <span>Expires {format(new Date(doc.expiresAt), 'MMM d, yyyy')}</span>}
                        </div>
                        {doc.notes && <p className="text-xs text-gray-400 mt-1">{doc.notes}</p>}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {expiryBadge(doc.expiresAt)}
                        <button
                          onClick={() => deleteMutation.mutate(doc.id)}
                          className="text-xs text-red-400 hover:text-red-600"
                        >
                          ✕
                        </button>
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
