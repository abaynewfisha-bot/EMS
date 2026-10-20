
import { query } from "../db.js";

export async function getNotifications(req, res, next) {
  try {
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limit = Math.min(
      100,
      Math.max(1, Number.parseInt(req.query.limit, 10) || 20)
    );
    const filter = req.query.filter || "all";

    if (!["all", "unread", "read"].includes(filter)) {
      return res.status(400).json({
        success: false,
        message: "Invalid notification filter",
      });
    }

    const conditions = [];
    if (filter === "unread") conditions.push("is_read = FALSE");
    if (filter === "read") conditions.push("is_read = TRUE");

    const whereSql = conditions.length
      ? `WHERE ${conditions.join(" AND ")}`
      : "";

    const offset = (page - 1) * limit;

    const [listResult, countResult, unreadResult] = await Promise.all([
      query(
        `SELECT id, title, message, type, link, is_read, created_at
         FROM notifications
         ${whereSql}
         ORDER BY created_at DESC, id DESC
         LIMIT $1 OFFSET $2`,
        [limit, offset]
      ),
      query(
        `SELECT COUNT(*)::int AS total
         FROM notifications ${whereSql}`
      ),
      query(
        `SELECT COUNT(*)::int AS count
         FROM notifications
         WHERE is_read = FALSE`
      ),
    ]);

    const total = countResult.rows[0].total;

    return res.json({
      success: true,
      data: listResult.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      unreadCount: unreadResult.rows[0].count,
    });
  } catch (error) {
    next(error);
  }
}

export async function getUnreadCount(req, res, next) {
  try {
    const { rows } = await query(
      `SELECT COUNT(*)::int AS count
       FROM notifications
       WHERE is_read = FALSE`
    );

    res.json({
      success: true,
      count: rows[0].count,
      unreadCount: rows[0].count,
    });
  } catch (error) {
    next(error);
  }
}

export async function markNotificationRead(req, res, next) {
  try {
    const id = Number(req.params.id);

    if (!Number.isSafeInteger(id) || id < 1) {
      return res.status(400).json({
        success: false,
        message: "Invalid notification ID",
      });
    }

    const { rows } = await query(
      `UPDATE notifications
       SET is_read = TRUE
       WHERE id = $1
       RETURNING id, is_read`,
      [id]
    );

    if (!rows[0]) {
      return res.status(404).json({
        success: false,
        message: "Notification not found",
      });
    }

    res.json({
      success: true,
      message: "Notification marked as read",
      data: rows[0],
    });
  } catch (error) {
    next(error);
  }
}

export async function markAllNotificationsRead(req, res, next) {
  try {
    const result = await query(
      `UPDATE notifications
       SET is_read = TRUE
       WHERE is_read = FALSE`
    );

    res.json({
      success: true,
      updatedCount: result.rowCount,
      message: "All notifications marked as read",
    });
  } catch (error) {
    next(error);
  }
}

export async function clearReadNotifications(req, res, next) {
  try {
    const result = await query(
      `DELETE FROM notifications
       WHERE is_read = TRUE`
    );

    res.json({
      success: true,
      deletedCount: result.rowCount,
      message: "Read notifications cleared",
    });
  } catch (error) {
    next(error);
  }
}
