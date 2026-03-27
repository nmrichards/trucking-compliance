import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { api } from '@/lib/api';

const TEST_TYPES = [
  { value: 'PRE_EMPLOYMENT', label: 'Pre-employment' },
  { value: 'RANDOM', label: 'Random' },
  { value: 'POST_ACCIDENT', label: 'Post-accident' },
  { value: 'REASONABLE_SUSPICION', label: 'Reasonable suspicion' },
  { value: 'RETURN_TO_DUTY', label: 'Return-to-duty' },
  { value: 'FOLLOW_UP', label: 'Follow-up' },
];

const TEST_RESULTS = [
  { value: 'NEGATIVE', label: 'Negative' },
  { value: 'POSITIVE', label: 'Positive' },
  { value: 'DILUTE', label: 'Dilute' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

const testSchema = z.object({
  testType: z.string(),
  status: z.string(),
  testDate: z.string().optional(),
  result: z.string().optional(),
  consortiumName: z.string().optional(),
  mroName: z.string().optional(),
  notes: z.string().optional(),
});

const consortiumSchema = z.object({
  consortiumName: z.string().min(1, 'Consortium name required'),
  memberSince: z.string().optional(),
  memberId: z.string().optional(),
  nextRandomDue: z.string().optional(),
  notes: z.string().optional(),
});

interface DrugTest {
  id: string;
  testType: string;
  status: string;
  testDate?: string;
  result?: string;
  consortiumName?: string;
  notes?: string;
}

interface Consortium {
  consortiumName: string;
  memberSince?: string;
  memberId?: string;
  nextRandomDue?: string;
  notes?: string;
}

const RESULT_BADGE: Record<string, string> = {
  NEGATIVE: 'badge-green',
  POSITIVE: 'badge-red',
  DILUTE: 'badge-yellow',
  CANCELLED: 'badge-gray',
};

const STATUS_BADGE: Record<string, string> = {
  SCHEDULED: 'badge-blue',
  PENDING: 'badge-yellow',
  COMPLETED: 'badge-green',
  CANCELLED: 'badge-gray',
};

export default function DrugTestPage() {
  const qc = useQueryClient();
  const [showTestForm, setShowTestForm] = useState(false);
  const [showConsortiumForm, setShowConsortiumForm] = useState(false);

  const { data: tests = [] } = useQuery<DrugTest[]>({
    queryKey: ['drug-tests'],
    queryFn: () => api.get('/drug-tests').then((r) => r.data),
  });

  const { data: consortium } = useQuery<Consortium | null>({
    queryKey: ['drug-tests', 'consortium'],
    queryFn: () => api.get('/drug-tests/consortium').then((r) => r.data),
  });

  const testForm = useForm({ resolver: zodResolver(testSchema), defaultValues: { testType: 'RANDOM', status: 'SCHEDULED' } });
  const cForm = useForm({ resolver: zodResolver(consortiumSchema) });

  const createTestMutation = useMutation({
    mutationFn: (d: any) =>
      api.post('/drug-tests', {
        ...d,
        testDate: d.testDate ? new Date(d.testDate).toISOString() : undefined,
      }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['drug-tests'] }); testForm.reset(); setShowTestForm(false); },
  });

  const deleteTestMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/drug-tests/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['drug-tests'] }),
  });

  const saveConsortiumMutation = useMutation({
    mutationFn: (d: any) =>
      api.put('/drug-tests/consortium', {
        ...d,
        memberSince: d.memberSince ? new Date(d.memberSince).toISOString() : undefined,
        nextRandomDue: d.nextRandomDue ? new Date(d.nextRandomDue).toISOString() : undefined,
      }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['drug-tests', 'consortium'] }); setShowConsortiumForm(false); },
  });

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Drug Testing</h1>
          <p className="text-sm text-gray-500 mt-1">Consortium enrollment + test log</p>
        </div>
        <button onClick={() => setShowTestForm(!showTestForm)} className="btn-primary text-sm">
          {showTestForm ? 'Cancel' : '+ Log test'}
        </button>
      </div>

      {/* Consortium card */}
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold">Consortium Enrollment</h2>
          <button onClick={() => setShowConsortiumForm(!showConsortiumForm)} className="btn-secondary text-sm py-1">
            {showConsortiumForm ? 'Cancel' : consortium ? 'Edit' : 'Add enrollment'}
          </button>
        </div>

        {showConsortiumForm ? (
          <form onSubmit={cForm.handleSubmit((d) => saveConsortiumMutation.mutate(d))} className="space-y-3">
            <div className="grid md:grid-cols-2 gap-3">
              <div><label className="label text-xs">Consortium name</label><input {...cForm.register('consortiumName')} className="input" /></div>
              <div><label className="label text-xs">Member ID</label><input {...cForm.register('memberId')} className="input" /></div>
              <div><label className="label text-xs">Member since</label><input {...cForm.register('memberSince')} type="date" className="input" /></div>
              <div><label className="label text-xs">Next random test due</label><input {...cForm.register('nextRandomDue')} type="date" className="input" /></div>
            </div>
            <button type="submit" className="btn-primary text-sm">Save</button>
          </form>
        ) : consortium ? (
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><span className="text-gray-500">Consortium:</span> <strong>{consortium.consortiumName}</strong></div>
            {consortium.memberId && <div><span className="text-gray-500">ID:</span> {consortium.memberId}</div>}
            {consortium.memberSince && <div><span className="text-gray-500">Since:</span> {format(new Date(consortium.memberSince), 'MMM d, yyyy')}</div>}
            {consortium.nextRandomDue && (
              <div><span className="text-gray-500">Next random:</span> <strong className="text-amber-700">{format(new Date(consortium.nextRandomDue), 'MMM d, yyyy')}</strong></div>
            )}
          </div>
        ) : (
          <p className="text-sm text-gray-500">No consortium enrollment recorded. Add yours to track random test scheduling.</p>
        )}
      </div>

      {/* Add test form */}
      {showTestForm && (
        <div className="card">
          <h2 className="font-semibold mb-4">Log drug test</h2>
          <form onSubmit={testForm.handleSubmit((d) => createTestMutation.mutate(d))} className="space-y-3">
            <div className="grid md:grid-cols-2 gap-3">
              <div>
                <label className="label">Test type</label>
                <select {...testForm.register('testType')} className="input">
                  {TEST_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Status</label>
                <select {...testForm.register('status')} className="input">
                  <option value="SCHEDULED">Scheduled</option>
                  <option value="PENDING">Pending result</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
              </div>
              <div>
                <label className="label">Test date <span className="text-gray-400 font-normal">(optional)</span></label>
                <input {...testForm.register('testDate')} type="date" className="input" />
              </div>
              <div>
                <label className="label">Result <span className="text-gray-400 font-normal">(if completed)</span></label>
                <select {...testForm.register('result')} className="input">
                  <option value="">— Select —</option>
                  {TEST_RESULTS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Consortium</label>
                <input {...testForm.register('consortiumName')} className="input" placeholder="e.g. National Drug Screening" />
              </div>
              <div>
                <label className="label">MRO name</label>
                <input {...testForm.register('mroName')} className="input" />
              </div>
            </div>
            <button type="submit" className="btn-primary">Log test</button>
          </form>
        </div>
      )}

      {/* Test list */}
      {tests.length === 0 ? (
        <div className="card text-center py-10">
          <div className="text-4xl mb-3">🧪</div>
          <p className="text-gray-500">No drug tests logged. Add your pre-employment or random test history.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {tests.map((t) => {
            const typeLabel = TEST_TYPES.find((x) => x.value === t.testType)?.label ?? t.testType;
            return (
              <div key={t.id} className="card py-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">{typeLabel}</span>
                      <span className={STATUS_BADGE[t.status]}>{t.status.toLowerCase()}</span>
                      {t.result && <span className={RESULT_BADGE[t.result]}>{t.result.toLowerCase()}</span>}
                    </div>
                    <div className="flex gap-3 mt-0.5 text-xs text-gray-500">
                      {t.testDate && <span>{format(new Date(t.testDate), 'MMM d, yyyy')}</span>}
                      {t.consortiumName && <span>{t.consortiumName}</span>}
                    </div>
                  </div>
                  <button onClick={() => deleteTestMutation.mutate(t.id)} className="text-xs text-red-400 hover:text-red-600">✕</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
