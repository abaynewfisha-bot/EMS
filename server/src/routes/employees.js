import { Router } from "express";
import { query } from "../db.js";

const router = Router();

const SELECT_WITH_DEPT = `
  SELECT e.*, d.name AS department_name, d.code AS department_code
    FROM employees e
    LEFT JOIN departments d ON d.id = e.department_id
`;

// GET /api/employees?search=&department_id=&status=&role_type=&page=&limit=&sort=
router.get("/", async (req, res, next) => {
  try {
    const {
      search = "",
      department_id = "",
      status = "",
      role_type = "",
      page = "1",
      limit = "10",
      sort = "created_at",
      order = "desc",
    } = req.query;

    const allowedSort = new Set(["created_at", "first_name", "last_name", "salary", "hire_date", "position"]);
    const sortCol = allowedSort.has(sort) ? sort : "created_at";
    const sortOrder = order.toLowerCase() === "asc" ? "ASC" : "DESC";

    const where = [];
    const params = [];

    if (search) {
      params.push(`%${search}%`);
      const i = params.length;
      where.push(
        `(e.first_name ILIKE $${i} OR e.last_name ILIKE $${i} OR e.email ILIKE $${i}
          OR e.staff_no ILIKE $${i} OR e.position ILIKE $${i})`
      );
    }
    if (department_id) {
      params.push(Number(department_id));
      where.push(`e.department_id = $${params.length}`);
    }
    if (status) {
      params.push(status);
      where.push(`e.status = $${params.length}`);
    }
    if (role_type) {
      params.push(role_type);
      where.push(`e.role_type = $${params.length}`);
    }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const countResult = await query(
      `SELECT COUNT(*)::int AS total FROM employees e ${whereSql}`,
      params
    );
    const total = countResult.rows[0].total;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
    const offset = (pageNum - 1) * pageSize;

    const listParams = [...params, pageSize, offset];
    const { rows } = await query(
      `${SELECT_WITH_DEPT}
       ${whereSql}
       ORDER BY e.${sortCol} ${sortOrder}
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

// GET /api/employees/:id
router.get("/:id", async (req, res, next) => {
  try {
    const { rows } = await query(`${SELECT_WITH_DEPT} WHERE e.id = $1`, [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: "Employee not found" });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

function validate(body) {
  const required = ["first_name", "last_name", "email", "position", "staff_no"];
  for (const field of required) {
    if (!body[field] || String(body[field]).trim() === "") {
      return `Field "${field}" is required`;
    }
  }
  return null;
}

function normalize(body) {
  return [
    body.staff_no?.trim(),
    body.first_name?.trim(),
    body.last_name?.trim(),
    body.email?.trim().toLowerCase(),
    body.phone || null,
    body.gender || null,
    body.position?.trim(),
    body.role_type || "Staff",
    body.employment_type || "Full-time",
    body.status || "Active",
    body.salary ?? 0,
    body.hire_date || new Date().toISOString().slice(0, 10),
    body.address || null,
    body.department_id ? Number(body.department_id) : null,
  ];
}

// POST /api/employees
router.post("/", async (req, res, next) => {
  try {
    const error = validate(req.body);
    if (error) return res.status(400).json({ error });

    const values = normalize(req.body);
    const { rows } = await query(
      `INSERT INTO employees
        (staff_no, first_name, last_name, email, phone, gender, position, role_type,
         employment_type, status, salary, hire_date, address, department_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
       RETURNING *`,
      values
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === "23505") {
      return res.status(409).json({ error: "Staff number or email already exists" });
    }
    next(err);
  }
});

// PUT /api/employees/:id
router.put("/:id", async (req, res, next) => {
  try {
    const error = validate(req.body);
    if (error) return res.status(400).json({ error });

    const values = normalize(req.body);
    const { rows } = await query(
      `UPDATE employees
          SET staff_no = $1, first_name = $2, last_name = $3, email = $4, phone = $5,
              gender = $6, position = $7, role_type = $8, employment_type = $9,
              status = $10, salary = $11, hire_date = $12, address = $13, department_id = $14
        WHERE id = $15
        RETURNING *`,
      [...values, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: "Employee not found" });
    res.json(rows[0]);
  } catch (err) {
    if (err.code === "23505") {
      return res.status(409).json({ error: "Staff number or email already exists" });
    }
    next(err);
  }
});

// DELETE /api/employees/:id
router.delete("/:id", async (req, res, next) => {
  try {
    const { rowCount } = await query("DELETE FROM employees WHERE id = $1", [req.params.id]);
    if (rowCount === 0) return res.status(404).json({ error: "Employee not found" });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

export default router;
