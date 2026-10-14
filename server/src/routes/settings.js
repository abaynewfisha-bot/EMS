import { Router } from "express";
import { query, pool } from "../db.js";

const router = Router();

async function readAll() {
  const { rows } = await query("SELECT key, value FROM settings ORDER BY key ASC");
  const obj = {};
  for (const r of rows) obj[r.key] = r.value;
  return obj;
}

async function upsertMany(entries) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (const [key, value] of entries) {
      const v = value === null || value === undefined ? null : String(value);
      await client.query(
        `INSERT INTO settings (key, value)
         VALUES ($1, $2)
         ON CONFLICT (key) DO UPDATE
           SET value = EXCLUDED.value, updated_at = NOW()`,
        [key, v]
      );
    }
    await client.query("COMMIT");
  } catch (err) {
    try { await client.query("ROLLBACK"); } catch {}
    throw err;
  } finally {
    client.release();
  }
}

// GET /api/settings
router.get("/", async (_req, res, next) => {
  try {
    const { rows } = await query("SELECT key, value FROM settings ORDER BY key ASC");
    const obj = {};
    for (const r of rows) obj[r.key] = r.value;
    res.json(obj);
  } catch (err) {
    next(err);
  }
});

// GET /api/settings/:key
router.get("/:key", async (req, res, next) => {
  try {
    const { rows } = await query("SELECT key, value FROM settings WHERE key = $1", [req.params.key]);
    if (!rows[0]) return res.status(404).json({ error: "Setting not found" });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

// PUT /api/settings (bulk upsert)
router.put("/", async (req, res, next) => {
  try {
    let entries;

    if (req.body && typeof req.body === "object" && !Array.isArray(req.body)) {
      entries = Object.entries(req.body);
      if (entries.length === 0) return res.status(400).json({ error: "No settings provided" });
    } else if (Array.isArray(req.body)) {
      const items = req.body.filter((x) => x && x.key);
      if (items.length === 0) return res.status(400).json({ error: "No valid settings provided" });
      entries = items.map((item) => [item.key, item.value]);
    } else {
      return res.status(400).json({ error: "Body must be an object or array of {key,value}" });
    }

    await upsertMany(entries);
    return res.json(await readAll());
  } catch (err) {
    next(err);
  }
});

// PUT /api/settings/:key
router.put("/:key", async (req, res, next) => {
  try {
    const { key } = req.params;
    const value = req.body?.value;
    const v = value === null || value === undefined ? null : String(value);

    const { rows } = await query(
      `INSERT INTO settings (key, value)
       VALUES ($1, $2)
       ON CONFLICT (key) DO UPDATE
         SET value = EXCLUDED.value, updated_at = NOW()
       RETURNING key, value`,
      [key, v]
    );
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/settings/:key
router.delete("/:key", async (req, res, next) => {
  try {
    const { rowCount } = await query("DELETE FROM settings WHERE key = $1", [req.params.key]);
    if (!rowCount) return res.status(404).json({ error: "Setting not found" });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

export default router;
