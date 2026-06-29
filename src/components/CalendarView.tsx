/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { enrichCalendarEvent } from '../lib/calendarEventUtils';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalIcon, 
  FileCheck2, 
  MapPin, 
  Palmtree, 
  UserPlus2, 
  CheckCircle2
} from 'lucide-react';

interface CalendarViewProps {
  token: string;
  user: any;
}

export default function CalendarView({ token, user }: CalendarViewProps) {
  const currentMonthStr = new Date().toISOString().substring(0, 7); // YYYY-MM
  const [selectedMonth, setSelectedMonth] = useState(currentMonthStr);
  const [events, setEvents] = useState<any[]>([]);
  const [teamUsers, setTeamUsers] = useState<any[]>([]);
  const [selectedUserId, setSelectedUserId] = useState(user.id);

  // States for adding event (Admin Only)
  const [newEventUser, setNewEventUser] = useState('all');
  const [newEventDate, setNewEventDate] = useState('');
  const [newEventType, setNewEventType] = useState<'task' | 'deadline' | 'holiday'>('deadline');
  const [newEventTitle, setNewEventTitle] = useState('');

  // States for logging leave (All Users)
  const [leaveDate, setLeaveDate] = useState('');
  const [leaveReason, setLeaveReason] = useState('');

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
    fetchEvents();
    if (user.role === 'admin') {
      fetchTeamUsers();
    }
  }, [selectedMonth, selectedUserId]);

  const fetchEvents = async () => {
    try {
      const res = await fetch(`/api/calendar/events?month=${selectedMonth}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await safeParseJson(res);
      if (res.ok) {
        const enrichedEvents = Array.isArray(data)
          ? data.map((event: any) => enrichCalendarEvent(event, teamUsers))
          : [];
        setEvents(enrichedEvents);
      }
    } catch (err) {
      console.error(err);
    }
  };

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

  const handleAddEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!newEventDate || !newEventTitle) {
      setError('Missing event date or title');
      return;
    }

    try {
      const res = await fetch('/api/calendar/event', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          user_id: newEventUser,
          date: newEventDate,
          type: newEventType,
          title: newEventTitle
        })
      });

      const data = await safeParseJson(res);
      if (!res.ok) throw new Error(data.error);

      setSuccess('Event mapped successfully!');
      setNewEventTitle('');
      setNewEventDate('');
      fetchEvents();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleLogLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!leaveDate) {
      setError('Leave date is required');
      return;
    }

    try {
      const res = await fetch('/api/calendar/leave', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          date: leaveDate,
          reason: leaveReason,
          applicantName: user.name
        })
      });

      const data = await safeParseJson(res);
      if (!res.ok) throw new Error(data.error);

      setSuccess('Planned leave logged successfully!');
      setLeaveDate('');
      setLeaveReason('');
      fetchEvents();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Build grid calendar helpers
  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month, 1).getDay(); // Sunday is 0
  };

  const [yearStr, monthStr] = selectedMonth.split('-');
  const yearNum = parseInt(yearStr);
  const monthNum = parseInt(monthStr) - 1; // 0-indexed

  const daysInMonth = getDaysInMonth(yearNum, monthNum);
  const firstDayIndex = getFirstDayOfMonth(yearNum, monthNum);

  const calendarGridCells: (number | null)[] = [];
  // Empty slots for preceding days
  for (let i = 0; i < firstDayIndex; i++) {
    calendarGridCells.push(null);
  }
  // Days of the month
  for (let d = 1; d <= daysInMonth; d++) {
    calendarGridCells.push(d);
  }

  const handleMonthPrev = () => {
    const d = new Date(yearNum, monthNum - 1, 1);
    setSelectedMonth(d.toISOString().substring(0, 7));
  };

  const handleMonthNext = () => {
    const d = new Date(yearNum, monthNum + 1, 1);
    setSelectedMonth(d.toISOString().substring(0, 7));
  };

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  return (
    <div id="calendar_view_container" className="grid grid-cols-1 lg:grid-cols-3 gap-6 font-sans">
      
      {/* Grid: 2 columns for actual Calendar, 1 column for Forms/Logs */}
      <div className="lg:col-span-2 space-y-6">
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          
          {/* Month Selector bar */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold font-display text-gray-900">
                {monthNames[monthNum]} {yearNum}
              </h2>
              <p className="text-xs text-gray-500">View tasks, leaves, and corporate holidays</p>
            </div>
            <div className="flex items-center gap-1">
              <button 
                onClick={handleMonthPrev}
                className="p-2 hover:bg-gray-100 rounded-lg transition text-gray-600"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button 
                onClick={handleMonthNext}
                className="p-2 hover:bg-gray-100 rounded-lg transition text-gray-600"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Weekdays headers */}
          <div className="grid grid-cols-7 text-center text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
            <span>Sun</span>
            <span>Mon</span>
            <span>Tue</span>
            <span>Wed</span>
            <span>Thu</span>
            <span>Fri</span>
            <span>Sat</span>
          </div>

          {/* Calendar Grid cells */}
          <div className="grid grid-cols-7 gap-1.5">
            {calendarGridCells.map((dayNum, cellIdx) => {
              if (dayNum === null) {
                return <div key={`empty-${cellIdx}`} className="aspect-square bg-gray-50/50 rounded-xl"></div>;
              }

              const formattedDayStr = dayNum.toString().padStart(2, '0');
              const cellDateStr = `${selectedMonth}-${formattedDayStr}`;

              // Find events on this specific date
              const dayEvents = events.filter(e => e.date === cellDateStr);

              return (
                <div 
                  key={`day-${dayNum}`}
                  className="aspect-square p-2 bg-gray-50 border border-gray-100 rounded-xl flex flex-col justify-between overflow-hidden relative group hover:bg-white hover:shadow-sm transition"
                >
                  <span className="text-xs font-bold text-gray-700 font-mono">{dayNum}</span>
                  
                  {/* Miniature event indicator */}
                  <div className="space-y-1 overflow-hidden mt-1">
                    {dayEvents.map(e => {
                      let color = 'bg-blue-500';
                      if (e.type === 'leave') color = 'bg-amber-500';
                      else if (e.type === 'holiday') color = 'bg-emerald-500';
                      else if (e.type === 'deadline') color = 'bg-red-500';

                      return (
                        <div 
                          key={e.id}
                          className={`h-1.5 w-1.5 rounded-full ${color}`}
                          title={`${e.type.toUpperCase()}: ${e.title}`}
                        ></div>
                      );
                    })}
                  </div>

                  {/* Tooltip on hover */}
                  {dayEvents.length > 0 && (
                    <div className="hidden group-hover:block absolute bottom-8 left-2 right-2 bg-gray-900 text-white text-[10px] p-2 rounded-lg shadow-xl z-10 max-h-24 overflow-y-auto">
                      {dayEvents.map(e => (
                        <p key={e.id} className="truncate">• {e.title}</p>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Color Guides */}
          <div className="mt-6 pt-4 border-t border-gray-100 flex flex-wrap gap-4 text-xs text-gray-500 justify-center">
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-red-500"></span> Deadlines</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-blue-500"></span> General Tasks</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-amber-500"></span> Planned Leaves</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-500"></span> Public Holidays</span>
          </div>

        </div>

        {/* Detailed Events log ledger */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <h3 className="text-base font-bold font-display text-gray-800 mb-4">Detailed Events Ledger</h3>
          <div className="space-y-3">
            {events.length === 0 ? (
              <p className="text-xs text-gray-400 italic text-center py-4">No events scheduled this month.</p>
            ) : (
              events.map(e => (
                <div key={e.id} className="p-3 bg-gray-50 rounded-xl border border-gray-100 flex justify-between items-center text-xs">
                  <div>
                    <p className="font-semibold text-gray-900">{e.title}</p>
                    <p className="text-gray-400 font-mono mt-0.5">{e.date}</p>
                    {e.type === 'leave' && e.submitted_by_name && (
                      <p className="text-[11px] text-amber-700 font-semibold mt-1">Applied by: {e.submitted_by_name}</p>
                    )}
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                    e.type === 'deadline' ? 'bg-red-50 text-red-700'
                    : e.type === 'leave' ? 'bg-amber-50 text-amber-700'
                    : 'bg-indigo-50 text-indigo-700'
                  }`}>
                    {e.type}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* Right Column: Dynamic Action Card panels based on role */}
      <div className="space-y-6">
        
        {/* Error/Success Feedbacks */}
        {error && <div className="p-4 bg-red-50 text-red-700 text-xs rounded-xl border border-red-100">{error}</div>}
        {success && <div className="p-4 bg-emerald-50 text-emerald-800 text-xs rounded-xl border border-emerald-100">{success}</div>}

        {/* Action Panel A: Log planned leave */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <h3 className="text-base font-bold font-display text-gray-900 mb-1">Log Planned Leave</h3>
          <p className="text-xs text-gray-500 mb-4">Leave days exclude timesheet targets from metrics</p>
          
          <form onSubmit={handleLogLeave} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Leave Date</label>
              <input
                type="date"
                required
                value={leaveDate}
                onChange={(e) => setLeaveDate(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Reason / Justification</label>
              <input
                type="text"
                value={leaveReason}
                onChange={(e) => setLeaveReason(e.target.value)}
                placeholder="Personal, Casual, Medical leave etc."
                className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
            <button
              type="submit"
              className="w-full py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-semibold shadow"
            >
              Log Planned Leave
            </button>
          </form>
        </div>

        {/* Action Panel B: Admin-Only Event Mapping tool */}
        {user.role === 'admin' && (
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
            <h3 className="text-base font-bold font-display text-gray-900 mb-1">Admin: Assign Event / Deadline</h3>
            <p className="text-xs text-gray-500 mb-4">Inject custom tasks directly into calendars</p>
            
            <form onSubmit={handleAddEvent} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Assign User</label>
                <select
                  value={newEventUser}
                  onChange={(e) => setNewEventUser(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  <option value="all">Broadcast All / Corporate</option>
                  {teamUsers.map(u => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Event Type</label>
                <div className="grid grid-cols-3 gap-1">
                  {(['task', 'deadline', 'holiday'] as const).map(t => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setNewEventType(t)}
                      className={`py-1 rounded text-[10px] font-bold uppercase ${
                        newEventType === t 
                          ? 'bg-indigo-600 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Target Date</label>
                <input
                  type="date"
                  required
                  value={newEventDate}
                  onChange={(e) => setNewEventDate(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Event / Task Title</label>
                <input
                  type="text"
                  required
                  value={newEventTitle}
                  onChange={(e) => setNewEventTitle(e.target.value)}
                  placeholder="e.g. Monthly SEO reports consolidation due"
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow"
              >
                Inject Calendar Task
              </button>
            </form>
          </div>
        )}

      </div>

    </div>
  );
}
