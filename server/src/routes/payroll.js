import { Router } from "express";
import { query } from "../db.js";

const router = Router();

const SELECT_WITH_EMP = `
  SELECT p.*, 
         e.staff_no, e.first_name, e.last_name, e.position, e.salary AS employee_base_salary,
         d.name AS department_name
    FROM payroll p
    JOIN employees e ON e.id = p.employee_id
    LEFT JOIN departments d ON d.id = e.department_id
`;

function computeNet(base, allowances, deductions) {
  const b = Number(base) || 0;
  const a = Number(allowances) || 0;
  const d = Number(deductions) || 0;
  return Math.max(0, b + a - d);
}

function normalize(body) {
  const base = body.base_salary ?? body.baseSalary ?? 0;
  const allowances = body.allowances ?? 0;
  const deductions = body.deductions ?? 0;
  const net = body.net_pay ?? body.netPay ?? computeNet(base, allowances, deductions);

  return {
    employee_id: body.employee_id ? Number(body.employee_id) : null,
    period_month: body.period_month ? Number(body.period_month) : null,
    period_year: body.period_year ? Number(body.period_year) : null,
    base_salary: base,
    allowances,
    deductions,
    net_pay: net,
    status: body.status || "Pending",
    paid_date: body.paid_date || body.paidDate || null,
    notes: body.notes || null,
  };
}

function validate(n) {
  if (!n.employee_id) return "employee_id is required";
  if (!n.period_month || n.period_month < 1 || n.period_month > 12) return "period_month must be 1-12";
  if (!n.period_year || n.period_year < 2000 || n.period_year > 2100) return "period_year must be 2000-2100";
  if (n.status && !["Pending", "Processing", "Paid"].includes(n.status)) {
    return "status must be Pending, Processing, or Paid";
  }
  if (n.paid_date && isNaN(Date.parse(n.paid_date))) return "paid_date must be a valid date";
  return null;
}

// GET /api/payroll
router.get("/", async (req, res, next) => {
  try {
    const {
      employee_id = "",
      period_month = "",
      period_year = "",
      status = "",
      search = "",
      page = "1",
      limit = "10",
      sort = "period_year",
      order = "desc",
    } = req.query;

    const allowed = new Set([
      "period_year",
      "period_month",
      "net_pay",
      "base_salary",
      "allowances",
      "deductions",
      "status",
      "paid_date",
      "created_at",
      "last_name",
      "first_name",
      "staff_no",
    ]);
    const sortCol = allowed.has(sort) ? sort : "period_year";
    const sortOrder = order.toLowerCase() === "asc" ? "ASC" : "DESC";
    const sortSql = sortCol.startsWith("e.") || sortCol.startsWith("d.")
      ? `${sortCol} ${sortOrder}`
      : `p.${sortCol} ${sortOrder}`;

    const where = [];
    const params = [];

    if (employee_id) {
      params.push(Number(employee_id));
      where.push(`p.employee_id = $${params.length}`);
    }
    if (period_month) {
      params.push(Number(period_month));
      where.push(`p.period_month = $${params.length}`);
    }
    if (period_year) {
      params.push(Number(period_year));
      where.push(`p.period_year = $${params.length}`);
    }
    if (status) {
      params.push(status);
      where.push(`p.status = $${params.length}`);
    }
    if (search) {
      params.push(`%${search}%`);
      const i = params.length;
      where.push(
        `(e.first_name ILIKE $${i} OR e.last_name ILIKE $${i} OR e.staff_no ILIKE $${i} OR e.position ILIKE $${i} OR d.name ILIKE $${i})`
      );
    }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const count = await query(
      `SELECT COUNT(*)::int AS total
         FROM payroll p
         JOIN employees e ON e.id = p.employee_id
         LEFT JOIN departments d ON d.id = e.department_id
         ${whereSql}`,
      params
    );
    const total = count.rows[0].total;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
    const offset = (pageNum - 1) * pageSize;

    const listParams = [...params, pageSize, offset];
    const { rows } = await query(
      `${SELECT_WITH_EMP}
       ${whereSql}
       ORDER BY ${sortSql}
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

// GET /api/payroll/:id
router.get("/:id", async (req, res, next) => {
  try {
    const { rows } = await query(`${SELECT_WITH_EMP} WHERE p.id = $1`, [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: "Payroll record not found" });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

// POST /api/payroll
router.post("/", async (req, res, next) => {
  try {
    const n = normalize(req.body);
    const err = validate(n);
    if (err) return res.status(400).json({ error: err });

    const { rows } = await query(
      `INSERT INTO payroll
        (employee_id, period_month, period_year, base_salary, allowances, deductions, net_pay, status, paid_date, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       RETURNING *`,
      [
        n.employee_id,
        n.period_month,
        n.period_year,
        n.base_salary,
        n.allowances,
        n.deductions,
        n.net_pay,
        n.status,
        n.paid_date,
        n.notes,
      ]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === "23505") {
      return res.status(409).json({ error: "Payroll already exists for this employee and period" });
    }
    next(err);
  }
});

// PUT /api/payroll/:id
router.put("/:id", async (req, res, next) => {
  try {
    const n = normalize(req.body);
    const err = validate(n);
    if (err) return res.status(400).json({ error: err });

    const { rows } = await query(
      `UPDATE payroll
          SET employee_id = $1,
              period_month = $2,
              period_year = $3,
              base_salary = $4,
              allowances = $5,
              deductions = $6,
              net_pay = $7,
              status = $8,
              paid_date = $9,
              notes = $10,
              updated_at = NOW()
        WHERE id = $11
        RETURNING *`,
      [
        n.employee_id,
        n.period_month,
        n.period_year,
        n.base_salary,
        n.allowances,
        n.deductions,
        n.net_pay,
        n.status,
        n.paid_date,
        n.notes,
        req.params.id,
      ]
    );
    if (!rows[0]) return res.status(404).json({ error: "Payroll record not found" });
    res.json(rows[0]);
  } catch (err) {
    if (err.code === "23505") {
      return res.status(409).json({ error: "Payroll already exists for this employee and period" });
    }
    next(err);
  }
});

// DELETE /api/payroll/:id
router.delete("/:id", async (req, res, next) => {
  try {
    const { rowCount } = await query("DELETE FROM payroll WHERE id = $1", [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: "Payroll record not found" });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

export default router;
