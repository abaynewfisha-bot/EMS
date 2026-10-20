
import { query } from "../db.js";

export async function createNotification({
  userId,
  title,
  message,
  type = "info",
  link = null,
}) {
  if (!userId || !title?.trim() || !message?.trim()) {
    throw new Error("userId, title, and message are required");
  }

  const allowedTypes = ["info", "success", "warning", "error"];

  if (!allowedTypes.includes(type)) {
    throw new Error("Invalid notification type");
  }

  const result = await query(
    `INSERT INTO notifications
       (employee_id, title, message, type, link)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [userId, title.trim(), message.trim(), type, link]
  );

  return result.rows[0];
}

