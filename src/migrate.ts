import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import prisma from './lib/prisma.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function toUpperStatus(status: string): 'ACTIVE' | 'INACTIVE' {
  return status?.toLowerCase() === 'inactive' ? 'INACTIVE' : 'ACTIVE';
}

function toTimesheetStatus(status: string): 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' {
  const map: Record<string, 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED'> = {
    draft: 'DRAFT',
    submitted: 'SUBMITTED',
    approved: 'APPROVED',
    rejected: 'REJECTED'
  };
  return map[status?.toLowerCase()] ?? 'DRAFT';
}

async function startMigration() {
  console.log('🚀 Starting migration from db.json to PostgreSQL via Prisma...');

  const jsonPath = path.join(__dirname, '../data/db.json');
  if (!fs.existsSync(jsonPath)) {
    console.error(`❌ Could not find db.json at ${jsonPath}`);
    return;
  }

  const db = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));

  // Maps old JSON ids -> new Prisma UUIDs
  const userIdMap: Record<string, string> = {};
  const metricIdMap: Record<string, string> = {};

  try {
    // ----------------------------------------------------------------
    // 1. ROLES
    // ----------------------------------------------------------------
    console.log('Seeding roles...');
    const adminRole = await prisma.role.upsert({
      where: { name: 'admin' },
      update: {},
      create: { name: 'admin' }
    });
    const memberRole = await prisma.role.upsert({
      where: { name: 'member' },
      update: {},
      create: { name: 'member' }
    });
    const roleMap: Record<string, string> = {
      admin: adminRole.id,
      member: memberRole.id
    };

    // ----------------------------------------------------------------
    // 2. USERS
    // ----------------------------------------------------------------
    console.log(`Migrating ${db.users.length} users...`);
    for (const u of db.users) {
      const roleId = roleMap[u.role] ?? memberRole.id;
      const user = await prisma.user.upsert({
        where: { empCode: u.emp_code.trim().toLowerCase() },
        update: {},
        create: {
          empCode: u.emp_code.trim().toLowerCase(),
          name: u.name,
          email: u.email.toLowerCase(),
          passwordHash: u.password_hash,
          designation: u.designation,
          brandFocus: u.brand_focus ?? 'All',
          doj: new Date(u.doj),
          status: toUpperStatus(u.status),
          mustResetPassword: u.must_reset_password ?? false,
          roleId
        }
      });
      userIdMap[u.id] = user.id;
    }

    // ----------------------------------------------------------------
    // 3. ATTENDANCE LOGS
    // ----------------------------------------------------------------
    console.log(`Migrating ${db.attendance.length} attendance logs...`);
    for (const a of db.attendance) {
      const userId = userIdMap[a.user_id];
      if (!userId) { console.warn(`  ⚠️  Skipping attendance ${a.id} — user ${a.user_id} not found`); continue; }

      await prisma.attendanceLog.upsert({
        where: { id: a.id },
        update: {},
        create: {
          id: a.id,
          userId,
          date: new Date(a.date),
          clockIn: new Date(a.clock_in_ts),
          clockOut: a.clock_out_ts ? new Date(a.clock_out_ts) : null,
          breakMinutes: a.break_minutes ?? 0,
          activeMinutes: a.active_minutes ?? 0,
          onBreak: a.on_break ?? false,
          device: a.device ?? 'Unknown',
          ip: a.ip ?? '127.0.0.1',
          status: a.status ?? 'open'
        }
      });
    }

    // ----------------------------------------------------------------
    // 4. KPI METRICS
    // ----------------------------------------------------------------
    console.log(`Migrating ${db.kpiMetrics.length} KPI metrics...`);
    for (const m of db.kpiMetrics) {
      const userId = userIdMap[m.user_id];
      if (!userId) { console.warn(`  ⚠️  Skipping metric ${m.id} — user ${m.user_id} not found`); continue; }

      const metric = await prisma.kPIMetric.upsert({
        where: { id: m.id },
        update: {},
        create: {
          id: m.id,
          userId,
          name: m.name,
          category: m.category,
          weight: m.weight,
          target: m.target,
          lowerIsBetter: m.lower_is_better ?? false,
          isPercentage: m.is_percentage ?? false
        }
      });
      metricIdMap[m.id] = metric.id;
    }

    // ----------------------------------------------------------------
    // 5. TASK ENTRIES
    // ----------------------------------------------------------------
    console.log(`Migrating ${db.taskEntries.length} task entries...`);
    for (const t of db.taskEntries) {
      const userId = userIdMap[t.user_id];
      if (!userId) { console.warn(`  ⚠️  Skipping task ${t.id} — user ${t.user_id} not found`); continue; }

      await prisma.taskEntry.upsert({
        where: { id: t.id },
        update: {},
        create: {
          id: t.id,
          userId,
          date: new Date(t.date),
          task: t.task,
          subTask: t.subtask ?? '',
          brand: t.brand,
          durationMinutes: t.duration_min ?? 0,
          status: t.status ?? 'pending',
          notes: t.notes ?? '',
          outputUrl: t.output_url ?? null,
          linkedKpiMetricId: t.linked_kpi_metric_id ? (metricIdMap[t.linked_kpi_metric_id] ?? null) : null,
          linkedKpiMetricName: t.linked_kpi_metric_name ?? null,
          submitted: t.submitted ?? false
        }
      });
    }

    // ----------------------------------------------------------------
    // 6. TIMESHEETS
    // ----------------------------------------------------------------
    console.log(`Migrating ${db.timesheets.length} timesheets...`);
    for (const s of db.timesheets) {
      const userId = userIdMap[s.user_id];
      if (!userId) { console.warn(`  ⚠️  Skipping timesheet ${s.id} — user ${s.user_id} not found`); continue; }

      const approverId = s.approver_id ? (userIdMap[s.approver_id] ?? null) : null;

      await prisma.timesheetDay.upsert({
        where: { id: s.id },
        update: {},
        create: {
          id: s.id,
          userId,
          date: new Date(s.date),
          totalLoggedMinutes: s.total_logged_min ?? 0,
          status: toTimesheetStatus(s.status),
          submittedAt: s.submitted_at ? new Date(s.submitted_at) : null,
          approverId,
          approverComment: s.approver_comment ?? null,
          approvedAt: s.approved_at ? new Date(s.approved_at) : null
        }
      });
    }

    // ----------------------------------------------------------------
    // 7. KPI ENTRIES
    // ----------------------------------------------------------------
    console.log(`Migrating ${db.kpiEntries.length} KPI entries...`);
    for (const e of db.kpiEntries) {
      const userId = userIdMap[e.user_id];
      const metricId = metricIdMap[e.metric_id];
      if (!userId || !metricId) { console.warn(`  ⚠️  Skipping kpiEntry ${e.id} — user or metric not found`); continue; }

      await prisma.kPIEntry.upsert({
        where: { id: e.id },
        update: {},
        create: {
          id: e.id,
          userId,
          metricId,
          month: e.month,
          week1: e.w1 ?? null,
          week2: e.w2 ?? null,
          week3: e.w3 ?? null,
          week4: e.w4 ?? null,
          monthlyValue: e.monthly_value ?? null,
          computedAchievement: e.computed_achievement ?? null
        }
      });
    }

    // ----------------------------------------------------------------
    // 8. KPI SCORES
    // ----------------------------------------------------------------
    console.log(`Migrating ${db.kpiScores.length} KPI scores...`);
    for (const sc of db.kpiScores) {
      const userId = userIdMap[sc.user_id];
      if (!userId) { console.warn(`  ⚠️  Skipping kpiScore ${sc.id} — user ${sc.user_id} not found`); continue; }

      await prisma.kPIScore.upsert({
        where: { id: sc.id },
        update: {},
        create: {
          id: sc.id,
          userId,
          month: sc.month,
          finalScore: sc.final_score,
          gateStatus: sc.gate_status
        }
      });
    }

    // ----------------------------------------------------------------
    // 9. CALENDAR EVENTS
    // ----------------------------------------------------------------
    console.log(`Migrating ${db.calendarEvents.length} calendar events...`);
    for (const ev of db.calendarEvents) {
      const userId = ev.user_id && ev.user_id !== 'all' ? (userIdMap[ev.user_id] ?? null) : null;

      await prisma.calendarEvent.upsert({
        where: { id: ev.id },
        update: {},
        create: {
          id: ev.id,
          userId,
          date: new Date(ev.date),
          type: ev.type,
          title: ev.title,
          status: ev.status ?? null
        }
      });
    }

    // ----------------------------------------------------------------
    // 10. INCENTIVE POOLS
    // ----------------------------------------------------------------
    console.log(`Migrating ${db.incentivePools.length} incentive pools...`);
    for (const p of db.incentivePools) {
      await prisma.incentivePool.upsert({
        where: { id: p.id },
        update: {},
        create: {
          id: p.id,
          brand: p.brand,
          month: p.month,
          poolAmount: p.pool_amount
        }
      });
    }

    // ----------------------------------------------------------------
    // 11. NOTIFICATIONS
    // ----------------------------------------------------------------
    console.log(`Migrating ${db.notifications.length} notifications...`);
    for (const n of db.notifications) {
      const userId = userIdMap[n.user_id];
      if (!userId) { console.warn(`  ⚠️  Skipping notification ${n.id} — user ${n.user_id} not found`); continue; }

      await prisma.notification.upsert({
        where: { id: n.id },
        update: {},
        create: {
          id: n.id,
          userId,
          type: n.type,
          message: n.message,
          read: n.read ?? false,
          createdAt: n.created_ts ? new Date(n.created_ts) : new Date()
        }
      });
    }

    console.log('🎉 Migration complete! All data moved to PostgreSQL.');

  } catch (error) {
    console.error('❌ Migration error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

startMigration();
