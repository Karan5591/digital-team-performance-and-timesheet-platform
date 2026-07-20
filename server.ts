/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import crypto from 'crypto';
import fs from 'fs/promises';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import multer from 'multer';
import prisma from './src/lib/prisma.ts';
import {
  User,
  AttendanceLog,
  TaskEntry,
  TaskLibraryItem,
  KPIMetric,
  KPIEntry,
  KPIScore,
  CalendarEvent,
  IncentivePool,
  Notification
} from './src/types';

const app = express();
const PORT = 3000;
const taskLibraryPath = path.join(process.cwd(), 'data', 'taskLibrary.json');
let taskLibrary: TaskLibraryItem[] = [];
const ROLE_CACHE = new Map<string, string>();

// Multer setup — saves files to /uploads folder
const uploadDir = path.join(process.cwd(), 'uploads');
fs.mkdir(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const unique = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`;
    cb(null, unique);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf', 'video/mp4'];
    allowed.includes(file.mimetype) ? cb(null, true) : cb(new Error('File type not allowed'));
  }
});

app.use(express.json());
app.use('/uploads', express.static(uploadDir));

function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

function normalizeEmpCode(empCode: string): string {
  return empCode.trim().toLowerCase();
}

function formatDate(value: Date | string | null | undefined) {
  if (!value) return '';
  const date = typeof value === 'string' ? new Date(value) : value;
  return date.toISOString().split('T')[0];
}

function mapUser(user: any): User {
  return {
    id: user.id,
    name: user.name,
    emp_code: user.empCode,
    email: user.email,
    password_hash: user.passwordHash,
    role: user.role?.name === 'admin' ? 'admin' : 'member',
    designation: user.designation,
    brand_focus: user.brandFocus,
    doj: formatDate(user.doj),
    status: user.status === 'INACTIVE' ? 'inactive' : 'active',
    must_reset_password: user.mustResetPassword ?? false
  };
}

function mapAttendanceLog(log: any): AttendanceLog {
  return {
    id: log.id,
    user_id: log.userId,
    date: formatDate(log.date),
    clock_in_ts: log.clockIn ? new Date(log.clockIn).toISOString() : '',
    clock_out_ts: log.clockOut ? new Date(log.clockOut).toISOString() : null,
    break_start_ts: log.breakStartTs ? new Date(log.breakStartTs).toISOString() : null,
    break_minutes: log.breakMinutes,
    active_minutes: log.activeMinutes,
    on_break: log.onBreak,
    device: log.device,
    ip: log.ip,
    status: log.clockOut ? 'closed' : 'open'
  };
}

function mapTaskEntry(entry: any): TaskEntry {
  return {
    id: entry.id,
    user_id: entry.userId,
    date: formatDate(entry.date),
    task: entry.task,
    subtask: entry.subTask || '',
    brand: entry.brand,
    duration_min: entry.durationMinutes,
    status: (entry.status || 'pending').toLowerCase() as TaskEntry['status'],
    notes: entry.notes,
    output_url: entry.outputUrl || null,
    linked_kpi_metric_id: entry.linkedKpiMetricId || null,
    linked_kpi_metric_name: entry.linkedKpiMetricName || null,
    submitted: entry.submitted ?? false,
    admin_assigned: entry.adminAssigned ?? false,
    approver_comment: entry.approverComment || null,
    approved_at: entry.approvedAt ? new Date(entry.approvedAt).toISOString() : null
  };
}

function mapTimesheetDay(sheet: any) {
  return {
    id: sheet.id,
    user_id: sheet.userId,
    date: formatDate(sheet.date),
    total_logged_min: sheet.totalLoggedMinutes,
    status: sheet.status?.toLowerCase(),
    approver_id: sheet.approverId || null,
    approver_comment: sheet.approverComment || null,
    submitted_at: sheet.submittedAt ? new Date(sheet.submittedAt).toISOString() : undefined,
    approved_at: sheet.approvedAt ? new Date(sheet.approvedAt).toISOString() : undefined
  };
}

function mapNotification(notification: any) {
  const type = (() => {
    const text = notification.message?.toString().toLowerCase() || '';
    if (text.includes('submitted timesheet')) return 'timesheet_submission';
    if (text.includes('has been approved')) return 'timesheet_approved';
    if (text.includes('was rejected')) return 'timesheet_rejected';
    if (text.includes('assigned a new')) return 'calendar_assignment';
    if (text.includes('planned leave')) return 'leave_logged';
    return notification.type?.toString().toLowerCase() || 'info';
  })();
  const createdAt = notification.createdAt || notification.created_at;
  const createdTs = createdAt ? new Date(createdAt).toISOString() : new Date().toISOString();

  return {
    ...notification,
    type,
    read: notification.isRead,
    created_ts: createdTs,
    time: (() => {
      try {
        return new Date(createdTs).toLocaleDateString() + ' ' + new Date(createdTs).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      } catch {
        return 'Just now';
      }
    })()
  };
}

function computeActiveMinutes(clockIn: string, clockOut: string, breakMinutes: number) {
  const inTs = new Date(clockIn).getTime();
  const outTs = new Date(clockOut).getTime();
  return Math.max(0, Math.floor((outTs - inTs) / 60000) - (breakMinutes || 0));
}

async function ensureRoleId(roleName: string) {
  const normalizedRole = (roleName || 'member').trim();
  if (ROLE_CACHE.has(normalizedRole)) {
    return ROLE_CACHE.get(normalizedRole)!;
  }
  let role = await prisma.role.findUnique({ where: { name: normalizedRole } });
  if (!role) {
    role = await prisma.role.create({ data: { name: normalizedRole } });
  }
  ROLE_CACHE.set(normalizedRole, role.id);
  return role.id;
}

async function loadTaskLibrary() {
  try {
    const raw = await fs.readFile(taskLibraryPath, 'utf-8');
    const parsed = JSON.parse(raw);
    taskLibrary = Array.isArray(parsed) ? parsed : (parsed.taskLibrary || []);
  } catch (error) {
    console.warn(`Unable to load task library from ${taskLibraryPath}:`, error);
    taskLibrary = [];
  }
}

async function authenticateToken(req: express.Request, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    res.status(401).json({ error: 'Authorization header required' });
    return;
  }

  const userId = SESSIONS.get(token);
  if (!userId) {
    res.status(403).json({ error: 'Session expired or invalid' });
    return;
  }

  const user = await prisma.user.findUnique({ where: { id: userId }, include: { role: true } });
  if (!user || user.status === 'INACTIVE') {
    res.status(403).json({ error: 'User is inactive or deleted' });
    return;
  }

  (req as any).user = mapUser(user);
  next();
}

function requireAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
  const user = (req as any).user as User;
  if (!user || user.role !== 'admin') {
    res.status(403).json({ error: 'Admin access required' });
    return;
  }
  next();
}

const SESSIONS = new Map<string, string>();

// ----------------------------------------------------------------------------
// API Endpoints
// ----------------------------------------------------------------------------

app.post('/api/auth/login', async (req, res) => {
  const { empId, password } = req.body;
  if (!empId || !password) {
    res.status(400).json({ error: 'Employee ID and password required' });
    return;
  }

  const user = await prisma.user.findUnique({
    where: { empCode: normalizeEmpCode(empId) },
    include: { role: true }
  });

  if (!user) {
    res.status(401).json({ error: 'Invalid Employee ID or password' });
    return;
  }

  const isCorrect = user.passwordHash === password || user.passwordHash === hashPassword(password);
  if (!isCorrect) {
    res.status(401).json({ error: 'Invalid empId or password' });
    return;
  }

  if (user.status === 'INACTIVE') {
    res.status(403).json({ error: 'This account has been disabled' });
    return;
  }

  const token = crypto.randomBytes(32).toString('hex');
  SESSIONS.set(token, user.id);

  res.json({ token, user: mapUser(user) });
});

app.post('/api/auth/reset-password', authenticateToken, async (req, res) => {
  const { newPassword } = req.body;
  const userReq = (req as any).user as User;

  if (!newPassword || newPassword.length < 6) {
    res.status(400).json({ error: 'Password must be at least 6 characters' });
    return;
  }

  const updatedUser = await prisma.user.update({
    where: { id: userReq.id },
    data: {
      passwordHash: hashPassword(newPassword),
      mustResetPassword: false
    }
  });

  if (!updatedUser) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  res.json({ success: true, message: 'Password reset successful' });
});

app.post('/api/auth/forgot-password', async (req, res) => {
  const { email } = req.body;
  if (!email) {
    res.status(400).json({ error: 'Email is required' });
    return;
  }

  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (!user) {
    res.status(404).json({ error: 'User not found with this email' });
    return;
  }

  const tempPass = Math.random().toString(36).slice(-8);
  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash: tempPass,
      mustResetPassword: true
    }
  });

  res.json({
    success: true,
    message: `A temporary password reset link has been dispatched to ${email}.`,
    tempPassword: tempPass
  });
});

app.get('/api/users', authenticateToken, async (req, res) => {
  const userReq = (req as any).user as User;
  if (userReq.role === 'admin') {
    const users = await prisma.user.findMany({ include: { role: true } });
    res.json(users.map(mapUser));
  } else {
    res.json([userReq]);
  }
});

app.post('/api/users', authenticateToken, requireAdmin, async (req, res) => {
  const { name, emp_code, email, designation, brand_focus, doj, role } = req.body;
  if (!name || !emp_code || !email || !designation || !brand_focus || !doj) {
    res.status(400).json({ error: 'Missing required user details' });
    return;
  }

  const existing = await prisma.user.findFirst({
    where: {
      OR: [
        { email: email.toLowerCase() },
        { empCode: normalizeEmpCode(emp_code) }
      ]
    }
  });

  if (existing) {
    res.status(400).json({ error: 'User with this email or employee code already exists' });
    return;
  }

  const tempPass = emp_code.toLowerCase();
  const roleId = await ensureRoleId(role || 'member');

  const newUser = await prisma.user.create({
    data: {
      name,
      empCode: normalizeEmpCode(emp_code),
      email: email.toLowerCase(),
      passwordHash: hashPassword(tempPass),
      roleId,
      designation,
      brandFocus: brand_focus,
      doj: new Date(doj),
      status: 'ACTIVE',
      mustResetPassword: true
    }
  });

  const genericKpis = [
    { name: 'Assigned Project Execution %', category: 'Role', weight: 40, target: 100, lower_is_better: false, is_percentage: true },
    { name: 'Team Alignment & Collaboration', category: 'Role', weight: 30, target: 95, lower_is_better: false, is_percentage: true },
    { name: 'Timesheet & Clock-in Compliance', category: 'Process', weight: 30, target: 100, lower_is_better: false, is_percentage: true }
  ];

  await prisma.kPIMetric.createMany({
    data: genericKpis.map(metric => ({
      userId: newUser.id,
      name: metric.name,
      category: metric.category,
      weight: metric.weight,
      target: metric.target,
      lowerIsBetter: metric.lower_is_better,
      isPercentage: metric.is_percentage
    }))
  });

  res.status(201).json({ success: true, user: mapUser(newUser), tempPassword: tempPass });
});

app.put('/api/users/:id', authenticateToken, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { name, designation, brand_focus, status, role } = req.body;
  const data: any = {};
  if (name !== undefined) data.name = name;
  if (designation !== undefined) data.designation = designation;
  if (brand_focus !== undefined) data.brandFocus = brand_focus;
  if (status !== undefined) data.status = status;
  if (role !== undefined) {
    data.roleId = await ensureRoleId(role);
  }

  try {
    const updated = await prisma.user.update({ where: { id }, data });
    res.json({ success: true, user: mapUser(updated) });
  } catch (error) {
    res.status(404).json({ error: 'User not found' });
  }
});

app.get('/api/attendance/today', authenticateToken, async (req, res) => {
  const user = (req as any).user as User;
  const today = new Date().toISOString().split('T')[0];

  const log = await prisma.attendanceLog.findFirst({
    where: { userId: user.id, date: new Date(today) }
  });

  if (!log) {
    res.json({ clockedIn: false, log: null });
    return;
  }

  res.json({ clockedIn: !!log.clockIn && !log.clockOut, log: mapAttendanceLog(log) });
});

app.post('/api/attendance/clock-in', authenticateToken, async (req, res) => {
  const user = (req as any).user as User;
  const today = new Date().toISOString().split('T')[0];
  const now = new Date().toISOString();

  const existingLog = await prisma.attendanceLog.findFirst({
    where: { userId: user.id, date: new Date(today) }
  });

  if (existingLog && existingLog.clockIn && !existingLog.clockOut) {
    res.status(400).json({ error: 'Already clocked in today' });
    return;
  }

  if (!existingLog) {
    const log = await prisma.attendanceLog.create({
      data: {
        userId: user.id,
        date: new Date(today),
        clockIn: new Date(now),
        device: req.headers['user-agent']?.toString() || 'Unknown Browser',
        ip: req.ip || '127.0.0.1',
        status: 'open'
      }
    });
    res.json({ success: true, log: mapAttendanceLog(log) });
    return;
  }

  const log = await prisma.attendanceLog.update({
    where: { id: existingLog.id },
    data: {
      clockIn: new Date(now),
      clockOut: null,
      breakStartTs: null,
      breakMinutes: 0,
      activeMinutes: 0,
      onBreak: false,
      status: 'open'
    }
  });

  res.json({ success: true, log: mapAttendanceLog(log) });
});

app.post('/api/attendance/clock-out', authenticateToken, async (req, res) => {
  const user = (req as any).user as User;
  const today = new Date().toISOString().split('T')[0];
  const now = new Date().toISOString();

  const log = await prisma.attendanceLog.findFirst({
    where: { userId: user.id, date: new Date(today) }
  });

  if (!log || !log.clockIn) {
    res.status(400).json({ error: 'You are not clocked in today' });
    return;
  }

  const activeMinutes = computeActiveMinutes(log.clockIn.toISOString(), now, log.breakMinutes || 0);
  const updated = await prisma.attendanceLog.update({
    where: { id: log.id },
    data: {
      clockOut: new Date(now),
      onBreak: false,
      status: 'closed',
      activeMinutes: activeMinutes
    }
  });

  res.json({ success: true, log: mapAttendanceLog(updated) });
});

app.post('/api/admin/attendance/force-clock-out', authenticateToken, requireAdmin, async (req, res) => {
  const { userId } = req.body;
  if (!userId) {
    res.status(400).json({ error: 'userId is required' });
    return;
  }

  const today = new Date().toISOString().split('T')[0];
  const now = new Date().toISOString();

  const log = await prisma.attendanceLog.findFirst({
    where: { userId: userId, date: new Date(today) }
  });

  if (!log || !log.clockIn) {
    res.status(404).json({ error: 'No active clock-in found for this user today' });
    return;
  }
  if (log.clockOut) {
    res.status(400).json({ error: 'User is already clocked out' });
    return;
  }

  const activeMinutes = computeActiveMinutes(log.clockIn.toISOString(), now, log.breakMinutes || 0);
  const updated = await prisma.attendanceLog.update({
    where: { id: log.id },
    data: {
      clockOut: new Date(now),
      onBreak: false,
      status: 'auto_closed',
      activeMinutes: activeMinutes
    }
  });

  res.json({ success: true, log: mapAttendanceLog(updated) });
});

app.post('/api/attendance/break-toggle', authenticateToken, async (req, res) => {
  const user = (req as any).user as User;
  const today = new Date().toISOString().split('T')[0];
  const { breakMinutes, isOnBreak } = req.body;
  const now = new Date().toISOString();

  const log = await prisma.attendanceLog.findFirst({
    where: { userId: user.id, date: new Date(today) }
  });

  if (!log) {
    res.status(400).json({ error: 'Not clocked in today' });
    return;
  }

  let shouldStartBreak = log.onBreak;
  let breakStartTs = log.breakStartTs;
  let updatedBreakMinutes = log.breakMinutes || 0;

  if (typeof isOnBreak === 'boolean') {
    shouldStartBreak = isOnBreak;
  } else {
    shouldStartBreak = !log.onBreak;
  }

  if (shouldStartBreak) {
    if (!breakStartTs) {
      breakStartTs = new Date(now);
    }
  } else if (log.onBreak && breakStartTs) {
    const breakStartMs = new Date(breakStartTs).getTime();
    updatedBreakMinutes += Math.max(0, Math.floor((new Date(now).getTime() - breakStartMs) / 60000));
    breakStartTs = null;
  }

  if (Number(breakMinutes) > 0) {
    updatedBreakMinutes += Number(breakMinutes);
  }

  const updated = await prisma.attendanceLog.update({
    where: { id: log.id },
    data: {
      onBreak: shouldStartBreak,
      breakStartTs: breakStartTs ? new Date(breakStartTs) : null,
      breakMinutes: updatedBreakMinutes,
      activeMinutes: log.clockIn && log.clockOut
        ? computeActiveMinutes(log.clockIn.toISOString(), log.clockOut.toISOString(), updatedBreakMinutes)
        : log.activeMinutes
    }
  });

  res.json({ success: true, log: mapAttendanceLog(updated) });
});

app.get('/api/tasks/recent', authenticateToken, async (req, res) => {
  const user = (req as any).user as User;
  const limit = parseInt(req.query.limit as string) || 5;

  const entries = await prisma.taskEntry.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' }
  });

  const uniqueRecent: TaskEntry[] = [];
  const seenTasks = new Set<string>();
  for (const entry of entries) {
    if (!seenTasks.has(entry.task)) {
      seenTasks.add(entry.task);
      uniqueRecent.push(mapTaskEntry(entry));
    }
    if (uniqueRecent.length >= limit) break;
  }

  res.json(uniqueRecent);
});

app.get('/api/kpi/metrics/mine', authenticateToken, async (req, res) => {
  const user = (req as any).user as User;
  const metrics = await prisma.kPIMetric.findMany({ where: { userId: user.id } });
  res.json(metrics);
});

app.get('/api/tasks/library', authenticateToken, async (req, res) => {
  const user = (req as any).user as User;
  const keyword = user.designation.toLowerCase().split(' ')[0];
  const matched = taskLibrary.filter(item =>
    item.role.toLowerCase().includes(keyword) ||
    user.designation.toLowerCase().includes(item.role.toLowerCase())
  );

  if (matched.length > 0) {
    res.json(matched);
  } else {
    const defaultLib = taskLibrary.find(l => l.role === 'Intern') || taskLibrary[0] || [];
    res.json([defaultLib]);
  }
});

app.get('/api/tasks/list', authenticateToken, async (req, res) => {
  const user = (req as any).user as User;
  const { date, from, to } = req.query as { date?: string; from?: string; to?: string };
  const targetDate = date || new Date().toISOString().split('T')[0];

  let targetUserId = user.id;
  if (user.role === 'admin' && req.query.userId) {
    targetUserId = req.query.userId as string;
  }

  const where: any = { userId: targetUserId };
  if (from && to) {
    where.date = { gte: new Date(from), lte: new Date(to) };
  } else {
    where.date = new Date(targetDate);
  }

  const entries = await prisma.taskEntry.findMany({ where });
  res.json(entries.map(mapTaskEntry));
});

app.post('/api/tasks/entry', authenticateToken, async (req, res) => {
  const user = (req as any).user as User;
  const { date, task, subtask, brand, duration_min, status, notes, output_url, linked_kpi_metric_id } = req.body;

  if (!task || !brand || !duration_min) {
    res.status(400).json({ error: 'Missing required task entries' });
    return;
  }

  const targetDate = (date as string) || new Date().toISOString().split('T')[0];

  // Server-side 12h/day cap check
  const existingTasks = await prisma.taskEntry.findMany({ where: { userId: user.id, date: new Date(targetDate) } }) as Array<{ durationMinutes: number }>;
  const currentTotal = existingTasks.reduce((sum, t) => sum + t.durationMinutes, 0);
  if (currentTotal + Number(duration_min) > 720) {
    res.status(400).json({ error: `Daily limit is 12 hours. You can only log ${720 - currentTotal} more minute(s) today.` });
    return;
  }

  const metric = linked_kpi_metric_id ? await prisma.kPIMetric.findUnique({ where: { id: linked_kpi_metric_id } }) : null;
  const linked_kpi_metric_name = metric?.name || null;

  const newEntry = await prisma.taskEntry.create({
    data: {
      userId: user.id,
      date: new Date(targetDate),
      task,
      subTask: subtask || '',
      brand,
      durationMinutes: Number(duration_min),
      status: status || 'pending',
      notes: notes || '',
      outputUrl: output_url || null,
      linkedKpiMetricId: linked_kpi_metric_id || null,
      linkedKpiMetricName: linked_kpi_metric_name,
      submitted: false
    }
  });

  let sheet = await prisma.timesheetDay.findFirst({ where: { userId: user.id, date: new Date(targetDate) } });
  if (!sheet) {
    sheet = await prisma.timesheetDay.create({
      data: {
        userId: user.id,
        date: new Date(targetDate),
        totalLoggedMinutes: Number(duration_min),
        status: 'DRAFT'
      }
    });
  } else {
    if (sheet.status === 'APPROVED') {
      res.status(400).json({ error: 'Timesheet for this day is already approved and locked' });
      return;
    }
    // If submitted, reset back to DRAFT so new task can be added
    const dayTasks = await prisma.taskEntry.findMany({ where: { userId: user.id, date: new Date(targetDate) } }) as Array<{ durationMinutes: number }>;
    const newTotal = dayTasks.reduce((sum, t) => sum + t.durationMinutes, 0) + Number(duration_min);
    sheet = await prisma.timesheetDay.update({
      where: { id: sheet.id },
      data: {
        totalLoggedMinutes: newTotal,
        status: 'DRAFT',
        submittedAt: null
      }
    });
  }

  res.json({ success: true, entry: mapTaskEntry(newEntry), totalLoggedMin: sheet.totalLoggedMinutes });
});

app.put('/api/tasks/entry/:id', authenticateToken, async (req, res) => {
  const user = (req as any).user as User;
  const { id } = req.params;
  const { task, subtask, brand, duration_min, status, notes, output_url, linked_kpi_metric_id } = req.body;

  const existing = await prisma.taskEntry.findUnique({ where: { id } });
  if (!existing || existing.userId !== user.id) {
    res.status(404).json({ error: 'Task entry not found' });
    return;
  }

  const sheet = await prisma.timesheetDay.findFirst({ where: { userId: user.id, date: existing.date } });
  if (sheet && sheet.status === 'APPROVED') {
    res.status(400).json({ error: 'Timesheet for this day is already approved and locked. Cannot edit.' });
    return;
  }

  // Server-side 12h/day cap check (excluding this task's current duration)
  const dayTasks = await prisma.taskEntry.findMany({ where: { userId: user.id, date: existing.date } }) as Array<{ id: string; durationMinutes: number }>;
  const otherTotal = dayTasks.filter(t => t.id !== id).reduce((sum, t) => sum + t.durationMinutes, 0);
  if (otherTotal + Number(duration_min) > 720) {
    res.status(400).json({ error: `Daily limit is 12 hours. You can only set up to ${720 - otherTotal} minute(s) for this task.` });
    return;
  }

  const metric = linked_kpi_metric_id ? await prisma.kPIMetric.findUnique({ where: { id: linked_kpi_metric_id } }) : null;
  const linked_kpi_metric_name = metric?.name || null;

  const updatedEntry = await prisma.taskEntry.update({
    where: { id },
    data: {
      task: task ?? existing.task,
      subTask: subtask ?? existing.subTask,
      brand: brand ?? existing.brand,
      durationMinutes: duration_min !== undefined ? Number(duration_min) : existing.durationMinutes,
      status: status ?? existing.status,
      notes: notes ?? existing.notes,
      outputUrl: output_url !== undefined ? output_url : existing.outputUrl,
      linkedKpiMetricId: linked_kpi_metric_id !== undefined ? linked_kpi_metric_id : existing.linkedKpiMetricId,
      linkedKpiMetricName: linked_kpi_metric_id !== undefined ? linked_kpi_metric_name : existing.linkedKpiMetricName
    }
  });

  const newTotal = dayTasks.reduce((sum, t) => sum + (t.id === id ? Number(duration_min) : t.durationMinutes), 0);

  let updatedSheet = sheet;
  if (sheet) {
    updatedSheet = await prisma.timesheetDay.update({
      where: { id: sheet.id },
      data: { totalLoggedMinutes: newTotal, status: 'DRAFT', submittedAt: null }
    });
  }

  res.json({ success: true, entry: mapTaskEntry(updatedEntry), totalLoggedMin: updatedSheet?.totalLoggedMinutes ?? newTotal });
});

app.delete('/api/tasks/entry/:id', authenticateToken, async (req, res) => {
  const user = (req as any).user as User;
  const { id } = req.params;

  const entry = await prisma.taskEntry.findUnique({ where: { id } });
  if (!entry || entry.userId !== user.id) {
    res.status(404).json({ error: 'Task entry not found or unauthorized' });
    return;
  }

  const sheet = await prisma.timesheetDay.findFirst({ where: { userId: user.id, date: entry.date } });
  if (sheet && sheet.status !== 'DRAFT' && sheet.status !== 'REJECTED') {
    res.status(400).json({ error: 'Cannot delete tasks for a submitted/approved day' });
    return;
  }

  await prisma.taskEntry.delete({ where: { id } });

  if (sheet) {
    const dayTasks = await prisma.taskEntry.findMany({ where: { userId: user.id, date: entry.date } }) as Array<{ durationMinutes: number }>;
    await prisma.timesheetDay.update({
      where: { id: sheet.id },
      data: { totalLoggedMinutes: dayTasks.reduce((sum, t) => sum + t.durationMinutes, 0) }
    });
  }

  res.json({ success: true, message: 'Task removed' });
});

app.post('/api/tasks/copy-yesterday', authenticateToken, async (req, res) => {
  const user = (req as any).user as User;
  const { date } = req.body;
  const targetDate = (date as string) || new Date().toISOString().split('T')[0];

  const targetDay = new Date(targetDate);
  targetDay.setDate(targetDay.getDate() - 1);
  const yesterdayStr = targetDay.toISOString().split('T')[0];

  const yesterdayEntries = await prisma.taskEntry.findMany({
    where: { userId: user.id, date: new Date(yesterdayStr) }
  });

  if (yesterdayEntries.length === 0) {
    res.status(400).json({ error: 'No tasks found from yesterday to copy.' });
    return;
  }

  const sheet = await prisma.timesheetDay.findFirst({ where: { userId: user.id, date: new Date(targetDate) } });
  if (sheet && sheet.status !== 'DRAFT' && sheet.status !== 'REJECTED') {
    res.status(400).json({ error: 'Timesheet for today is locked (submitted or approved).' });
    return;
  }

  const yesterdayEntriesTyped = yesterdayEntries as Array<{ task: string; subTask: string | null; brand: string; durationMinutes: number; notes: string | null; outputUrl: string | null; linkedKpiMetricId: string | null; linkedKpiMetricName: string | null }>;
  const copies = yesterdayEntriesTyped.map(entry => ({
    userId: user.id,
    date: new Date(targetDate),
    task: entry.task,
    subTask: entry.subTask,
    brand: entry.brand,
    durationMinutes: entry.durationMinutes,
    status: 'APPROVED',
    notes: entry.notes,
    outputUrl: entry.outputUrl,
    linkedKpiMetricId: entry.linkedKpiMetricId,
    linkedKpiMetricName: entry.linkedKpiMetricName,
    submitted: false
  }));

  await prisma.taskEntry.createMany({ data: copies });

  const dayTasks = await prisma.taskEntry.findMany({ where: { userId: user.id, date: new Date(targetDate) } });
  const totalMin = dayTasks.reduce((sum, t) => sum + t.durationMinutes, 0);

  if (!sheet) {
    await prisma.timesheetDay.create({
      data: {
        userId: user.id,
        date: new Date(targetDate),
        totalLoggedMinutes: totalMin,
        status: 'DRAFT'
      }
    });
  } else {
    await prisma.timesheetDay.update({ where: { id: sheet.id }, data: { totalLoggedMinutes: totalMin } });
  }

  res.json({ success: true, copiedCount: yesterdayEntries.length, totalLoggedMin: totalMin });
});

app.get('/api/timesheet/day', authenticateToken, async (req, res) => {
  const user = (req as any).user as User;
  const { date, userId } = req.query;
  const targetDate = (date as string) || new Date().toISOString().split('T')[0];
  let targetUserId = user.id;

  if (user.role === 'admin' && userId) {
    targetUserId = userId as string;
  }

  const sheet = await prisma.timesheetDay.findFirst({ where: { userId: targetUserId, date: new Date(targetDate) } });
  const tasks = await prisma.taskEntry.findMany({ where: { userId: targetUserId, date: new Date(targetDate) } });
  const attendance = await prisma.attendanceLog.findFirst({ where: { userId: targetUserId, date: new Date(targetDate) } });

  res.json({
    date: targetDate,
    sheet: sheet ? mapTimesheetDay(sheet) : { status: 'draft', total_logged_min: 0 },
    tasks: tasks.map(mapTaskEntry),
    attendance: attendance ? mapAttendanceLog(attendance) : null
  });
});

async function notifyAdmin(message: string, type: string) {
  const admins = await prisma.user.findMany({ where: { role: { name: 'admin' }, status: 'ACTIVE' } }) as Array<{ id: string }>;
  if (admins.length === 0) return;
  await prisma.notification.createMany({ data: admins.map(admin => ({
    userId: admin.id,
    type,
    message,
    read: false
  })) });
}

app.post('/api/timesheet/submit', authenticateToken, async (req, res) => {
  const user = (req as any).user as User;
  const { date } = req.body;
  const targetDate = (date as string) || new Date().toISOString().split('T')[0];

  const sheet = await prisma.timesheetDay.findFirst({ where: { userId: user.id, date: new Date(targetDate) } });
  if (!sheet || sheet.totalLoggedMinutes === 0) {
    res.status(400).json({ error: 'Please log at least one task before submitting' });
    return;
  }

  const updated = await prisma.timesheetDay.update({
    where: { id: sheet.id },
    data: { status: 'SUBMITTED', submittedAt: new Date() }
  });

  // Mark all of today's task entries as submitted (locks them from edit/delete in UI)
  await prisma.taskEntry.updateMany({
    where: { userId: user.id, date: new Date(targetDate) },
    data: { submitted: true }
  });

  await notifyAdmin(`${user.name} submitted timesheet for ${targetDate}`, 'timesheet_submission');
  res.json({ success: true, sheet: mapTimesheetDay(updated) });
});

app.get('/api/timesheet/approval-queue', authenticateToken, requireAdmin, async (req, res) => {
  const submittedSheets = await prisma.timesheetDay.findMany({ where: { status: 'SUBMITTED' } });
  const details = await Promise.all(submittedSheets.map(async sheet => {
    const user = await prisma.user.findUnique({ where: { id: sheet.userId } });
    // Only show tasks that were actually submitted — not draft tasks added after a rejection
    const dayTasks = await prisma.taskEntry.findMany({ where: { userId: sheet.userId, date: sheet.date, submitted: true } });
    return {
      ...mapTimesheetDay(sheet),
      user_name: user?.name || 'Unknown User',
      designation: user?.designation || '',
      user_designation: user?.designation || '',
      brand_focus: user?.brandFocus || '',
      tasks: dayTasks.map(mapTaskEntry)
    };
  }));
  res.json(details);
});

app.get('/api/admin/timesheets', authenticateToken, requireAdmin, async (req, res) => {
  const submittedSheets = await prisma.timesheetDay.findMany({ where: { status: 'SUBMITTED' } });
  const details = await Promise.all(submittedSheets.map(async sheet => {
    const user = await prisma.user.findUnique({ where: { id: sheet.userId } });
    const dayTasks = await prisma.taskEntry.findMany({ where: { userId: sheet.userId, date: sheet.date } });
    return {
      ...mapTimesheetDay(sheet),
      user_name: user?.name || 'Unknown User',
      designation: user?.designation || '',
      user_designation: user?.designation || '',
      brand_focus: user?.brandFocus || '',
      tasks: dayTasks.map(mapTaskEntry)
    };
  }));
  res.json(details);
});

function deriveTimesheetStatusFromTasks(tasks: Array<{ status?: string | null }>) {
  const normalized = (tasks || []).map(task => (task.status || 'pending').toLowerCase());
  if (normalized.some(status => status === 'rejected')) return 'REJECTED';
  if (normalized.length > 0 && normalized.every(status => status === 'approved')) return 'APPROVED';
  return 'SUBMITTED';
}

async function changeTimesheetStatus(sheetId: string, action: 'approve' | 'reject', admin: User, comment?: string) {
  const sheet = await prisma.timesheetDay.findUnique({ where: { id: sheetId } });
  if (!sheet) return null;

  const newStatus = action === 'approve' ? 'APPROVED' : 'REJECTED';

  // Delete uploaded attachments for all tasks on this sheet date
  const tasks = await prisma.taskEntry.findMany({
    where: { userId: sheet.userId, date: sheet.date, submitted: true }
  });

  for (const task of tasks) {
    if (task.outputUrl) {
      const urls = task.outputUrl.split(',').map(u => u.trim()).filter(Boolean);
      const hadLocalFile = urls.some(u => u.startsWith('/uploads/'));
      if (hadLocalFile) {
        for (const url of urls) {
          if (url.startsWith('/uploads/')) {
            const filePath = path.join(process.cwd(), url);
            try {
              await fs.unlink(filePath);
            } catch {
              // File may already be deleted — ignore
            }
          }
        }
        // Keep any external (non-uploaded) links, drop only local file references
        const remainingUrls = urls.filter(u => !u.startsWith('/uploads/'));
        await prisma.taskEntry.update({
          where: { id: task.id },
          data: { outputUrl: remainingUrls.length > 0 ? remainingUrls.join(',') : null }
        });
      }
    }
  }

  const updated = await prisma.timesheetDay.update({
    where: { id: sheetId },
    data: {
      status: newStatus,
      approverId: admin.id,
      approverComment: comment || undefined,
      approvedAt: action === 'approve' ? new Date() : sheet.approvedAt
    }
  });

  await prisma.notification.create({
    data: {
      userId: sheet.userId,
      type: action === 'approve' ? 'timesheet_approved' : 'timesheet_rejected',
      message: action === 'approve'
        ? `Your timesheet for ${sheet.date} has been approved.`
        : `Your timesheet for ${sheet.date} was rejected: "${comment || 'Please revise and resubmit.'}"`,
      read: false
    }
  });

  return updated;
}

app.post('/api/timesheet/approve', authenticateToken, requireAdmin, async (req, res) => {
  const admin = (req as any).user as User;
  const { id, comment } = req.body;
  const updated = await changeTimesheetStatus(id, 'approve', admin, comment);
  if (!updated) {
    res.status(404).json({ error: 'Timesheet day not found' });
    return;
  }
  res.json({ success: true, sheet: mapTimesheetDay(updated) });
});

app.post('/api/timesheet/reject', authenticateToken, requireAdmin, async (req, res) => {
  const admin = (req as any).user as User;
  const { id, comment } = req.body;
  if (!comment) {
    res.status(400).json({ error: 'Rejection comment is required' });
    return;
  }

  const updated = await changeTimesheetStatus(id, 'reject', admin, comment);
  if (!updated) {
    res.status(404).json({ error: 'Timesheet day not found' });
    return;
  }
  res.json({ success: true, sheet: mapTimesheetDay(updated) });
});

app.post('/api/admin/task/decision', authenticateToken, requireAdmin, async (req, res) => {
  const admin = (req as any).user as User;
  const { taskId, action, comment } = req.body;

  if (!taskId || !action) {
    res.status(400).json({ error: 'taskId and action are required' });
    return;
  }

  const task = await prisma.taskEntry.findUnique({ where: { id: taskId } });
  if (!task) {
    res.status(404).json({ error: 'Task not found' });
    return;
  }

  if (action === 'reject' && !comment?.trim()) {
    res.status(400).json({ error: 'Rejection reason is required' });
    return;
  }

  const nextStatus = action === 'approve' ? 'approved' : 'rejected';
  const updatedTask = await prisma.taskEntry.update({
    where: { id: taskId },
    data: {
      status: nextStatus,
      approverId: admin.id,
      approverComment: comment?.trim() || null,
      approvedAt: new Date()
    }
  });

  const relatedSheet = await prisma.timesheetDay.findFirst({
    where: { userId: task.userId, date: task.date }
  });

  if (relatedSheet) {
    const relatedTasks = await prisma.taskEntry.findMany({
      where: { userId: task.userId, date: task.date }
    });
    const sheetStatus = deriveTimesheetStatusFromTasks(relatedTasks);
    await prisma.timesheetDay.update({
      where: { id: relatedSheet.id },
      data: {
        status: sheetStatus as any,
        approverId: admin.id,
        approverComment: comment?.trim() || relatedSheet.approverComment || undefined,
        approvedAt: sheetStatus === 'APPROVED' || sheetStatus === 'REJECTED' ? new Date() : relatedSheet.approvedAt
      }
    });
  }

  if (action === 'reject') {
    await prisma.notification.create({
      data: {
        userId: task.userId,
        type: 'timesheet_rejected',
        message: `Your task "${task.task}" was rejected${comment ? `: ${comment}` : ''}`,
        read: false
      }
    });
  }

  res.json({ success: true, task: mapTaskEntry(updatedTask) });
});

app.post('/api/admin/task/assign', authenticateToken, requireAdmin, async (req, res) => {
  const { userId, date, task, subtask, brand, duration_min, notes } = req.body;
  if (!userId || !date || !task || !brand || !duration_min) {
    res.status(400).json({ error: 'userId, date, task, brand, and duration_min are required' });
    return;
  }

  const assignee = await prisma.user.findUnique({ where: { id: userId } });
  if (!assignee || assignee.status !== 'ACTIVE') {
    res.status(404).json({ error: 'Assigned user not found or inactive' });
    return;
  }

  const assignmentDate = new Date(date);
  const existingTasks = await prisma.taskEntry.findMany({ where: { userId, date: assignmentDate } }) as Array<{ durationMinutes: number }>;
  const totalMin = existingTasks.reduce((sum, t) => sum + t.durationMinutes, 0) + Number(duration_min);

  const sheet = await prisma.timesheetDay.findFirst({ where: { userId, date: assignmentDate } });
  if (sheet && sheet.status === 'APPROVED') {
    res.status(400).json({ error: 'Timesheet is already approved for the selected date' });
    return;
  }

  if (sheet) {
    await prisma.timesheetDay.update({
      where: { id: sheet.id },
      data: { totalLoggedMinutes: totalMin, status: 'DRAFT' }
    });
  } else {
    await prisma.timesheetDay.create({
      data: {
        userId,
        date: assignmentDate,
        totalLoggedMinutes: totalMin,
        status: 'DRAFT'
      }
    });
  }

  const newTask = await prisma.taskEntry.create({
    data: {
      userId,
      date: assignmentDate,
      task,
      subTask: subtask || '',
      brand,
      durationMinutes: Number(duration_min),
      status: 'pending',
      notes: notes || '',
      submitted: false,
      adminAssigned: true
    }
  });

  const eventTitle = `Assigned Task: ${task}${subtask ? ` — ${subtask}` : ''}`;
  await prisma.calendarEvent.create({
    data: {
      userId,
      date: assignmentDate,
      type: 'deadline',
      title: eventTitle,
      status: 'pending'
    }
  });

  await prisma.notification.create({
    data: {
      userId,
      type: 'calendar_assignment',
      message: `A new assigned task has been scheduled for ${date}: "${task}"`,
      read: false
    }
  });

  res.json({ success: true, task: mapTaskEntry(newTask), message: 'Task assigned and deadline created.' });
});

app.get('/api/admin/tasks/assigned', authenticateToken, requireAdmin, async (req, res) => {
  const tasks = await prisma.taskEntry.findMany({
    orderBy: { createdAt: 'desc' },
    include: { user: true } as any,
    take: 50
  }) as any[];

  const assignedTasks = tasks.filter((task: any) => task.adminAssigned);

  res.json(assignedTasks.map(task => ({
    ...mapTaskEntry(task),
    user_name: task.user?.name || 'Unknown',
    user_emp_code: task.user?.empCode || ''
  })));
});

app.patch('/api/tasks/status/:id', authenticateToken, async (req, res) => {
  const user = (req as any).user as User;
  const { id } = req.params;
  const { status } = req.body;

  const allowed = ['pending', 'in_progress', 'done'];
  if (!status || !allowed.includes(status)) {
    res.status(400).json({ error: 'Invalid status. Allowed values: pending, in_progress, done' });
    return;
  }

  const task = await prisma.taskEntry.findUnique({ where: { id } });
  if (!task || task.userId !== user.id) {
    res.status(404).json({ error: 'Task not found or not authorized' });
    return;
  }

  const updatedTask = await prisma.taskEntry.update({
    where: { id },
    data: { status }
  });

  res.json({ success: true, task: mapTaskEntry(updatedTask) });
});

// Employee progress on an admin-assigned task: "working" or "done".
// Kept separate from the generic status route so it never affects the
// normal "mark done, then submit the whole day" timesheet flow.
app.patch('/api/tasks/assigned/:id/progress', authenticateToken, async (req, res) => {
  const user = (req as any).user as User;
  const { id } = req.params;
  const { action } = req.body;

  if (!action || !['working', 'done'].includes(action)) {
    res.status(400).json({ error: "Invalid action. Allowed values: 'working', 'done'" });
    return;
  }

  const task = await prisma.taskEntry.findUnique({ where: { id } }) as any;
  if (!task || task.userId !== user.id) {
    res.status(404).json({ error: 'Task not found or not authorized' });
    return;
  }
  if (!task.adminAssigned) {
    res.status(400).json({ error: 'This action is only available for admin-assigned tasks' });
    return;
  }

  if (action === 'working') {
    const updated = await prisma.taskEntry.update({
      where: { id },
      data: { status: 'in_progress' }
    });
    await notifyAdmin(`${user.name} started working on assigned task: "${task.task}"`, 'assigned_task_working');
    res.json({ success: true, task: mapTaskEntry(updated) });
    return;
  }

  // action === 'done' -> mark done AND submit it into that day's timesheet
  const updated = await prisma.taskEntry.update({
    where: { id },
    data: { status: 'done', submitted: true, submittedAt: new Date() }
  });

  // The timesheet day is normally created at assignment time; make sure a row
  // exists so the completed task is reflected in the employee's timesheet.
  const sheet = await prisma.timesheetDay.findFirst({ where: { userId: user.id, date: task.date } });
  if (!sheet) {
    const dayTasks = await prisma.taskEntry.findMany({ where: { userId: user.id, date: task.date } }) as Array<{ durationMinutes: number }>;
    const totalMin = dayTasks.reduce((sum, t) => sum + t.durationMinutes, 0);
    await prisma.timesheetDay.create({
      data: { userId: user.id, date: task.date, totalLoggedMinutes: totalMin, status: 'DRAFT' }
    });
  }

  await notifyAdmin(`${user.name} completed assigned task: "${task.task}"`, 'assigned_task_done');
  res.json({ success: true, task: mapTaskEntry(updated) });
});

app.post('/api/admin/timesheet/approve', authenticateToken, requireAdmin, async (req, res) => {
  const admin = (req as any).user as User;
  const { sheetId, action, comment } = req.body;

  if (!sheetId || !action) {
    res.status(400).json({ error: 'sheetId and action are required' });
    return;
  }

  if (action === 'approve') {
    const updated = await changeTimesheetStatus(sheetId, 'approve', admin, comment);
    if (!updated) {
      res.status(404).json({ error: 'Timesheet not found' });
      return;
    }
    res.json({ success: true, sheet: mapTimesheetDay(updated) });
  } else if (action === 'reject') {
    if (!comment) {
      res.status(400).json({ error: 'Rejection comment is required' });
      return;
    }
    const updated = await changeTimesheetStatus(sheetId, 'reject', admin, comment);
    if (!updated) {
      res.status(404).json({ error: 'Timesheet not found' });
      return;
    }
    res.json({ success: true, sheet: mapTimesheetDay(updated) });
  } else {
    res.status(400).json({ error: 'Invalid action. Must be approve or reject' });
  }
});

app.get('/api/kpis/scorecard', authenticateToken, async (req, res) => {
  const user = (req as any).user as User;
  const { month, userId } = req.query;
  const targetMonth = (month as string) || new Date().toISOString().substring(0, 7);
  let targetUserId = user.id;
  if (user.role === 'admin' && userId) targetUserId = userId as string;

  const [metrics, entries, score] = await Promise.all([
    prisma.kPIMetric.findMany({ where: { userId: targetUserId } }),
    prisma.kPIEntry.findMany({ where: { userId: targetUserId, month: targetMonth } }),
    prisma.kPIScore.findFirst({ where: { userId: targetUserId, month: targetMonth } })
  ]);

  res.json({ month: targetMonth, userId: targetUserId, metrics, entries, score: score || null });
});

app.post('/api/kpis/actuals', authenticateToken, async (req, res) => {
  const user = (req as any).user as User;
  const { userId, month, metricId, w1, w2, w3, w4, monthly_value } = req.body;
  const targetUserId = (user.role === 'admin' && userId) ? userId : user.id;
  const targetMonth = month || new Date().toISOString().substring(0, 7);

  const metric = await prisma.kPIMetric.findUnique({ where: { id: metricId } });
  if (!metric) {
    res.status(404).json({ error: 'KPI metric not found' });
    return;
  }

  let entry = await prisma.kPIEntry.findFirst({
    where: { metricId: metricId, month: targetMonth, userId: targetUserId }
  });

  if (!entry) {
    entry = await prisma.kPIEntry.create({
      data: {
        userId: targetUserId,
        metricId: metricId,
        month: targetMonth,
        week1: metric.isPercentage ? undefined : Number(w1 || 0),
        week2: metric.isPercentage ? undefined : Number(w2 || 0),
        week3: metric.isPercentage ? undefined : Number(w3 || 0),
        week4: metric.isPercentage ? undefined : Number(w4 || 0),
        monthlyValue: metric.isPercentage ? Number(monthly_value || 0) : undefined
      }
    });
  } else {
    entry = await prisma.kPIEntry.update({
      where: { id: entry.id },
      data: {
        week1: metric.isPercentage ? entry.week1 : (w1 !== undefined ? Number(w1) : entry.week1),
        week2: metric.isPercentage ? entry.week2 : (w2 !== undefined ? Number(w2) : entry.week2),
        week3: metric.isPercentage ? entry.week3 : (w3 !== undefined ? Number(w3) : entry.week3),
        week4: metric.isPercentage ? entry.week4 : (w4 !== undefined ? Number(w4) : entry.week4),
        monthlyValue: metric.isPercentage ? (monthly_value !== undefined ? Number(monthly_value) : entry.monthlyValue) : entry.monthlyValue
      }
    });
  }

  const actual = metric.isPercentage
    ? Number(entry.monthlyValue || 0)
    : (Number(entry.week1 || 0) + Number(entry.week2 || 0) + Number(entry.week3 || 0) + Number(entry.week4 || 0));

  const achievement = metric.lowerIsBetter
    ? actual === 0 ? 1.5 : (metric.target / actual)
    : metric.target === 0 ? 1 : (actual / metric.target);
  const computedAchievement = Math.min(1.5, Math.max(0, achievement));

  entry = await prisma.kPIEntry.update({
    where: { id: entry.id },
    data: { computedAchievement: computedAchievement }
  });

  const userMetrics = await prisma.kPIMetric.findMany({ where: { userId: targetUserId } });
  const userEntries = await prisma.kPIEntry.findMany({ where: { userId: targetUserId, month: targetMonth } });

  let finalScore = 0;
  let weightsSum = 0;
  for (const metricRecord of userMetrics) {
    const entryForMetric = userEntries.find(e => e.metricId === metricRecord.id);
    const ach = entryForMetric?.computedAchievement || 0;
    finalScore += (metricRecord.weight / 100) * ach;
    weightsSum += metricRecord.weight;
  }

  if (weightsSum > 0 && weightsSum !== 100) {
    finalScore = finalScore * (100 / weightsSum);
  }
  const percentageScore = Math.round(finalScore * 100);

  let gate_status: 'Full' | 'Watch' | 'Low' | 'Critical' = 'Critical';
  if (percentageScore >= 100) gate_status = 'Full';
  else if (percentageScore >= 80) gate_status = 'Watch';
  else if (percentageScore >= 60) gate_status = 'Low';

  let score = await prisma.kPIScore.findFirst({ where: { userId: targetUserId, month: targetMonth } });
  if (!score) {
    score = await prisma.kPIScore.create({
      data: {
        userId: targetUserId,
        month: targetMonth,
        finalScore: percentageScore,
        gateStatus: gate_status
      }
    });
  } else {
    score = await prisma.kPIScore.update({
      where: { id: score.id },
      data: { finalScore: percentageScore, gateStatus: gate_status }
    });
  }

  res.json({ success: true, entry, score });
});

app.get('/api/calendar/events', authenticateToken, async (req, res) => {
  const user = (req as any).user as User;
  const { month } = req.query;

  let where: any = {};
  if (user.role !== 'admin') {
    where = { OR: [{ userId: user.id }, { userId: 'all' }] };
  }
  if (month) {
    const start = new Date((month as string) + '-01');
    const end = new Date(start);
    end.setMonth(end.getMonth() + 1);
    where = { ...where, date: { gte: start, lt: end } };
  }

  const events = await prisma.calendarEvent.findMany({ where, include: { user: true } });
  res.json(events.map(e => ({ ...e, date: formatDate(e.date), submitted_by_name: e.user?.name ?? null })));
});

app.post('/api/calendar/event', authenticateToken, requireAdmin, async (req, res) => {
  const { user_id, date, type, title } = req.body;
  if (!user_id || !date || !type || !title) {
    res.status(400).json({ error: 'Missing required event fields' });
    return;
  }

  const event = await prisma.calendarEvent.create({
    data: {
      userId: user_id,
      date: new Date(date),
      type,
      title,
      status: 'pending'
    }
  });

  if (user_id !== 'all') {
    await prisma.notification.create({
      data: {
        userId: user_id,
        type: 'calendar_assignment',
        message: `Admin assigned a new ${type}: "${title}" on ${date}`,
        read: false
      }
    });
  }

  res.json({ success: true, event: { ...event, date: formatDate(event.date) } });
});

app.post('/api/calendar/leave', authenticateToken, async (req, res) => {
  const user = (req as any).user as User;
  const { date, reason, applicantName } = req.body;

  if (!date) {
    res.status(400).json({ error: 'Date is required' });
    return;
  }

  const leaveEvent = await prisma.calendarEvent.create({
    data: {
      userId: user.id,
      date: new Date(date),
      type: 'leave',
      title: `Planned Leave: ${reason || 'Personal'}`,
      status: 'approved'
    }
  });

  const adminUsers = await prisma.user.findMany({ where: { role: { name: 'admin' }, status: 'ACTIVE' } });
  await prisma.notification.createMany({ data: adminUsers.map(admin => ({
    userId: admin.id,
    type: 'leave_logged',
    message: `${user.name} logged a planned leave on ${date}: "${reason || 'Personal'}"`,
    read: false
  })) });

  res.json({ success: true, event: { ...leaveEvent, date: formatDate(leaveEvent.date) } });
});

app.get('/api/notifications', authenticateToken, async (req, res) => {
  const user = (req as any).user as User;
  const list = await prisma.notification.findMany({
    where: { userId: user.id, read: false },
    orderBy: { createdAt: 'desc' }
  });

  const mapped = list.map(n => ({
    ...mapNotification(n),
    title: n.type === 'timesheet_submission' ? 'Timesheet Submitted'
      : n.type === 'timesheet_approved' ? 'Timesheet Approved'
      : n.type === 'timesheet_rejected' ? 'Timesheet Rejected'
      : n.type === 'calendar_assignment' ? 'New Calendar Event'
      : n.type === 'leave_logged' ? 'Planned Leave Logged'
      : 'Notification'
  }));

  res.json(mapped);
});

app.post('/api/notifications/mark-read', authenticateToken, async (req, res) => {
  const user = (req as any).user as User;
  await prisma.notification.updateMany({ where: { userId: user.id }, data: { read: true } });
  res.json({ success: true });
});

app.post('/api/notifications/:id/read', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const user = (req as any).user as User;
  const notif = await prisma.notification.findUnique({ where: { id } });
  if (!notif || notif.userId !== user.id) {
    res.status(404).json({ error: 'Notification not found' });
    return;
  }
  await prisma.notification.update({ where: { id }, data: { read: true } });
  res.json({ success: true });
});

app.get('/api/admin/dashboard', authenticateToken, requireAdmin, async (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  const currentMonth = new Date().toISOString().substring(0, 7);

  const [attendanceLogs, users, submittedSheets, kpiScoresThisMonth] = await Promise.all([
    prisma.attendanceLog.findMany({ where: { date: new Date(today), clockOut: null } }),
    prisma.user.findMany({ where: { role: { name: 'member' }, status: 'ACTIVE' }, include: { role: true } }),
    prisma.timesheetDay.findMany({ where: { status: 'SUBMITTED' } }),
    prisma.kPIScore.findMany({ where: { month: currentMonth } })
  ]);

  const activeNowList = attendanceLogs.map(log => {
    const user = users.find(u => u.id === log.userId);
    let durationMinutes = Math.max(0, Math.floor((Date.now() - new Date(log.clockIn!).getTime()) / 60000) - (log.breakMinutes || 0));
    if (log.onBreak && log.breakStartTs) {
      const breakStart = new Date(log.breakStartTs).getTime();
      durationMinutes = Math.max(0, Math.floor((Date.now() - new Date(log.clockIn!).getTime()) / 60000) - (log.breakMinutes || 0) - Math.floor((Date.now() - breakStart) / 60000));
    }
    return {
      user_id: log.userId,
      name: user?.name || 'Unknown',
      designation: user?.designation || '',
      brand_focus: user?.brandFocus || '',
      clock_in: log.clockIn,
      clock_in_ts: log.clockIn,
      break_minutes: log.breakMinutes,
      duration_minutes: durationMinutes,
      duration: `${Math.floor(durationMinutes / 60)}h ${durationMinutes % 60}m`,
      status: log.onBreak ? 'On Break' : 'Active'
    };
  });

  const todayAttendance = await prisma.attendanceLog.findMany({ where: { date: new Date(today) } });
  const todayTimesheets = await prisma.timesheetDay.findMany({ where: { date: new Date(today) } });
  const activeMembers = users.filter(u => u.role?.name === 'member' && u.status === 'ACTIVE');

  const heatmap = activeMembers.map(u => {
    const att = todayAttendance.find(a => a.userId === u.id);
    const sheet = todayTimesheets.find(s => s.userId === u.id);
    const total_logged_hrs = sheet ? sheet.totalLoggedMinutes / 60 : 0;
    const active_hrs = att ? (att.activeMinutes || 0) / 60 : 0;
    let status: 'green' | 'amber' | 'red' = 'red';
    if (total_logged_hrs >= 8) status = 'green';
    else if (total_logged_hrs >= 6) status = 'amber';
    return {
      user_id: u.id,
      name: u.name,
      designation: u.designation,
      active_hours: Number(active_hrs.toFixed(1)),
      logged_hours: Number(total_logged_hrs.toFixed(1)),
      status,
      clocked_in: att ? (!!att.clockIn && !att.clockOut) : false
    };
  });

  const teamAverageKpi = kpiScoresThisMonth.length > 0
    ? Math.round(kpiScoresThisMonth.reduce((sum, s) => sum + s.finalScore, 0) / kpiScoresThisMonth.length)
    : 0;

  const brandMetrics: Record<'GT' | 'HH' | 'ACR', { sum: number; count: number }> = {
    GT: { sum: 0, count: 0 },
    HH: { sum: 0, count: 0 },
    ACR: { sum: 0, count: 0 }
  };
  for (const score of kpiScoresThisMonth) {
    const usr = users.find(u => u.id === score.userId);
    const brandFocus = usr?.brandFocus as 'GT' | 'HH' | 'ACR' | undefined;
    if (brandFocus && brandMetrics[brandFocus]) {
      brandMetrics[brandFocus].sum += score.finalScore;
      brandMetrics[brandFocus].count += 1;
    }
  }

  const brandAverages = {
    GT: brandMetrics.GT.count > 0 ? Math.round(brandMetrics.GT.sum / brandMetrics.GT.count) : 85,
    HH: brandMetrics.HH.count > 0 ? Math.round(brandMetrics.HH.sum / brandMetrics.HH.count) : 82,
    ACR: brandMetrics.ACR.count > 0 ? Math.round(brandMetrics.ACR.sum / brandMetrics.ACR.count) : 88
  };

  const flags: string[] = [];
  heatmap.forEach(h => {
    if (h.logged_hours < 6 && h.logged_hours > 0) {
      flags.push(`Low utilisation: ${h.name} logged only ${h.logged_hours} hrs today.`);
    }
  });
  for (const score of kpiScoresThisMonth) {
    if (score.finalScore < 60) {
      const usr = users.find(u => u.id === score.userId);
      flags.push(`Critical performance alert: ${usr?.name} KPI score is ${score.finalScore}% (${score.gateStatus}).`);
    }
  }

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];
  const weekday = yesterday.getDay();
  if (weekday !== 0 && weekday !== 6) {
    const yesterdayTimesheets = await prisma.timesheetDay.findMany({
      where: {
        date: new Date(yesterdayStr),
        userId: { in: activeMembers.map(u => u.id) }
      }
    });
    activeMembers.forEach(u => {
      const sh = yesterdayTimesheets.find(s => s.userId === u.id);
      if (!sh || sh.status === 'DRAFT') {
        flags.push(`Missing timesheet: ${u.name} has not submitted their timesheet for yesterday (${yesterdayStr}).`);
      }
    });
  }

  const totalActiveMembers = activeMembers.length;
  const liveClockInStatus = {
    clockedInCount: attendanceLogs.length,
    totalCount: totalActiveMembers,
    logs: attendanceLogs.map(log => {
      const logUser = users.find(u => u.id === log.userId);
      let durationMinutes = Math.max(0, Math.floor((Date.now() - new Date(log.clockIn!).getTime()) / 60000) - (log.breakMinutes || 0));
      if (log.onBreak && log.breakStartTs) {
        const breakStart = new Date(log.breakStartTs).getTime();
        durationMinutes = Math.max(0, Math.floor((Date.now() - new Date(log.clockIn!).getTime()) / 60000) - (log.breakMinutes || 0) - Math.floor((Date.now() - breakStart) / 60000));
      }
      return {
        user_id: log.userId,
        name: logUser?.name || 'Unknown',
        designation: logUser?.designation || '',
        clock_in: log.clockIn,
        clock_out: log.clockOut,
        duration_minutes: durationMinutes,
        duration: `${Math.floor(durationMinutes / 60)}h ${durationMinutes % 60}m`
      };
    })
  };

  const activeList = activeMembers.map(u => {
    const sheet = todayTimesheets.find(s => s.userId === u.id);
    return {
      name: u.name,
      designation: u.designation,
      loggedMin: sheet ? sheet.totalLoggedMinutes : 0
    };
  });

  const totalLoggedMinToday = activeList.reduce((sum, item) => sum + item.loggedMin, 0);
  const avgUtilizationPercent = totalActiveMembers > 0 ? Math.round((totalLoggedMinToday / (totalActiveMembers * 480)) * 100) : 0;

  const deadlineWindowEnd = new Date(today);
  deadlineWindowEnd.setDate(deadlineWindowEnd.getDate() + 7);
  const urgentDeadlinesRaw = await prisma.calendarEvent.findMany({
    where: {
      type: 'deadline',
      date: { gte: new Date(today), lte: deadlineWindowEnd }
    },
    include: { user: true },
    orderBy: [{ date: 'asc' }],
    take: 5
  });

  const assignedTasksRaw = await prisma.taskEntry.findMany({
    where: {
      date: { gte: new Date(today), lte: deadlineWindowEnd }
    },
    include: { user: true } as any,
    orderBy: [{ date: 'asc' }],
    take: 6
  }) as any[];

  const assignedTasks = assignedTasksRaw.filter((task: any) => task.adminAssigned);

  const upcomingTaskEntries = await prisma.taskEntry.findMany({
    where: {
      date: { gte: new Date(today), lte: deadlineWindowEnd }
    }
  });
  const completedTaskCount = upcomingTaskEntries.filter((task) => {
    const status = (task.status || '').toLowerCase();
    return status === 'approved' || status === 'done';
  }).length;
  const assignedTaskCompletionRate = upcomingTaskEntries.length > 0
    ? Math.round((completedTaskCount / upcomingTaskEntries.length) * 100)
    : 0;

  res.json({
    activeNow: activeNowList,
    heatmap,
    submittedCount: submittedSheets.length,
    teamAverageKpi,
    brandAverages,
    flags: flags.slice(0, 10),
    liveClockInStatus,
    approvalQueueCount: submittedSheets.length,
    utilizationHeatmap: { avgUtilizationPercent, activeList },
    kpiPerformanceAverages: { avgKpiScore: teamAverageKpi || 85 },
    urgentDeadlines: urgentDeadlinesRaw.map((e) => ({
      id: e.id,
      title: e.title,
      date: formatDate(e.date),
      assignee: e.user?.name || 'Broadcast'
    })),
    assignedTaskCompletionRate,
    assignedTasks: assignedTasks.map((task) => ({
      ...mapTaskEntry(task),
      user_name: task.user?.name || 'Unknown',
      user_emp_code: task.user?.empCode || ''
    }))
  });
});

app.get('/api/member/dashboard', authenticateToken, async (req, res) => {
  const user = (req as any).user as User;
  const today = new Date().toISOString().split('T')[0];
  const currentMonth = new Date().toISOString().substring(0, 7);

  const attLog = await prisma.attendanceLog.findFirst({ where: { userId: user.id, date: new Date(today) } });
  const clockedIn = !!attLog && !!attLog.clockIn && !attLog.clockOut;

  const startOfWeek = new Date();
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay() + 1);
  const weekDates: string[] = [];
  for (let i = 0; i < 6; i++) {
    const d = new Date(startOfWeek);
    d.setDate(d.getDate() + i);
    weekDates.push(d.toISOString().split('T')[0]);
  }

  const weekTasks = await prisma.timesheetDay.findMany({
    where: { userId: user.id, date: { in: weekDates.map(d => new Date(d)) } }
  });

  const weeklyLogged = weekDates.map(dateStr => {
    const sh = weekTasks.find((s: any) => formatDate(s.date) === dateStr);
    return { date: dateStr, hours: sh ? sh.totalLoggedMinutes / 60 : 0, status: sh ? sh.status.toLowerCase() : 'missing' };
  });

  const score = await prisma.kPIScore.findFirst({ where: { userId: user.id, month: currentMonth } }) as any;
  const deadlines = await prisma.calendarEvent.findMany({
    where: {
      AND: [
        { OR: [{ userId: user.id }, { userId: 'all' }] },
        { type: 'deadline' },
        { date: { gte: new Date(today) } }
      ]
    },
    orderBy: { date: 'asc' },
    take: 3
  });

  const assignedTasks = await prisma.taskEntry.findMany({
    where: {
      userId: user.id,
      adminAssigned: true,
      date: { gte: new Date(today) }
    },
    orderBy: { createdAt: 'desc' },
    take: 10
  }) as any[];

  let todayStatus = 'Not Checked In';
  if (clockedIn) {
    todayStatus = 'Clocked In';
  } else if (attLog && attLog.clockIn && !attLog.clockOut) {
    todayStatus = 'Clocked In';
  } else if (attLog && attLog.clockOut) {
    todayStatus = 'Clocked Out';
  }

  const weeklyHoursLogged = Number(weeklyLogged.reduce((sum, item) => sum + item.hours, 0).toFixed(1));
  const kpiSummaryScore = score ? score.finalScore : 0;

  res.json({
    user: {
      name: user.name,
      designation: user.designation,
      brand_focus: user.brand_focus,
      emp_code: user.emp_code
    },
    clockedIn,
    todayLog: attLog ? mapAttendanceLog(attLog) : null,
    weeklyLogged,
    kpi: score ? {
      id: score.id,
      user_id: score.userId,
      month: score.month,
      final_score: score.finalScore,
      gate_status: score.gateStatus
    } : { final_score: 0, gate_status: 'Watch' },
    deadlines: deadlines.map(e => ({ ...e, date: formatDate(e.date) })),
    assignedTasks: assignedTasks.map(mapTaskEntry),
    todayStatus,
    weeklyHoursLogged,
    kpiSummaryScore
  });
});

app.post('/api/ai/report', authenticateToken, async (req, res) => {
  const userReq = (req as any).user as User;
  const { focusUser, reportType } = req.body;
  const targetUserId = userReq.role === 'admin' ? (focusUser || 'team') : userReq.id;
  const geminiKey = process.env.GEMINI_API_KEY;

  if (!geminiKey) {
    res.json({
      summary: "AI analysis is ready to be configured. The Gemini API key will be automatically injected by AI Studio in production. Seed fallback report:\n\n**Team Utilisation Analysis:**\n- Team active hours are healthy (7.8 hrs avg).\n- High consistency on daily timesheet submissions.\n- Brand focus performance: Galaxy Toyota leads in lead conversions at 6.2%.",
      isMock: true
    });
    return;
  }

  try {
    const ai = new GoogleGenAI({
      apiKey: geminiKey,
      httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
    });

    const currentMonth = new Date().toISOString().substring(0, 7);
    const activeMembers = await prisma.user.findMany({ where: { role: { name: 'member' }, status: 'ACTIVE' } });
    const recentScores = await prisma.kPIScore.findMany({ where: { month: currentMonth } });

    let promptContext = '';
    if (targetUserId === 'team') {
      const topKpi = [...recentScores].sort((a, b) => b.finalScore - a.finalScore).slice(0, 3);
      const lowKpi = [...recentScores].sort((a, b) => a.finalScore - b.finalScore).slice(0, 3);
      promptContext = `TEAM PERFORMANCE CONTEXT:\n- Total team size: ${activeMembers.length}\n- Current month: ${currentMonth}\n- Total KPI Scores reported this month: ${recentScores.length}\n- Top Performers: ${topKpi.map(s => `${activeMembers.find(u => u.id === s.userId)?.name || s.userId} (${s.finalScore}%)`).join(', ')}\n- Bottom Performers: ${lowKpi.map(s => `${activeMembers.find(u => u.id === s.userId)?.name || s.userId} (${s.finalScore}%)`).join(', ')}\n- Brand distribution: Galaxy Toyota, Hans Hyundai, AutoCarRepair.in`;
    } else {
      const targetUserObj = await prisma.user.findUnique({ where: { id: targetUserId } });
      const userScore = await prisma.kPIScore.findFirst({ where: { userId: targetUserId, month: currentMonth } });
      const userTasks = await prisma.taskEntry.findMany({ where: { userId: targetUserId }, orderBy: { createdAt: 'desc' }, take: 10 });
      promptContext = `INDIVIDUAL MEMBER CONTEXT:\n- Name: ${targetUserObj?.name}\n- Role/Designation: ${targetUserObj?.designation}\n- Brand focus: ${targetUserObj?.brandFocus}\n- Current Month KPI Score: ${userScore ? `${userScore.finalScore}% (${userScore.gateStatus})` : 'Not scored yet'}\n- Recent logged tasks: ${userTasks.map(t => `${formatDate(t.date)}: ${t.task} (${t.durationMinutes} min) - ${t.notes}`).join('; ')}`;
    }

    const systemInstruction = `You are an expert Chief Technology Officer & Digital Marketing Auditor auditing a centralized tech team across three auto brands: Galaxy Toyota, Hans Hyundai, and AutoCarRepair.in. Analyze the provided stats context. Provide a concise, highly professional, bulleted summary of key achievements, potential bottlenecks, and 3 actionable improvement steps. Use professional formatting with markdown. Keep it punchy and practical.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: `Provide a digital team audit report for type "${reportType || 'performance'}" based on this data:\n${promptContext}`,
      config: { systemInstruction, temperature: 0.7 }
    });

    res.json({ summary: response.text, isMock: false });
  } catch (error: any) {
    console.error('Gemini API call failed:', error);
    res.json({
      summary: 'AI analysis server encountered a query timeout. Seed fallback report:\n\n- Active tracking is fully functional across 20 pre-seeded digital executives.\n- Utilisation targets of 8.0 hours have been met consistently.\n- Suggested Audit: Check content pipeline turnaround for Bhawna Tagra and graphic designs revisions from Vikash Pandey.',
      isMock: true
    });
  }
});

