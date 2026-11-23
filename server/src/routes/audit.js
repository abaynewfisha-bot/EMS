import { Router } from "express";
import { query } from "../db.js";

const router = Router();

export function getRequestIp(req) {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded) return forwarded.split(",")[0].trim();
  return req.ip || req.socket?.remoteAddress || null;
}

export async function recordAudit({
  userId = null,
  employeeId = null,
  action,
  module,
  description,
  entityType = module,
  entityId = null,
  ipAddress = null,
  result = "Success",
  oldValues = null,
  newValues = null,
}) {
  await query(`
    INSERT INTO audit_log
      (user_id, employee_id, action, module, description, entity_type, entity_id,
       ip_address, result, old_values, new_values)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
  `, [
    userId,
    employeeId,
    action,
    module,
    description,
    entityType,
    entityId,
    ipAddress,
    result,
    oldValues,
    newValues,
  ]);
}

router.get("/", async (req, res, next) => {
  try {
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 50));
    const offset = (page - 1) * limit;
    const module = String(req.query.module || "").trim();
    const result = String(req.query.result || "").trim();
    const search = String(req.query.search || "").trim();
    const dateRange = String(req.query.dateRange || "30").trim();
    const user = String(req.query.user || "").trim();
    const action = String(req.query.action || "").trim();

    const where = [];
    const params = [];
    if (dateRange !== "all") {
      const days = Number.parseInt(dateRange, 10) || 30;
      params.push(days);
      where.push(`a.created_at >= NOW() - ($${params.length} * INTERVAL '1 day')`);
    }
    if (user) {
      params.push(user);
      where.push(`u.username = $${params.length}`);
    }
    if (action) {
      params.push(action);
      where.push(`a.action = $${params.length}`);
    }
    if (module) {
      params.push(module);
      where.push(`COALESCE(a.module,a.entity_type) = $${params.length}`);
    }
    if (result) {
      params.push(result);
      where.push(`a.result = $${params.length}`);
    }
    if (search) {
      params.push(`%${search}%`);
      const index = params.length;
      where.push(`(a.action ILIKE $${index} OR a.description ILIKE $${index} OR u.username ILIKE $${index})`);
    }
    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const count = await query(`
      SELECT COUNT(*)::int AS total
      FROM audit_log a
      LEFT JOIN users u ON u.id=a.user_id
      ${whereSql}
    `, params);

    params.push(limit, offset);
    const { rows } = await query(`
      SELECT a.id, a.created_at, a.action, a.module, a.description,
             a.entity_type, a.entity_id, a.ip_address, a.result,
             COALESCE(u.username,'System') AS user_name,
             u.role AS user_role
      FROM audit_log a
      LEFT JOIN users u ON u.id=a.user_id
      ${whereSql}
      ORDER BY a.created_at DESC, a.id DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `, params);

    res.json({
      data: rows,
      pagination: {
        total: count.rows[0].total,
        page,
        limit,
        pages: Math.max(1, Math.ceil(count.rows[0].total / limit)),
      },
    });
  } catch (err) {
    next(err);
  }
});

router.post("/", async (req, res, next) => {
  try {
    await recordAudit({
      ...req.body,
      ipAddress: getRequestIp(req),
    });
    res.status(201).json({ success: true });
  } catch (err) {
    next(err);
  }
});

export default router;
