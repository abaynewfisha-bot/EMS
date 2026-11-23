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

ALTER TABLE payroll
  ADD COLUMN IF NOT EXISTS approval_status VARCHAR(20) NOT NULL DEFAULT 'Pending'
    CHECK (approval_status IN ('Pending', 'Approved', 'Rejected')),
  ADD COLUMN IF NOT EXISTS bank_name VARCHAR(120),
  ADD COLUMN IF NOT EXISTS bank_reference VARCHAR(120),
  ADD COLUMN IF NOT EXISTS disbursement_status VARCHAR(20) NOT NULL DEFAULT 'Pending'
    CHECK (disbursement_status IN ('Pending', 'Processing', 'Ready', 'Paid', 'Failed')),
  ADD COLUMN IF NOT EXISTS approved_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;

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

ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS bank_name VARCHAR(120),
  ADD COLUMN IF NOT EXISTS bank_account_no VARCHAR(80),
  ADD COLUMN IF NOT EXISTS mobile_money_provider VARCHAR(80),
  ADD COLUMN IF NOT EXISTS mobile_money_number VARCHAR(40),
  ADD COLUMN IF NOT EXISTS preferred_notification VARCHAR(20) NOT NULL DEFAULT 'In-App'
    CHECK (preferred_notification IN ('In-App', 'SMS', 'Mobile Bank', 'SMS + Mobile Bank'));

CREATE TABLE IF NOT EXISTS payroll_transfers (
  id BIGSERIAL PRIMARY KEY,
  payroll_id INTEGER NOT NULL REFERENCES payroll(id) ON DELETE CASCADE,
  employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  bank_name VARCHAR(120) NOT NULL,
  destination_account VARCHAR(80),
  mobile_money_provider VARCHAR(80),
  mobile_money_number VARCHAR(40),
  amount NUMERIC(12, 2) NOT NULL CHECK (amount >= 0),
  status VARCHAR(20) NOT NULL DEFAULT 'Processing'
    CHECK (status IN ('Processing', 'Sent', 'Confirmed', 'Failed')),
  provider_reference VARCHAR(160),
  failure_reason TEXT,
  sms_sent BOOLEAN NOT NULL DEFAULT FALSE,
  app_notification_sent BOOLEAN NOT NULL DEFAULT FALSE,
  attempted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

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

CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  employee_id   INTEGER UNIQUE REFERENCES employees(id) ON DELETE SET NULL,
  username      VARCHAR(80) NOT NULL UNIQUE,
  email         VARCHAR(160) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role          VARCHAR(30) NOT NULL DEFAULT 'Staff'
                  CHECK (role IN ('Admin', 'HR Manager', 'Manager', 'Staff')),
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  last_login_at TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  VARCHAR(128) NOT NULL UNIQUE,
  expires_at  TIMESTAMPTZ NOT NULL,
  revoked_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id);

