import { pool } from "../db.js";

const departments = [
  { name: "Computer Science", code: "CS", head: "Dr. Amina Yusuf", location: "Block A, Floor 2", description: "Software, AI and systems research." },
  { name: "Electrical Engineering", code: "EEE", head: "Prof. Daniel Okoro", location: "Block B, Floor 1", description: "Power systems and electronics." },
  { name: "Business Administration", code: "BUS", head: "Dr. Grace Mensah", location: "Block C, Floor 3", description: "Management, finance and marketing." },
  { name: "Medicine & Surgery", code: "MED", head: "Prof. Samuel Adeyemi", location: "Teaching Hospital", description: "Clinical training and research." },
  { name: "Library Services", code: "LIB", head: "Mrs. Esther Bello", location: "Central Library", description: "Academic resources and archives." },
  { name: "Registrar's Office", code: "REG", head: "Mr. Peter Nwosu", location: "Admin Block", description: "Admissions and student records." },
];

const employees = [
  ["UNI-0001", "Amina", "Yusuf", "amina.yusuf@uni.edu", "+234 801 111 0001", "Female", "Professor", "Faculty", "Full-time", "Active", 9200, "2012-08-15", "12 University Ave", "CS"],
  ["UNI-0002", "Daniel", "Okoro", "daniel.okoro@uni.edu", "+234 801 111 0002", "Male", "Professor", "Faculty", "Full-time", "Active", 8800, "2010-01-10", "3 Faculty Rd", "EEE"],
  ["UNI-0003", "Grace", "Mensah", "grace.mensah@uni.edu", "+234 801 111 0003", "Female", "Associate Professor", "Faculty", "Full-time", "Active", 7400, "2015-09-01", "7 Campus Close", "BUS"],
  ["UNI-0004", "Samuel", "Adeyemi", "samuel.adeyemi@uni.edu", "+234 801 111 0004", "Male", "Professor", "Faculty", "Full-time", "On Leave", 9600, "2008-03-20", "1 Hospital Way", "MED"],
  ["UNI-0005", "Esther", "Bello", "esther.bello@uni.edu", "+234 801 111 0005", "Female", "Chief Librarian", "Staff", "Full-time", "Active", 4600, "2016-06-11", "9 Library Ln", "LIB"],
  ["UNI-0006", "Peter", "Nwosu", "peter.nwosu@uni.edu", "+234 801 111 0006", "Male", "Registrar", "Admin", "Full-time", "Active", 6200, "2017-02-05", "4 Admin St", "REG"],
  ["UNI-0007", "Chiamaka", "Eze", "chiamaka.eze@uni.edu", "+234 801 111 0007", "Female", "Lecturer I", "Faculty", "Full-time", "Active", 5400, "2019-10-01", "22 Scholars Rd", "CS"],
  ["UNI-0008", "Ibrahim", "Musa", "ibrahim.musa@uni.edu", "+234 801 111 0008", "Male", "Lab Technician", "Staff", "Full-time", "Active", 3200, "2020-01-15", "18 Tech St", "EEE"],
  ["UNI-0009", "Fatima", "Sani", "fatima.sani@uni.edu", "+234 801 111 0009", "Female", "Assistant Lecturer", "Faculty", "Part-time", "Active", 3800, "2022-08-20", "5 Green Rd", "BUS"],
  ["UNI-0010", "Tunde", "Balogun", "tunde.balogun@uni.edu", "+234 801 111 0010", "Male", "IT Support Officer", "Staff", "Full-time", "Active", 3400, "2021-04-12", "14 Network Ave", "CS"],
  ["UNI-0011", "Ngozi", "Okafor", "ngozi.okafor@uni.edu", "+234 801 111 0011", "Female", "Accountant", "Staff", "Full-time", "Active", 4200, "2018-07-30", "6 Finance Rd", "REG"],
  ["UNI-0012", "Kwame", "Asante", "kwame.asante@uni.edu", "+234 801 111 0012", "Male", "Senior Lecturer", "Faculty", "Full-time", "Resigned", 6800, "2014-05-19", "8 Alumni Way", "MED"],
];

