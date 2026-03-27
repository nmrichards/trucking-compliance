import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { api } from '@/lib/api';

const STATES = [
  'AL','AR','AZ','CA','CO','CT','DE','FL','GA','IA','ID','IL','IN','KS','KY',
  'LA','MA','MD','ME','MI','MN','MO','MS','MT','NC','ND','NE','NH','NJ','NM',
  'NV','NY','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VA','VT','WA',
  'WI','WV','WY',
  // Canadian provinces
  'AB','BC','MB','NB','NL','NS','ON','PE','QC','SK',
];

const quarterSchema = z.object({
  year: z.coerce.number().int().min(2020).max(2030),
  quarter: z.coerce.number().int().min(1).max(4),
});

const mileageSchema = z.object({
  date: z.string().min(1),
  state: z.string().length(2),
  miles: z.coerce.number().positive(),
  notes: z.string().optional(),
});

const fuelSchema = z.object({
  quarterId: z.string(),
  date: z.string().min(1),
  state: z.string().length(2),
  gallons: z.coerce.number().positive(),
  pricePerGallon: z.coerce.number().positive().optional(),
  vendor: z.string().optional(),
});

interface Quarter {
  id: string;
  year: number;
  quarter: number;
  status: string;
  dueDate: string;
  filedAt?: string;
  fuelLogs: FuelLog[];
}

interface FuelLog {
  id: string;
  date: string;
  state: string;
  gallons: number;
  vendor?: string;
}

interface MileageLog {
  id: string;
  date: string;
  state: string;
  miles: number;
}

const STATUS_LABELS: Record<string, string> = {
  OPEN: 'Open',
  READY: 'Ready to file',
  FILED: 'Filed',
  AMENDED: 'Amended',
};

const STATUS_BADGE: Record<string, string> = {
  OPEN: 'badge-gray',
  READY: 'badge-yellow',
  FILED: 'badge-green',
  AMENDED: 'badge-blue',
};

