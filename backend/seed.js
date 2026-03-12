const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');
require('dotenv').config();

async function seed() {
  const connectionConfig = {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    multipleStatements: true,
  };

  if (process.env.DB_SSL === 'true') {
    connectionConfig.ssl = { rejectUnauthorized: true };
  }

  const connection = await mysql.createConnection(connectionConfig);
  console.log('Đã kết nối MySQL thành công!');

  await connection.query(`CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  await connection.query(`USE \`${process.env.DB_NAME}\``);
  console.log(`Đã tạo/chọn database: ${process.env.DB_NAME}`);

  // Xóa bảng cũ (theo thứ tự FK)
  await connection.query('SET FOREIGN_KEY_CHECKS = 0');
  const tables = [
    'notifications', 'documents', 'work_history', 'contracts',
    'leave_balances', 'leave_requests', 'role_permissions', 'permissions',
    'users', 'departments', 'roles',
  ];
  for (const t of tables) {
    await connection.query(`DROP TABLE IF EXISTS ${t}`);
  }
  await connection.query('SET FOREIGN_KEY_CHECKS = 1');
  console.log('Đã xóa bảng cũ.');

  // ===== TẠO BẢNG =====

  // 1. roles
  await connection.query(`
    CREATE TABLE roles (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(50) NOT NULL UNIQUE
    )
  `);

  // 2. permissions
  await connection.query(`
    CREATE TABLE permissions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      code VARCHAR(100) NOT NULL UNIQUE,
      description VARCHAR(191) NOT NULL
    )
  `);

  // 3. role_permissions (many-to-many)
  await connection.query(`
    CREATE TABLE role_permissions (
      role_id INT NOT NULL,
      permission_id INT NOT NULL,
      PRIMARY KEY (role_id, permission_id),
      CONSTRAINT fk_rp_role FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
      CONSTRAINT fk_rp_permission FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
    )
  `);

  // 4. departments
  await connection.query(`
    CREATE TABLE departments (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100) NOT NULL UNIQUE,
      manager_id INT NULL
    )
  `);

  // 5. users (mở rộng)
  await connection.query(`
    CREATE TABLE users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      full_name VARCHAR(100) NOT NULL,
      email VARCHAR(191) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      role_id INT NOT NULL,
      department_id INT NULL,
      start_date DATE NOT NULL,
      phone VARCHAR(20) NULL,
      address VARCHAR(191) NULL,
      gender ENUM('Male', 'Female', 'Other') NULL,
      date_of_birth DATE NULL,
      id_card_number VARCHAR(20) NULL,
      bank_account_number VARCHAR(30) NULL,
      bank_name VARCHAR(100) NULL,
      avatar_url VARCHAR(191) NULL,
      CONSTRAINT fk_users_role FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE RESTRICT ON UPDATE CASCADE,
      CONSTRAINT fk_users_department FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL ON UPDATE CASCADE
    )
  `);

  // FK departments.manager_id -> users
  await connection.query(`
    ALTER TABLE departments
      ADD CONSTRAINT fk_departments_manager FOREIGN KEY (manager_id) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE
  `);

  // 6. contracts (hợp đồng lao động)
  await connection.query(`
    CREATE TABLE contracts (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      contract_type VARCHAR(50) NOT NULL,
      start_date DATE NOT NULL,
      end_date DATE NULL,
      salary DECIMAL(15,2) NULL,
      status ENUM('Active', 'Expired', 'Terminated') NOT NULL DEFAULT 'Active',
      notes TEXT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_contracts_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // 7. work_history (lịch sử công tác / thăng tiến)
  await connection.query(`
    CREATE TABLE work_history (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      event_type ENUM('Promotion', 'Transfer', 'Role Change', 'Other') NOT NULL,
      event_date DATE NOT NULL,
      from_position VARCHAR(100) NULL,
      to_position VARCHAR(100) NULL,
      from_department_id INT NULL,
      to_department_id INT NULL,
      notes TEXT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_wh_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      CONSTRAINT fk_wh_from_dept FOREIGN KEY (from_department_id) REFERENCES departments(id) ON DELETE SET NULL,
      CONSTRAINT fk_wh_to_dept FOREIGN KEY (to_department_id) REFERENCES departments(id) ON DELETE SET NULL
    )
  `);

  // 8. documents (tài liệu số — CCCD, bằng cấp, etc.)
  await connection.query(`
    CREATE TABLE documents (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      doc_type VARCHAR(50) NOT NULL,
      doc_name VARCHAR(191) NOT NULL,
      file_url VARCHAR(500) NOT NULL,
      uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_docs_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // 9. leave_requests
  await connection.query(`
    CREATE TABLE leave_requests (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      start_date DATE NOT NULL,
      end_date DATE NOT NULL,
      reason TEXT NOT NULL,
      status ENUM('Pending', 'Approved', 'Rejected') NOT NULL DEFAULT 'Pending',
      approved_by INT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_lr_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      CONSTRAINT fk_lr_approver FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL,
      CONSTRAINT chk_dates CHECK (end_date >= start_date)
    )
  `);

  // 10. leave_balances (số ngày phép còn lại)
  await connection.query(`
    CREATE TABLE leave_balances (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      year INT NOT NULL,
      total_days INT NOT NULL DEFAULT 12,
      used_days INT NOT NULL DEFAULT 0,
      UNIQUE KEY uq_user_year (user_id, year),
      CONSTRAINT fk_lb_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // 11. notifications (thông báo nội bộ)
  await connection.query(`
    CREATE TABLE notifications (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      title VARCHAR(191) NOT NULL,
      message TEXT NOT NULL,
      is_read TINYINT(1) NOT NULL DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_notif_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  console.log('Đã tạo 11 bảng.');

  // ===== SEED DATA =====

  // Roles (4 vai trò)
  await connection.query(`INSERT INTO roles (name) VALUES ('Admin'), ('HR'), ('Manager'), ('Employee')`);
  console.log('Đã thêm 4 vai trò: Admin, HR, Manager, Employee.');

  // Permissions
  const perms = [
    // Employees
    ['employees.view_all', 'Xem danh sách tất cả nhân viên'],
    ['employees.view_department', 'Xem nhân viên trong phòng mình'],
    ['employees.view_self', 'Xem thông tin cá nhân'],
    ['employees.create', 'Thêm nhân viên mới'],
    ['employees.edit', 'Sửa thông tin nhân viên'],
    ['employees.delete', 'Xóa nhân viên'],
    // Departments
    ['departments.view', 'Xem phòng ban'],
    ['departments.create', 'Tạo phòng ban'],
    ['departments.edit', 'Sửa phòng ban'],
    // Leaves
    ['leaves.view_all', 'Xem tất cả đơn nghỉ phép'],
    ['leaves.view_department', 'Xem đơn nghỉ phép phòng mình'],
    ['leaves.view_self', 'Xem đơn nghỉ phép bản thân'],
    ['leaves.create', 'Tạo đơn nghỉ phép'],
    ['leaves.approve', 'Duyệt/từ chối đơn nghỉ phép'],
    // Contracts
    ['contracts.view_all', 'Xem tất cả hợp đồng'],
    ['contracts.view_self', 'Xem hợp đồng bản thân'],
    ['contracts.create', 'Tạo hợp đồng'],
    ['contracts.edit', 'Sửa hợp đồng'],
    // Profile
    ['profile.edit_self', 'Sửa hồ sơ cá nhân (bank, phone)'],
    // Documents
    ['documents.view_all', 'Xem tài liệu tất cả NV'],
    ['documents.view_self', 'Xem tài liệu bản thân'],
    ['documents.upload', 'Upload tài liệu'],
    // Notifications
    ['notifications.send', 'Gửi thông báo'],
    ['notifications.view_self', 'Xem thông báo bản thân'],
    // Work history
    ['work_history.view_all', 'Xem lịch sử công tác tất cả'],
    ['work_history.view_self', 'Xem lịch sử công tác bản thân'],
    ['work_history.create', 'Thêm lịch sử công tác'],
  ];

  for (const [code, desc] of perms) {
    await connection.query('INSERT INTO permissions (code, description) VALUES (?, ?)', [code, desc]);
  }
  console.log(`Đã thêm ${perms.length} quyền.`);

  // Role-Permission mapping
  // Admin (role_id=1): ALL permissions
  const [allPerms] = await connection.query('SELECT id FROM permissions');
  for (const p of allPerms) {
    await connection.query('INSERT INTO role_permissions (role_id, permission_id) VALUES (1, ?)', [p.id]);
  }

  // HR (role_id=2): most permissions except delete employees
  const hrPerms = [
    'employees.view_all', 'employees.create', 'employees.edit',
    'departments.view', 'departments.create', 'departments.edit',
    'leaves.view_all', 'leaves.create', 'leaves.approve',
    'contracts.view_all', 'contracts.create', 'contracts.edit',
    'profile.edit_self',
    'documents.view_all', 'documents.upload',
    'notifications.send', 'notifications.view_self',
    'work_history.view_all', 'work_history.create',
  ];
  const [hrPermRows] = await connection.query(
    `SELECT id FROM permissions WHERE code IN (${hrPerms.map(() => '?').join(',')})`, hrPerms
  );
  for (const p of hrPermRows) {
    await connection.query('INSERT INTO role_permissions (role_id, permission_id) VALUES (2, ?)', [p.id]);
  }

  // Manager (role_id=3): department-scoped + self
  const mgrPerms = [
    'employees.view_department', 'employees.view_self',
    'departments.view',
    'leaves.view_department', 'leaves.view_self', 'leaves.create', 'leaves.approve',
    'contracts.view_self',
    'profile.edit_self',
    'documents.view_self', 'documents.upload',
    'notifications.view_self',
    'work_history.view_self',
  ];
  const [mgrPermRows] = await connection.query(
    `SELECT id FROM permissions WHERE code IN (${mgrPerms.map(() => '?').join(',')})`, mgrPerms
  );
  for (const p of mgrPermRows) {
    await connection.query('INSERT INTO role_permissions (role_id, permission_id) VALUES (3, ?)', [p.id]);
  }

  // Employee (role_id=4): self only
  const empPerms = [
    'employees.view_self',
    'departments.view',
    'leaves.view_self', 'leaves.create',
    'contracts.view_self',
    'profile.edit_self',
    'documents.view_self', 'documents.upload',
    'notifications.view_self',
    'work_history.view_self',
  ];
  const [empPermRows] = await connection.query(
    `SELECT id FROM permissions WHERE code IN (${empPerms.map(() => '?').join(',')})`, empPerms
  );
  for (const p of empPermRows) {
    await connection.query('INSERT INTO role_permissions (role_id, permission_id) VALUES (4, ?)', [p.id]);
  }
  console.log('Đã gán quyền cho 4 vai trò.');

  // Departments
  await connection.query(`INSERT INTO departments (name) VALUES ('IT'), ('Marketing'), ('Sales')`);
  console.log('Đã thêm 3 phòng ban.');

  // Hash mật khẩu
  const password = 'password123';
  const hash = await bcrypt.hash(password, 10);

  // Users (6 nhân viên mẫu, bao gồm Manager)
  await connection.query(
    `INSERT INTO users (full_name, email, password_hash, role_id, department_id, start_date, phone, gender, date_of_birth, id_card_number, bank_account_number, bank_name, address) VALUES
      (?, ?, ?, 1, 1, '2020-01-15', '0901234567', 'Male', '1985-05-20', '012345678901', '1234567890', 'Vietcombank', 'Hà Nội'),
      (?, ?, ?, 2, 2, '2021-03-01', '0912345678', 'Female', '1990-08-15', '012345678902', '2345678901', 'Techcombank', 'TP.HCM'),
      (?, ?, ?, 3, 1, '2019-06-01', '0923456789', 'Male', '1988-03-10', '012345678903', '3456789012', 'BIDV', 'Đà Nẵng'),
      (?, ?, ?, 4, 1, '2022-06-10', '0934567890', 'Male', '1995-11-25', '012345678904', '4567890123', 'Agribank', 'Hà Nội'),
      (?, ?, ?, 4, 2, '2023-01-20', '0945678901', 'Female', '1998-07-03', '012345678905', '5678901234', 'MBBank', 'TP.HCM'),
      (?, ?, ?, 4, 3, '2023-06-15', '0956789012', 'Male', '1997-01-12', '012345678906', '6789012345', 'VPBank', 'Hải Phòng')`,
    [
      'Nguyễn Văn An',    'admin@company.com',    hash,
      'Trần Thị Bình',    'hr@company.com',       hash,
      'Lê Hoàng Cường',   'manager@company.com',  hash,
      'Phạm Minh Dũng',   'dung@company.com',     hash,
      'Võ Thị Mai',       'mai@company.com',      hash,
      'Hoàng Đức Thắng',  'thang@company.com',    hash,
    ]
  );
  console.log('Đã thêm 6 nhân viên mẫu.');

  // Gán trưởng phòng
  await connection.query(`UPDATE departments SET manager_id = 3 WHERE name = 'IT'`);
  await connection.query(`UPDATE departments SET manager_id = 2 WHERE name = 'Marketing'`);
  console.log('Đã gán trưởng phòng.');

  // Contracts
  await connection.query(
    `INSERT INTO contracts (user_id, contract_type, start_date, end_date, salary, status, notes) VALUES
      (1, 'Không thời hạn', '2020-01-15', NULL, 45000000, 'Active', 'HĐ không thời hạn'),
      (2, 'Có thời hạn', '2021-03-01', '2025-03-01', 30000000, 'Active', 'HĐ 4 năm'),
      (3, 'Có thời hạn', '2019-06-01', '2025-12-31', 35000000, 'Active', 'HĐ quản lý'),
      (4, 'Thử việc', '2022-06-10', '2022-08-10', 12000000, 'Expired', 'HĐ thử việc 2 tháng'),
      (4, 'Có thời hạn', '2022-08-11', '2025-08-11', 18000000, 'Active', 'HĐ chính thức'),
      (5, 'Có thời hạn', '2023-01-20', '2025-07-20', 16000000, 'Active', 'Sắp hết hạn'),
      (6, 'Thử việc', '2023-06-15', '2023-08-15', 10000000, 'Expired', 'HĐ thử việc')`
  );
  console.log('Đã thêm 7 hợp đồng mẫu.');

  // Work history
  await connection.query(
    `INSERT INTO work_history (user_id, event_type, event_date, from_position, to_position, from_department_id, to_department_id, notes) VALUES
      (3, 'Promotion', '2021-01-01', 'Senior Developer', 'IT Manager', 1, 1, 'Thăng chức quản lý'),
      (4, 'Transfer', '2023-01-01', 'Junior Developer', 'Developer', 1, 1, 'Chuyển vị trí'),
      (2, 'Role Change', '2022-06-01', 'HR Staff', 'HR Manager', 2, 2, 'Thăng chức HR Manager')`
  );
  console.log('Đã thêm 3 lịch sử công tác mẫu.');

  // Leave requests
  await connection.query(
    `INSERT INTO leave_requests (user_id, start_date, end_date, reason, status, approved_by) VALUES
      (4, '2026-03-10', '2026-03-12', 'Việc gia đình', 'Pending', NULL),
      (5, '2026-03-15', '2026-03-16', 'Khám sức khỏe', 'Approved', 2),
      (4, '2026-02-01', '2026-02-02', 'Nghỉ phép năm', 'Rejected', 3)`
  );
  console.log('Đã thêm 3 đơn nghỉ phép mẫu.');

  // Leave balances (năm 2026)
  await connection.query(
    `INSERT INTO leave_balances (user_id, year, total_days, used_days) VALUES
      (1, 2026, 15, 0),
      (2, 2026, 14, 1),
      (3, 2026, 14, 0),
      (4, 2026, 12, 3),
      (5, 2026, 12, 1),
      (6, 2026, 12, 0)`
  );
  console.log('Đã thêm số ngày phép 2026.');

  // Notifications
  await connection.query(
    `INSERT INTO notifications (user_id, title, message, is_read) VALUES
      (4, 'Đơn nghỉ phép bị từ chối', 'Đơn xin nghỉ ngày 01/02/2026 đã bị từ chối bởi quản lý.', 1),
      (5, 'Đơn nghỉ phép được duyệt', 'Đơn xin nghỉ ngày 15/03/2026 đã được HR duyệt.', 0),
      (4, 'Hợp đồng sắp hết hạn', 'Hợp đồng lao động của bạn sẽ hết hạn vào 11/08/2025.', 0),
      (3, 'Đơn nghỉ phép cần duyệt', 'Phạm Minh Dũng đã gửi đơn xin nghỉ ngày 10-12/03/2026.', 0)`
  );
  console.log('Đã thêm 4 thông báo mẫu.');

  await connection.end();

  console.log('\n===== SEED HOÀN TẤT =====');
  console.log('Tài khoản đăng nhập mẫu:');
  console.log('  Admin:    admin@company.com    / password123');
  console.log('  HR:       hr@company.com       / password123');
  console.log('  Manager:  manager@company.com  / password123');
  console.log('  Employee: dung@company.com     / password123');
  console.log('  Employee: mai@company.com      / password123');
  console.log('  Employee: thang@company.com    / password123');
}

seed().catch((err) => {
  console.error('Lỗi seed:', err.message);
  process.exit(1);
});
