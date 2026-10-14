import { Router } from "express";
import { query } from "../db.js";

const router = Router();

const SELECT_WITH_EMPLOYEE = `
  SELECT a.id, a.employee_id, a.date, a.status, a.check_in, a.check_out, a.notes, a.created_at,
         e.first_name, e.last_name, e.staff_no, e.position,
         d.name AS department_name, d.code AS department_code
    FROM attendance a
    JOIN employees e ON e.id = a.employee_id
    LEFT JOIN departments d ON d.id = e.department_id
`;

// GET /api/attendance?search=&from=&to=&employee_id=&department_id=&status=&page=&limit=&sort=&order=
router.get("/", async (req, res, next) => {
  try {
    const {
      search = "",
      from = "",
      to = "",
      employee_id = "",
      department_id = "",
      status = "",
      page = "1",
      limit = "10",
      sort = "date",
      order = "desc",
    } = req.query;

    const allowedSort = new Set(["date", "status", "first_name", "last_name", "created_at"]);
    const sortCol = allowedSort.has(sort) ? sort : "date";
    const sortOrder = order.toLowerCase() === "asc" ? "ASC" : "DESC";
    const sortExpr = sortCol === "first_name" || sortCol === "last_name" ? `e.${sortCol}` : `a.${sortCol}`;

    const where = [];
    const params = [];

    if (from) {
      params.push(from);
      where.push(`a.date >= $${params.length}`);
    }
    if (to) {
      params.push(to);
      where.push(`a.date <= $${params.length}`);
    }
    if (employee_id) {
      params.push(Number(employee_id));
      where.push(`a.employee_id = $${params.length}`);
    }
    if (department_id) {
      params.push(Number(department_id));
      where.push(`e.department_id = $${params.length}`);
    }
    if (status) {
      params.push(status);
      where.push(`a.status = $${params.length}`);
    }
    if (search) {
      params.push(`%${search}%`);
      const i = params.length;
      where.push(`(e.first_name ILIKE $${i} OR e.last_name ILIKE $${i} OR e.staff_no ILIKE $${i})`);
    }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const countResult = await query(
      `SELECT COUNT(*)::int AS total
         FROM attendance a
         JOIN employees e ON e.id = a.employee_id
         ${whereSql}`,
      params
    );
    const total = countResult.rows[0].total;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
    const offset = (pageNum - 1) * pageSize;

    const listParams = [...params, pageSize, offset];
    const { rows } = await query(
      `${SELECT_WITH_EMPLOYEE}
       ${whereSql}
       ORDER BY ${sortExpr} ${sortOrder}, a.id ${sortOrder}
       LIMIT $${listParams.length - 1} OFFSET $${listParams.length}`,
      listParams
    );

    res.json({
      data: rows,
      pagination: {
        total,
        page: pageNum,
        limit: pageSize,
        pages: Math.max(1, Math.ceil(total / pageSize)),
      },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/attendance/summary?from=&to=&department_id=
router.get("/summary", async (req, res, next) => {
  try {
    const { from = "", to = "", department_id = "" } = req.query;

    const where = [];
    const params = [];
    if (from) {
      params.push(from);
      where.push(`a.date >= $${params.length}`);
    }
    if (to) {
      params.push(to);
      where.push(`a.date <= $${params.length}`);
    }
    if (department_id) {
      params.push(Number(department_id));
      where.push(`e.department_id = $${params.length}`);
    }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const { rows } = await query(
      `SELECT
         COUNT(*)::int                                         AS total,
         COUNT(*) FILTER (WHERE a.status = 'Present')::int     AS present,
         COUNT(*) FILTER (WHERE a.status = 'Late')::int        AS late,
         COUNT(*) FILTER (WHERE a.status = 'Absent')::int      AS absent,
         COUNT(*) FILTER (WHERE a.status = 'On Leave')::int    AS on_leave,
         COUNT(*) FILTER (WHERE a.status = 'Remote')::int      AS remote
         FROM attendance a
         JOIN employees e ON e.id = a.employee_id
         ${whereSql}`,
      params
    );

    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

const STATUSES = ["Present", "Late", "Absent", "On Leave", "Remote"];

// POST /api/attendance
router.post("/", async (req, res, next) => {
  try {
    const { employee_id, date, status = "Present", check_in, check_out, notes } = req.body;
    if (!employee_id || !date) {
      return res.status(400).json({ error: "employee_id and date are required" });
    }
    if (!STATUSES.includes(status)) {
      return res.status(400).json({ error: "Invalid attendance status" });
    }

    const { rows } = await query(
      `INSERT INTO attendance (employee_id, date, status, check_in, check_out, notes)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [Number(employee_id), date, status, check_in || null, check_out || null, notes || null]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === "23505") {
      return res.status(409).json({ error: "Attendance for this employee and date already exists" });
    }
    if (err.code === "23503") {
      return res.status(400).json({ error: "Selected employee no longer exists" });
    }
    next(err);
  }
});

// PUT /api/attendance/:id
router.put("/:id", async (req, res, next) => {
  try {
    const { employee_id, date, status = "Present", check_in, check_out, notes } = req.body;
    if (!employee_id || !date) {
      return res.status(400).json({ error: "employee_id and date are required" });
    }
    if (!STATUSES.includes(status)) {
      return res.status(400).json({ error: "Invalid attendance status" });
    }

    const { rows } = await query(
      `UPDATE attendance
          SET employee_id = $1, date = $2, status = $3, check_in = $4, check_out = $5, notes = $6
        WHERE id = $7
        RETURNING *`,
      [Number(employee_id), date, status, check_in || null, check_out || null, notes || null, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: "Attendance record not found" });
    res.json(rows[0]);
  } catch (err) {
    if (err.code === "23505") {
      return res.status(409).json({ error: "Attendance for this employee and date already exists" });
    }
    next(err);
  }
});

// DELETE /api/attendance/:id
router.delete("/:id", async (req, res, next) => {
  try {
    const { rowCount } = await query("DELETE FROM attendance WHERE id = $1", [req.params.id]);
    if (rowCount === 0) return res.status(404).json({ error: "Attendance record not found" });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

export default router;
