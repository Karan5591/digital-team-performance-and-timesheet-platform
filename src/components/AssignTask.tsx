/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  ClipboardList,
  Send,
  RefreshCw,
  CalendarClock,
  CheckCircle2,
  Loader2,
  AlertTriangle
} from 'lucide-react';

interface AssignTaskProps {
  token: string;
}

type BrandCode = 'GT' | 'HH' | 'ACR';

const BRANDS: { code: BrandCode; label: string; color: string }[] = [
  { code: 'GT', label: 'Galaxy Toyota', color: '#C8102E' },
  { code: 'HH', label: 'Hans Hyundai', color: '#003189' },
  { code: 'ACR', label: 'AutoCarRepair.in', color: '#1A6B3A' }
];

const brandColor = (b: string) =>
  b === 'GT' ? '#C8102E' : b === 'HH' ? '#003189' : b === 'ACR' ? '#1A6B3A' : '#374151';

// Maps the stored task status to the label + pill styling the admin sees.
const statusPill = (status: string) => {
  const s = (status || 'pending').toLowerCase();
  if (s === 'done' || s === 'approved')
    return { label: 'Done', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
  if (s === 'in_progress')
    return { label: 'Working', cls: 'bg-blue-50 text-blue-700 border-blue-200' };
  return { label: 'Pending', cls: 'bg-amber-50 text-amber-700 border-amber-200' };
};

export default function AssignTask({ token }: AssignTaskProps) {
  const todayStr = new Date().toISOString().split('T')[0];

  const [employees, setEmployees] = useState<any[]>([]);
  const [assigned, setAssigned] = useState<any[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [form, setForm] = useState({
    userId: '',
    brand: 'GT' as BrandCode,
    date: todayStr,
    duration_min: 60,
    task: '',
    subtask: '',
    notes: ''
  });

  const safeParseJson = async (res: Response) => {
    const text = await res.text();
    try {
      return JSON.parse(text);
    } catch {
      return { error: 'Invalid response from server. Please try again.' };
    }
  };

  const fetchEmployees = async () => {
    try {
      const res = await fetch('/api/users', { headers: { Authorization: `Bearer ${token}` } });
      const data = await safeParseJson(res);
      if (res.ok && Array.isArray(data)) {
        const active = data.filter((u: any) => u.status === 'active');
        setEmployees(active);
        setForm(prev => (prev.userId ? prev : { ...prev, userId: active[0]?.id || '' }));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchAssigned = async () => {
    setLoadingList(true);
    try {
      const res = await fetch('/api/admin/tasks/assigned', { headers: { Authorization: `Bearer ${token}` } });
      const data = await safeParseJson(res);
      if (res.ok && Array.isArray(data)) setAssigned(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
    fetchAssigned();
    // Keep the list fresh so Working/Done updates from employees show up.
    const interval = setInterval(fetchAssigned, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleChange = (field: string, value: any) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleAssign = async () => {
    setError('');
    setSuccessMsg('');

    if (!form.userId) return setError('Please choose an employee.');
    if (!form.task.trim()) return setError('Please enter a task.');
    if (!form.duration_min || Number(form.duration_min) <= 0)
      return setError('Please enter a valid duration in minutes.');

    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/task/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          userId: form.userId,
          date: form.date,
          task: form.task.trim(),
          subtask: form.subtask.trim(),
          brand: form.brand,
          duration_min: Number(form.duration_min),
          notes: form.notes.trim()
        })
      });
      const data = await safeParseJson(res);
      if (!res.ok || data.error) throw new Error(data.error || 'Could not assign the task.');

      setSuccessMsg('Task assigned. It is now in the employee’s Performance Summary.');
      setForm(prev => ({ ...prev, task: '', subtask: '', notes: '' }));
      fetchAssigned();
    } catch (err: any) {
      setError(err.message || 'Something went wrong while assigning the task.');
    } finally {
      setSubmitting(false);
    }
  };

  const selectCls =
    'w-full h-10 px-3 rounded-xl border border-gray-200 bg-white text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-400 transition';

  return (
    <div className="max-w-5xl">
      <div className="mb-6">
        <h2 className="text-xl font-extrabold font-display text-gray-900 flex items-center gap-2">
          <ClipboardList className="h-5 w-5 text-indigo-600" /> Assign Task
        </h2>
        <p className="text-xs text-gray-500 mt-1">
          Give a team member a task &mdash; it lands in their timesheet and Performance Summary.
        </p>
      </div>

      {/* ASSIGNMENT FORM */}
      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-[11px] font-semibold text-gray-500 mb-1">Employee</label>
            <select value={form.userId} onChange={e => handleChange('userId', e.target.value)} className={selectCls}>
              {employees.length === 0 && <option value="">No active employees</option>}
              {employees.map(u => (
                <option key={u.id} value={u.id}>
                  {u.name}{u.emp_code ? ` — ${u.emp_code}` : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-gray-500 mb-1">Brand</label>
            <select value={form.brand} onChange={e => handleChange('brand', e.target.value)} className={selectCls}>
              {BRANDS.map(b => (
                <option key={b.code} value={b.code}>{b.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-gray-500 mb-1">Due date</label>
            <input type="date" value={form.date} onChange={e => handleChange('date', e.target.value)} className={selectCls} />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-gray-500 mb-1">Duration (minutes)</label>
            <input type="number" min={1} value={form.duration_min} onChange={e => handleChange('duration_min', e.target.value)} className={selectCls} />
          </div>

          <div className="md:col-span-2">
            <label className="block text-[11px] font-semibold text-gray-500 mb-1">Task</label>
            <input type="text" value={form.task} placeholder="Build Google Ads report for June" onChange={e => handleChange('task', e.target.value)} className={selectCls} />
          </div>

          <div className="md:col-span-2">
            <label className="block text-[11px] font-semibold text-gray-500 mb-1">Sub-task (optional)</label>
            <input type="text" value={form.subtask} placeholder="Campaign-level CTR breakdown" onChange={e => handleChange('subtask', e.target.value)} className={selectCls} />
          </div>

          <div className="md:col-span-2">
            <label className="block text-[11px] font-semibold text-gray-500 mb-1">Notes (optional)</label>
            <textarea
              value={form.notes}
              placeholder="Include CTR and cost-per-lead by campaign…"
              onChange={e => handleChange('notes', e.target.value)}
              rows={2}
              className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-400 transition resize-none"
            />
          </div>
        </div>

        {error && (
          <div className="mt-4 flex items-center gap-2 text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
            <AlertTriangle className="h-4 w-4 shrink-0" /> {error}
          </div>
        )}
        {successMsg && (
          <div className="mt-4 flex items-center gap-2 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" /> {successMsg}
          </div>
        )}

        <div className="mt-5 flex justify-end">
          <button
            onClick={handleAssign}
            disabled={submitting}
            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white rounded-xl text-sm font-bold shadow-md shadow-indigo-600/10 transition"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {submitting ? 'Assigning…' : 'Assign task'}
          </button>
        </div>
      </div>

      {/* RECENTLY ASSIGNED LIST */}
      <div className="mt-8">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold font-display text-gray-900">Recently assigned</h3>
          <button onClick={fetchAssigned} className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-500 hover:text-indigo-600 transition">
            <RefreshCw className={`h-3.5 w-3.5 ${loadingList ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>

        <div className="space-y-2.5">
          {assigned.length === 0 ? (
            <p className="text-xs text-gray-400 italic text-center py-6 bg-white rounded-2xl border border-gray-100">
              No tasks assigned yet.
            </p>
          ) : (
            assigned.map((t: any) => {
              const pill = statusPill(t.status);
              return (
                <motion.div
                  key={t.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center justify-between bg-white border border-gray-100 rounded-2xl px-4 py-3 shadow-sm"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="h-8 w-1.5 rounded-full shrink-0" style={{ backgroundColor: brandColor(t.brand) }} />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{t.task}</p>
                      <p className="text-[11px] text-gray-500 flex items-center gap-1.5 mt-0.5">
                        <span className="font-medium text-gray-700">{t.user_name || 'Unknown'}</span>
                        {t.user_emp_code && <span className="text-gray-400">&middot; {t.user_emp_code}</span>}
                        <span className="text-gray-300">&middot;</span>
                        <CalendarClock className="h-3 w-3 text-gray-400" /> due {t.date}
                      </p>
                    </div>
                  </div>
                  <span className={`shrink-0 text-[10px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-lg border ${pill.cls}`}>
                    {pill.label}
                  </span>
                </motion.div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
