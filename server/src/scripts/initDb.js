import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const { Client } = pg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

function baseConfig() {
  if (process.env.DATABASE_URL) {
    const url = new URL(process.env.DATABASE_URL);
    return {
      host: url.hostname,
      port: Number(url.port) || 5432,
      user: decodeURIComponent(url.username),
      password: decodeURIComponent(url.password),
      ssl: process.env.PGSSL === "true" ? { rejectUnauthorized: false } : false,
    };
  }
  return {
    host: process.env.PGHOST || "localhost",
    port: Number(process.env.PGPORT) || 5432,
    user: process.env.PGUSER || "postgres",
    password: process.env.PGPASSWORD || "postgres",
    ssl: process.env.PGSSL === "true" ? { rejectUnauthorized: false } : false,
  };
}

export function targetDatabase() {
  if (process.env.DATABASE_URL) {
    return new URL(process.env.DATABASE_URL).pathname.replace(/^\//, "") || "university_ems";
  }
  return process.env.PGDATABASE || "university_ems";
}

async function ensureDatabase() {
  const dbName = targetDatabase();
  const admin = new Client({ ...baseConfig(), database: "postgres" });
  await admin.connect();
  const { rows } = await admin.query("SELECT 1 FROM pg_database WHERE datname = $1", [dbName]);
  if (rows.length === 0) {
    await admin.query(`CREATE DATABASE "${dbName}"`);
    console.log(`Created database "${dbName}".`);
  } else {
    console.log(`Database "${dbName}" already exists.`);
  }
  await admin.end();
}

async function applySchema() {
  const sql = fs.readFileSync(path.join(__dirname, "..", "schema.sql"), "utf8");
  const client = new Client({ ...baseConfig(), database: targetDatabase() });
  await client.connect();
  await client.query(sql);
  await client.end();
  console.log("Schema applied successfully.");
}

async function main() {
  try {
    await ensureDatabase();
    await applySchema();
    console.log("Database initialization complete.");
  } catch (err) {
    console.error("Failed to initialize database:", err.message);
    process.exit(1);
  }
}

main();
