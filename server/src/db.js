import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const { Pool } = pg;

const useConnectionString = Boolean(process.env.DATABASE_URL);

export const pool = new Pool(
  useConnectionString
    ? {
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.PGSSL === "true" ? { rejectUnauthorized: false } : false,
      }
    : {
        host: process.env.PGHOST || "localhost",
        port: Number(process.env.PGPORT) || 5432,
        user: process.env.PGUSER || "postgres",
        password: process.env.PGPASSWORD || "root",
        database: process.env.PGDATABASE || "university_ems",
        ssl: process.env.PGSSL === "true" ? { rejectUnauthorized: false } : false,
      }
);

pool.on("error", (err) => {
  console.error("Unexpected PostgreSQL pool error:", err.message);
});

export const query = (text, params) => pool.query(text, params);

export default pool;
