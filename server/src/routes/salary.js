import { Router } from "express";
import { pool, query } from "../db.js";

const router = Router();

router.get("/grades", async (_req, res, next) => {
  try {
    const { rows } = await query(`
      SELECT g.*, COALESCE(json_agg(
        json_build_object('id', s.id, 'step_number', s.step_number, 'amount', s.amount,
                          'effective_date', s.effective_date)
        ORDER BY s.step_number
      ) FILTER (WHERE s.id IS NOT NULL), '[]') AS steps
      FROM jobgrades g
      LEFT JOIN salary_scales s ON s.grade_id = g.id
      GROUP BY g.id
      ORDER BY g.grade_level
    `);
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

router.put("/grades/:id", async (req, res, next) => {
  const { name, code, grade_level, min_salary, midpoint_salary, max_salary, currency = "USD", effective_date } = req.body;
  if (!name || !code || !grade_level || min_salary == null || midpoint_salary == null || max_salary == null) {
    return res.status(400).json({ error: "name, code, grade_level, min_salary, midpoint_salary, and max_salary are required" });
  }
  if (Number(min_salary) > Number(midpoint_salary) || Number(midpoint_salary) > Number(max_salary)) {
    return res.status(400).json({ error: "Salary range must satisfy minimum <= midpoint <= maximum" });
  }

  try {
    const { rows } = await query(`
      UPDATE jobgrades
      SET name=$1, code=$2, grade_level=$3, min_salary=$4, midpoint_salary=$5, max_salary=$6,
          currency=$7, effective_date=COALESCE($8::date,effective_date), version=version+1, updated_at=NOW()
      WHERE id=$9
      RETURNING *
    `, [name, code, Number(grade_level), min_salary, midpoint_salary, max_salary, currency, effective_date || null, req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: "Salary grade not found" });
    res.json(rows[0]);
  } catch (err) {
    if (err.code === "23505") return res.status(409).json({ error: "Grade name or code already exists" });
    next(err);
  }
});

router.post("/grades", async (req, res, next) => {
  const { name, code, grade_level, min_salary, midpoint_salary, max_salary, currency = "USD", effective_date } = req.body;
  if (!name || !code || !grade_level || min_salary == null || midpoint_salary == null || max_salary == null) {
    return res.status(400).json({ error: "Missing required salary grade fields" });
  }
  if (Number(min_salary) > Number(midpoint_salary) || Number(midpoint_salary) > Number(max_salary)) {
    return res.status(400).json({ error: "Salary range must satisfy minimum <= midpoint <= maximum" });
  }
  try {
    const { rows } = await query(`
      INSERT INTO jobgrades
        (name, code, grade_level, min_salary, midpoint_salary, max_salary, currency, effective_date)
      VALUES ($1,$2,$3,$4,$5,$6,$7,COALESCE($8::date,CURRENT_DATE))
      RETURNING *
    `, [name, code, Number(grade_level), min_salary, midpoint_salary, max_salary, currency, effective_date || null]);
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === "23505") return res.status(409).json({ error: "Grade name or code already exists" });
    next(err);
  }
});

router.post("/assignments", async (req, res, next) => {
  const { employee_id, grade_id, step_number = 1, effective_date } = req.body;
  if (!employee_id || !grade_id) return res.status(400).json({ error: "employee_id and grade_id are required" });
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const grade = await client.query("SELECT * FROM jobgrades WHERE id=$1", [grade_id]);
    if (!grade.rows[0]) return res.status(404).json({ error: "Salary grade not found" });

    let scale = await client.query(
      "SELECT * FROM salary_scales WHERE grade_id=$1 AND step_number=$2 ORDER BY effective_date DESC LIMIT 1",
      [grade_id, step_number]
    );
    let baseSalary = scale.rows[0]?.amount;
    if (!baseSalary) {
      const min = Number(grade.rows[0].min_salary);
      const max = Number(grade.rows[0].max_salary);
      baseSalary = (min + ((max - min) / 4) * (Number(step_number) - 1)).toFixed(2);
    }

    await client.query(
      "UPDATE employee_salary_assignments SET is_active=FALSE, end_date=COALESCE(end_date,CURRENT_DATE) WHERE employee_id=$1 AND is_active",
      [employee_id]
    );
    const assigned = await client.query(`
      INSERT INTO employee_salary_assignments
        (employee_id, grade_id, scale_id, step_number, base_salary, effective_date)
      VALUES ($1,$2,$3,$4,$5,COALESCE($6::date,CURRENT_DATE))
      RETURNING *
    `, [employee_id, grade_id, scale.rows[0]?.id || null, Number(step_number), baseSalary, effective_date || null]);
    await client.query("UPDATE employees SET salary=$1, updated_at=NOW() WHERE id=$2", [baseSalary, employee_id]);
    await client.query("COMMIT");
    res.status(201).json(assigned.rows[0]);
  } catch (err) {
    await client.query("ROLLBACK");
    next(err);
  } finally {
    client.release();
  }
});

router.get("/assignments", async (_req, res, next) => {
  try {
    const { rows } = await query(`
      SELECT a.*, e.staff_no, e.first_name, e.last_name, g.name AS grade_name, g.code AS grade_code
      FROM employee_salary_assignments a
      JOIN employees e ON e.id=a.employee_id
      JOIN jobgrades g ON g.id=a.grade_id
      ORDER BY a.is_active DESC, a.created_at DESC
    `);
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

router.post("/increments", async (req, res, next) => {
  const { employee_id, new_grade_id, new_step, effective_date, reason } = req.body;
  if (!employee_id || !new_grade_id || !effective_date) {
    return res.status(400).json({ error: "employee_id, new_grade_id, and effective_date are required" });
  }
  try {
    const current = await query(`
      SELECT a.*, g.name AS current_grade_name
      FROM employee_salary_assignments a
      JOIN jobgrades g ON g.id=a.grade_id
      WHERE a.employee_id=$1 AND a.is_active
    `, [employee_id]);
    const scale = await query(
      "SELECT amount FROM salary_scales WHERE grade_id=$1 AND step_number=$2 ORDER BY effective_date DESC LIMIT 1",
      [new_grade_id, new_step || 1]
    );
    const previousSalary = current.rows[0]?.base_salary || 0;
    const newSalary = scale.rows[0]?.amount || previousSalary;
    const { rows } = await query(`
      INSERT INTO salary_increment_history
        (employee_id, previous_grade_id, new_grade_id, previous_step, new_step,
         previous_salary, new_salary, effective_date, reason, status)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'Pending')
      RETURNING *
    `, [
      employee_id,
      current.rows[0]?.grade_id || null,
      new_grade_id,
      current.rows[0]?.step_number || null,
      new_step || 1,
      previousSalary,
      newSalary,
      effective_date,
      reason || null,
    ]);
    res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
});

router.patch("/increments/:id/approve", async (req, res, next) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const increment = await client.query("SELECT * FROM salary_increment_history WHERE id=$1", [req.params.id]);
    if (!increment.rows[0]) return res.status(404).json({ error: "Increment request not found" });
    const row = increment.rows[0];
    await client.query(
      "UPDATE salary_increment_history SET status='Approved', approved_at=NOW(), approved_by=$1 WHERE id=$2",
      [req.body.approved_by || null, row.id]
    );
    await client.query(
      "UPDATE employee_salary_assignments SET is_active=FALSE, end_date=$1 WHERE employee_id=$2 AND is_active",
      [row.effective_date, row.employee_id]
    );
    await client.query(`
      INSERT INTO employee_salary_assignments
        (employee_id, grade_id, step_number, base_salary, effective_date)
      VALUES ($1,$2,$3,$4,$5)
    `, [row.employee_id, row.new_grade_id, row.new_step, row.new_salary, row.effective_date]);
    await client.query("UPDATE employees SET salary=$1, updated_at=NOW() WHERE id=$2", [row.new_salary, row.employee_id]);
    await client.query("COMMIT");
    res.json({ ...row, status: "Approved" });
  } catch (err) {
    await client.query("ROLLBACK");
    next(err);
  } finally {
    client.release();
  }
});

router.get("/increments", async (_req, res, next) => {
  try {
    const { rows } = await query(`
      SELECT h.*, e.staff_no, e.first_name, e.last_name,
             pg.name AS previous_grade, ng.name AS new_grade
      FROM salary_increment_history h
      JOIN employees e ON e.id=h.employee_id
      LEFT JOIN jobgrades pg ON pg.id=h.previous_grade_id
      LEFT JOIN jobgrades ng ON ng.id=h.new_grade_id
      ORDER BY h.created_at DESC
    `);
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

router.get("/report", async (_req, res, next) => {
  try {
    const { rows } = await query(`
      SELECT g.name AS grade, g.code, g.grade_level, g.version,
             g.min_salary, g.midpoint_salary, g.max_salary, g.currency,
             COUNT(a.id) FILTER (WHERE a.is_active) AS assigned_employees,
             COALESCE(AVG(a.base_salary) FILTER (WHERE a.is_active),0)::float AS average_salary
      FROM jobgrades g
      LEFT JOIN employee_salary_assignments a ON a.grade_id=g.id
      GROUP BY g.id
      ORDER BY g.grade_level
    `);
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

router.post("/steps/:gradeId", async (req, res, next) => {
  const { step_number, amount, effective_date } = req.body;
  if (!step_number || amount == null) return res.status(400).json({ error: "step_number and amount are required" });
  try {
    const { rows } = await query(`
      INSERT INTO salary_scales
        (name, grade_id, step_number, amount, effective_date)
      VALUES ($1,$2,$3,$4,COALESCE($5::date,CURRENT_DATE))
      ON CONFLICT (grade_id, step_number, effective_date)
      DO UPDATE SET amount=EXCLUDED.amount, updated_at=NOW()
      RETURNING *
    `, [`Grade ${req.params.gradeId} - Step ${step_number}`, req.params.gradeId, Number(step_number), amount, effective_date || null]);
    res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
});

router.get("/allowances/:employeeId", async (req, res, next) => {
  try {
    const { rows } = await query("SELECT * FROM salary_allowances WHERE employee_id=$1 ORDER BY is_active DESC, name", [req.params.employeeId]);
    res.json(rows);
  } catch (err) { next(err); }
});

router.post("/allowances", async (req, res, next) => {
  const { employee_id, name, amount, is_taxable = true, effective_date } = req.body;
  if (!employee_id || !name || amount == null) return res.status(400).json({ error: "employee_id, name, and amount are required" });
  try {
    const { rows } = await query(`
      INSERT INTO salary_allowances (employee_id,name,amount,is_taxable,effective_date)
      VALUES ($1,$2,$3,$4,COALESCE($5::date,CURRENT_DATE)) RETURNING *
    `, [employee_id, name, amount, is_taxable, effective_date || null]);
    res.status(201).json(rows[0]);
  } catch (err) { next(err); }
});

router.get("/deductions/:employeeId", async (req, res, next) => {
  try {
    const { rows } = await query("SELECT * FROM salary_deductions WHERE employee_id=$1 ORDER BY is_active DESC, name", [req.params.employeeId]);
    res.json(rows);
  } catch (err) { next(err); }
});

router.post("/deductions", async (req, res, next) => {
  const { employee_id, name, amount, effective_date } = req.body;
  if (!employee_id || !name || amount == null) return res.status(400).json({ error: "employee_id, name, and amount are required" });
  try {
    const { rows } = await query(`
      INSERT INTO salary_deductions (employee_id,name,amount,effective_date)
      VALUES ($1,$2,$3,COALESCE($4::date,CURRENT_DATE)) RETURNING *
    `, [employee_id, name, amount, effective_date || null]);
    res.status(201).json(rows[0]);
  } catch (err) { next(err); }
});

router.patch("/increments/:id/reject", async (req, res, next) => {
  try {
    const { rows } = await query(
      "UPDATE salary_increment_history SET status='Rejected', approved_by=$1, approved_at=NOW() WHERE id=$2 RETURNING *",
      [req.body.approved_by || null, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: "Increment request not found" });
    res.json(rows[0]);
  } catch (err) { next(err); }
});

export default router;
