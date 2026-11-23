import { Router } from "express";
import { query } from "../db.js";

const router = Router();

// GET /api/dashboard/stats
router.get("/stats", async (_req, res, next) => {
  try {
    const totals = await query(`
      SELECT
        COUNT(*)::int                                              AS total_employees,
        COUNT(*) FILTER (WHERE status = 'Active')::int             AS active,
        COUNT(*) FILTER (WHERE status = 'On Leave')::int           AS on_leave,
        COUNT(*) FILTER (WHERE role_type = 'Faculty')::int         AS faculty,
        COUNT(*) FILTER (WHERE role_type = 'Staff')::int           AS staff,
        COUNT(*) FILTER (WHERE role_type = 'Admin')::int           AS admin,
        COALESCE(SUM(salary), 0)::float                            AS total_salary,
        COALESCE(AVG(salary), 0)::float                            AS avg_salary
        FROM employees
    `);

    const byDepartment = await query(`
      SELECT d.id, d.name, d.code,
             COUNT(e.id)::int AS employee_count,
             COALESCE(SUM(e.salary), 0)::float AS total_salary
        FROM departments d
        LEFT JOIN employees e ON e.department_id = d.id
       GROUP BY d.id
       ORDER BY employee_count DESC, d.name ASC
    `);

    const byRole = await query(`
      SELECT role_type AS role, COUNT(*)::int AS count
        FROM employees
       GROUP BY role_type
       ORDER BY count DESC
    `);

    const recentHires = await query(`
      SELECT e.id, e.first_name, e.last_name, e.position, e.hire_date,
             d.name AS department_name
        FROM employees e
        LEFT JOIN departments d ON d.id = e.department_id
       ORDER BY e.hire_date DESC
       LIMIT 5
    `);

    const activity = await query(`
      SELECT month_key, month_number,
             SUM(present_count)::int AS present,
             SUM(attendance_count)::int AS total
      FROM (
        SELECT TO_CHAR(date, 'Mon') AS month_key,
               EXTRACT(MONTH FROM date) AS month_number,
               COUNT(*) FILTER (WHERE status IN ('Present','Late','Remote'))::int AS present_count,
               COUNT(*)::int AS attendance_count
        FROM attendance
        WHERE date >= CURRENT_DATE - INTERVAL '10 months'
        GROUP BY TO_CHAR(date, 'Mon'), EXTRACT(MONTH FROM date)
      ) attendance_months
      GROUP BY month_key, month_number
      ORDER BY month_number
    `);

    const pending = await query(`
      SELECT 'Leave Request' AS type, e.first_name || ' ' || e.last_name AS employee,
             lr.created_at AS date, lr.status, lr.id
      FROM leave_requests lr
      JOIN employees e ON e.id=lr.employee_id
      UNION ALL
      SELECT 'Contract Renewal', e.first_name || ' ' || e.last_name,
             c.created_at, c.status, c.id
      FROM contracts c
      JOIN employees e ON e.id=c.employee_id
      UNION ALL
      SELECT 'Overtime', e.first_name || ' ' || e.last_name,
             a.created_at, a.status, a.id
      FROM attendance a
      JOIN employees e ON e.id=a.employee_id
      WHERE a.status='Late'
      ORDER BY date DESC
      LIMIT 8
    `);

    res.json({
      ...totals.rows[0],
      department_count: byDepartment.rows.length,
      by_department: byDepartment.rows,
      by_role: byRole.rows,
      recent_hires: recentHires.rows,
      attendance_growth: activity.rows,
      pending_requests: pending.rows,
      on_leave_today: totals.rows[0].on_leave,
      pending_approvals: pending.rows.length,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
