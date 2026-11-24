import { Router } from "express";
import { query } from "../db.js";

const router = Router();

const selectSql = `
  SELECT ec.*, e.staff_no, e.first_name, e.last_name,
         d.id AS department_id, d.name AS department_name
  FROM emergency_contacts ec
  JOIN employees e ON e.id=ec.employee_id
  LEFT JOIN departments d ON d.id=e.department_id
`;

router.get("/", async (req, res, next) => {
  try {
    const search = String(req.query.search || "").trim();
    const departmentId = req.query.department_id;
    const where = [];
    const params = [];
    if (search) {
      params.push(`%${search}%`);
      const i = params.length;
      where.push(`(ec.full_name ILIKE $${i} OR ec.phone ILIKE $${i} OR ec.email ILIKE $${i} OR e.first_name ILIKE $${i} OR e.last_name ILIKE $${i})`);
    }
    if (departmentId) {
      params.push(Number(departmentId));
      where.push(`e.department_id=$${params.length}`);
    }
    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
    const count = await query(`
      SELECT COUNT(*)::int AS total
      FROM emergency_contacts ec
      JOIN employees e ON e.id=ec.employee_id
      LEFT JOIN departments d ON d.id=e.department_id
      ${whereSql}
    `, params);
    const { rows } = await query(`${selectSql} ${whereSql} ORDER BY ec.is_primary DESC, ec.full_name ASC`, params);
    res.json({ data: rows, pagination: { total: count.rows[0].total } });
  } catch (err) {
    next(err);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const { employee_id, full_name, relationship, phone, email, address, is_primary } = req.body;
    if (!employee_id || !full_name || !phone) {
      return res.status(400).json({ error: "employee_id, full_name, and phone are required" });
    }
    if (is_primary) {
      await query("UPDATE emergency_contacts SET is_primary=FALSE WHERE employee_id=$1", [employee_id]);
    }
    const { rows } = await query(`
      INSERT INTO emergency_contacts
        (employee_id,full_name,relationship,phone,email,address,is_primary)
      VALUES ($1,$2,$3,$4,$5,$6,$7)
      RETURNING *
    `, [employee_id, full_name, relationship || null, phone, email || null, address || null, Boolean(is_primary)]);
    res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
});

router.put("/:id", async (req, res, next) => {
  try {
    const { employee_id, full_name, relationship, phone, email, address, is_primary } = req.body;
    if (!employee_id || !full_name || !phone) {
      return res.status(400).json({ error: "employee_id, full_name, and phone are required" });
    }
    if (is_primary) {
      await query("UPDATE emergency_contacts SET is_primary=FALSE WHERE employee_id=$1", [employee_id]);
    }
    const { rows } = await query(`
      UPDATE emergency_contacts
      SET employee_id=$1, full_name=$2, relationship=$3, phone=$4,
          email=$5, address=$6, is_primary=$7
      WHERE id=$8
      RETURNING *
    `, [employee_id, full_name, relationship || null, phone, email || null, address || null, Boolean(is_primary), req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: "Emergency contact not found" });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    const { rowCount } = await query("DELETE FROM emergency_contacts WHERE id=$1", [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: "Emergency contact not found" });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

export default router;