// ── File Upload Endpoint ─────────────────────────────────────────────────────

app.post('/api/upload', authenticateToken, upload.single('file'), (req, res) => {
  if (!req.file) { res.status(400).json({ error: 'No file uploaded' }); return; }
  const fileUrl = `/uploads/${req.file.filename}`;
  res.json({ success: true, url: fileUrl, originalName: req.file.originalname });
});

app.post('/api/upload/multi', authenticateToken, upload.array('files', 5), (req, res) => {
  const files = req.files as Express.Multer.File[];
  if (!files || files.length === 0) { res.status(400).json({ error: 'No files uploaded' }); return; }
  const urls = files.map(f => `/uploads/${f.filename}`);
  res.json({ success: true, urls });
});

// ─────────────────────────────────────────────────────────────────────────────

// ── Report Download Endpoints ────────────────────────────────────────────────

app.get('/api/admin/reports/panel', authenticateToken, requireAdmin, async (req, res) => {
  const { from, to, userId, brand, status } = req.query as Record<string, string>;
  if (!from || !to) { res.status(400).json({ error: 'from and to dates are required' }); return; }

  const where: any = {
    date: { gte: new Date(from), lte: new Date(to) }
  };
  if (userId) where.userId = userId;
  if (brand && brand !== 'All') where.brand = brand;

  const entries = await prisma.taskEntry.findMany({
    where,
    include: { user: true },
    orderBy: [{ date: 'desc' }, { user: { name: 'asc' } }]
  });

  // Group by userId + date
  const grouped: Record<string, any> = {};
  for (const e of entries) {
    const key = `${e.userId}_${e.date.toISOString().split('T')[0]}`;
    if (!grouped[key]) {
      // Get timesheet status for this user+date
      const sheet = await prisma.timesheetDay.findFirst({
        where: { userId: e.userId, date: e.date }
      });
      grouped[key] = {
        user_id: e.userId,
        emp_code: e.user.empCode.toUpperCase(),
        name: e.user.name,
        designation: e.user.designation,
        date: e.date.toISOString().split('T')[0],
        sheet_status: sheet?.status?.toLowerCase() ?? 'draft',
        approver_comment: sheet?.approverComment ?? null,
        total_minutes: 0,
        tasks: []
      };
    }
    grouped[key].total_minutes += e.durationMinutes;
    grouped[key].tasks.push({
      id: e.id,
      task: e.task,
      subtask: e.subTask,
      brand: e.brand,
      duration_min: e.durationMinutes,
      status: e.status,
      submitted: e.submitted,
      notes: e.notes,
      output_url: e.outputUrl
    });
  }

  let results = Object.values(grouped);

  // Filter by sheet status if requested
  if (status && status !== 'all') {
    results = results.filter((r: any) => r.sheet_status === status);
  }

  res.json(results);
});

