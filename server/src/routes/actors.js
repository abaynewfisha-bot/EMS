import { Router } from "express";
import { query } from "../db.js";

const router = Router();

const actors = {
  users: { table: "users", select: "id, username, email, role, is_active, last_login_at, created_at" },
  "refresh-tokens": { table: "refresh_tokens", select: "id, user_id, expires_at, revoked_at, created_at" },
  positions: { table: "positions", select: "*" },
  jobgrades: { table: "jobgrades", select: "*" },
  faculty: { table: "faculty", select: "*" },
  contracts: { table: "contracts", select: "*" },
  "employment-history": { table: "employment_history", select: "*" },
  education: { table: "education", select: "*" },
  "emergency-contacts": { table: "emergency_contacts", select: "*" },
  documents: { table: "documents", select: "*" },
  "leave-types": { table: "leave_types", select: "*" },
  "leave-balances": { table: "leave_balances", select: "*" },
  "leave-requests": { table: "leave_requests", select: "*" },
  "salary-scales": { table: "salary_scales", select: "*" },
  "performance-reviews": { table: "performance_reviews", select: "*" },
  publications: { table: "publications", select: "*" },
  "teaching-assignment": { table: "teaching_assignments", select: "*" },
  "teaching-assignments": { table: "teaching_assignments", select: "*" },
  "audit-log": { table: "audit_log", select: "*" },
};

router.get("/:actor", async (req, res, next) => {
  try {
    const actor = actors[req.params.actor];
    if (!actor) return res.status(404).json({ error: "Actor not found" });

    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 20));
    const offset = (page - 1) * limit;
    const search = String(req.query.search || "").trim();
    const [countResult, dataResult] = await Promise.all([
      query(`SELECT COUNT(*)::int AS total FROM ${actor.table}`),
      query(
        `SELECT ${actor.select}
         FROM ${actor.table}
         ORDER BY id DESC
         LIMIT $1 OFFSET $2`,
        [limit, offset]
      ),
    ]);

    const total = countResult.rows[0].total;
    res.json({
      data: dataResult.rows,
      pagination: { total, page, limit, pages: Math.max(1, Math.ceil(total / limit)) },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