export default function IFTAPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<'quarters' | 'mileage'>('quarters');
  const [selectedQuarter, setSelectedQuarter] = useState<string | null>(null);
  const [showQForm, setShowQForm] = useState(false);
  const [showMForm, setShowMForm] = useState(false);
  const [showFForm, setShowFForm] = useState(false);

  const { data: quarters = [] } = useQuery<Quarter[]>({
    queryKey: ['ifta', 'quarters'],
    queryFn: () => api.get('/ifta/quarters').then((r) => r.data),
  });

  const { data: mileageLogs = [] } = useQuery<MileageLog[]>({
    queryKey: ['ifta', 'mileage'],
    queryFn: () => api.get('/ifta/mileage').then((r) => r.data),
    enabled: tab === 'mileage',
  });

  const qForm = useForm<z.infer<typeof quarterSchema>>({ resolver: zodResolver(quarterSchema), defaultValues: { year: new Date().getFullYear(), quarter: Math.ceil((new Date().getMonth() + 1) / 3) } });
  const mForm = useForm<z.infer<typeof mileageSchema>>({ resolver: zodResolver(mileageSchema), defaultValues: { state: 'TX' } });
  const fForm = useForm<z.infer<typeof fuelSchema>>({ resolver: zodResolver(fuelSchema), defaultValues: { state: 'TX', quarterId: selectedQuarter ?? '' } });

  const createQuarterMutation = useMutation({
    mutationFn: (d: any) => api.post('/ifta/quarters', d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['ifta'] }); qForm.reset(); setShowQForm(false); },
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch(`/ifta/quarters/${id}/status`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ifta'] }),
  });

  const createMileageMutation = useMutation({
    mutationFn: (d: any) => api.post('/ifta/mileage', { ...d, date: new Date(d.date).toISOString() }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['ifta'] }); mForm.reset(); setShowMForm(false); },
  });

  const deleteMileageMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/ifta/mileage/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ifta'] }),
  });

  const createFuelMutation = useMutation({
    mutationFn: (d: any) => api.post('/ifta/fuel-logs', { ...d, date: new Date(d.date).toISOString() }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['ifta'] }); fForm.reset(); setShowFForm(false); },
  });

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">IFTA Tracker</h1>
          <p className="text-sm text-gray-500 mt-1">Quarterly filing guide, mileage log, fuel tracking</p>
        </div>
      </div>

      {/* IFTA info banner */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
        <strong>Filing reminder:</strong> IFTA returns are due Apr 30 (Q1), Jul 31 (Q2), Oct 31 (Q3), Jan 31 (Q4).
        TruckGuard tracks your data — file directly with your base state's IFTA office.
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {(['quarters', 'mileage'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`btn text-sm py-1.5 capitalize ${tab === t ? 'btn-primary' : 'btn-secondary'}`}
          >
            {t === 'quarters' ? 'Quarters & Fuel' : 'Mileage Log'}
          </button>
        ))}
      </div>

      {/* Quarters tab */}
      {tab === 'quarters' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="font-semibold text-gray-800">IFTA Quarters</h2>
            <button onClick={() => setShowQForm(!showQForm)} className="btn-primary text-sm">
              {showQForm ? 'Cancel' : '+ New quarter'}
            </button>
          </div>

          {showQForm && (
            <div className="card">
              <form onSubmit={qForm.handleSubmit((d) => createQuarterMutation.mutate(d))} className="flex gap-3 items-end">
                <div>
                  <label className="label">Year</label>
                  <input {...qForm.register('year')} type="number" className="input w-24" />
                </div>
                <div>
                  <label className="label">Quarter</label>
                  <select {...qForm.register('quarter')} className="input w-24">
                    <option value={1}>Q1</option>
                    <option value={2}>Q2</option>
                    <option value={3}>Q3</option>
                    <option value={4}>Q4</option>
                  </select>
                </div>
                <button type="submit" className="btn-primary">Create</button>
              </form>
            </div>
          )}

          {quarters.length === 0 ? (
            <div className="card text-center py-10">
              <div className="text-4xl mb-3">⛽</div>
              <p className="text-gray-500">No quarters yet. Create your first IFTA quarter.</p>
            </div>
          ) : (
            quarters.map((q) => (
              <div key={q.id} className="card space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-semibold">{q.year} Q{q.quarter}</span>
                    <span className="ml-2 text-sm text-gray-500">Due {format(new Date(q.dueDate), 'MMM d, yyyy')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={STATUS_BADGE[q.status]}>{STATUS_LABELS[q.status]}</span>
                    {q.status !== 'FILED' && (
                      <button
                        onClick={() => updateStatusMutation.mutate({ id: q.id, status: q.status === 'OPEN' ? 'READY' : 'FILED' })}
                        className="btn-secondary text-xs py-1"
                      >
                        {q.status === 'OPEN' ? 'Mark ready' : 'Mark filed'}
                      </button>
                    )}
                  </div>
                </div>

                {/* Fuel logs */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-gray-600">Fuel purchases ({q.fuelLogs.length})</span>
                    <button
                      onClick={() => { setSelectedQuarter(q.id); fForm.setValue('quarterId', q.id); setShowFForm(!showFForm); }}
                      className="text-xs text-brand-700 hover:underline"
                    >
                      + Add fuel
                    </button>
                  </div>

                  {showFForm && selectedQuarter === q.id && (
                    <form onSubmit={fForm.handleSubmit((d) => createFuelMutation.mutate(d))} className="bg-gray-50 rounded-lg p-3 mb-3 grid grid-cols-2 md:grid-cols-4 gap-2">
                      <div><label className="label text-xs">Date</label><input {...fForm.register('date')} type="date" className="input text-sm" /></div>
                      <div><label className="label text-xs">State</label>
                        <select {...fForm.register('state')} className="input text-sm">
                          {STATES.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                      <div><label className="label text-xs">Gallons</label><input {...fForm.register('gallons')} type="number" step="0.01" className="input text-sm" /></div>
                      <div><label className="label text-xs">Vendor</label><input {...fForm.register('vendor')} className="input text-sm" /></div>
                      <div className="col-span-2 md:col-span-4">
                        <button type="submit" className="btn-primary text-sm py-1.5">Add fuel log</button>
                      </div>
                    </form>
                  )}

                  {q.fuelLogs.length > 0 && (
                    <div className="space-y-1">
                      {q.fuelLogs.map((log) => (
                        <div key={log.id} className="flex items-center justify-between text-xs text-gray-600 py-1 border-b border-gray-100 last:border-0">
                          <span>{format(new Date(log.date), 'MMM d')} · {log.state}</span>
                          <span>{log.gallons.toFixed(3)} gal{log.vendor ? ` · ${log.vendor}` : ''}</span>
                        </div>
                      ))}
                      <div className="text-xs font-medium text-gray-800 pt-1">
                        Total: {q.fuelLogs.reduce((s, l) => s + l.gallons, 0).toFixed(3)} gallons
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Mileage log tab */}
      {tab === 'mileage' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="font-semibold text-gray-800">Mileage by State</h2>
            <button onClick={() => setShowMForm(!showMForm)} className="btn-primary text-sm">
              {showMForm ? 'Cancel' : '+ Log miles'}
            </button>
          </div>

          {showMForm && (
            <div className="card">
              <form onSubmit={mForm.handleSubmit((d) => createMileageMutation.mutate(d))} className="grid grid-cols-2 md:grid-cols-4 gap-3 items-end">
                <div><label className="label">Date</label><input {...mForm.register('date')} type="date" className="input" /></div>
                <div><label className="label">State</label>
                  <select {...mForm.register('state')} className="input">
                    {STATES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div><label className="label">Miles</label><input {...mForm.register('miles')} type="number" step="0.1" className="input" /></div>
                <button type="submit" className="btn-primary">Log</button>
              </form>
            </div>
          )}

          {mileageLogs.length === 0 ? (
            <div className="card text-center py-10">
              <p className="text-gray-500">No mileage logged yet.</p>
            </div>
          ) : (
            <div className="space-y-1">
              {mileageLogs.map((log) => (
                <div key={log.id} className="card py-2.5 flex items-center justify-between">
                  <div className="flex gap-4 text-sm">
                    <span className="text-gray-500">{format(new Date(log.date), 'MMM d, yyyy')}</span>
                    <span className="font-medium">{log.state}</span>
                    <span>{log.miles.toFixed(1)} mi</span>
                  </div>
                  <button onClick={() => deleteMileageMutation.mutate(log.id)} className="text-xs text-red-400 hover:text-red-600">✕</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
