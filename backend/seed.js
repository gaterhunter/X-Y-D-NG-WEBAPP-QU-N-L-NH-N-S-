const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function seed() {
  // Kết nối MySQL không chỉ định database (để tạo DB nếu chưa có)
  const connectionConfig = {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    multipleStatements: true,
  };

  // Cloud MySQL (TiDB) yêu cầu SSL
  if (process.env.DB_SSL === 'true') {
    connectionConfig.ssl = { rejectUnauthorized: true };
  }

  const connection = await mysql.createConnection(connectionConfig);

  console.log('Đã kết nối MySQL thành công!');

  // Tạo database
  await connection.query(`CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  await connection.query(`USE \`${process.env.DB_NAME}\``);
  console.log(`Đã tạo/chọn database: ${process.env.DB_NAME}`);

  // Xóa bảng cũ (theo thứ tự FK)
  await connection.query('SET FOREIGN_KEY_CHECKS = 0');
  await connection.query('DROP TABLE IF EXISTS leave_requests');
  await connection.query('DROP TABLE IF EXISTS users');
  await connection.query('DROP TABLE IF EXISTS departments');
  await connection.query('DROP TABLE IF EXISTS roles');
  await connection.query('SET FOREIGN_KEY_CHECKS = 1');
  console.log('Đã xóa bảng cũ (nếu có).');

  // Tạo bảng roles
  await connection.query(`
    CREATE TABLE roles (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(50) NOT NULL UNIQUE
    )
  `);

  // Tạo bảng departments
  await connection.query(`
    CREATE TABLE departments (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100) NOT NULL UNIQUE,
      manager_id INT NULL
    )
  `);

  // Tạo bảng users
  await connection.query(`
    CREATE TABLE users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      full_name VARCHAR(100) NOT NULL,
      email VARCHAR(191) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      role_id INT NOT NULL,
      department_id INT NULL,
      start_date DATE NOT NULL,
      CONSTRAINT fk_users_role FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE RESTRICT ON UPDATE CASCADE,
      CONSTRAINT fk_users_department FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL ON UPDATE CASCADE
    )
  `);

  // FK cho departments.manager_id
  await connection.query(`
    ALTER TABLE departments
      ADD CONSTRAINT fk_departments_manager FOREIGN KEY (manager_id) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE
  `);

  // Tạo bảng leave_requests
  await connection.query(`
    CREATE TABLE leave_requests (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      start_date DATE NOT NULL,
      end_date DATE NOT NULL,
      reason TEXT NOT NULL,
      status ENUM('Pending', 'Approved', 'Rejected') NOT NULL DEFAULT 'Pending',
      CONSTRAINT fk_leave_requests_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT chk_dates CHECK (end_date >= start_date)
    )
  `);

  console.log('Đã tạo 4 bảng: roles, departments, users, leave_requests.');

  // ===== SEED DATA =====

  // Roles
  await connection.query(`INSERT INTO roles (name) VALUES ('Admin'), ('HR'), ('Employee')`);
  console.log('Đã thêm 3 vai trò.');

  // Departments
  await connection.query(`INSERT INTO departments (name) VALUES ('IT'), ('Marketing'), ('Sales')`);
  console.log('Đã thêm 3 phòng ban.');

  // Hash mật khẩu thật bằng bcrypt
  const password = 'password123';
  const hash = await bcrypt.hash(password, 10);
  console.log(`Mật khẩu mẫu: "${password}" -> hash tạo xong.`);

  // Users
  await connection.query(
    `INSERT INTO users (full_name, email, password_hash, role_id, department_id, start_date) VALUES
      (?, ?, ?, 1, 1, '2020-01-15'),
      (?, ?, ?, 2, 2, '2021-03-01'),
      (?, ?, ?, 3, 1, '2022-06-10'),
      (?, ?, ?, 3, 3, '2023-01-20')`,
    [
      'Nguyễn Văn An',  'admin@company.com',  hash,
      'Trần Thị Bình',  'hr@company.com',     hash,
      'Lê Hoàng Cường', 'cuong@company.com',  hash,
      'Phạm Minh Dũng', 'dung@company.com',   hash,
    ]
  );
  console.log('Đã thêm 4 nhân viên mẫu.');

  // Gán trưởng phòng
  await connection.query(`UPDATE departments SET manager_id = 1 WHERE name = 'IT'`);
  await connection.query(`UPDATE departments SET manager_id = 2 WHERE name = 'Marketing'`);
  await connection.query(`UPDATE departments SET manager_id = 4 WHERE name = 'Sales'`);
  console.log('Đã gán trưởng phòng.');

  // Leave requests
  await connection.query(
    `INSERT INTO leave_requests (user_id, start_date, end_date, reason, status) VALUES
      (3, '2026-03-10', '2026-03-12', 'Việc gia đình', 'Pending'),
      (4, '2026-03-15', '2026-03-16', 'Khám sức khỏe', 'Approved'),
      (3, '2026-02-01', '2026-02-02', 'Nghỉ phép năm', 'Rejected')`
  );
  console.log('Đã thêm 3 đơn nghỉ phép mẫu.');

  await connection.end();

  console.log('\n===== SEED HOÀN TẤT =====');
  console.log('Tài khoản đăng nhập mẫu:');
  console.log('  Admin:    admin@company.com  / password123');
  console.log('  HR:       hr@company.com     / password123');
  console.log('  Employee: cuong@company.com  / password123');
  console.log('  Employee: dung@company.com   / password123');
}

seed().catch((err) => {
  console.error('Lỗi seed:', err.message);
  process.exit(1);
});
