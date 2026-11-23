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

router.get("/dashboard/summary", async (_req, res, next) => {
  try {
    const period = await query(`
      SELECT
        COALESCE(SUM(p.base_salary),0)::float AS gross_salary,
        COALESCE(SUM(p.allowances),0)::float AS allowances,
        COALESCE(SUM(p.deductions),0)::float AS deductions,
        COALESCE(SUM(p.net_pay),0)::float AS net_pay,
        COUNT(DISTINCT p.employee_id)::int AS employees,
        COUNT(*) FILTER (WHERE p.status='Paid')::int AS paid,
        COUNT(*) FILTER (WHERE p.status!='Paid')::int AS pending
      FROM payroll p
      WHERE p.period_month=EXTRACT(MONTH FROM CURRENT_DATE)::int
        AND p.period_year=EXTRACT(YEAR FROM CURRENT_DATE)::int
    `);
    const trends = await query(`
      SELECT period_year, period_month,
             SUM(base_salary)::float AS gross,
             SUM(net_pay)::float AS net,
             COUNT(*)::int AS employees
      FROM payroll
      GROUP BY period_year, period_month
      ORDER BY period_year DESC, period_month DESC
      LIMIT 6
    `);
    const recent = await query(`
      SELECT p.*, e.first_name, e.last_name, e.staff_no
      FROM payroll p JOIN employees e ON e.id=p.employee_id
      ORDER BY p.period_year DESC, p.period_month DESC, p.id DESC
      LIMIT 10
    `);
    res.json({
      ...period.rows[0],
      approved: period.rows[0].paid,
      progress: period.rows[0].employees ? Math.round(period.rows[0].paid / period.rows[0].employees * 100) : 0,
      trends: trends.rows.reverse(),
      recent: recent.rows,
    });
  } catch (err) { next(err); }
});

router.post("/calculate", async (req, res, next) => {
  try {
    const { employee_id } = req.body;
    if (!employee_id) return res.status(400).json({ error: "employee_id is required" });
    const result = await query(`
      SELECT e.id AS employee_id, e.staff_no, e.first_name, e.last_name,
             COALESCE(a.base_salary,e.salary,0)::float AS base_salary,
             COALESCE((SELECT SUM(amount) FROM salary_allowances WHERE employee_id=e.id AND is_active),0)::float AS allowances,
             COALESCE((SELECT SUM(amount) FROM salary_deductions WHERE employee_id=e.id AND is_active),0)::float AS deductions
      FROM employees e
      LEFT JOIN employee_salary_assignments a ON a.employee_id=e.id AND a.is_active
      WHERE e.id=$1
    `, [employee_id]);
    if (!result.rows[0]) return res.status(404).json({ error: "Employee not found" });
    const r = result.rows[0];
    const pension = Number((r.base_salary * 0.07).toFixed(2));
    const net = Math.max(0, r.base_salary + r.allowances - r.deductions - pension);
    res.json({ ...r, pension, net_pay: net });
  } catch (err) { next(err); }
});

router.post("/process", async (req, res, next) => {
  try {
    const periodMonth = req.body.period_month || new Date().getMonth() + 1;
    const periodYear = req.body.period_year || new Date().getFullYear();
    const employees = await query(`
      SELECT e.id AS employee_id, COALESCE(a.base_salary,e.salary,0) AS base_salary
      FROM employees e
      LEFT JOIN employee_salary_assignments a ON a.employee_id=e.id AND a.is_active
      WHERE e.status='Active'
    `);
    let created = 0;
    for (const e of employees.rows) {
      const extras = await query(`
        SELECT
          COALESCE((SELECT SUM(amount) FROM salary_allowances WHERE employee_id=$1 AND is_active),0) allowances,
          COALESCE((SELECT SUM(amount) FROM salary_deductions WHERE employee_id=$1 AND is_active),0) deductions
      `, [e.employee_id]);
      const base = Number(e.base_salary) || 0;
      const allowances = Number(extras.rows[0].allowances) || 0;
      const deductions = Number(extras.rows[0].deductions) + base * 0.07;
      const net = Math.max(0, base + allowances - deductions);
      const saved = await query(`
        INSERT INTO payroll
          (employee_id,period_month,period_year,base_salary,allowances,deductions,net_pay,status)
        VALUES ($1,$2,$3,$4,$5,$6,$7,'Pending')
        ON CONFLICT (employee_id,period_month,period_year) DO UPDATE
        SET base_salary=EXCLUDED.base_salary, allowances=EXCLUDED.allowances,
            deductions=EXCLUDED.deductions, net_pay=EXCLUDED.net_pay, updated_at=NOW()
        RETURNING id
      `, [e.employee_id, periodMonth, periodYear, base, allowances, deductions.toFixed(2), net.toFixed(2)]);
      if (saved.rows[0]) created++;
    }
    res.json({ success: true, created, period_month: periodMonth, period_year: periodYear });
  } catch (err) { next(err); }
});

router.patch("/:id/approve", async (req, res, next) => {
  try {
    const { rows } = await query(`
      UPDATE payroll SET approval_status='Approved', approved_by=$1, approved_at=NOW(), status='Processing', updated_at=NOW()
      WHERE id=$2 RETURNING *
    `, [req.body.approved_by || null, req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: "Payroll record not found" });
    res.json(rows[0]);
  } catch (err) { next(err); }
});

router.patch("/:id/disburse", async (req, res, next) => {
  try {
    const { bank_name, bank_reference } = req.body;
    const { rows } = await query(`
      UPDATE payroll SET bank_name=$1, bank_reference=$2, disbursement_status='Paid',
                        status='Paid', paid_date=CURRENT_DATE, updated_at=NOW()
      WHERE id=$3 RETURNING *
    `, [bank_name || null, bank_reference || null, req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: "Payroll record not found" });
    res.json(rows[0]);
  } catch (err) { next(err); }
});

router.get("/reports/summary", async (_req, res, next) => {
  try {
    const { rows } = await query(`
      SELECT period_year, period_month, COUNT(*)::int AS employees,
             SUM(base_salary)::float AS gross_salary,
             SUM(allowances)::float AS allowances,
             SUM(deductions)::float AS deductions,
             SUM(net_pay)::float AS net_salary
      FROM payroll
      GROUP BY period_year, period_month
      ORDER BY period_year DESC, period_month DESC
    `);
    res.json(rows);
  } catch (err) { next(err); }
});

export default router;
