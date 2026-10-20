-- University Employee Management System schema

-- keep updated_at fresh (must be defined before any trigger uses it)
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS departments (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(120) NOT NULL UNIQUE,
  code        VARCHAR(20)  NOT NULL UNIQUE,
  head        VARCHAR(120),
  location    VARCHAR(120),
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS employees (
  id              SERIAL PRIMARY KEY,
  staff_no        VARCHAR(20)  NOT NULL UNIQUE,
  first_name      VARCHAR(80)  NOT NULL,
  last_name       VARCHAR(80)  NOT NULL,
  email           VARCHAR(160) NOT NULL UNIQUE,
  phone           VARCHAR(40),
  gender          VARCHAR(20),
  position        VARCHAR(120) NOT NULL,
  role_type       VARCHAR(20)  NOT NULL DEFAULT 'Staff'
                    CHECK (role_type IN ('Faculty', 'Staff', 'Admin')),
  employment_type VARCHAR(20)  NOT NULL DEFAULT 'Full-time'
                    CHECK (employment_type IN ('Full-time', 'Part-time', 'Contract')),
  status          VARCHAR(20)  NOT NULL DEFAULT 'Active'
                    CHECK (status IN ('Active', 'On Leave', 'Resigned', 'Retired')),
  salary          NUMERIC(12, 2) NOT NULL DEFAULT 0,
  hire_date       DATE NOT NULL DEFAULT CURRENT_DATE,
  address         TEXT,
  department_id   INTEGER REFERENCES departments(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_employees_department ON employees(department_id);
CREATE INDEX IF NOT EXISTS idx_employees_status ON employees(status);
CREATE INDEX IF NOT EXISTS idx_employees_name ON employees(first_name, last_name);

CREATE TABLE IF NOT EXISTS attendance (
  id          SERIAL PRIMARY KEY,
  employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  date        DATE NOT NULL DEFAULT CURRENT_DATE,
  status      VARCHAR(20) NOT NULL DEFAULT 'Present'
                CHECK (status IN ('Present', 'Late', 'Absent', 'On Leave', 'Remote')),
  check_in    TIME,
  check_out   TIME,
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (employee_id, date)
);

CREATE INDEX IF NOT EXISTS idx_attendance_employee ON attendance(employee_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(date);
CREATE INDEX IF NOT EXISTS idx_attendance_status ON attendance(status);

CREATE TABLE IF NOT EXISTS payroll (
  id            SERIAL PRIMARY KEY,
  employee_id   INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  period_month  INTEGER NOT NULL CHECK (period_month BETWEEN 1 AND 12),
  period_year   INTEGER NOT NULL CHECK (period_year BETWEEN 2000 AND 2100),
  base_salary   NUMERIC(12, 2) NOT NULL DEFAULT 0,
  allowances    NUMERIC(12, 2) NOT NULL DEFAULT 0,
  deductions    NUMERIC(12, 2) NOT NULL DEFAULT 0,
  net_pay       NUMERIC(12, 2) NOT NULL DEFAULT 0,
  status        VARCHAR(20) NOT NULL DEFAULT 'Pending'
                  CHECK (status IN ('Pending', 'Processing', 'Paid')),
  paid_date     DATE,
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (employee_id, period_month, period_year)
);

CREATE INDEX IF NOT EXISTS idx_payroll_employee ON payroll(employee_id);
CREATE INDEX IF NOT EXISTS idx_payroll_period ON payroll(period_year, period_month);
CREATE INDEX IF NOT EXISTS idx_payroll_status ON payroll(status);

DROP TRIGGER IF EXISTS trg_payroll_updated_at ON payroll;
CREATE TRIGGER trg_payroll_updated_at
  BEFORE UPDATE ON payroll
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS notifications (
  id          SERIAL PRIMARY KEY,
  title       VARCHAR(160) NOT NULL,
  message     TEXT,
  type        VARCHAR(20) NOT NULL DEFAULT 'info'
                CHECK (type IN ('info', 'success', 'warning', 'error')),
  link        VARCHAR(200),
  is_read     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE notifications
ADD COLUMN IF NOT EXISTS employee_id INTEGER
REFERENCES employees(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_notifications_employee_read
ON notifications(employee_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);

CREATE TABLE IF NOT EXISTS settings (
  key         VARCHAR(60) PRIMARY KEY,
  value       TEXT,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trg_employees_updated_at ON employees;
CREATE TRIGGER trg_employees_updated_at
  BEFORE UPDATE ON employees
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();