const attendancePattern = [
  "Present", "Present", "Present", "Present", "Late", "Present",
  "Remote", "Present", "Absent", "Present", "On Leave", "Present",
];

const settings = [
  ["org_name", "University EMS"],
  ["org_short_name", "UniStaff"],
  ["currency", "USD"],
  ["timezone", "UTC"],
  ["payroll_auto_compute", "true"],
  ["enable_notifications", "true"],
  ["theme", "light"],
  ["support_email", "support@uni.edu"],
  ["address", "University Campus, 12 University Avenue"],
];

const toISODate = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

function recentWeekdays(count) {
  const days = [];
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);
  while (days.length < count) {
    const day = cursor.getDay();
    if (day !== 0 && day !== 6) days.push(new Date(cursor));
    cursor.setDate(cursor.getDate() - 1);
  }
  return days.reverse();
}

async function seedAttendance(client, employeeIds) {
  const days = recentWeekdays(14);
  let count = 0;

  for (let e = 0; e < employeeIds.length; e++) {
    for (let d = 0; d < days.length; d++) {
      const status = attendancePattern[(e + d) % attendancePattern.length];
      const present = status === "Present" || status === "Remote";
      const checkIn = present ? "08:00:00" : status === "Late" ? "09:15:00" : null;
      const checkOut = present || status === "Late" ? "17:00:00" : null;

      await client.query(
        `INSERT INTO attendance (employee_id, date, status, check_in, check_out, notes)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [employeeIds[e], toISODate(days[d]), status, checkIn, checkOut, null]
      );
      count++;
    }
  }

  return count;
}

async function seed() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(`
      TRUNCATE TABLE
        departments, employees, attendance, payroll, notifications, settings,
        users, refresh_tokens, positions, jobgrades, salary_scales, contracts,
        employment_history, faculty, education, emergency_contacts, documents,
        leave_types, leave_balances, leave_requests, performance_reviews,
        publications, teaching_assignments, audit_log,
        employee_salary_assignments, salary_allowances, salary_deductions,
        salary_increment_history
      RESTART IDENTITY CASCADE
    `);

    const deptIdByCode = {};
    for (const d of departments) {
      const { rows } = await client.query(
        `INSERT INTO departments (name, code, head, location, description)
         VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [d.name, d.code, d.head, d.location, d.description]
      );
      deptIdByCode[d.code] = rows[0].id;
    }

    const employeeIds = [];
    for (const e of employees) {
      const [staff_no, first_name, last_name, email, phone, gender, position, role_type, employment_type, status, salary, hire_date, address, deptCode] = e;
      const { rows } = await client.query(
        `INSERT INTO employees
          (staff_no, first_name, last_name, email, phone, gender, position, role_type,
           employment_type, status, salary, hire_date, address, department_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
         RETURNING id`,
        [staff_no, first_name, last_name, email, phone, gender, position, role_type,
         employment_type, status, salary, hire_date, address, deptIdByCode[deptCode] ?? null]
      );
      employeeIds.push(rows[0].id);
    }

    const attendanceCount = await seedAttendance(client, employeeIds);

    for (const [key, value] of settings) {
      await client.query(
        `INSERT INTO settings (key, value) VALUES ($1, $2)
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
        [key, value]
      );
    }

    await client.query(
      `INSERT INTO users (username, email, password_hash, role)
       VALUES ('admin', 'admin@uni.edu', 'seed-placeholder-change-me', 'Admin')`
    );

    const leaveTypes = [
      ["Annual Leave", "ANNUAL", true, 30],
      ["Sick Leave", "SICK", true, 14],
      ["Maternity Leave", "MATERNITY", true, 90],
      ["Study Leave", "STUDY", true, 20],
      ["Compassionate Leave", "COMPASSIONATE", true, 5],
    ];
    const leaveTypeIds = {};
    for (const [name, code, paid, maxDays] of leaveTypes) {
      const { rows } = await client.query(
        `INSERT INTO leave_types (name, code, paid, max_days)
         VALUES ($1, $2, $3, $4) RETURNING id`,
        [name, code, paid, maxDays]
      );
      leaveTypeIds[code] = rows[0].id;
    }

    await client.query(
      `INSERT INTO jobgrades
        (name, code, grade_level, min_salary, midpoint_salary, max_salary, version)
       VALUES
         ('Assistant', 'ASSISTANT', 1, 2500, 3500, 4500, 1),
         ('Lecturer', 'LECTURER', 2, 4000, 5500, 7000, 1),
         ('Senior Lecturer', 'SENIOR', 3, 6500, 7750, 9000, 1),
         ('Professor', 'PROFESSOR', 4, 8500, 10250, 12000, 1)`
    );

    const gradeIds = {};
    const gradeRows = await client.query("SELECT id, code, min_salary, midpoint_salary, max_salary FROM jobgrades");
    for (const grade of gradeRows.rows) gradeIds[grade.code] = grade;

    for (const grade of gradeRows.rows) {
      for (let step = 1; step <= 5; step++) {
        const min = Number(grade.min_salary);
        const max = Number(grade.max_salary);
        const amount = min + ((max - min) / 4) * (step - 1);
        await client.query(
          `INSERT INTO salary_scales
            (name, grade_id, step_number, amount, effective_date)
           VALUES ($1, $2, $3, $4, CURRENT_DATE)`,
          [`${grade.code} - Step ${step}`, grade.id, step, amount.toFixed(2)]
        );
      }
    }

    for (let i = 0; i < employeeIds.length; i++) {
      const gradeCodes = ["ASSISTANT", "LECTURER", "SENIOR", "PROFESSOR"];
      const gradeCode = i < 2 ? "PROFESSOR" : i < 5 ? "SENIOR" : i < 9 ? "LECTURER" : "ASSISTANT";
      const grade = gradeIds[gradeCode];
      const step = (i % 5) + 1;
      const scale = await client.query(
        "SELECT id, amount FROM salary_scales WHERE grade_id=$1 AND step_number=$2 LIMIT 1",
        [grade.id, step]
      );
      const baseSalary = scale.rows[0]?.amount || employees[i][10];
      await client.query(
        `INSERT INTO employee_salary_assignments
          (employee_id, grade_id, scale_id, step_number, base_salary, is_active)
         VALUES ($1,$2,$3,$4,$5,TRUE)`,
        [employeeIds[i], grade.id, scale.rows[0]?.id || null, step, baseSalary]
      );
      await client.query(
        "UPDATE employees SET salary=$1 WHERE id=$2",
        [baseSalary, employeeIds[i]]
      );

      await client.query(
        `UPDATE employees
         SET bank_name='Commercial Bank of Ethiopia',
             bank_account_no=$1,
             mobile_money_provider='Telebirr',
             mobile_money_number=$2,
             preferred_notification='SMS + Mobile Bank'
         WHERE id=$3`,
        [
          `100000${String(i + 1).padStart(6, "0")}`,
          `+251900${String(i + 1).padStart(6, "0")}`,
          employeeIds[i],
        ]
      );

      await client.query(
        `INSERT INTO salary_allowances
          (employee_id, name, amount, is_taxable)
         VALUES ($1,'Transport Allowance',$2,TRUE),($1,'Housing Allowance',$3,FALSE)`,
        [employeeIds[i], i % 2 ? 350 : 250, i % 3 ? 500 : 400]
      );
      await client.query(
        `INSERT INTO salary_deductions
          (employee_id, name, amount)
         VALUES ($1,'Pension Contribution',$2),($1,'Health Insurance',$3)`,
        [employeeIds[i], (Number(baseSalary) * 0.05).toFixed(2), 75]
      );
    }

    await client.query(
      `INSERT INTO salary_increment_history
        (employee_id, previous_grade_id, new_grade_id, previous_step, new_step,
         previous_salary, new_salary, effective_date, reason, status)
       SELECT a.employee_id, a.grade_id,
              CASE WHEN a.step_number < 5 THEN a.grade_id ELSE g.id END,
              a.step_number,
              CASE WHEN a.step_number < 5 THEN a.step_number + 1 ELSE 1 END,
              a.base_salary,
              a.base_salary + 250,
              CURRENT_DATE + 30,
              'Annual performance increment',
              'Pending'
       FROM employee_salary_assignments a
       JOIN jobgrades g ON g.grade_level = (SELECT MIN(grade_level) FROM jobgrades)
       WHERE a.employee_id = $1`,
      [employeeIds[0]]
    );

    const payrollCount = employeeIds.length;
    for (let i = 0; i < employeeIds.length; i++) {
      const employee = employees[i];
      const base = employee[10];
      const allowances = i % 3 === 0 ? 500 : i % 3 === 1 ? 350 : 250;
      const deductions = i % 4 === 0 ? 120 : 80;
      const net = Math.max(0, base + allowances - deductions);
      await client.query(
        `INSERT INTO payroll
          (employee_id, period_month, period_year, base_salary, allowances, deductions, net_pay, status)
         VALUES ($1, EXTRACT(MONTH FROM CURRENT_DATE)::int,
                 EXTRACT(YEAR FROM CURRENT_DATE)::int, $2, $3, $4, $5, $6)
         ON CONFLICT (employee_id, period_month, period_year) DO NOTHING`,
        [employeeIds[i], base, allowances, deductions, net, i % 5 === 0 ? "Paid" : "Pending"]
      );
    }

    for (const deptCode of Object.keys(deptIdByCode)) {
      const deptId = deptIdByCode[deptCode];
      await client.query(
        `INSERT INTO faculty (department_id, name, code)
         SELECT $1,
                CASE $2
                  WHEN 'CS' THEN 'Faculty of Computing'
                  WHEN 'EEE' THEN 'Faculty of Engineering'
                  WHEN 'BUS' THEN 'Faculty of Management Sciences'
                  WHEN 'MED' THEN 'Faculty of Clinical Sciences'
                  ELSE 'Faculty of Academic Services'
                END,
                'FAC-' || $2
         ON CONFLICT (code) DO NOTHING`,
        [deptId, deptCode]
      );

      await client.query(
        `INSERT INTO positions (title, department_id, grade)
         SELECT 'Academic Staff', $1, 'Lecturer'
         WHERE NOT EXISTS (
           SELECT 1 FROM positions WHERE department_id = $1 AND title = 'Academic Staff'
         )`,
        [deptId]
      );
    }

    for (let i = 0; i < employeeIds.length; i++) {
      const employeeId = employeeIds[i];
      const employee = employees[i];
      const startDate = employee[11];

      await client.query(
        `INSERT INTO contracts
          (employee_id, contract_no, title, start_date, salary, status)
         VALUES ($1, $2, $3, $4, $5, 'Active')`,
        [employeeId, `CON-${String(i + 1).padStart(4, "0")}`, employee[6], startDate, employee[10]]
      );

      await client.query(
        `INSERT INTO employment_history
          (employee_id, position_title, department_id, start_date, employment_type)
         VALUES ($1, $2, $3, $4, $5)`,
        [employeeId, employee[6], i < departments.length ? deptIdByCode[employee[13]] : null, startDate, employee[8]]
      );

      await client.query(
        `INSERT INTO education
          (employee_id, institution, degree, field_of_study)
         VALUES ($1, 'University of the Nation', $2, $3)`,
        [employeeId, i < 4 ? "PhD" : "Master's Degree", i % 2 === 0 ? "Computer Science" : "Management"]
      );

      await client.query(
        `INSERT INTO emergency_contacts
          (employee_id, full_name, relationship, phone, is_primary)
         VALUES ($1, $2, 'Next of Kin', $3, TRUE)`,
        [employeeId, `Emergency Contact ${i + 1}`, `+234 802 000 ${String(i + 1).padStart(4, "0")}`]
      );

      await client.query(
        `INSERT INTO leave_balances
          (employee_id, leave_type_id, year, opening_days, used_days, remaining_days)
         VALUES ($1, $2, EXTRACT(YEAR FROM CURRENT_DATE)::int, 30, $3, $4)
         ON CONFLICT (employee_id, leave_type_id, year) DO NOTHING`,
        [
          employeeId,
          leaveTypeIds.ANNUAL,
          i % 5,
          30 - (i % 5),
        ]
      );

      if (i < 4) {
        await client.query(
          `INSERT INTO leave_requests
            (employee_id, leave_type_id, start_date, end_date, total_days, reason, status)
           VALUES ($1, $2, CURRENT_DATE + 7, CURRENT_DATE + 11, 5,
                   'Personal and family matters', 'Pending')`,
          [employeeId, leaveTypeIds.ANNUAL]
        );
      }

      if (employee[7] === "Faculty") {
        await client.query(
          `INSERT INTO teaching_assignments
            (employee_id, course_code, course_name, department_id, academic_year, semester, credits)
           VALUES ($1, $2, $3, $4, '2026/2027', 'First Semester', 3)`,
          [
            employeeId,
            `COURSE-${String(i + 1).padStart(3, "0")}`,
            `${employee[6]} Studies`,
            deptIdByCode[employee[13]],
          ]
        );

        await client.query(
          `INSERT INTO publications
            (employee_id, title, publication_type, journal_or_publisher)
           VALUES ($1, $2, 'Journal Article', 'University Research Journal')`,
          [employeeId, `Research Contribution by ${employee[1]} ${employee[2]}`]
        );
      }

      await client.query(
        `INSERT INTO performance_reviews
          (employee_id, reviewer_id, review_period, rating, strengths, improvements, status)
         VALUES ($1, NULL, '2026 Annual Review', $2,
                 'Reliable performance and strong teamwork',
                 'Continue professional development', 'Completed')`,
        [employeeId, (3.5 + (i % 2) * 0.5).toFixed(2)]
      );

      await client.query(
        `INSERT INTO documents
          (employee_id, title, document_type, file_name, file_path, mime_type)
         VALUES ($1, 'Employee Profile Document', 'Profile',
                 $2, $3, 'application/pdf')`,
        [
          employeeId,
          `employee-${i + 1}.pdf`,
          `/documents/employees/employee-${i + 1}.pdf`,
        ]
      );
    }

    await client.query(
      `INSERT INTO notifications
        (employee_id, title, message, type, link)
       VALUES
         (NULL, 'Payroll period ready', 'The current payroll period has been prepared.', 'success', '/payroll'),
         (NULL, 'Attendance review', 'Review attendance records that need approval.', 'info', '/attendance'),
         (NULL, 'Leave requests', 'New leave requests are awaiting your review.', 'warning', '/employees'),
         (NULL, 'System update', 'University employee settings were updated successfully.', 'success', '/settings')`
    );

    await client.query(`
      INSERT INTO audit_log
        (user_id, action, module, description, entity_type, ip_address, result)
      SELECT u.id, 'Login', 'Authentication',
             'Administrator logged into the system.', 'Authentication',
             '127.0.0.1', 'Success'
      FROM users u WHERE u.username='admin'
    `);
    await client.query(`
      INSERT INTO audit_log
        (user_id, action, module, description, entity_type, ip_address, result)
      SELECT u.id, 'Processed Payroll', 'Payroll',
             'Payroll records processed for the current period.', 'Payroll',
             '127.0.0.1', 'Success'
      FROM users u WHERE u.username='admin'
    `);
    await client.query(`
      INSERT INTO audit_log
        (user_id, action, module, description, entity_type, ip_address, result)
      SELECT u.id, 'Updated Settings', 'Settings',
             'Organization and system settings were updated.', 'Settings',
             '127.0.0.1', 'Success'
      FROM users u WHERE u.username='admin'
    `);

    await client.query("COMMIT");
    console.log(
      `Seeded ${departments.length} departments, ${employees.length} employees, ${attendanceCount} attendance records, ${payrollCount} payroll records, settings, notifications, contracts, leave data, and supporting HR records.`
    );
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Seed failed:", err.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
