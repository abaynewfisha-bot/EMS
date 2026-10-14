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
    await client.query("TRUNCATE attendance RESTART IDENTITY CASCADE");
    await client.query("TRUNCATE employees RESTART IDENTITY CASCADE");
    await client.query("TRUNCATE departments RESTART IDENTITY CASCADE");

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

    await client.query("COMMIT");
    console.log(
      `Seeded ${departments.length} departments, ${employees.length} employees and ${attendanceCount} attendance records.`
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
