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

    res.json({
      ...totals.rows[0],
      department_count: byDepartment.rows.length,
      by_department: byDepartment.rows,
      by_role: byRole.rows,
      recent_hires: recentHires.rows,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
