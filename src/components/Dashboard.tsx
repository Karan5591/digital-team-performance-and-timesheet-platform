/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import {
  Users,
  Calendar,
  Clock,
  TrendingUp,
  CheckCircle2,
  Bell,
  RefreshCw,
  Check,
  X,
  Paperclip,
  ExternalLink,
  FileSpreadsheet,
  Square,
  AlertTriangle,
  ArrowRight,
  Activity,
  Volume2,
  VolumeX
} from 'lucide-react';

interface DashboardProps {
  token: string;
  user: any;
  onNavigateToTab?: (tab: string) => void;
}

export default function Dashboard({ token, user, onNavigateToTab }: DashboardProps) {
  const [adminMetrics, setAdminMetrics] = useState<any>(null);
  const [memberMetrics, setMemberMetrics] = useState<any>(null);
  const [approvals, setApprovals] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [rejectReason, setRejectReason] = useState<{ [key: string]: string }>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    try { return localStorage.getItem('notifSound') !== 'off'; } catch { return true; }
  });

  // Refs to chime exactly once when a brand-new notification arrives (employee side).
  const seenNotifIdsRef = useRef<Set<string>>(new Set());
  const notifInitializedRef = useRef(false);
  const soundEnabledRef = useRef(soundEnabled);
  const audioCtxRef = useRef<any>(null);

  useEffect(() => { soundEnabledRef.current = soundEnabled; }, [soundEnabled]);

  const toggleSound = () => {
    setSoundEnabled(prev => {
      const next = !prev;
      try { localStorage.setItem('notifSound', next ? 'on' : 'off'); } catch {}
      return next;
    });
  };

  // Short two-tone "ding" generated in-browser, so there's no audio file to host.
  const playNotificationSound = () => {
    try {
      const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (!Ctx) return;
      if (!audioCtxRef.current) audioCtxRef.current = new Ctx();
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') ctx.resume();
      const now = ctx.currentTime;
      ([[880, 0], [1174.66, 0.16]] as [number, number][]).forEach(([freq, offset]) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        osc.connect(gain);
        gain.connect(ctx.destination);
        const t = now + offset;
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.25, t + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.28);
        osc.start(t);
        osc.stop(t + 0.3);
      });
    } catch (e) {
      console.warn('Notification sound blocked or failed:', e);
    }
  };

  // Browsers block audio until the user interacts; prime the context on first gesture.
  useEffect(() => {
    const unlock = () => {
      try {
        const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext;
        if (Ctx && !audioCtxRef.current) audioCtxRef.current = new Ctx();
        if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') audioCtxRef.current.resume();
      } catch {}
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, []);

  const safeParseJson = async (res: Response) => {
    const text = await res.text();
    try {
      return JSON.parse(text);
    } catch (e) {
      console.warn('Received non-JSON response from server:', text.substring(0, 100));
      return { error: 'Invalid response from server. Please wait or try again.' };
    }
  };

  useEffect(() => {
    fetchDashboardMetrics();
    fetchNotifications();
    if (user.role === 'admin') fetchApprovalQueue();

    if (user.role === 'admin') {
      const interval = setInterval(() => {
        fetchDashboardMetrics();
      }, 300000);
      return () => clearInterval(interval);
    } else {
      // Poll so a newly-assigned task chimes without needing a manual refresh.
      const interval = setInterval(() => {
        fetchNotifications();
      }, 20000);
      return () => clearInterval(interval);
    }
  }, []);

  const fetchDashboardMetrics = async () => {
    setLoading(true);
    try {
      const url = user.role === 'admin' ? '/api/admin/dashboard' : '/api/member/dashboard';
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      const data = await safeParseJson(res);
      if (res.ok && data && !data.error) {
        if (user.role === 'admin') setAdminMetrics(data);
        else setMemberMetrics(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchNotifications = async () => {
    try {
      const res = await fetch('/api/notifications', { headers: { Authorization: `Bearer ${token}` } });
      const data = await safeParseJson(res);
      if (res.ok && Array.isArray(data)) {
        // Chime for employees when a genuinely new notification (e.g. a task
        // assignment) shows up. Seed silently on the first load.
        if (user.role !== 'admin') {
          const currentIds: string[] = data.map((n: any) => n.id).filter(Boolean);
          if (!notifInitializedRef.current) {
            notifInitializedRef.current = true;
          } else {
            const hasNew = currentIds.some(id => !seenNotifIdsRef.current.has(id));
            if (hasNew && soundEnabledRef.current) playNotificationSound();
          }
          currentIds.forEach(id => seenNotifIdsRef.current.add(id));
        }
        setNotifications(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchApprovalQueue = async () => {
    try {
      const res = await fetch('/api/admin/timesheets', { headers: { Authorization: `Bearer ${token}` } });
      const data = await safeParseJson(res);
      if (res.ok && Array.isArray(data)) setApprovals(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAdminClockOut = async (userId: string, userName: string) => {
    if (!window.confirm(`Force clock out ${userName}?`)) return;
    setError('');
    try {
      const res = await fetch('/api/admin/attendance/force-clock-out', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ userId })
      });
      const data = await safeParseJson(res);
      if (!res.ok || data.error) throw new Error(data.error || 'Failed to force clock out.');
      fetchDashboardMetrics();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleApproveTimesheet = async (sheetId: string) => {
    setError('');
    try {
      const res = await fetch('/api/admin/timesheet/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ sheetId, action: 'approve' })
      });
      const data = await safeParseJson(res);
      if (!res.ok || data.error) throw new Error(data.error || 'Failed to approve timesheet');
      setApprovals(prev => prev.filter(s => s.id !== sheetId));
      fetchDashboardMetrics();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleRejectTimesheet = async (sheetId: string) => {
    setError('');
    const comment = rejectReason[sheetId] || '';
    if (!comment.trim()) {
      setError('Please provide a rejection reason before rejecting.');
      return;
    }
    try {
      const res = await fetch('/api/admin/timesheet/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ sheetId, action: 'reject', comment })
      });
      const data = await safeParseJson(res);
      if (!res.ok || data.error) throw new Error(data.error || 'Failed to reject timesheet');
      setApprovals(prev => prev.filter(s => s.id !== sheetId));
      setRejectReason(prev => { const u = { ...prev }; delete u[sheetId]; return u; });
      fetchDashboardMetrics();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleMarkNotificationRead = async (notifId: string) => {
    try {
      await fetch(`/api/notifications/${notifId}/read`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications(prev => prev.filter(n => n.id !== notifId));
    } catch (err) {
      console.error(err);
    }
  };

  // Employee marks an assigned task as Working (in_progress) or Done (submitted).
  const handleAssignedProgress = async (taskId: string, action: 'working' | 'done') => {
    try {
      const res = await fetch(`/api/tasks/assigned/${taskId}/progress`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action })
      });
      const data = await safeParseJson(res);
      if (res.ok && data.success) {
        setMemberMetrics((prev: any) =>
          prev
            ? {
                ...prev,
                assignedTasks: (prev.assignedTasks || []).map((t: any) =>
                  t.id === taskId ? { ...t, status: data.task.status, submitted: data.task.submitted } : t
                )
              }
            : prev
        );
      }
    } catch (err) {
      console.error(err);
    }
  };

  const livePresence = (adminMetrics?.activeNow || adminMetrics?.liveClockInStatus?.logs || []).filter((entry: any) => entry && entry.user_id);

  // Only show clocked-in users (server now filters, but guard here too)
  const activeLogs = (adminMetrics?.liveClockInStatus?.logs || []).filter((l: any) => !l.clock_out);

  return (
    <div id="dashboard_screen_container" className="space-y-6 font-sans">

      {/* Welcome Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <div>
          <h2 className="text-2xl font-bold font-display tracking-tight text-gray-900">
            Welcome back, {user.name}!
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Designation: <strong>{user.designation}</strong> | Brand Focus:{' '}
            <strong className="text-indigo-600">{user.brand_focus}</strong>
          </p>
        </div>
        <button
          onClick={() => { fetchDashboardMetrics(); fetchNotifications(); if (user.role === 'admin') fetchApprovalQueue(); }}
          className="p-2 bg-gray-50 border border-gray-200 rounded-xl hover:bg-gray-100 transition text-gray-500 hover:text-indigo-600 flex items-center gap-1 text-xs font-semibold"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh stats
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-700 text-xs rounded-xl border border-red-100 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0" /> {error}
        </div>
      )}

      {/* ─── ADMIN VIEW ─── */}
      {user.role === 'admin' && adminMetrics && (
        <div className="space-y-6">

          {/* KPI Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
              <div className="flex justify-between items-center mb-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Live Active</span>
                <Users className="h-4 w-4 text-indigo-500" />
              </div>
              <p className="text-3xl font-extrabold text-gray-900">
                {adminMetrics.liveClockInStatus?.clockedInCount || 0}
                <span className="text-xs text-gray-400 font-medium ml-1">/ {adminMetrics.liveClockInStatus?.totalCount || 0}</span>
              </p>
              <div className="mt-2 flex items-center gap-1 text-[10px] text-emerald-600 font-semibold">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping inline-block"></span> Clocked in now
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
              <div className="flex justify-between items-center mb-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Approvals</span>
                <FileSpreadsheet className="h-4 w-4 text-amber-500" />
              </div>
              <p className="text-3xl font-extrabold text-gray-900">{adminMetrics.approvalQueueCount || 0}</p>
              <p className="mt-2 text-[10px] text-gray-400">Timesheets awaiting review</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
              <div className="flex justify-between items-center mb-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Avg Utilization</span>
                <Activity className="h-4 w-4 text-emerald-500" />
              </div>
              <p className="text-3xl font-extrabold text-gray-900">
                {adminMetrics.utilizationHeatmap?.avgUtilizationPercent || 0}%
              </p>
              <p className="mt-2 text-[10px] text-gray-400">Logged hrs vs 8h target</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
              <div className="flex justify-between items-center mb-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Avg KPI Score</span>
                <TrendingUp className="h-4 w-4 text-indigo-600" />
              </div>
              <p className="text-3xl font-extrabold text-gray-900">
                {adminMetrics.kpiPerformanceAverages?.avgKpiScore || 0}%
              </p>
              <p className="mt-2 text-[10px] text-gray-400">Team scorecards this month</p>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="text-base font-bold font-display text-gray-900">Live Team Presence</h3>
                <p className="text-xs text-gray-500 mt-1">Admins can see who is active, who is on break, and force-clock out anyone still logged in.</p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-gray-100 text-gray-500 uppercase tracking-wider">
                    <th className="py-2 pr-3">Employee</th>
                    <th className="py-2 pr-3">Current State</th>
                    <th className="py-2 pr-3">Clock In</th>
                    <th className="py-2 pr-3">Total Login</th>
                    <th className="py-2">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {livePresence.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-4 text-center text-gray-400">No active users at the moment.</td>
                    </tr>
                  ) : livePresence.map((entry: any) => (
                    <tr key={entry.user_id} className="align-middle">
                      <td className="py-3 pr-3">
                        <div className="font-semibold text-gray-900">{entry.name}</div>
                        <div className="text-[11px] text-gray-400">{entry.designation}</div>
                      </td>
                      <td className="py-3 pr-3">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${entry.status === 'On Break' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                          {entry.status || 'Active'}
                        </span>
                      </td>
                      <td className="py-3 pr-3 font-mono text-gray-500">{entry.clock_in ? new Date(entry.clock_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                      <td className="py-3 pr-3 font-mono text-gray-500">{entry.duration || '0h 0m'}</td>
                      <td className="py-3">
                        <button
                          onClick={() => handleAdminClockOut(entry.user_id, entry.name)}
                          className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-[11px] font-semibold text-red-600 transition hover:bg-red-100"
                        >
                          Force Clock Out
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Main body: left col (approvals + heatmap) | right col (shift logs + notifications) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* LEFT: Approval Queue + Heatmap */}
            <div className="lg:col-span-2 space-y-6">

              {/* Approval Queue */}
              <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                <h3 className="text-base font-bold font-display text-gray-900 mb-4">Pending Timesheet Approvals</h3>
                <div className="space-y-4">
                  {approvals.length === 0 ? (
                    <div className="p-8 text-center bg-gray-50 rounded-xl border border-dashed border-gray-200">
                      <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
                      <p className="text-sm font-semibold text-gray-600">Queue is clear!</p>
                      <p className="text-xs text-gray-400 mt-0.5">All submitted timesheets have been reviewed.</p>
                    </div>
                  ) : (
                    approvals.map(sheet => (
                      <div key={sheet.id} className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-3">
                        <div className="flex justify-between items-start gap-4 flex-wrap">
                          <div>
                            <span className="text-[10px] bg-indigo-50 text-indigo-700 border border-indigo-200 font-mono px-2 py-0.5 rounded font-bold">
                              {sheet.date}
                            </span>
                            <h4 className="text-sm font-semibold text-gray-900 mt-1">{sheet.user_name}</h4>
                            <p className="text-xs text-gray-400">{sheet.user_designation}</p>
                          </div>
                          <div className="text-right">
                            <span className="text-xs text-gray-400 font-semibold uppercase">Logged</span>
                            <p className="text-sm font-bold text-gray-800">{(sheet.total_logged_min / 60).toFixed(1)} hrs</p>
                          </div>
                        </div>
                        <div className="p-3 bg-white rounded-lg border border-gray-100 space-y-1.5">
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Tasks:</span>
                          {sheet.tasks && sheet.tasks.map((tk: any) => (
                            <div key={tk.id} className="text-xs text-gray-700 border-b border-gray-50 pb-2 last:border-0 space-y-1">
                              <div className="flex justify-between gap-2">
                                <span className="font-semibold">{tk.task} <span className="font-normal italic text-gray-400">({tk.subtask})</span></span>
                                <span className="font-mono text-gray-400 shrink-0">{(tk.duration_min / 60).toFixed(1)}h</span>
                              </div>
                              {tk.output_url && (
                                <div className="pt-0.5">
                                  {tk.output_url.startsWith('/uploads/') && tk.output_url.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                                    <a href={tk.output_url} target="_blank" rel="noopener noreferrer">
                                      <img src={tk.output_url} alt="attachment" className="h-20 w-28 object-cover rounded-lg border border-gray-200 hover:opacity-80 transition mt-1" />
                                    </a>
                                  ) : (
                                    <a href={tk.output_url} target="_blank" rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1 text-[11px] font-medium text-indigo-600 hover:underline">
                                      {tk.output_url.startsWith('/uploads/') ? <Paperclip className="h-3 w-3" /> : <ExternalLink className="h-3 w-3" />}
                                      {tk.output_url.startsWith('/uploads/') ? 'View Attachment' : 'Live Link'}
                                    </a>
                                  )}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                        <div className="flex flex-col sm:flex-row gap-2 items-center pt-1">
                          <input
                            type="text"
                            placeholder="Rejection reason (required to reject)..."
                            value={rejectReason[sheet.id] || ''}
                            onChange={e => setRejectReason(prev => ({ ...prev, [sheet.id]: e.target.value }))}
                            className="flex-1 px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                          />
                          <div className="flex gap-1.5 shrink-0 w-full sm:w-auto">
                            <button
                              onClick={() => handleApproveTimesheet(sheet.id)}
                              className="flex-1 sm:flex-none bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs px-3 py-1.5 rounded-lg flex items-center justify-center gap-1 transition"
                            >
                              <Check className="h-3.5 w-3.5" /> Approve
                            </button>
                            <button
                              onClick={() => handleRejectTimesheet(sheet.id)}
                              className="flex-1 sm:flex-none bg-red-600 hover:bg-red-700 text-white font-semibold text-xs px-3 py-1.5 rounded-lg flex items-center justify-center gap-1 transition"
                            >
                              <X className="h-3.5 w-3.5" /> Reject
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Notifications */}
              <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                <h3 className="text-base font-bold font-display text-gray-900 mb-4 flex items-center gap-1.5">
                  <Bell className="h-4 w-4 text-indigo-500" /> Notifications
                </h3>
                <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                  {notifications.length === 0 ? (
                    <p className="text-xs text-gray-400 italic text-center py-4">All quiet. No new notifications.</p>
                  ) : (
                    notifications.map(notif => (
                      <div key={notif.id} className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-100 text-xs flex justify-between items-start gap-2">
                        <div>
                          <p className="font-semibold text-gray-800">{notif.title}</p>
                          <p className="text-gray-500 mt-0.5">{notif.message}</p>
                          <span className="text-[10px] text-gray-400 font-mono block mt-1">{notif.time}</span>
                        </div>
                        <button
                          onClick={() => handleMarkNotificationRead(notif.id)}
                          className="text-[10px] font-bold text-indigo-600 hover:underline shrink-0"
                        >
                          Dismiss
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* ─── MEMBER VIEW ─── */}
      {user.role === 'member' && memberMetrics && (
        <div className="space-y-6">

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Shift Progress</span>
              <div className="mt-4 flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">
                  <Clock className="h-6 w-6" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-gray-900">{memberMetrics.todayStatus || 'Shift Closed'}</h4>
                  <p className="text-xs text-gray-500 mt-0.5">Target: 8.0 hrs/day</p>
                </div>
              </div>
              <button
                onClick={() => onNavigateToTab?.('timesheet')}
                className="mt-4 w-full py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1"
              >
                Manage Timesheet <ArrowRight className="h-3 w-3" />
              </button>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Weekly Performance</span>
              <div className="mt-4">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>{memberMetrics.weeklyHoursLogged || 0} hrs logged</span>
                  <span>Target: 40h</span>
                </div>
                <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden">
                  <div
                    className="h-2.5 bg-emerald-500 rounded-full"
                    style={{ width: `${Math.min(100, ((memberMetrics.weeklyHoursLogged || 0) / 40) * 100)}%` }}
                  />
                </div>
                <p className="text-[10px] text-gray-400 mt-2">Resets each Monday morning.</p>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
              {(() => {
                const openTasks = (memberMetrics.assignedTasks || []).filter((t: any) => {
                  const s = (t.status || 'pending').toLowerCase();
                  return !(s === 'done' || s === 'approved' || t.submitted);
                });
                const sorted = [...openTasks].sort((a: any, b: any) =>
                  a.date > b.date ? 1 : a.date < b.date ? -1 : 0
                );
                const soonest = sorted[0];
                const count = openTasks.length;

                if (count === 0) {
                  return (
                    <>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Urgent Assigned Tasks</span>
                      <div className="mt-4 flex items-center gap-4">
                        <div className="h-12 w-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
                          <CheckCircle2 className="h-6 w-6" />
                        </div>
                        <div>
                          <h4 className="text-sm font-semibold text-gray-900">All caught up</h4>
                          <p className="text-[10px] text-gray-400 mt-0.5">No open tasks assigned to you.</p>
                        </div>
                      </div>
                      <div className="mt-4 w-full py-2 bg-emerald-50 text-emerald-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1">
                        Nothing pending
                      </div>
                    </>
                  );
                }

                return (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600">Urgent Assigned Tasks</span>
                      <span className="text-[10px] font-bold text-white bg-amber-500 rounded-full px-2 py-0.5">{count} open</span>
                    </div>
                    <div className="mt-4 flex items-center gap-4">
                      <div className="h-12 w-12 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 shrink-0 animate-pulse">
                        <AlertTriangle className="h-6 w-6" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-sm font-semibold text-gray-900 truncate">{soonest.task}</h4>
                        <p className="text-[10px] text-gray-500 mt-0.5">{soonest.brand} &middot; due {soonest.date}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => document.getElementById('assigned_tasks_card')?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
                      className="mt-4 w-full py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1"
                    >
                      Review tasks <ArrowRight className="h-3 w-3" />
                    </button>
                  </>
                );
              })()}
            </div>

          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">

            <div id="assigned_tasks_card" className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col h-full">
              <h3 className="text-base font-bold font-display text-gray-900 mb-4">Assigned Tasks & Deadlines</h3>
              <div className="space-y-3 flex-1">
                {/* Admin-assigned tasks with Working / Done controls */}
                {(memberMetrics.assignedTasks || []).map((t: any) => {
                  const s = (t.status || 'pending').toLowerCase();
                  const isDone = s === 'done' || s === 'approved' || t.submitted;
                  const isWorking = s === 'in_progress';
                  return (
                    <div key={t.id} className="p-3.5 bg-indigo-50/40 border border-indigo-100 rounded-xl text-xs">
                      <div className="flex justify-between items-start gap-2">
                        <div className="min-w-0">
                          <p className="font-semibold text-gray-900 truncate">{t.task}</p>
                          <p className="text-gray-400 font-mono mt-0.5">{t.brand} &middot; due {t.date} &middot; {t.duration_min} min</p>
                        </div>
                        {isDone ? (
                          <span className="shrink-0 text-[10px] bg-emerald-100 text-emerald-700 border border-emerald-200 font-bold uppercase px-2 py-0.5 rounded flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" /> Completed
                          </span>
                        ) : isWorking ? (
                          <span className="shrink-0 text-[10px] bg-blue-100 text-blue-700 border border-blue-200 font-bold uppercase px-2 py-0.5 rounded flex items-center gap-1">
                            <Activity className="h-3 w-3" /> Working
                          </span>
                        ) : (
                          <span className="shrink-0 text-[10px] bg-amber-100 text-amber-700 border border-amber-200 font-bold uppercase px-2 py-0.5 rounded flex items-center gap-1">
                            <Clock className="h-3 w-3" /> Pending
                          </span>
                        )}
                      </div>
                      {isDone ? (
                        <div className="mt-2.5 flex items-center gap-1.5 text-[11px] font-bold text-emerald-700">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Done &middot; submitted to timesheet
                        </div>
                      ) : (
                        <div className="mt-2.5 flex items-center gap-2">
                          <button
                            onClick={() => handleAssignedProgress(t.id, 'working')}
                            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-bold border transition ${isWorking ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-blue-700 border-blue-200 hover:bg-blue-50'}`}
                          >
                            <Activity className="h-3 w-3" /> {isWorking ? 'Working' : 'Start working'}
                          </button>
                          <button
                            onClick={() => handleAssignedProgress(t.id, 'done')}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-bold border bg-white text-emerald-700 border-emerald-200 hover:bg-emerald-50 transition"
                          >
                            <Check className="h-3 w-3" /> Done
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Calendar deadlines */}
                {(memberMetrics.deadlines || []).map((dl: any, idx: number) => (
                  <div key={`dl-${idx}`} className="p-3.5 bg-gray-50 border border-gray-200 rounded-xl text-xs flex justify-between items-center">
                    <div>
                      <p className="font-semibold text-gray-900">{dl.title}</p>
                      <p className="text-gray-400 font-mono mt-0.5">Due: {dl.date}</p>
                    </div>
                    <span className="text-[10px] bg-red-50 text-red-700 border border-red-200 font-bold uppercase px-2 py-0.5 rounded">
                      Deadline
                    </span>
                  </div>
                ))}

                {(!memberMetrics.assignedTasks || memberMetrics.assignedTasks.length === 0) &&
                  (!memberMetrics.deadlines || memberMetrics.deadlines.length === 0) && (
                    <p className="text-xs text-gray-400 italic text-center py-4">No assigned tasks or deadlines.</p>
                  )}
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col h-full">
              <h3 className="text-base font-bold font-display text-gray-900 mb-4 flex items-center justify-between gap-1.5">
                <span className="flex items-center gap-1.5"><Bell className="h-4 w-4 text-indigo-500" /> Notifications</span>
                <button
                  onClick={toggleSound}
                  title={soundEnabled ? 'Mute assignment sound' : 'Unmute assignment sound'}
                  aria-label={soundEnabled ? 'Mute assignment sound' : 'Unmute assignment sound'}
                  className="text-gray-400 hover:text-indigo-600 transition"
                >
                  {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                </button>
              </h3>
              <div className="space-y-3 flex-1 overflow-auto">
                {notifications.length === 0 ? (
                  <p className="text-xs text-gray-400 italic text-center py-4">No new alerts.</p>
                ) : (
                  notifications.map(notif => (
                    <div key={notif.id} className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-100 text-xs flex justify-between items-start gap-2">
                      <div>
                        <p className="font-semibold text-gray-800">{notif.title}</p>
                        <p className="text-gray-500 mt-0.5">{notif.message}</p>
                        <span className="text-[10px] text-gray-400 font-mono block mt-1">{notif.time}</span>
                      </div>
                      <button
                        onClick={() => handleMarkNotificationRead(notif.id)}
                        className="text-[10px] font-bold text-indigo-600 hover:underline shrink-0"
                      >
                        Dismiss
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
