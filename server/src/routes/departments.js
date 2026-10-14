import { Router } from "express";
import { query } from "../db.js";

const router = Router();

// GET /api/departments  (with employee counts)
router.get("/", async (_req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT d.*,
              COUNT(e.id)::int AS employee_count
         FROM departments d
         LEFT JOIN employees e ON e.department_id = d.id
        GROUP BY d.id
        ORDER BY d.name ASC`
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// GET /api/departments/:id
router.get("/:id", async (req, res, next) => {
  try {
    const { rows } = await query("SELECT * FROM departments WHERE id = $1", [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: "Department not found" });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

// POST /api/departments
router.post("/", async (req, res, next) => {
  try {
    const { name, code, head, location, description } = req.body;
    if (!name || !code) {
      return res.status(400).json({ error: "name and code are required" });
    }
    const { rows } = await query(
      `INSERT INTO departments (name, code, head, location, description)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [name.trim(), code.trim(), head || null, location || null, description || null]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === "23505") {
      return res.status(409).json({ error: "A department with that name or code already exists" });
    }
    next(err);
  }
});

// PUT /api/departments/:id
router.put("/:id", async (req, res, next) => {
  try {
    const { name, code, head, location, description } = req.body;
    const { rows } = await query(
      `UPDATE departments
          SET name = $1, code = $2, head = $3, location = $4, description = $5
        WHERE id = $6
        RETURNING *`,
      [name, code, head || null, location || null, description || null, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: "Department not found" });
    res.json(rows[0]);
  } catch (err) {
    if (err.code === "23505") {
      return res.status(409).json({ error: "A department with that name or code already exists" });
    }
    next(err);
  }
});

// DELETE /api/departments/:id
router.delete("/:id", async (req, res, next) => {
  try {
    const { rowCount } = await query("DELETE FROM departments WHERE id = $1", [req.params.id]);
    if (rowCount === 0) return res.status(404).json({ error: "Department not found" });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

export default router;