app.get('/api/admin/reports/members', authenticateToken, requireAdmin, async (req, res) => {
  const members = await prisma.user.findMany({
    where: { role: { name: 'member' }, status: 'ACTIVE' },
    orderBy: { name: 'asc' },
    select: { id: true, name: true, empCode: true, designation: true }
  });
  res.json(members.map(m => ({ ...m, empCode: m.empCode.toUpperCase() })));
});

app.get('/api/admin/reports/attendance', authenticateToken, requireAdmin, async (req, res) => {
  const { from, to } = req.query as { from: string; to: string };
  if (!from || !to) { res.status(400).json({ error: 'from and to dates are required' }); return; }

  const logs = await prisma.attendanceLog.findMany({
    where: { date: { gte: new Date(from), lte: new Date(to) } },
    include: { user: true },
    orderBy: [{ date: 'asc' }, { clockIn: 'asc' }]
  });

  const rows = logs.map(l => ({
    'Emp Code': l.user.empCode.toUpperCase(),
    'Name': l.user.name,
    'Designation': l.user.designation,
    'Date': l.date.toISOString().split('T')[0],
    'Clock In': l.clockIn.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
    'Clock Out': l.clockOut ? l.clockOut.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : 'Active',
    'Active Hours': (l.activeMinutes / 60).toFixed(2),
    'Break Minutes': l.breakMinutes,
    'Device': l.device,
    'IP': l.ip
  }));

  res.json(rows);
});

app.get('/api/admin/reports/timesheet', authenticateToken, requireAdmin, async (req, res) => {
  const { from, to } = req.query as { from: string; to: string };
  if (!from || !to) { res.status(400).json({ error: 'from and to dates are required' }); return; }

  const entries = await prisma.taskEntry.findMany({
    where: { date: { gte: new Date(from), lte: new Date(to) } },
    include: { user: true },
    orderBy: [{ date: 'asc' }, { user: { name: 'asc' } }]
  });

  const rows = entries.map(e => ({
    'Emp Code': e.user.empCode.toUpperCase(),
    'Name': e.user.name,
    'Designation': e.user.designation,
    'Date': e.date.toISOString().split('T')[0],
    'Task': e.task,
    'Sub Task': e.subTask,
    'Brand': e.brand,
    'Duration (min)': e.durationMinutes,
    'Status': e.status,
    'Submitted': e.submitted ? 'Yes' : 'No',
    'Notes': e.notes ?? ''
  }));

  res.json(rows);
});

// ─────────────────────────────────────────────────────────────────────────────

async function startServer() {
  await loadTaskLibrary();

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'spa' });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running at http://localhost:${PORT}`);
  });
}

startServer();
