/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback, type ReactElement } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search,
  ChevronDown,
  ChevronUp,
  Download,
  Clock,
  Calendar,
  User,
  Filter,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertCircle,
  FileText,
  Paperclip,
  ExternalLink,
} from 'lucide-react';

interface ReportsProps {
  token: string;
}

const statusColors: Record<string, string> = {
  approved: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  submitted: 'bg-amber-50 text-amber-700 border border-amber-200',
  draft: 'bg-gray-100 text-gray-600 border border-gray-200',
  rejected: 'bg-red-50 text-red-700 border border-red-200',
};

const taskStatusColors: Record<string, string> = {
  approved: 'bg-emerald-50 text-emerald-700',
  rejected: 'bg-red-50 text-red-700',
  done: 'bg-emerald-50 text-emerald-700',
  in_progress: 'bg-blue-50 text-blue-700',
  blocked: 'bg-red-50 text-red-700',
  pending_review: 'bg-amber-50 text-amber-700',
  not_started: 'bg-gray-100 text-gray-600',
  pending: 'bg-gray-100 text-gray-600',
};

const statusIcons: Record<string, ReactElement> = {
  approved: <CheckCircle2 className="h-3.5 w-3.5" />,
  submitted: <AlertCircle className="h-3.5 w-3.5" />,
  draft: <FileText className="h-3.5 w-3.5" />,
  rejected: <XCircle className="h-3.5 w-3.5" />,
};

const brandColor: Record<string, string> = {
  GT: 'bg-[#C8102E]',
  HH: 'bg-[#003189]',
  ACR: 'bg-[#1A6B3A]',
  Internal: 'bg-gray-700',
};