CREATE TABLE IF NOT EXISTS positions (
  id          SERIAL PRIMARY KEY,
  title       VARCHAR(120) NOT NULL,
  department_id INTEGER REFERENCES departments(id) ON DELETE SET NULL,
  grade       VARCHAR(30),
  description TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_positions_department_title
ON positions(department_id, title);

CREATE TABLE IF NOT EXISTS jobgrades (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(80) NOT NULL UNIQUE,
  code        VARCHAR(20) NOT NULL UNIQUE,
  grade_level INTEGER NOT NULL,
  min_salary  NUMERIC(12, 2) NOT NULL DEFAULT 0,
  max_salary  NUMERIC(12, 2) NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (min_salary >= 0),
  CHECK (max_salary >= min_salary)
);

CREATE TABLE IF NOT EXISTS salary_scales (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(100) NOT NULL,
  grade_id    INTEGER REFERENCES jobgrades(id) ON DELETE SET NULL,
  step_number INTEGER NOT NULL DEFAULT 1,
  amount      NUMERIC(12, 2) NOT NULL DEFAULT 0,
  currency    VARCHAR(10) NOT NULL DEFAULT 'USD',
  effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (grade_id, step_number, effective_date),
  CHECK (amount >= 0),
  CHECK (step_number >= 1)
);

ALTER TABLE jobgrades
  ADD COLUMN IF NOT EXISTS midpoint_salary NUMERIC(12, 2),
  ADD COLUMN IF NOT EXISTS currency VARCHAR(10) NOT NULL DEFAULT 'USD',
  ADD COLUMN IF NOT EXISTS effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

UPDATE jobgrades
SET midpoint_salary = ROUND(((COALESCE(min_salary, 0) + COALESCE(max_salary, 0)) / 2)::numeric, 2)
WHERE midpoint_salary IS NULL;

ALTER TABLE jobgrades
  ALTER COLUMN midpoint_salary SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_jobgrade_salary_range'
  ) THEN
    ALTER TABLE jobgrades
      ADD CONSTRAINT chk_jobgrade_salary_range
      CHECK (min_salary <= midpoint_salary AND midpoint_salary <= max_salary);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS employee_salary_assignments (
  id SERIAL PRIMARY KEY,
  employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  grade_id INTEGER NOT NULL REFERENCES jobgrades(id) ON DELETE RESTRICT,
  scale_id INTEGER REFERENCES salary_scales(id) ON DELETE SET NULL,
  step_number INTEGER NOT NULL DEFAULT 1 CHECK (step_number >= 1),
  base_salary NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (base_salary >= 0),
  effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (end_date IS NULL OR end_date >= effective_date)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_active_employee_salary
ON employee_salary_assignments(employee_id)
WHERE is_active;

CREATE TABLE IF NOT EXISTS salary_allowances (
  id SERIAL PRIMARY KEY,
  employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  amount NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (amount >= 0),
  is_taxable BOOLEAN NOT NULL DEFAULT TRUE,
  effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS salary_deductions (
  id SERIAL PRIMARY KEY,
  employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  amount NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (amount >= 0),
  effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS salary_increment_history (
  id SERIAL PRIMARY KEY,
  employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  previous_grade_id INTEGER REFERENCES jobgrades(id) ON DELETE SET NULL,
  new_grade_id INTEGER REFERENCES jobgrades(id) ON DELETE SET NULL,
  previous_step INTEGER,
  new_step INTEGER,
  previous_salary NUMERIC(12, 2) NOT NULL,
  new_salary NUMERIC(12, 2) NOT NULL,
  effective_date DATE NOT NULL,
  reason TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'Pending'
    CHECK (status IN ('Pending', 'Approved', 'Rejected')),
  requested_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  approved_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS contracts (
  id          SERIAL PRIMARY KEY,
  employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  contract_no VARCHAR(40) NOT NULL UNIQUE,
  title       VARCHAR(120),
  start_date  DATE NOT NULL,
  end_date    DATE,
  salary      NUMERIC(12, 2) NOT NULL DEFAULT 0,
  terms       TEXT,
  status      VARCHAR(20) NOT NULL DEFAULT 'Active'
                CHECK (status IN ('Draft', 'Active', 'Expired', 'Terminated')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (end_date IS NULL OR end_date >= start_date),
  CHECK (salary >= 0)
);

CREATE INDEX IF NOT EXISTS idx_contracts_employee ON contracts(employee_id);
CREATE INDEX IF NOT EXISTS idx_contracts_status ON contracts(status);

CREATE TABLE IF NOT EXISTS employment_history (
  id           SERIAL PRIMARY KEY,
  employee_id  INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  position_title VARCHAR(120) NOT NULL,
  department_id INTEGER REFERENCES departments(id) ON DELETE SET NULL,
  start_date   DATE NOT NULL,
  end_date     DATE,
  employment_type VARCHAR(20),
  notes        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (end_date IS NULL OR end_date >= start_date)
);

CREATE TABLE IF NOT EXISTS faculty (
  id          SERIAL PRIMARY KEY,
  department_id INTEGER REFERENCES departments(id) ON DELETE SET NULL,
  name        VARCHAR(120) NOT NULL,
  code        VARCHAR(20) NOT NULL UNIQUE,
  dean        VARCHAR(120),
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS education (
  id          SERIAL PRIMARY KEY,
  employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  institution VARCHAR(160) NOT NULL,
  degree      VARCHAR(120),
  field_of_study VARCHAR(120),
  start_date  DATE,
  end_date    DATE,
  grade       VARCHAR(40),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (end_date IS NULL OR start_date IS NULL OR end_date >= start_date)
);

CREATE TABLE IF NOT EXISTS emergency_contacts (
  id          SERIAL PRIMARY KEY,
  employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  full_name   VARCHAR(160) NOT NULL,
  relationship VARCHAR(80),
  phone       VARCHAR(40) NOT NULL,
  email       VARCHAR(160),
  address     TEXT,
  is_primary  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_emergency_contacts_employee
ON emergency_contacts(employee_id);

CREATE TABLE IF NOT EXISTS documents (
  id          SERIAL PRIMARY KEY,
  employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
  title       VARCHAR(160) NOT NULL,
  document_type VARCHAR(50),
  file_name   VARCHAR(255) NOT NULL,
  file_path   TEXT NOT NULL,
  mime_type   VARCHAR(100),
  file_size   BIGINT,
  uploaded_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (file_size IS NULL OR file_size >= 0)
);

CREATE TABLE IF NOT EXISTS leave_types (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(80) NOT NULL UNIQUE,
  code        VARCHAR(20) NOT NULL UNIQUE,
  paid        BOOLEAN NOT NULL DEFAULT TRUE,
  max_days    NUMERIC(5, 1),
  description TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS leave_balances (
  id          SERIAL PRIMARY KEY,
  employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  leave_type_id INTEGER NOT NULL REFERENCES leave_types(id) ON DELETE CASCADE,
  year        INTEGER NOT NULL CHECK (year BETWEEN 2000 AND 2100),
  opening_days NUMERIC(5, 1) NOT NULL DEFAULT 0,
  used_days    NUMERIC(5, 1) NOT NULL DEFAULT 0,
  remaining_days NUMERIC(5, 1) NOT NULL DEFAULT 0,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (employee_id, leave_type_id, year)
);

CREATE TABLE IF NOT EXISTS leave_requests (
  id          SERIAL PRIMARY KEY,
  employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  leave_type_id INTEGER NOT NULL REFERENCES leave_types(id) ON DELETE RESTRICT,
  start_date  DATE NOT NULL,
  end_date    DATE NOT NULL,
  total_days  NUMERIC(5, 1) NOT NULL,
  reason      TEXT,
  status      VARCHAR(20) NOT NULL DEFAULT 'Pending'
                CHECK (status IN ('Pending', 'Approved', 'Rejected', 'Cancelled')),
  approved_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (end_date >= start_date),
  CHECK (total_days > 0)
);

CREATE INDEX IF NOT EXISTS idx_leave_requests_employee
ON leave_requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_leave_requests_status
ON leave_requests(status);

CREATE TABLE IF NOT EXISTS performance_reviews (
  id          SERIAL PRIMARY KEY,
  employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  reviewer_id INTEGER REFERENCES employees(id) ON DELETE SET NULL,
  review_period VARCHAR(40) NOT NULL,
  review_date DATE NOT NULL DEFAULT CURRENT_DATE,
  rating      NUMERIC(3, 2),
  strengths   TEXT,
  improvements TEXT,
  goals       TEXT,
  comments    TEXT,
  status      VARCHAR(20) NOT NULL DEFAULT 'Draft'
                CHECK (status IN ('Draft', 'Submitted', 'Completed', 'Acknowledged')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (rating IS NULL OR (rating >= 0 AND rating <= 5))
);

CREATE INDEX IF NOT EXISTS idx_performance_reviews_employee
ON performance_reviews(employee_id);

CREATE TABLE IF NOT EXISTS publications (
  id          SERIAL PRIMARY KEY,
  employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  title       VARCHAR(255) NOT NULL,
  publication_type VARCHAR(50),
  journal_or_publisher VARCHAR(160),
  publication_date DATE,
  doi         VARCHAR(160),
  url         TEXT,
  abstract    TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_publications_employee
ON publications(employee_id);

CREATE TABLE IF NOT EXISTS teaching_assignments (
  id          SERIAL PRIMARY KEY,
  employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  course_code VARCHAR(40) NOT NULL,
  course_name VARCHAR(160) NOT NULL,
  department_id INTEGER REFERENCES departments(id) ON DELETE SET NULL,
  academic_year VARCHAR(20) NOT NULL,
  semester    VARCHAR(30) NOT NULL,
  section     VARCHAR(30),
  credits     NUMERIC(4, 1),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (employee_id, course_code, academic_year, semester, section)
);

CREATE INDEX IF NOT EXISTS idx_teaching_assignments_employee
ON teaching_assignments(employee_id);

CREATE TABLE IF NOT EXISTS audit_log (
  id          BIGSERIAL PRIMARY KEY,
  user_id     INTEGER REFERENCES users(id) ON DELETE SET NULL,
  employee_id INTEGER REFERENCES employees(id) ON DELETE SET NULL,
  action      VARCHAR(80) NOT NULL,
  entity_type VARCHAR(80) NOT NULL,
  entity_id   VARCHAR(80),
  old_values  JSONB,
  new_values  JSONB,
  ip_address  INET,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE audit_log
  ADD COLUMN IF NOT EXISTS module VARCHAR(80),
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS result VARCHAR(20) NOT NULL DEFAULT 'Success'
    CHECK (result IN ('Success', 'Failed', 'Warning'));

CREATE INDEX IF NOT EXISTS idx_audit_log_user ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_entity
ON audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created ON audit_log(created_at DESC);

DROP TRIGGER IF EXISTS trg_users_updated_at ON users;
CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_leave_requests_updated_at ON leave_requests;
CREATE TRIGGER trg_leave_requests_updated_at
  BEFORE UPDATE ON leave_requests
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_leave_balances_updated_at ON leave_balances;
CREATE TRIGGER trg_leave_balances_updated_at
  BEFORE UPDATE ON leave_balances
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();
