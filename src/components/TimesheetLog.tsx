/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Play, 
  Square, 
  Coffee, 
  Plus, 
  Trash2, 
  Copy, 
  Clock, 
  AlertTriangle, 
  ExternalLink, 
  CheckCircle2,
  Paperclip,
  X,
  Pencil,
} from 'lucide-react';

interface TimesheetLogProps {
  token: string;
  user: any;
  onStatusChange?: () => void;
  onLogout?: () => void;
}

export default function TimesheetLog({ token, user, onStatusChange, onLogout }: TimesheetLogProps) {
  const todayStr = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState(todayStr);

  const [clockedIn, setClockedIn] = useState(false);
  const [attendanceLog, setAttendanceLog] = useState<any>(null);
  const [taskLibrary, setTaskLibrary] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [sheetStatus, setSheetStatus] = useState<string>('draft');
  const [totalLoggedMin, setTotalLoggedMin] = useState(0);

  // Form states for new task entry
  const [selectedTask, setSelectedTask] = useState('');
  const [selectedSubtask, setSelectedSubtask] = useState('');
  const [selectedBrand, setSelectedBrand] = useState<'GT' | 'HH' | 'ACR' | 'Internal' | 'All'>('GT');
  const [durationMin, setDurationMin] = useState(30);
  const [status, setStatus] = useState<'Not started' | 'In progress' | 'Done' | 'Blocked' | 'Pending Review'>('Done');
  const [notes, setNotes] = useState('');
  const [outputUrl, setOutputUrl] = useState('');
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [attachedPreviews, setAttachedPreviews] = useState<(string | null)[]>([]);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [existingAttachmentUrls, setExistingAttachmentUrls] = useState<string[]>([]); // urls already saved, kept on edit unless removed
  const [showSubmitted, setShowSubmitted] = useState(true);
  const [showApproved, setShowApproved] = useState(false);
  
  // Quick pre-set durations
  const durationChips = [15, 30, 60, 120, 180];

  // For checklist/checkpoints
  const [checkpoints, setCheckpoints] = useState<{ [key: string]: boolean }>({});

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Added States
  const [liveActiveMinutes, setLiveActiveMinutes] = useState(0);
  const [onBreak, setOnBreak] = useState(false);
  const [breakStartTime, setBreakStartTime] = useState<Date | null>(null);
  const [linkedKpiMetricId, setLinkedKpiMetricId] = useState('');
  const [kpiMetrics, setKpiMetrics] = useState<any[]>([]);
  const [recentTasks, setRecentTasks] = useState<any[]>([]);
  const [approverComment, setApproverComment] = useState<string | null>(null);

  const statusMap: Record<string, string> = {
    'Not started': 'not_started',
    'In progress': 'in_progress',
    'Done': 'done',
    'Blocked': 'blocked',
    'Pending Review': 'pending_review'
  };

  const statusReverseMap: Record<string, string> = {
    'not_started': 'Not started',
    'in_progress': 'In progress',
    'done': 'Done',
    'blocked': 'Blocked',
    'pending_review': 'Pending Review'
  };

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
    fetchAttendanceToday();
    fetchTaskLibrary();
    fetchDayDetails();
    fetchKpiMetrics();
  }, [selectedDate, token]);

  // Reset checkpoints when selectedTask changes
  useEffect(() => {
    setCheckpoints({});
    setSelectedSubtask('');
  }, [selectedTask]);

  // Calculate live minutes and tick every 60 seconds
  useEffect(() => {
    if (!clockedIn || !attendanceLog?.clock_in_ts) {
      setLiveActiveMinutes(0);
      return;
    }
    const tick = () => {
      setLiveActiveMinutes(
        Math.max(0, Math.floor((Date.now() - new Date(attendanceLog.clock_in_ts).getTime()) / 60000) - (attendanceLog.break_minutes || 0))
      );
    };
    tick();
    const id = setInterval(tick, 60000);
    return () => clearInterval(id);
  }, [clockedIn, attendanceLog]);