export default function Reports({ token }: ReportsProps) {
  const today = new Date().toISOString().split('T')[0];
  const weekAgo = new Date(Date.now() - 6 * 86400000).toISOString().split('T')[0];

  const [fromDate, setFromDate] = useState(weekAgo);
  const [toDate, setToDate] = useState(today);
  const [selectedMember, setSelectedMember] = useState('all');
  const [selectedBrand, setSelectedBrand] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [members, setMembers] = useState<any[]>([]);
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [downloading, setDownloading] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);
  const [taskActionState, setTaskActionState] = useState<Record<string, { comment: string; loading: boolean }>>({});

  // Fetch member list on mount
  useEffect(() => {
    fetch('/api/admin/reports/members', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => setMembers(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, [token]);

  const fetchReport = useCallback(async () => {
    setLoading(true);
    setSearched(true);
    try {
      const params = new URLSearchParams({
        from: fromDate,
        to: toDate,
        ...(selectedMember !== 'all' && { userId: selectedMember }),
        ...(selectedBrand !== 'All' && { brand: selectedBrand }),
        ...(selectedStatus !== 'all' && { status: selectedStatus }),
      });
      const res = await fetch(`/api/admin/reports/panel?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setResults(Array.isArray(data) ? data : []);
      setExpandedRows(new Set());
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [token, fromDate, toDate, selectedMember, selectedBrand, selectedStatus]);

  const toggleRow = (key: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const downloadReport = async (type: 'attendance' | 'timesheet') => {
    try {
      setDownloading(type);
      const params = new URLSearchParams({ from: fromDate, to: toDate });
      if (selectedMember !== 'all') params.set('userId', selectedMember);
      const res = await fetch(`/api/admin/reports/${type}?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      const XLSX = await import('xlsx');
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, type === 'attendance' ? 'Attendance' : 'Timesheet');
      XLSX.writeFile(wb, `${type}_${fromDate}_to_${toDate}.xlsx`);
    } catch {
      alert('Download failed.');
    } finally {
      setDownloading(null);
    }
  };

  const totalHours = results.reduce((sum, r) => sum + (r.total_minutes || 0), 0);

  const deriveSheetStatus = (tasks: any[]) => {
    const normalized = (tasks || []).map((task: any) => (task.status || 'pending').toLowerCase());
    if (normalized.some(status => status === 'rejected')) return 'rejected';
    if (normalized.length > 0 && normalized.every(status => status === 'approved')) return 'approved';
    return 'submitted';
  };

  const updateTaskInResults = (taskId: string, nextStatus: string, comment?: string) => {
    setResults(prev => prev.map((row: any) => {
      if (!row.tasks.some((task: any) => task.id === taskId)) return row;
      const updatedTasks = row.tasks.map((task: any) => task.id === taskId ? {
        ...task,
        status: nextStatus,
        approver_comment: comment ?? task.approver_comment ?? null
      } : task);
      return {
        ...row,
        tasks: updatedTasks,
        sheet_status: deriveSheetStatus(updatedTasks)
      };
    }));
  };

  const handleTaskDecision = async (taskId: string, action: 'approve' | 'reject') => {
    const current = taskActionState[taskId] || { comment: '', loading: false };
    if (action === 'reject' && !current.comment.trim()) {
      alert('Please provide a rejection reason before rejecting.');
      return;
    }

    setTaskActionState(prev => ({ ...prev, [taskId]: { ...prev[taskId], loading: true } }));

    try {
      const res = await fetch('/api/admin/task/decision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ taskId, action, comment: current.comment.trim() })
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Failed to update task');
      updateTaskInResults(taskId, action === 'approve' ? 'approved' : 'rejected', action === 'reject' ? current.comment.trim() : undefined);
    } catch (err: any) {
      alert(err.message || 'Failed to update task');
    } finally {
      setTaskActionState(prev => ({ ...prev, [taskId]: { comment: prev[taskId]?.comment || '', loading: false } }));
    }
  };

  return (
    <div className="space-y-6 font-sans">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold font-display text-gray-900">Reports</h2>
          <p className="text-sm text-gray-400 mt-0.5">View and export agent timesheet data by date and filters</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => downloadReport('attendance')}
            disabled={!!downloading}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-xl transition disabled:opacity-50"
          >
            {downloading === 'attendance' ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
            Attendance Excel
          </button>
          <button
            onClick={() => downloadReport('timesheet')}
            disabled={!!downloading}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition disabled:opacity-50"
          >
            {downloading === 'timesheet' ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
            Timesheet Excel
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="h-4 w-4 text-indigo-500" />
          <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">Filters</h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {/* From */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1">
              <Calendar className="h-3 w-3" /> From
            </label>
            <input
              type="date"
              value={fromDate}
              onChange={e => setFromDate(e.target.value)}
              className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs font-mono text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>

          {/* To */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1">
              <Calendar className="h-3 w-3" /> To
            </label>
            <input
              type="date"
              value={toDate}
              onChange={e => setToDate(e.target.value)}
              className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs font-mono text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>

          {/* Agent */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1">
              <User className="h-3 w-3" /> Agent
            </label>
            <select
              value={selectedMember}
              onChange={e => setSelectedMember(e.target.value)}
              className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            >
              <option value="all">All Agents</option>
              {members.map(m => (
                <option key={m.id} value={m.id}>{m.name} ({m.empCode})</option>
              ))}
            </select>
          </div>

          {/* Brand */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Brand</label>
            <select
              value={selectedBrand}
              onChange={e => setSelectedBrand(e.target.value)}
              className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            >
              {['All', 'GT', 'HH', 'ACR', 'Internal'].map(b => (
                <option key={b}>{b}</option>
              ))}
            </select>
          </div>

          {/* Status */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Sheet Status</label>
            <select
              value={selectedStatus}
              onChange={e => setSelectedStatus(e.target.value)}
              className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            >
              <option value="all">All</option>
              <option value="draft">Draft</option>
              <option value="submitted">Submitted</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>

        <div className="mt-4 flex justify-end">
          <button
            onClick={fetchReport}
            disabled={loading}
            className="flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl transition disabled:opacity-50 shadow-sm"
          >
            {loading
              ? <><RefreshCw className="h-3.5 w-3.5 animate-spin" /> Loading...</>
              : <><Search className="h-3.5 w-3.5" /> Generate Report</>
            }
          </button>
        </div>
      </div>

      {/* Summary strip */}
      {searched && !loading && results.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm text-center">
            <p className="text-2xl font-extrabold text-gray-900">{results.length}</p>
            <p className="text-[10px] text-gray-400 uppercase tracking-wider mt-0.5">Agent-Day Records</p>
          </div>
          <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm text-center">
            <p className="text-2xl font-extrabold text-indigo-700">{(totalHours / 60).toFixed(1)}h</p>
            <p className="text-[10px] text-gray-400 uppercase tracking-wider mt-0.5">Total Hours Logged</p>
          </div>
          <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm text-center">
            <p className="text-2xl font-extrabold text-emerald-700">
              {results.filter(r => r.sheet_status === 'approved').length}
            </p>
            <p className="text-[10px] text-gray-400 uppercase tracking-wider mt-0.5">Approved Sheets</p>
          </div>
        </div>
      )}

      {/* Results */}
      {searched && (
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
          {loading ? (
            <div className="py-16 text-center">
              <RefreshCw className="h-7 w-7 text-indigo-400 animate-spin mx-auto mb-3" />
              <p className="text-sm text-gray-400">Fetching data...</p>
            </div>
          ) : results.length === 0 ? (
            <div className="py-16 text-center">
              <FileText className="h-8 w-8 text-gray-300 mx-auto mb-3" />
              <p className="text-sm font-medium text-gray-500">No records found for the selected filters.</p>
              <p className="text-xs text-gray-400 mt-1">Try adjusting the date range or filters.</p>
            </div>
          ) : (
            <div>
              {/* Table header */}
              <div className="grid grid-cols-12 gap-2 px-5 py-3 bg-gray-50 border-b border-gray-100 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                <div className="col-span-1">Date</div>
                <div className="col-span-2">Agent</div>
                <div className="col-span-2">Designation</div>
                <div className="col-span-1">Tasks</div>
                <div className="col-span-2">Hours</div>
                <div className="col-span-2">Status</div>
                <div className="col-span-2 text-right">Actions</div>
              </div>

              <AnimatePresence>
                {results.map((row: any) => {
                  const key = `${row.user_id}_${row.date}`;
                  const isExpanded = expandedRows.has(key);
                  const hrs = (row.total_minutes / 60).toFixed(1);
                  const pct = Math.min(100, (row.total_minutes / 480) * 100);
                  const barColor = pct >= 100 ? 'bg-emerald-500' : pct >= 75 ? 'bg-amber-400' : 'bg-red-400';

                  return (
                    <motion.div
                      key={key}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="border-b border-gray-50 last:border-0"
                    >
                      {/* Row */}
                      <div
                        className="grid grid-cols-12 gap-2 px-5 py-3.5 hover:bg-gray-50/60 cursor-pointer items-center transition"
                        onClick={() => toggleRow(key)}
                      >
                        <div className="col-span-1 text-xs font-mono text-gray-600">{row.date}</div>
                        <div className="col-span-2">
                          <p className="text-xs font-semibold text-gray-900 truncate">{row.name}</p>
                          <p className="text-[10px] text-gray-400">{row.emp_code}</p>
                        </div>
                        <div className="col-span-2 text-xs text-gray-500 truncate">{row.designation}</div>
                        <div className="col-span-1 text-xs font-semibold text-gray-700">{row.tasks.length}</div>
                        <div className="col-span-2">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-gray-800 w-8 shrink-0">{hrs}h</span>
                            <div className="flex-1 bg-gray-100 h-1.5 rounded-full overflow-hidden">
                              <div className={`h-1.5 rounded-full ${barColor}`} style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        </div>
                        <div className="col-span-2">
                          <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-lg ${statusColors[row.sheet_status] || statusColors.draft}`}>
                            {statusIcons[row.sheet_status]}
                            {row.sheet_status.charAt(0).toUpperCase() + row.sheet_status.slice(1)}
                          </span>
                        </div>
                        <div className="col-span-2 flex justify-end items-center gap-2">
                          <Clock className="h-3.5 w-3.5 text-gray-300" />
                          {isExpanded
                            ? <ChevronUp className="h-4 w-4 text-gray-400" />
                            : <ChevronDown className="h-4 w-4 text-gray-400" />
                          }
                        </div>
                      </div>

                      {/* Expanded task list */}
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="px-6 pb-4 pt-1 bg-gray-50/60 border-t border-gray-100 space-y-2">
                              {row.approver_comment && row.sheet_status === 'rejected' && (
                                <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex gap-2 items-start">
                                  <XCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                                  <span><strong>Rejection reason:</strong> {row.approver_comment}</span>
                                </div>
                              )}
                              <div className="grid grid-cols-12 gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider px-1 pb-1">
                                <div className="col-span-1">Brand</div>
                                <div className="col-span-3">Task</div>
                                <div className="col-span-3">Checkpoints</div>
                                <div className="col-span-1">Duration</div>
                                <div className="col-span-2">Status</div>
                                <div className="col-span-2">Attachment</div>
                              </div>
                              {row.tasks.map((t: any, i: number) => {
                                const attachments = (t.output_url || '').split(',').map((u: string) => u.trim()).filter(Boolean);
                                const taskState = taskActionState[t.id] || { comment: '', loading: false };
                                const isDecisionMade = t.status === 'approved' || t.status === 'rejected';
                                return (
                                  <div key={t.id || i} className="bg-white border border-gray-100 rounded-xl px-3 py-2.5 text-xs">
                                    <div className="grid grid-cols-12 gap-2 items-start">
                                      <div className="col-span-1">
                                        <span className={`text-[9px] font-bold text-white px-1.5 py-0.5 rounded ${brandColor[t.brand] || 'bg-gray-600'}`}>
                                          {t.brand}
                                        </span>
                                      </div>
                                      <div className="col-span-3 font-semibold text-gray-800">{t.task}</div>
                                      <div className="col-span-3 text-gray-500 italic text-[11px]">{t.subtask || '—'}</div>
                                      <div className="col-span-1 font-mono text-gray-600">{(t.duration_min / 60).toFixed(1)}h</div>
                                      <div className="col-span-2">
                                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${taskStatusColors[t.status] || 'bg-gray-100 text-gray-600'}`}>
                                          {t.status}
                                        </span>
                                      </div>
                                      <div className="col-span-2 flex flex-wrap gap-1">
                                        {attachments.length === 0 ? (
                                          <span className="text-[10px] text-gray-300">—</span>
                                        ) : attachments.map((url: string, ai: number) => (
                                          url.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                                            <a key={ai} href={url} target="_blank" rel="noopener noreferrer">
                                              <img src={url} alt="attachment" className="h-8 w-10 object-cover rounded border border-gray-200 hover:opacity-80 transition" />
                                            </a>
                                          ) : (
                                            <a key={ai} href={url} target="_blank" rel="noopener noreferrer"
                                              className="inline-flex items-center gap-0.5 text-[10px] text-indigo-600 hover:underline">
                                              {url.startsWith('/uploads/') ? <Paperclip className="h-3 w-3" /> : <ExternalLink className="h-3 w-3" />}
                                              {url.startsWith('/uploads/') ? `File ${ai + 1}` : 'Link'}
                                            </a>
                                          )
                                        ))}
                                      </div>
                                    </div>
                                    <div className="mt-3 flex flex-col gap-2 border-t border-gray-100 pt-2">
                                      {t.approver_comment && (t.status === 'rejected' || t.status === 'approved') && (
                                        <div className="text-[10px] text-gray-600 bg-gray-50 rounded-lg px-2 py-1.5">
                                          <span className="font-semibold">Decision note:</span> {t.approver_comment}
                                        </div>
                                      )}
                                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                                        <input
                                          value={taskState.comment}
                                          onChange={(e) => setTaskActionState(prev => ({ ...prev, [t.id]: { ...prev[t.id], comment: e.target.value } }))}
                                          placeholder="Rejection reason"
                                          className="flex-1 border border-gray-200 rounded-lg px-2.5 py-1.5 text-[11px] text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                                          disabled={taskState.loading || isDecisionMade}
                                        />
                                        <div className="flex gap-2">
                                          <button
                                            onClick={() => handleTaskDecision(t.id, 'approve')}
                                            disabled={taskState.loading || isDecisionMade}
                                            className="flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-[11px] font-semibold text-emerald-700 disabled:opacity-50"
                                          >
                                            <CheckCircle2 className="h-3.5 w-3.5" /> Approve
                                          </button>
                                          <button
                                            onClick={() => handleTaskDecision(t.id, 'reject')}
                                            disabled={taskState.loading || isDecisionMade}
                                            className="flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-[11px] font-semibold text-red-700 disabled:opacity-50"
                                          >
                                            <XCircle className="h-3.5 w-3.5" /> Reject
                                          </button>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </div>
      )}

      {!searched && (
        <div className="py-20 text-center">
          <Search className="h-10 w-10 text-gray-200 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-400">Set your filters and click Generate Report</p>
          <p className="text-xs text-gray-300 mt-1">You can filter by agent, brand, date range and status</p>
        </div>
      )}

    </div>
  );
}
