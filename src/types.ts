/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface User {
  id: string;
  name: string;
  emp_code: string;
  email: string;
  password_hash: string;
  role: 'admin' | 'member';
  designation: string;
  brand_focus: 'GT' | 'HH' | 'ACR' | 'All';
  doj: string;
  manager_id?: string;
  photo_url?: string;
  status: 'active' | 'inactive';
  must_reset_password?: boolean;
}

export interface AttendanceLog {
  id: string; user_id: string; date: string;
  clock_in_ts: string; clock_out_ts: string | null;
  break_start_ts?: string | null;
  break_minutes: number; active_minutes: number; on_break: boolean;
  device: string; ip: string;
  status: 'open' | 'closed' | 'auto_closed';
}

export interface TaskLibraryItem {
  id: string; role: string;
  task_name: string; subtasks: string[]; category: string;
}

export interface TaskEntry {
  id: string; user_id: string; date: string;
  task: string; subtask: string;
  brand: 'GT' | 'HH' | 'ACR' | 'Internal' | 'All';
  duration_min: number;
  status: 'not_started' | 'in_progress' | 'done' | 'blocked' | 'pending_review';
  notes: string; output_url: string | null;
  linked_kpi_metric_id: string | null;
  linked_kpi_metric_name: string | null;
  submitted: boolean;
}

export interface TimesheetDay {
  tasks: TaskEntry[];
  sheet: {
    id: string; user_id: string; date: string;
    total_logged_min: number;
    status: 'draft' | 'submitted' | 'approved' | 'rejected';
    approver_comment: string | null;
  } | null;
}

export interface KPIMetric {
  id: string;
  user_id: string; // Specific user ID, or 'template_designation'
  name: string;
  category: string;
  weight: number; // sum to 100%
  target: number;
  lower_is_better: boolean;
  is_percentage: boolean;
}

export interface KPIEntry {
  id: string;
  user_id: string;
  metric_id: string;
  month: string; // YYYY-MM
  w1?: number; // count metrics
  w2?: number;
  w3?: number;
  w4?: number;
  monthly_value?: number; // percentage metrics (entered once)
  computed_achievement?: number; // up to 150%
}

export interface KPIScore {
  id: string;
  user_id: string;
  month: string; // YYYY-MM
  final_score: number;
  gate_status: 'Full' | 'Watch' | 'Low' | 'Critical';
}

export interface CalendarEvent {
  id: string;
  user_id: string;
  date: string; // YYYY-MM-DD
  type: 'task' | 'deadline' | 'leave' | 'holiday';
  title: string;
  status: string; // 'pending' | 'completed' | etc.
}

export interface IncentivePool {
  id: string;
  brand: 'GT' | 'HH' | 'ACR';
  month: string; // YYYY-MM
  pool_amount: number;
}

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  message: string;
  read: boolean;
  created_ts: string;
}
