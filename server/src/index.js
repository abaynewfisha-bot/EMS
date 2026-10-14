import express from "express";
import cors from "cors";
import morgan from "morgan";
import dotenv from "dotenv";

import { pool } from "./db.js";
import employeesRouter from "./routes/employees.js";
import departmentsRouter from "./routes/departments.js";
import dashboardRouter from "./routes/dashboard.js";
import attendanceRouter from "./routes/attendance.js";
import payrollRouter from "./routes/payroll.js";
import notificationsRouter from "./routes/notifications.js";
import settingsRouter from "./routes/settings.js";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 5000;

const origins = (process.env.CORS_ORIGIN || "http://localhost:5173")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

app.use(cors({ origin: origins }));
app.use(express.json());
app.use(morgan("dev"));

app.get("/api/health", async (_req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ status: "ok", database: "connected" });
  } catch {
    res.status(500).json({ status: "error", database: "disconnected" });
  }
});

app.use("/api/employees", employeesRouter);
app.use("/api/departments", departmentsRouter);
app.use("/api/dashboard", dashboardRouter);
app.use("/api/attendance", attendanceRouter);
app.use("/api/payroll", payrollRouter);
app.use("/api/notifications", notificationsRouter);
app.use("/api/settings", settingsRouter);

app.use((_req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

app.listen(PORT, () => {
  console.log(`API server running on http://localhost:${PORT}`);
});
