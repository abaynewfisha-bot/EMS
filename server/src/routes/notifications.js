import { Router } from "express";
import { query } from "../db.js";

const router = Router();

function normalize(body) {
  const type = body.type || "info";
  const valid = ["info", "success", "warning", "error"];
  return {
    title: body.title?.trim() || "",
    message: body.message || null,
    type: valid.includes(type) ? type : "info",
    link: body.link || null,
    is_read: Boolean(body.is_read),
  };
}

function validate(n) {
  if (!n.title) return "title is required";
  return null;
}

// GET /api/notifications
router.get("/", async (req, res, next) => {
  try {
    const {
      is_read = "",
      limit = "50",
      page = "1",
      sort = "created_at",
      order = "desc",
    } = req.query;

    const allowed = new Set(["created_at", "title", "type", "is_read"]);
    const sortCol = allowed.has(sort) ? sort : "created_at";
    const sortOrder = order.toLowerCase() === "asc" ? "ASC" : "DESC";

    const where = [];
    const params = [];

    if (is_read === "true" || is_read === "false") {
      params.push(is_read === "true");
      where.push(`is_read = $${params.length}`);
    }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const count = await query(`SELECT COUNT(*)::int AS total FROM notifications ${whereSql}`, params);
    const total = count.rows[0].total;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const pageSize = Math.min(200, Math.max(1, parseInt(limit, 10) || 50));
    const offset = (pageNum - 1) * pageSize;

    const listParams = [...params, pageSize, offset];
    const { rows } = await query(
      `SELECT id, title, message, type, link, is_read, created_at
         FROM notifications
         ${whereSql}
         ORDER BY ${sortCol} ${sortOrder}
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

// GET /api/notifications/unread-count
router.get("/unread-count", async (_req, res, next) => {
  try {
    const { rows } = await query("SELECT COUNT(*)::int AS count FROM notifications WHERE is_read = FALSE");
    res.json({ count: rows[0].count });
  } catch (err) {
    next(err);
  }
});

// GET /api/notifications/:id
router.get("/:id", async (req, res, next) => {
  try {
    const { rows } = await query("SELECT * FROM notifications WHERE id = $1", [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: "Notification not found" });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

// POST /api/notifications
router.post("/", async (req, res, next) => {
  try {
    const n = normalize(req.body);
    const err = validate(n);
    if (err) return res.status(400).json({ error: err });

    const { rows } = await query(
      `INSERT INTO notifications (title, message, type, link, is_read)
       VALUES ($1,$2,$3,$4,$5)
       RETURNING *`,
      [n.title, n.message, n.type, n.link, n.is_read]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/notifications/:id/read
router.patch("/:id/read", async (req, res, next) => {
  try {
    const { rows } = await query(
      `UPDATE notifications
          SET is_read = TRUE
        WHERE id = $1
        RETURNING *`,
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: "Notification not found" });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/notifications/read-all
router.patch("/read-all", async (_req, res, next) => {
  try {
    const { rows } = await query(
      `UPDATE notifications
          SET is_read = TRUE
        WHERE is_read = FALSE
        RETURNING id`
    );
    res.json({ updated: rows.length });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/notifications/read
router.delete("/read", async (_req, res, next) => {
  try {
    const { rows } = await query("DELETE FROM notifications WHERE is_read = TRUE RETURNING id");
    res.json({ deleted: rows.length });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/notifications/:id
router.delete("/:id", async (req, res, next) => {
  try {
    const { rowCount } = await query("DELETE FROM notifications WHERE id = $1", [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: "Notification not found" });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

export default router;
