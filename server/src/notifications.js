import { query } from "./db.js";

export async function notify({ title, message = null, type = "info", link = null }) {
  try {
    await query(
      `INSERT INTO notifications (title, message, type, link)
       VALUES ($1, $2, $3, $4)`,
      [title, message, type, link]
    );
  } catch (err) {
    console.error("Failed to create notification:", err.message);
  }
}