/* //============================Testing=========================

// 1. Auto-Trigger Break on 5-Minute Inactivity or System Sleep
useEffect(() => {
  // Only monitor if the user is actively clocked in and NOT already on a break
  if (!clockedIn || onBreak) return;

  let idleTimer: NodeJS.Timeout;
  const IDLE_TIMEOUT_MS = 1 * 30 * 1000; // 5 minutes

  const triggerAutomaticBreak = () => {
    console.log("Inactivity detected. Automatically triggering break state...");
    
    // Fallback safeguard: If handleLogBreak handles toggling, we ensure it sets onBreak to true
    if (!onBreak) {
      handleLogBreak();
    }
  };

  const resetIdleTimer = () => {
    clearTimeout(idleTimer);
    idleTimer = setTimeout(triggerAutomaticBreak, IDLE_TIMEOUT_MS);
  };

  // Activity events while working on this tab
  const activityEvents = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
  resetIdleTimer();

  activityEvents.forEach(event => {
    window.addEventListener(event, resetIdleTimer);
  });

  // Also catch if they close the laptop lid using the Time Skip Delta method
  let lastTick = Date.now();
  const sleepCheckInterval = setInterval(() => {
    const now = Date.now();
    // If a gap greater than 15 seconds happens suddenly, the computer slept
    if (now - lastTick > 15000) {
      console.log("Lid close / System sleep detected. Forcing break state...");
      triggerAutomaticBreak();
    }
    lastTick = now;
  }, 2000);

  return () => {
    clearTimeout(idleTimer);
    clearInterval(sleepCheckInterval);
    activityEvents.forEach(event => {
      window.removeEventListener(event, resetIdleTimer);
    });
  };
}, [clockedIn, onBreak]);

// ==============end testing======================== */




  const fetchAttendanceToday = async () => {
    try {
      const res = await fetch('/api/attendance/today', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await safeParseJson(res);
      if (res.ok && data && !data.error) {
        setClockedIn(data.clockedIn);
        setAttendanceLog(data.log);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchTaskLibrary = async () => {
    try {
      const res = await fetch('/api/tasks/library', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await safeParseJson(res);
      if (res.ok && Array.isArray(data) && data.length > 0) {
        setTaskLibrary(data);
        setSelectedTask(data[0].task_name);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchKpiMetrics = async () => {
    try {
      const res = await fetch('/api/kpi/metrics/mine', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await safeParseJson(res);
      if (res.ok && Array.isArray(data)) {
        setKpiMetrics(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchRecentTasks = async () => {
    try {
      const res = await fetch('/api/tasks/recent?limit=5', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await safeParseJson(res);
      if (res.ok && Array.isArray(data)) {
        setRecentTasks(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchDayDetails = async () => {
    try {
      const res = await fetch(`/api/timesheet/day?date=${selectedDate}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await safeParseJson(res);
      if (res.ok && data && !data.error) {
        setTasks(data.tasks || []);
        setSheetStatus(data.sheet?.status || 'draft');
        setApproverComment(data.sheet?.approver_comment || null);
        setTotalLoggedMin(data.sheet?.total_logged_min || 0);
        fetchRecentTasks();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleClockIn = async () => {
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/attendance/clock-in', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await safeParseJson(res);
      if (!res.ok) throw new Error(data.error);
      setClockedIn(true);
      setAttendanceLog(data.log);
      if (onStatusChange) onStatusChange();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleClockOut = async () => {
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/attendance/clock-out', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await safeParseJson(res);
      if (!res.ok) throw new Error(data.error);
      setClockedIn(false);
      setAttendanceLog(data.log);
      if (onStatusChange) onStatusChange();
      setTimeout(() => onLogout?.(), 1500)
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogBreak = async () => {
    setError('');
    setSuccessMsg('');
    if (!onBreak) {
      setOnBreak(true);
      setBreakStartTime(new Date());
      try {
        await fetch('/api/attendance/break-toggle', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ breakMinutes: 0, isOnBreak: true })
        });
      } catch (err) {
        console.error(err);
      }
      setSuccessMsg('Away break started. Click again to end and record break.');
      setTimeout(() => setSuccessMsg(''), 4000);
    } else {
      if (!breakStartTime) {
        setOnBreak(false);
        return;
      }
      setLoading(true);
      try {
        const diffMinutes = Math.max(1, Math.round((Date.now() - breakStartTime.getTime()) / 60000));
        const res = await fetch('/api/attendance/break-toggle', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}` 
          },
          body: JSON.stringify({ breakMinutes: diffMinutes })
        });
        const data = await safeParseJson(res);
        if (!res.ok) throw new Error(data.error);
        setAttendanceLog(data.log);
        setOnBreak(false);
        setBreakStartTime(null);
        setSuccessMsg(`Logged a ${diffMinutes}-minute break successfully!`);
        setTimeout(() => setSuccessMsg(''), 3000);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
  };

  // Checkbox checkpoints
  const handleToggleCheckpoint = (cp: string) => {
    setCheckpoints(prev => {
      const updated = { ...prev, [cp]: !prev[cp] };
      // Map check list to subtask description
      const activeCps = Object.keys(updated).filter(k => updated[k]);
      setSelectedSubtask(activeCps.join(', ') || 'Standard completion');
      return updated;
    });
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);
    if (selected.length === 0) return;
    const combined = [...attachedFiles, ...selected].slice(0, 5); // max 5 files
    setAttachedFiles(combined);
    setAttachedPreviews(combined.map(f => f.type.startsWith('image/') ? URL.createObjectURL(f) : null));
    e.target.value = ''; // allow re-selecting same file
  };

  const handleRemoveNewFile = (idx: number) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== idx));
    setAttachedPreviews(prev => prev.filter((_, i) => i !== idx));
  };

  const handleRemoveExistingUrl = (idx: number) => {
    setExistingAttachmentUrls(prev => prev.filter((_, i) => i !== idx));
  };

  const uploadAttachments = async (): Promise<string[]> => {
    if (attachedFiles.length === 0) return [];
    setUploadingFile(true);
    try {
      const formData = new FormData();
      attachedFiles.forEach(f => formData.append('files', f));
      const res = await fetch('/api/upload/multi', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      return data.urls as string[];
    } catch (err: any) {
      setError('File upload failed. Task not saved.');
      return [];
    } finally {
      setUploadingFile(false);
    }
  };

  const resetForm = () => {
    setNotes('');
    setOutputUrl('');
    setSelectedSubtask('');
    setCheckpoints({});
    setLinkedKpiMetricId('');
    setAttachedFiles([]);
    setAttachedPreviews([]);
    setExistingAttachmentUrls([]);
    setEditingTaskId(null);
  };

  const handleEditTaskClick = (t: any) => {
    setEditingTaskId(t.id);
    setSelectedTask(t.task);
    setSelectedSubtask(t.subtask || '');
    setSelectedBrand(t.brand);
    setDurationMin(t.duration_min);
    setStatus(statusReverseMap[t.status] as any || 'Done');
    setNotes(t.notes || '');
    setLinkedKpiMetricId(t.linked_kpi_metric_id || '');
    const urls = (t.output_url || '').split(',').map((u: string) => u.trim()).filter(Boolean);
    setExistingAttachmentUrls(urls.filter((u: string) => u.startsWith('/uploads/')));
    setOutputUrl(urls.find((u: string) => !u.startsWith('/uploads/')) || '');
    setAttachedFiles([]);
    setAttachedPreviews([]);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    resetForm();
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    const mappedStatus = statusMap[status] || 'done';

    // Client-Side Validations
    if (!selectedTask) {
      setError('Please select a task from your role dropdown');
      return;
    }
    if (!selectedSubtask.trim()) {
      setError('Subtask description is required');
      return;
    }
    if (durationMin < 5 || durationMin > 480) {
      setError('Duration spent must be between 5 and 480 minutes');
      return;
    }
    const otherTasksTotal = editingTaskId
      ? tasks.filter(t => t.id !== editingTaskId).reduce((sum, t) => sum + t.duration_min, 0)
      : totalLoggedMin;
    const remainingMin = 480 - otherTasksTotal;
    if (durationMin > remainingMin) {
      setError(`Daily limit is 8 hours. You can only set up to ${remainingMin} minute(s) for this task.`);
      return;
    }
    if ((mappedStatus === 'blocked' || mappedStatus === 'pending_review') && !notes.trim()) {
      setError('Notes required when status is Blocked or Pending Review');
      return;
    }
    if (mappedStatus === 'done' && !outputUrl.trim() && attachedFiles.length === 0 && existingAttachmentUrls.length === 0) {
      // Soft warning only (do not block)
      setSuccessMsg('Adding an attachment or output link helps HOD verify completion');
      setTimeout(() => setSuccessMsg(''), 6000);
    }

    setLoading(true);
    try {
      const newlyUploadedUrls = await uploadAttachments();
      if (attachedFiles.length > 0 && newlyUploadedUrls.length === 0) { setLoading(false); return; } // upload failed

      const allUrls = [...existingAttachmentUrls, ...newlyUploadedUrls, ...(outputUrl.trim() ? [outputUrl.trim()] : [])];
      const finalOutputUrl = allUrls.length > 0 ? allUrls.join(',') : null;

      const isEditing = !!editingTaskId;
      const res = await fetch(isEditing ? `/api/tasks/entry/${editingTaskId}` : '/api/tasks/entry', {
        method: isEditing ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          date: selectedDate,
          task: selectedTask,
          subtask: selectedSubtask || 'Standard execution',
          brand: selectedBrand,
          duration_min: durationMin,
          status: mappedStatus,
          notes,
          output_url: finalOutputUrl,
          linked_kpi_metric_id: linkedKpiMetricId || null
        })
      });

      const data = await safeParseJson(res);
      if (!res.ok) throw new Error(data.error);

      if (isEditing) {
        setTasks(prev => prev.map(t => t.id === editingTaskId ? data.entry : t));
      } else {
        setTasks(prev => [...prev, data.entry]);
      }
      setTotalLoggedMin(data.totalLoggedMin);
      resetForm();
      setSuccessMsg(isEditing ? 'Task entry updated' : 'Task entry added to timesheet');
      setTimeout(() => setSuccessMsg(''), 3000);
      fetchRecentTasks();
      if (onStatusChange) onStatusChange();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTask = async (id: string) => {
    setError('');
    
    // Save old state in case of failure rollback
    const oldTasks = [...tasks];
    const oldTotalMin = totalLoggedMin;

    // Optimistic Update
    const deletedTask = tasks.find(t => t.id === id);
    setTasks(prev => prev.filter(t => t.id !== id));
    setTotalLoggedMin(prev => Math.max(0, prev - (deletedTask?.duration_min || 0)));

    if (editingTaskId === id) resetForm();

    try {
      const res = await fetch(`/api/tasks/entry/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await safeParseJson(res);
      if (!res.ok) throw new Error(data.error);

      if (onStatusChange) onStatusChange();
    } catch (err: any) {
      // Rollback on failure
      setTasks(oldTasks);
      setTotalLoggedMin(oldTotalMin);
      setError(err.message);
    }
  };

  const handleCopyYesterday = async () => {
    setError('');
    setSuccessMsg('');
    setLoading(true);
    try {
      const res = await fetch('/api/tasks/copy-yesterday', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ date: selectedDate })
      });
      const data = await safeParseJson(res);
      if (!res.ok) throw new Error(data.error);

      setSuccessMsg(`Copied ${data.copiedCount} task entries from yesterday successfully!`);
      fetchDayDetails();
      if (onStatusChange) onStatusChange();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitTimesheet = async () => {
    setError('');
    setSuccessMsg('');

    if (hasGap) {
      const hours = Math.floor(gapMinutes / 60);
      const mins = gapMinutes % 60;
      const hoursMinsStr = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
      const confirmed = window.confirm(`You have ${hoursMinsStr} unaccounted. Submit anyway?`);
      if (!confirmed) return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/timesheet/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ date: selectedDate })
      });
      const data = await safeParseJson(res);
      if (!res.ok) throw new Error(data.error);

      setSheetStatus('submitted');
      setSuccessMsg('Timesheet submitted to Head of Digital for approval!');
      if (onStatusChange) onStatusChange();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Computations
  const loggedHrs = Number((totalLoggedMin / 60).toFixed(1));
  const liveActiveHrs = Number((liveActiveMinutes / 60).toFixed(1));
  
  const gapMinutes = liveActiveMinutes - totalLoggedMin;
  const hasGap = liveActiveMinutes > 0 && totalLoggedMin < liveActiveMinutes - 15;

  const selectedTaskObj = taskLibrary.find(t => t.task_name === selectedTask);
  const activeCheckpoints = selectedTaskObj?.subtasks || [];

  // const isLocked = sheetStatus === 'approved';

  const isLocked = false;

  // Split tasks into three groups
  const draftTasks = tasks.filter((t: any) => !t.submitted);
  const submittedTasks = tasks.filter((t: any) => t.submitted && sheetStatus !== 'approved');
  const approvedTasks = tasks.filter((t: any) => t.submitted && sheetStatus === 'approved');

  const renderTaskCard = (t: any, canModify: boolean) => {
    const brandColor = t.brand === 'GT' ? 'bg-[#C8102E]' : t.brand === 'HH' ? 'bg-[#003189]' : t.brand === 'ACR' ? 'bg-[#1A6B3A]' : 'bg-gray-800';
    const taskAttachments = (t.output_url || '').split(',').map((u: string) => u.trim()).filter(Boolean);
    const modifiable = canModify && !isLocked;
    return (
      <motion.div
        key={t.id}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className={`p-4 rounded-xl border transition flex justify-between items-start gap-4 ${
          editingTaskId === t.id ? 'bg-indigo-50 border-indigo-300' : modifiable ? 'bg-gray-50 hover:bg-gray-100 border-gray-200' : 'bg-gray-50/60 border-gray-100'
        }`}
      >
        <div className="space-y-1.5 flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-[10px] font-bold text-white px-2 py-0.5 rounded ${brandColor}`}>
              {t.brand}
            </span>
            <span className="text-xs font-semibold text-gray-500 font-mono flex items-center gap-0.5">
              <Clock className="h-3 w-3" /> {t.duration_min} min ({(t.duration_min/60).toFixed(1)}h)
            </span>
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
              t.status === 'done' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              : t.status === 'in_progress' ? 'bg-blue-50 text-blue-700 border border-blue-200'
              : t.status === 'blocked' ? 'bg-red-50 text-red-700 border border-red-200'
              : t.status === 'pending_review' ? 'bg-purple-50 text-purple-700 border border-purple-200'
              : 'bg-gray-100 text-gray-700'
            }`}>
              {statusReverseMap[t.status] || t.status}
            </span>
            {editingTaskId === t.id && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-100 text-indigo-700 border border-indigo-300">Editing...</span>
            )}
          </div>
          <h4 className="text-sm font-semibold text-gray-900">{t.task}</h4>
          <p className="text-xs text-gray-600 italic">Checkpoints: {t.subtask}</p>
          {t.notes && <p className="text-xs text-gray-500 font-sans">{t.notes}</p>}

          {t.linked_kpi_metric_name && (
            <div className="inline-flex items-center gap-1 bg-purple-50 text-purple-700 text-[10px] font-semibold px-2 py-0.5 rounded border border-purple-200 mt-1">
              🎯 KPI: {t.linked_kpi_metric_name}
            </div>
          )}

          {taskAttachments.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-1">
              {taskAttachments.map((url: string, i: number) => (
                url.startsWith('/uploads/') && url.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                  <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                    <img src={url} alt="attachment" className="h-14 w-20 object-cover rounded-lg border border-gray-200 hover:opacity-80 transition" />
                  </a>
                ) : (
                  <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] font-medium text-indigo-600 hover:underline">
                    {url.startsWith('/uploads/') ? <Paperclip className="h-3 w-3" /> : <ExternalLink className="h-3 w-3" />}
                    {url.startsWith('/uploads/') ? `Attachment ${i + 1}` : 'Live Link'}
                  </a>
                )
              ))}
            </div>
          )}
        </div>

        {modifiable && (
          <div className="flex flex-col gap-1 shrink-0">
            <button
              onClick={() => handleEditTaskClick(t)}
              className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
              title="Edit task"
            >
              <Pencil className="h-4 w-4" />
            </button>
            <button
              onClick={() => handleDeleteTask(t.id)}
              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
              title="Delete task"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        )}
      </motion.div>
    );
  };

  return (
    <div id="timesheet_log_container" className="space-y-6">
      
      {/* 1. Header & Quick Date Selector */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold font-display tracking-tight text-gray-900">Daily Attendance & Timesheet</h1>
          <p className="text-sm text-gray-500 mt-1">Clock in your work shift and account for your 8-hour target.</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-gray-600">Select Date:</label>
          <input 
            type="date"
            max={todayStr}
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3 py-1.5 bg-gray-50 border border-gray-300 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          />
        </div>
      </div>

      {error && (
        <div id="timesheet_error" className="p-4 bg-red-50 text-red-700 text-sm rounded-xl border border-red-100 flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div id="timesheet_success" className="p-4 bg-emerald-50 text-emerald-800 text-sm rounded-xl border border-emerald-100 flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* 2. Attendance Clock Control */}
      {selectedDate === todayStr && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Shift Controller</span>
              <h3 className="text-lg font-bold text-gray-800 mt-1">
                {clockedIn ? '🟢 ACTIVE IN SHIFT' : '⚪ SHIFT CLOSED'}
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                {attendanceLog?.clock_in_ts 
                  ? `Clocked in: ${new Date(attendanceLog.clock_in_ts).toLocaleTimeString()}`
                  : 'You have not clocked in for today yet.'}
              </p>
            </div>
            
            <div className="flex gap-2 mt-4">
              {!clockedIn ? (
                <button
                  id="clock_in_btn"
                  onClick={handleClockIn}
                  disabled={loading}
                  className="flex-1 py-2.5 px-4 rounded-xl text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 flex items-center justify-center gap-1.5 shadow-sm transition disabled:opacity-50"
                >
                  <Play className="h-4 w-4 fill-white" /> Clock In
                </button>
              ) : (
                <button
                  id="clock_out_btn"
                  onClick={handleClockOut}
                  disabled={loading}
                  className="flex-1 py-2.5 px-4 rounded-xl text-xs font-semibold text-white bg-red-600 hover:bg-red-700 flex items-center justify-center gap-1.5 shadow-sm transition disabled:opacity-50"
                >
                  <Square className="h-4 w-4 fill-white" /> Clock Out
                </button>
              )}

              {clockedIn && (
                <button
                  id="break_btn"
                  onClick={handleLogBreak}
                  disabled={loading}
                  className={`py-2.5 px-4 rounded-xl text-xs font-semibold flex items-center justify-center gap-1 transition ${
                    onBreak ? 'bg-amber-100 text-amber-800 border border-amber-300' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                  title={onBreak ? 'End Break' : 'Start Break'}
                >
                  <Coffee className="h-4 w-4" /> {onBreak ? 'End Break' : 'Start Break'}
                </button>
              )}
            </div>
          </div>

          {/* Time System Card */}
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Time on System</span>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-3xl font-bold tracking-tight text-gray-900">{liveActiveHrs}</span>
              <span className="text-sm font-medium text-gray-500">Hours Active</span>
            </div>
            
            <div className="mt-4 space-y-2">
              <div className="flex justify-between text-xs text-gray-500">
                <span>Active ({liveActiveHrs}h) vs Logged ({loggedHrs}h)</span>
                <span>Target: 8h</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full transition-all ${liveActiveHrs >= 8 ? 'bg-emerald-500' : 'bg-amber-500'}`}
                  style={{ width: `${Math.min(100, (liveActiveHrs / 8) * 100)}%` }}
                ></div>
              </div>
            </div>
          </div>

          {/* Reconciliation Audit */}
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Reconciliation Status</span>
              {hasGap ? (
                <div className="mt-2 flex items-start gap-2 text-amber-700 bg-amber-50 p-3 rounded-xl border border-amber-100">
                  <AlertTriangle className="h-5 w-5 shrink-0 text-amber-500" />
                  <div className="text-xs">
                    <p className="font-bold">Timesheet Discrepancy</p>
                    <p className="text-gray-600 mt-0.5">There are {(gapMinutes/60).toFixed(1)} hrs active but unaccounted in your daily task log.</p>
                  </div>
                </div>
              ) : (
                <div className="mt-2 flex items-start gap-2 text-emerald-800 bg-emerald-50 p-3 rounded-xl border border-emerald-100">
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
                  <div className="text-xs">
                    <p className="font-bold">Perfect Reconciliation</p>
                    <p className="text-gray-600 mt-0.5">Your active system time aligns beautifully with task logs.</p>
                  </div>
                </div>
              )}
            </div>
            {attendanceLog && (
              <div className="text-[11px] text-gray-400 font-mono mt-2">
                Device: {attendanceLog.device.substring(0, 30)}... | IP: {attendanceLog.ip}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 3. Task Input & Log Board */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left column: Add Task Form */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold font-display text-gray-900">Log Daily Task</h3>
              {!isLocked && (
                <button
                  type="button"
                  onClick={handleCopyYesterday}
                  disabled={loading}
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-500 flex items-center gap-1 bg-indigo-50 px-2 py-1 rounded disabled:opacity-50"
                >
                  <Copy className="h-3 w-3" /> Copy Yesterday
                </button>
              )}
            </div>

            {isLocked ? (
              <div className="p-4 bg-gray-50 border border-gray-100 rounded-xl text-center text-gray-500 text-sm">
                🔒 Timesheet is <strong>approved and locked</strong>. No further changes allowed.
              </div>
            ) : (
              <div className="space-y-4">
                {sheetStatus === 'submitted' && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-start gap-2">
                    <span>⏱️</span>
                    <span><strong>Awaiting approval</strong> — You can still add more tasks. Adding a new task will reset this timesheet to draft and require re-submission.</span>
                  </div>
                )}
                {sheetStatus === 'rejected' && approverComment && (
                  <div id="rejected_comment_banner" className="p-4 bg-red-50 text-red-800 text-xs rounded-xl border border-red-200">
                    <p className="font-bold">❌ Revision Required by Approver:</p>
                    <p className="mt-1 italic">"{approverComment}"</p>
                  </div>
                )}

                {/* Quick Add Section */}
                {recentTasks.length > 0 && (
                  <div className="p-3 bg-indigo-50/40 rounded-xl border border-indigo-100/50">
                    <label className="block text-[11px] font-bold text-indigo-700 uppercase tracking-wider mb-2">Quick add from recent</label>
                    <div className="flex flex-wrap gap-1.5">
                      {recentTasks.map((rt) => (
                        <button
                          key={rt.id}
                          type="button"
                          onClick={() => {
                            setSelectedTask(rt.task);
                            setSelectedBrand(rt.brand);
                            setDurationMin(rt.duration_min);
                            if (rt.linked_kpi_metric_id) {
                              setLinkedKpiMetricId(rt.linked_kpi_metric_id);
                            } else {
                              setLinkedKpiMetricId('');
                            }
                          }}
                          className="px-2.5 py-1 bg-white hover:bg-indigo-100 text-indigo-800 text-[11px] font-semibold rounded-lg transition border border-indigo-200/50 text-left max-w-full truncate shadow-sm shrink-0"
                          title={`Task: ${rt.task} | Brand: ${rt.brand} | Duration: ${rt.duration_min}m`}
                        >
                          <span className="font-extrabold text-[9px] text-indigo-600 mr-1">[{rt.brand}]</span>
                          {rt.task.substring(0, 30)}{rt.task.length > 30 ? '...' : ''} ({rt.duration_min}m)
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <form onSubmit={handleAddTask} className="space-y-4">
                  
                  {/* Brand Selector */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Brand focus</label>
                    <div className="grid grid-cols-4 gap-1.5">
                      {(['GT', 'HH', 'ACR', 'Internal'] as const).map(brand => (
                        <button
                          key={brand}
                          type="button"
                          onClick={() => setSelectedBrand(brand)}
                          className={`py-1.5 rounded-lg text-xs font-semibold border transition ${
                            selectedBrand === brand 
                              ? brand === 'GT' ? 'bg-[#C8102E] text-white border-[#C8102E]'
                                : brand === 'HH' ? 'bg-[#003189] text-white border-[#003189]'
                                : brand === 'ACR' ? 'bg-[#1A6B3A] text-white border-[#1A6B3A]'
                                : 'bg-gray-800 text-white border-gray-800'
                              : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                          }`}
                        >
                          {brand}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Task Dropdown */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Core Task Category</label>
                    <select
                      value={selectedTask}
                      onChange={(e) => setSelectedTask(e.target.value)}
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none font-medium"
                    >
                      <option value="">-- Select core task --</option>
                      {taskLibrary.map((item) => (
                        <option key={item.id} value={item.task_name}>{item.task_name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Linked KPI Dropdown */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Linked KPI Metric (Optional)</label>
                    <select
                      value={linkedKpiMetricId}
                      onChange={(e) => setLinkedKpiMetricId(e.target.value)}
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none font-medium text-gray-700"
                    >
                      <option value="">-- None (No KPI link) --</option>
                      {kpiMetrics.map((m) => (
                        <option key={m.id} value={m.id}>
                          [{m.category}] {m.name} ({m.weight}%)
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Interactive Checkpoints */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Checkpoints Checklist</label>
                    <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl max-h-36 overflow-y-auto space-y-2">
                      {activeCheckpoints.map((cp: string, idx: number) => (
                        <label key={idx} className="flex items-start gap-2 cursor-pointer text-xs text-gray-700 hover:text-gray-900">
                          <input
                            type="checkbox"
                            checked={!!checkpoints[cp]}
                            onChange={() => handleToggleCheckpoint(cp)}
                            className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500"
                          />
                          <span>{cp}</span>
                        </label>
                      ))}
                      {activeCheckpoints.length === 0 && (
                        <p className="text-gray-400 italic text-center text-xs">No template mapped for this selection.</p>
                      )}
                    </div>
                  </div>

                  {/* Subtask Details */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Subtask / Action description</label>
                    <input
                      type="text"
                      required
                      value={selectedSubtask}
                      onChange={(e) => setSelectedSubtask(e.target.value)}
                      placeholder="e.g. Published blog with optimized H2 headings..."
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>

                  {/* Duration */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Duration Spent</label>
                    <p className="text-[10px] text-gray-400 mb-1.5">Pick a quick option below, or enter an exact custom duration</p>
                    <div className="flex gap-1.5 mb-2 overflow-x-auto pb-1">
                      {durationChips.map(chip => (
                        <button
                          key={chip}
                          type="button"
                          onClick={() => setDurationMin(chip)}
                          className={`px-2.5 py-1 text-xs font-medium rounded-lg border shrink-0 transition ${
                            durationMin === chip
                              ? 'bg-indigo-600 text-white border-indigo-600'
                              : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                          }`}
                        >
                          {chip}m
                        </button>
                      ))}
                    </div>
                    <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Or enter custom duration (minutes)</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="5"
                        max="480"
                        value={durationMin}
                        onChange={(e) => setDurationMin(Number(e.target.value))}
                        className="w-24 px-3 py-1.5 bg-gray-50 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none font-semibold text-center"
                      />
                      <span className="text-xs text-gray-500">
                        Allowed range: 5–480 minutes &nbsp;({(durationMin/60).toFixed(1)} hrs)
                      </span>
                    </div>
                  </div>

                  {/* Task Status */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Execution Status</label>
                    <div className="grid grid-cols-5 gap-1">
                      {(['Not started', 'In progress', 'Done', 'Blocked', 'Pending Review'] as const).map(st => (
                        <button
                          key={st}
                          type="button"
                          onClick={() => setStatus(st)}
                          className={`py-1 text-[10px] font-medium rounded-lg border transition ${
                            status === st
                              ? 'bg-indigo-100 text-indigo-700 border-indigo-300'
                              : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                          }`}
                        >
                          {st}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Attachments */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                      Work Attachments <span className="text-gray-400 font-normal normal-case">(screenshots, PDF, video — up to 5 files, 10MB each)</span>
                    </label>

                    {/* Existing attachments (when editing) */}
                    {existingAttachmentUrls.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-2">
                        {existingAttachmentUrls.map((url, i) => (
                          <div key={i} className="relative">
                            {url.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                              <img src={url} alt="existing" className="h-14 w-20 object-cover rounded-lg border border-gray-200" />
                            ) : (
                              <div className="h-14 w-20 bg-gray-100 rounded-lg flex items-center justify-center border border-gray-200">
                                <Paperclip className="h-4 w-4 text-gray-400" />
                              </div>
                            )}
                            <button type="button" onClick={() => handleRemoveExistingUrl(i)}
                              className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full p-0.5 hover:bg-red-600 transition">
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Newly selected files */}
                    {attachedFiles.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-2">
                        {attachedFiles.map((file, i) => (
                          <div key={i} className="relative">
                            {attachedPreviews[i] ? (
                              <img src={attachedPreviews[i]!} alt="preview" className="h-14 w-20 object-cover rounded-lg border border-indigo-200" />
                            ) : (
                              <div className="h-14 w-20 bg-indigo-50 rounded-lg flex items-center justify-center border border-indigo-200">
                                <Paperclip className="h-4 w-4 text-indigo-400" />
                              </div>
                            )}
                            <button type="button" onClick={() => handleRemoveNewFile(i)}
                              className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full p-0.5 hover:bg-red-600 transition">
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {(existingAttachmentUrls.length + attachedFiles.length) < 5 && (
                      <label className="flex items-center gap-2 w-full px-3 py-2.5 bg-gray-50 border border-dashed border-gray-300 rounded-xl text-sm text-gray-500 cursor-pointer hover:border-indigo-400 hover:bg-indigo-50 transition">
                        <Paperclip className="h-4 w-4 text-gray-400" />
                        <span>Click to attach {attachedFiles.length + existingAttachmentUrls.length > 0 ? 'another' : 'a'} file</span>
                        <input
                          type="file"
                          accept="image/*,application/pdf,video/mp4"
                          onChange={handleFileSelect}
                          className="hidden"
                        />
                      </label>
                    )}

                    {/* External URL fallback */}
                    <input
                      type="url"
                      value={outputUrl}
                      onChange={(e) => setOutputUrl(e.target.value)}
                      placeholder="Or paste an external link (optional)"
                      className="mt-2 w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>

                  {/* Notes */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Execution Notes</label>
                    <textarea
                      rows={2}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Key observations or tools used..."
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>

                  <div className="flex gap-2">
                    {editingTaskId && (
                      <button
                        type="button"
                        onClick={handleCancelEdit}
                        className="px-4 py-2.5 rounded-xl text-sm font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 transition"
                      >
                        Cancel
                      </button>
                    )}
                    <button
                      type="submit"
                      disabled={loading || uploadingFile}
                      className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 flex items-center justify-center gap-1 transition shadow-sm disabled:opacity-50"
                    >
                      {uploadingFile ? 'Uploading file...' : loading ? (editingTaskId ? 'Updating...' : 'Logging...') : editingTaskId ? (<><Pencil className="h-4 w-4" /> Update Task</>) : (<><Plus className="h-4 w-4" /> Log Task</>)}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>

        {/* Right column: Logged Tasks list for the Day */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-lg font-bold font-display text-gray-900">Task Log Summary</h3>
                <p className="text-xs text-gray-400 mt-0.5">{selectedDate === todayStr ? 'Today' : selectedDate} log history</p>
              </div>
              <div className="text-right">
                <span className="text-xs font-semibold uppercase text-gray-400">Total Logged</span>
                <p className="text-xl font-bold text-gray-800">{loggedHrs} / 8.0 <span className="text-xs text-gray-400">hrs</span></p>
              </div>
            </div>

            {/* ── SECTION 1: Task Log Summary (Draft tasks — editable) ── */}
            {tasks.length === 0 ? (
              <div className="p-8 text-center bg-gray-50 border border-dashed border-gray-200 rounded-2xl">
                <Clock className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm font-medium text-gray-500">No tasks logged on this date yet.</p>
                <p className="text-xs text-gray-400 mt-1">Use the form on the left to log your first task.</p>
              </div>
            ) : (
              <>
                {draftTasks.length > 0 ? (
                  <div className="space-y-3">
                    {draftTasks.map((t: any) => renderTaskCard(t, true))}
                  </div>
                ) : !isLocked && (
                  <div className="p-4 text-center bg-gray-50/60 border border-dashed border-gray-200 rounded-xl">
                    <p className="text-xs text-gray-400">All tasks submitted. Add a new task above to log more hours.</p>
                  </div>
                )}

                {/* ── Submit Timesheet button ── */}
                {!isLocked && (
                  <div className="mt-5 pt-5 border-t border-gray-100 flex flex-col md:flex-row justify-between items-center gap-3 bg-indigo-50/50 p-4 rounded-xl border border-indigo-100">
                    <div className="text-center md:text-left">
                      <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Timesheet Submission</span>
                      <div className="flex items-center gap-2 mt-1 justify-center md:justify-start">
                        {sheetStatus === 'draft' && <span className="text-sm font-bold text-gray-700">Draft ready — submit when done</span>}
                        {sheetStatus === 'submitted' && <span className="text-sm font-bold text-amber-700 flex items-center gap-1">⏱️ Awaiting Admin Approval</span>}
                        {sheetStatus === 'rejected' && <span className="text-sm font-bold text-red-700 flex items-center gap-1">❌ Rejected — revise and resubmit</span>}
                      </div>
                      {sheetStatus === 'draft' && hasGap && (
                        <p className="text-xs text-amber-600 mt-1">⚠️ You have unaccounted hours vs shift clock.</p>
                      )}
                    </div>
                    {draftTasks.length > 0 && (
                      <button
                        id="submit_timesheet_btn"
                        onClick={handleSubmitTimesheet}
                        disabled={loading}
                        className="py-2 px-6 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 shadow transition w-full md:w-auto disabled:opacity-50"
                      >
                        {loading ? 'Submitting...' : 'Submit Timesheet'}
                      </button>
                    )}
                  </div>
                )}

                {isLocked && (
                  <div className="mt-5 pt-5 border-t border-gray-100 p-4 bg-emerald-50 rounded-xl border border-emerald-100 text-center">
                    <span className="text-sm font-bold text-emerald-800">🟢 Approved & Locked</span>
                  </div>
                )}

                {/* ── SECTION 2: Tasks Submitted for Review (locked, collapsible) ── */}
                {submittedTasks.length > 0 && (
                  <div className="mt-6 space-y-3">
                    <button
                      onClick={() => setShowSubmitted(s => !s)}
                      className="w-full flex items-center justify-between text-[11px] font-bold text-amber-700 uppercase tracking-wider pt-2 border-t-2 border-amber-100 hover:text-amber-900 transition pb-1"
                    >
                      <span className="flex items-center gap-1.5">
                        🔒 Tasks Submitted for Review ({submittedTasks.length})
                      </span>
                      <span className="text-amber-400 text-xs">{showSubmitted ? '▲ Collapse' : '▼ Expand'}</span>
                    </button>
                    {showSubmitted && (
                      <div className="space-y-3">
                        {submittedTasks.map((t: any) => renderTaskCard(t, false))}
                      </div>
                    )}
                  </div>
                )}

                {/* ── SECTION 3: Approved Tasks (collapsed by default) ── */}
                {approvedTasks.length > 0 && (
                  <div className="mt-6 space-y-3">
                    <button
                      onClick={() => setShowApproved(s => !s)}
                      className="w-full flex items-center justify-between text-[11px] font-bold text-emerald-700 uppercase tracking-wider pt-2 border-t-2 border-emerald-100 hover:text-emerald-900 transition pb-1"
                    >
                      <span className="flex items-center gap-1.5">
                        ✅ Approved Today ({approvedTasks.length})
                      </span>
                      <span className="text-emerald-400 text-xs">{showApproved ? '▲ Collapse' : '▼ Expand'}</span>
                    </button>
                    {showApproved && (
                      <div className="space-y-3">
                        {approvedTasks.map((t: any) => renderTaskCard(t, false))}
                      </div>
                    )}
                  </div>
                )}

              </>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
