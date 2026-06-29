/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  CheckCircle2, 
  AlertTriangle, 
  ChevronRight, 
  Info, 
  TrendingUp, 
  Trophy, 
  Sliders, 
  ShieldAlert,
  UserCheck
} from 'lucide-react';

interface KPIManagerProps {
  token: string;
  user: any;
}

export default function KPIManager({ token, user }: KPIManagerProps) {
  const currentMonthStr = new Date().toISOString().substring(0, 7); // YYYY-MM
  const [selectedMonth, setSelectedMonth] = useState(currentMonthStr);
  const [teamUsers, setTeamUsers] = useState<any[]>([]);
  const [selectedUserId, setSelectedUserId] = useState(user.id);

  const [metrics, setMetrics] = useState<any[]>([]);
  const [entries, setEntries] = useState<any[]>([]);
  const [score, setScore] = useState<any>(null);

  // Editing actuals state
  const [editMetricId, setEditMetricId] = useState<string | null>(null);
  const [inputW1, setInputW1] = useState('');
  const [inputW2, setInputW2] = useState('');
  const [inputW3, setInputW3] = useState('');
  const [inputW4, setInputW4] = useState('');
  const [inputMonthlyValue, setInputMonthlyValue] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const safeParseJson = async (res: Response) => {
    const text = await res.text();
    try {
      return JSON.parse(text);
    } catch (e) {
      console.warn("Received non-JSON response from server:", text.substring(0, 100));
      return { error: 'Invalid response from server. Please wait or try again.' };
    }
  };

  useEffect(() => {
    if (user.role === 'admin') {
      fetchTeamUsers();
    }
  }, []);

  useEffect(() => {
    fetchScorecard();
  }, [selectedMonth, selectedUserId]);

  const fetchTeamUsers = async () => {
    try {
      const res = await fetch('/api/users', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await safeParseJson(res);
      if (res.ok) {
        setTeamUsers(data.filter((u: any) => u.role === 'member'));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchScorecard = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/kpis/scorecard?month=${selectedMonth}&userId=${selectedUserId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await safeParseJson(res);
      if (res.ok) {
        setMetrics(data.metrics || []);
        setEntries(data.entries || []);
        setScore(data.score);
      } else {
        throw new Error(data.error || 'Failed to fetch scorecard');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (metric: any) => {
    const existing = entries.find(e => e.metric_id === metric.id);
    setEditMetricId(metric.id);
    if (metric.is_percentage) {
      setInputMonthlyValue(existing?.monthly_value?.toString() || '');
    } else {
      setInputW1(existing?.w1?.toString() || '');
      setInputW2(existing?.w2?.toString() || '');
      setInputW3(existing?.w3?.toString() || '');
      setInputW4(existing?.w4?.toString() || '');
    }
  };

  const saveActuals = async (metricId: string) => {
    setError('');
    setSuccess('');
    try {
      const body: any = {
        userId: selectedUserId,
        month: selectedMonth,
        metricId
      };

      const metric = metrics.find(m => m.id === metricId);
      if (metric.is_percentage) {
        if (inputMonthlyValue === '') {
          setError('Monthly percentage actual is required');
          return;
        }
        body.monthly_value = Number(inputMonthlyValue);
      } else {
        body.w1 = inputW1 === '' ? 0 : Number(inputW1);
        body.w2 = inputW2 === '' ? 0 : Number(inputW2);
        body.w3 = inputW3 === '' ? 0 : Number(inputW3);
        body.w4 = inputW4 === '' ? 0 : Number(inputW4);
      }

      const res = await fetch('/api/kpis/actuals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(body)
      });

      const data = await safeParseJson(res);
      if (!res.ok) throw new Error(data.error);

      setSuccess('KPI metric updated successfully!');
      setTimeout(() => setSuccess(''), 3000);
      setEditMetricId(null);
      fetchScorecard();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const getGateBadgeClass = (gate: string) => {
    switch (gate) {
      case 'Full': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'Watch': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'Low': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'Critical': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div id="kpi_manager_container" className="space-y-6">
      
      {/* KPI Controls Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold font-display tracking-tight text-gray-900">Monthly KPI Scorecard</h1>
          <p className="text-sm text-gray-500 mt-1">Review operational, business, and role-based KPI metrics with automated scoring.</p>
        </div>
        <div className="flex flex-wrap gap-3 items-center">
          {user.role === 'admin' && (
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-600">Select Member:</label>
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="px-3 py-1.5 bg-gray-50 border border-gray-300 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                <option value={user.id}>My Scorecard</option>
                {teamUsers.map(u => (
                  <option key={u.id} value={u.id}>{u.name} ({u.designation})</option>
                ))}
              </select>
            </div>
          )}
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-600">Month:</label>
            <input 
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-3 py-1.5 bg-gray-50 border border-gray-300 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {error && (
        <div id="kpi_error" className="p-4 bg-red-50 text-red-700 text-sm rounded-xl border border-red-100 flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div id="kpi_success" className="p-4 bg-emerald-50 text-emerald-800 text-sm rounded-xl border border-emerald-100 flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* KPI Overviews & Score Gauge */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        
        {/* final score visualizer */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between md:col-span-1 text-center">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Weighted Performance</span>
            <div className="mt-4 flex justify-center items-center relative h-32">
              <div className="text-4xl font-extrabold text-gray-900 font-display">
                {score ? `${score.final_score}%` : '0%'}
              </div>
            </div>
          </div>
          <div className="mt-2">
            <span className="text-xs font-semibold text-gray-500">Status Gate</span>
            <div className={`mt-1 py-1.5 rounded-xl border font-bold text-sm ${getGateBadgeClass(score?.gate_status || 'Critical')}`}>
              {score?.gate_status || 'Critical (0%)'}
            </div>
          </div>
        </div>

        {/* performance metrics info cards */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm md:col-span-3 flex flex-col justify-between">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <div className="flex items-center gap-2 text-indigo-600 mb-1">
                <Sliders className="h-4 w-4" />
                <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Structured Split</span>
              </div>
              <p className="text-xs text-gray-600 leading-relaxed">
                Centralized SPOC roles utilize a <strong>70% Business / 30% Role</strong> KPI model targeting direct conversions. Specialized roles map 100% to tactical KPIs.
              </p>
            </div>

            <div>
              <div className="flex items-center gap-2 text-indigo-600 mb-1">
                <ShieldAlert className="h-4 w-4" />
                <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Status Gates Key</span>
              </div>
              <div className="space-y-1 text-xs">
                <p className="flex justify-between"><strong>≥100% Achievement:</strong> <span className="text-emerald-700 font-semibold">Full Kitty</span></p>
                <p className="flex justify-between"><strong>80–99% Achievement:</strong> <span className="text-amber-700 font-semibold">Watch</span></p>
                <p className="flex justify-between"><strong>60–79% Achievement:</strong> <span className="text-orange-700 font-semibold">Low</span></p>
                <p className="flex justify-between"><strong>&lt;60% Achievement:</strong> <span className="text-red-700 font-semibold">Critical</span></p>
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2 text-indigo-600 mb-1">
                <Trophy className="h-4 w-4" />
                <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Achievement Formula</span>
              </div>
              <p className="text-xs text-gray-600 leading-relaxed">
                Counts use W1-W4 sums. Percentage metrics are captured monthly. Achievements are capped per-metric at <strong>150%</strong> for score calculations.
              </p>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-2 text-xs text-gray-400">
            <Info className="h-4 w-4 text-indigo-500 shrink-0" />
            <span>Audits and revisions are strictly recorded. Keep weekly actual values filled before the 1st of every month.</span>
          </div>
        </div>
      </div>

      {/* KPI Scores Ledger Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center flex-wrap gap-4">
          <div>
            <h3 className="text-lg font-bold font-display text-gray-900">Registered KPI Metrics</h3>
            <p className="text-xs text-gray-400 mt-0.5">Manage and save target actuals</p>
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-gray-500 font-semibold">
            Loading scorecard...
          </div>
        ) : metrics.length === 0 ? (
          <div className="p-12 text-center bg-gray-50 text-gray-500">
            No KPI Metrics mapped for this role. Admin can map metrics in the Team panel.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-gray-500 text-xs font-semibold uppercase tracking-wider">
                  <th className="py-3 px-6">Metric Name</th>
                  <th className="py-3 px-6">Category</th>
                  <th className="py-3 px-6">Weight</th>
                  <th className="py-3 px-6">Target</th>
                  <th className="py-3 px-6">Inputs (W1–W4 / Value)</th>
                  <th className="py-3 px-6">Actual Total</th>
                  <th className="py-3 px-6">Achievement %</th>
                  <th className="py-3 px-6">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-700">
                {metrics.map(metric => {
                  const entry = entries.find(e => e.metric_id === metric.id);
                  const isEditing = editMetricId === metric.id;

                  // Computation helpers
                  let actualVal = 0;
                  if (metric.is_percentage) {
                    actualVal = entry?.monthly_value || 0;
                  } else {
                    actualVal = (entry?.w1 || 0) + (entry?.w2 || 0) + (entry?.w3 || 0) + (entry?.w4 || 0);
                  }

                  const achieveRate = entry?.computed_achievement !== undefined
                    ? Math.round(entry.computed_achievement * 100)
                    : 0;

                  return (
                    <tr key={metric.id} className="hover:bg-gray-50/50 transition">
                      <td className="py-4 px-6 max-w-xs">
                        <div className="font-semibold text-gray-900">{metric.name}</div>
                        {metric.lower_is_better && (
                          <span className="text-[10px] bg-amber-50 text-amber-700 border border-amber-200 rounded px-1.5 py-0.5 mt-1 inline-block">
                            Lower-Is-Better
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-6">
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-md font-medium">
                          {metric.category}
                        </span>
                      </td>
                      <td className="py-4 px-6 font-bold text-gray-800">{metric.weight}%</td>
                      <td className="py-4 px-6 font-mono text-xs font-semibold text-gray-500">
                        {metric.target}{metric.is_percentage ? '%' : ''}
                      </td>
                      <td className="py-4 px-6">
                        {isEditing ? (
                          metric.is_percentage ? (
                            <input
                              type="number"
                              value={inputMonthlyValue}
                              onChange={(e) => setInputMonthlyValue(e.target.value)}
                              placeholder="Monthly Value"
                              className="w-24 px-2 py-1 bg-white border border-gray-300 rounded text-xs"
                            />
                          ) : (
                            <div className="flex gap-1">
                              <input
                                type="number"
                                placeholder="W1"
                                value={inputW1}
                                onChange={(e) => setInputW1(e.target.value)}
                                className="w-10 px-1 py-1 bg-white border border-gray-300 rounded text-center text-xs"
                              />
                              <input
                                type="number"
                                placeholder="W2"
                                value={inputW2}
                                onChange={(e) => setInputW2(e.target.value)}
                                className="w-10 px-1 py-1 bg-white border border-gray-300 rounded text-center text-xs"
                              />
                              <input
                                type="number"
                                placeholder="W3"
                                value={inputW3}
                                onChange={(e) => setInputW3(e.target.value)}
                                className="w-10 px-1 py-1 bg-white border border-gray-300 rounded text-center text-xs"
                              />
                              <input
                                type="number"
                                placeholder="W4"
                                value={inputW4}
                                onChange={(e) => setInputW4(e.target.value)}
                                className="w-10 px-1 py-1 bg-white border border-gray-300 rounded text-center text-xs"
                              />
                            </div>
                          )
                        ) : (
                          metric.is_percentage ? (
                            <span className="text-xs font-mono font-medium">
                              {entry?.monthly_value !== undefined ? `${entry.monthly_value}%` : '—'}
                            </span>
                          ) : (
                            <span className="text-xs font-mono text-gray-500">
                              [{entry?.w1 || 0}, {entry?.w2 || 0}, {entry?.w3 || 0}, {entry?.w4 || 0}]
                            </span>
                          )
                        )}
                      </td>
                      <td className="py-4 px-6 font-mono text-xs font-bold text-gray-900">
                        {actualVal}{metric.is_percentage ? '%' : ''}
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-1.5">
                          <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                            achieveRate >= 100 ? 'bg-emerald-50 text-emerald-700'
                            : achieveRate >= 80 ? 'bg-amber-50 text-amber-700'
                            : 'bg-red-50 text-red-700'
                          }`}>
                            {achieveRate}%
                          </span>
                          {achieveRate > 100 && (
                            <span className="text-[10px] text-gray-400 font-mono">(Capped at 150%)</span>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        {isEditing ? (
                          <div className="flex gap-1">
                            <button
                              onClick={() => saveActuals(metric.id)}
                              className="text-xs font-bold text-emerald-600 hover:text-emerald-500 bg-emerald-50 px-2 py-1 rounded"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditMetricId(null)}
                              className="text-xs text-gray-500 hover:text-gray-700 bg-gray-100 px-2 py-1 rounded"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => startEdit(metric)}
                            className="text-xs font-semibold text-indigo-600 hover:text-indigo-500"
                          >
                            Edit Actuals
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
