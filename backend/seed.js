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
  await connection.query(`INSERT INTO departments (name) VALUES ('IT'), ('Marketing'), ('Sales'), ('Kế toán'), ('Nhân sự')`);
  console.log('Đã thêm 5 phòng ban.');

  // Hash mật khẩu
  const password = 'password123';
  const hash = await bcrypt.hash(password, 10);

  // Users (20 nhân viên mẫu)
  await connection.query(
    `INSERT INTO users (full_name, email, password_hash, role_id, department_id, start_date, phone, gender, date_of_birth, id_card_number, bank_account_number, bank_name, address) VALUES
      (?, ?, ?, 1, 1, '2020-01-15', '0901234567', 'Male',   '1985-05-20', '012345678901', '1234567890', 'Vietcombank', 'Hà Nội'),
      (?, ?, ?, 2, 5, '2021-03-01', '0912345678', 'Female', '1990-08-15', '012345678902', '2345678901', 'Techcombank', 'TP.HCM'),
      (?, ?, ?, 3, 1, '2019-06-01', '0923456789', 'Male',   '1988-03-10', '012345678903', '3456789012', 'BIDV', 'Đà Nẵng'),
      (?, ?, ?, 4, 1, '2022-06-10', '0934567890', 'Male',   '1995-11-25', '012345678904', '4567890123', 'Agribank', 'Hà Nội'),
      (?, ?, ?, 4, 2, '2023-01-20', '0945678901', 'Female', '1998-07-03', '012345678905', '5678901234', 'MBBank', 'TP.HCM'),
      (?, ?, ?, 4, 3, '2023-06-15', '0956789012', 'Male',   '1997-01-12', '012345678906', '6789012345', 'VPBank', 'Hải Phòng'),
      (?, ?, ?, 3, 2, '2020-04-01', '0967890123', 'Female', '1987-09-22', '012345678907', '7890123456', 'Sacombank', 'TP.HCM'),
      (?, ?, ?, 3, 3, '2020-07-15', '0978901234', 'Male',   '1986-12-05', '012345678908', '8901234567', 'ACB', 'Hà Nội'),
      (?, ?, ?, 4, 1, '2024-01-10', '0989012345', 'Female', '1999-04-18', '012345678909', '9012345678', 'TPBank', 'Đà Nẵng'),
      (?, ?, ?, 4, 1, '2024-03-05', '0990123456', 'Male',   '2000-06-30', '012345678910', '0123456789', 'OCB', 'Hà Nội'),
      (?, ?, ?, 4, 2, '2023-08-20', '0901122334', 'Female', '1996-02-14', '012345678911', '1122334455', 'VIB', 'TP.HCM'),
      (?, ?, ?, 4, 2, '2024-06-01', '0912233445', 'Male',   '2001-10-08', '012345678912', '2233445566', 'SHB', 'Cần Thơ'),
      (?, ?, ?, 4, 3, '2023-11-10', '0923344556', 'Female', '1994-07-25', '012345678913', '3344556677', 'SeABank', 'Huế'),
      (?, ?, ?, 4, 3, '2024-02-14', '0934455667', 'Male',   '1999-01-01', '012345678914', '4455667788', 'LienVietPostBank', 'Nha Trang'),
      (?, ?, ?, 4, 4, '2022-09-01', '0945566778', 'Female', '1993-11-11', '012345678915', '5566778899', 'Vietcombank', 'Hà Nội'),
      (?, ?, ?, 4, 4, '2023-04-15', '0956677889', 'Male',   '1996-05-05', '012345678916', '6677889900', 'BIDV', 'TP.HCM'),
      (?, ?, ?, 3, 4, '2019-08-01', '0967788990', 'Female', '1985-08-20', '012345678917', '7788990011', 'Techcombank', 'Hà Nội'),
      (?, ?, ?, 4, 5, '2024-01-15', '0978899001', 'Male',   '2000-03-17', '012345678918', '8899001122', 'MBBank', 'Bắc Ninh'),
      (?, ?, ?, 4, 5, '2023-07-01', '0989900112', 'Female', '1997-12-28', '012345678919', '9900112233', 'VPBank', 'Hà Nội'),
      (?, ?, ?, 4, 4, '2025-01-06', '0990011223', 'Male',   '2002-09-15', '012345678920', '0011223344', 'Agribank', 'Nghệ An')`,
    [
      'Nguyễn Văn An',       'admin@company.com',        hash,
      'Trần Thị Bình',       'hr@company.com',           hash,
      'Lê Hoàng Cường',      'manager@company.com',      hash,
      'Phạm Minh Dũng',      'dung@company.com',         hash,
      'Võ Thị Mai',          'mai@company.com',          hash,
      'Hoàng Đức Thắng',     'thang@company.com',        hash,
      'Nguyễn Thị Hương',    'huong@company.com',        hash,
      'Trần Văn Hải',        'hai@company.com',          hash,
      'Lý Thị Ngọc Lan',    'lan@company.com',          hash,
      'Đỗ Quang Minh',       'minh@company.com',         hash,
      'Bùi Thị Thu Hà',      'ha@company.com',           hash,
      'Vũ Đình Khoa',        'khoa@company.com',         hash,
      'Phan Thị Thanh Tâm',  'tam@company.com',          hash,
      'Lương Văn Phúc',      'phuc@company.com',         hash,
      'Đặng Thị Kim Ngân',   'ngan@company.com',         hash,
      'Cao Văn Trung',       'trung@company.com',        hash,
      'Đinh Thị Phương',     'phuong@company.com',       hash,
      'Tạ Hữu Nghĩa',       'nghia@company.com',        hash,
      'Hồ Thị Yến Nhi',      'nhi@company.com',          hash,
      'Ngô Văn Tài',         'tai@company.com',          hash,
    ]
  );
  console.log('Đã thêm 20 nhân viên mẫu.');

  // Gán trưởng phòng
  await connection.query(`UPDATE departments SET manager_id = 3 WHERE name = 'IT'`);
  await connection.query(`UPDATE departments SET manager_id = 7 WHERE name = 'Marketing'`);
  await connection.query(`UPDATE departments SET manager_id = 8 WHERE name = 'Sales'`);
  await connection.query(`UPDATE departments SET manager_id = 17 WHERE name = 'Kế toán'`);
  await connection.query(`UPDATE departments SET manager_id = 2 WHERE name = 'Nhân sự'`);
  console.log('Đã gán trưởng phòng.');

  // Contracts (20 hợp đồng)
  await connection.query(
    `INSERT INTO contracts (user_id, contract_type, start_date, end_date, salary, status, notes) VALUES
      (1,  'Không thời hạn', '2020-01-15', NULL,          45000000, 'Active',  'HĐ không thời hạn - Admin'),
      (2,  'Có thời hạn',    '2021-03-01', '2027-03-01',  30000000, 'Active',  'HĐ 6 năm - HR'),
      (3,  'Có thời hạn',    '2019-06-01', '2026-06-01',  35000000, 'Active',  'HĐ quản lý IT'),
      (4,  'Thử việc',       '2022-06-10', '2022-08-10',  12000000, 'Expired', 'HĐ thử việc 2 tháng'),
      (4,  'Có thời hạn',    '2022-08-11', '2026-04-11',  18000000, 'Active',  'HĐ chính thức - sắp hết hạn'),
      (5,  'Có thời hạn',    '2023-01-20', '2026-03-20',  16000000, 'Active',  'Sắp hết hạn trong 8 ngày'),
      (6,  'Thử việc',       '2023-06-15', '2023-08-15',  10000000, 'Expired', 'HĐ thử việc'),
      (6,  'Có thời hạn',    '2023-08-16', '2026-08-16',  15000000, 'Active',  'HĐ chính thức sau thử việc'),
      (7,  'Có thời hạn',    '2020-04-01', '2026-04-01',  32000000, 'Active',  'HĐ quản lý Marketing - sắp hết hạn'),
      (8,  'Không thời hạn', '2020-07-15', NULL,          33000000, 'Active',  'HĐ quản lý Sales'),
      (9,  'Thử việc',       '2024-01-10', '2024-03-10',  11000000, 'Expired', 'HĐ thử việc'),
      (9,  'Có thời hạn',    '2024-03-11', '2027-03-11',  17000000, 'Active',  'HĐ chính thức'),
      (10, 'Thử việc',       '2024-03-05', '2024-05-05',  10000000, 'Expired', 'HĐ thử việc'),
      (10, 'Có thời hạn',    '2024-05-06', '2026-05-06',  16000000, 'Active',  'HĐ 2 năm - sắp hết hạn'),
      (11, 'Có thời hạn',    '2023-08-20', '2026-08-20',  15000000, 'Active',  'HĐ 3 năm'),
      (12, 'Thử việc',       '2024-06-01', '2024-08-01',   9000000, 'Expired', 'HĐ thử việc'),
      (13, 'Có thời hạn',    '2023-11-10', '2026-11-10',  14000000, 'Active',  'HĐ 3 năm'),
      (14, 'Có thời hạn',    '2024-02-14', '2027-02-14',  13000000, 'Active',  'HĐ 3 năm'),
      (15, 'Có thời hạn',    '2022-09-01', '2026-09-01',  22000000, 'Active',  'HĐ kế toán'),
      (16, 'Có thời hạn',    '2023-04-15', '2026-04-15',  20000000, 'Active',  'HĐ kế toán - sắp hết hạn'),
      (17, 'Không thời hạn', '2019-08-01', NULL,          34000000, 'Active',  'HĐ trưởng phòng Kế toán'),
      (18, 'Thử việc',       '2024-01-15', '2024-03-15',   8000000, 'Expired', 'HĐ thử việc'),
      (18, 'Có thời hạn',    '2024-03-16', '2027-03-16',  14000000, 'Active',  'HĐ chính thức'),
      (19, 'Có thời hạn',    '2023-07-01', '2026-07-01',  15000000, 'Active',  'HĐ nhân sự'),
      (20, 'Thử việc',       '2025-01-06', '2025-03-06',   9000000, 'Expired', 'HĐ thử việc'),
      (20, 'Có thời hạn',    '2025-03-07', '2027-03-07',  14000000, 'Active',  'HĐ chính thức')`
  );
  console.log('Đã thêm 26 hợp đồng mẫu.');

  // Work history (12 lịch sử công tác)
  await connection.query(
    `INSERT INTO work_history (user_id, event_type, event_date, from_position, to_position, from_department_id, to_department_id, notes) VALUES
      (3,  'Promotion',    '2021-01-01', 'Senior Developer',   'IT Manager',           1, 1, 'Thăng chức quản lý IT'),
      (4,  'Transfer',     '2023-01-01', 'Junior Developer',   'Developer',            1, 1, 'Lên vị trí Developer'),
      (2,  'Role Change',  '2022-06-01', 'HR Staff',           'HR Manager',           5, 5, 'Thăng chức HR Manager'),
      (7,  'Promotion',    '2022-01-01', 'Marketing Executive','Marketing Manager',    2, 2, 'Thăng chức quản lý Marketing'),
      (8,  'Promotion',    '2021-06-01', 'Sales Lead',         'Sales Manager',        3, 3, 'Thăng chức quản lý Sales'),
      (5,  'Transfer',     '2024-06-01', 'Marketing Staff',    'Senior Marketing',     2, 2, 'Lên Senior Marketing'),
      (9,  'Other',        '2024-03-11', 'Thử việc',           'Junior Developer',     1, 1, 'Hoàn thành thử việc'),
      (15, 'Transfer',     '2024-01-01', 'Junior Accountant',  'Accountant',           4, 4, 'Lên vị trí Accountant'),
      (17, 'Promotion',    '2021-08-01', 'Senior Accountant',  'Chief Accountant',     4, 4, 'Thăng chức trưởng phòng Kế toán'),
      (11, 'Transfer',     '2024-06-01', 'Marketing Intern',   'Marketing Executive',  2, 2, 'Kết thúc thực tập, lên NV chính thức'),
      (6,  'Transfer',     '2024-01-01', 'Sales Intern',       'Sales Executive',      3, 3, 'Hoàn thành thử việc'),
      (10, 'Other',        '2024-05-06', 'Thử việc',           'Junior Developer',     1, 1, 'Hoàn thành thử việc - ký HĐ chính thức')`
  );
  console.log('Đã thêm 12 lịch sử công tác mẫu.');

  // Leave requests (15 đơn nghỉ phép)
  await connection.query(
    `INSERT INTO leave_requests (user_id, start_date, end_date, reason, status, approved_by) VALUES
      (4,  '2026-03-10', '2026-03-12', 'Việc gia đình',                     'Pending',  NULL),
      (5,  '2026-03-15', '2026-03-16', 'Khám sức khỏe định kỳ',            'Approved', 2),
      (4,  '2026-02-01', '2026-02-02', 'Nghỉ phép năm',                    'Rejected', 3),
      (6,  '2026-03-20', '2026-03-21', 'Đám cưới bạn thân',                'Pending',  NULL),
      (9,  '2026-03-14', '2026-03-14', 'Đi khám răng',                     'Approved', 3),
      (10, '2026-03-18', '2026-03-19', 'Việc cá nhân',                     'Pending',  NULL),
      (11, '2026-02-14', '2026-02-14', 'Nghỉ Valentine',                   'Approved', 7),
      (13, '2026-03-25', '2026-03-28', 'Du lịch gia đình',                 'Pending',  NULL),
      (15, '2026-04-01', '2026-04-03', 'Nghỉ lễ Giỗ tổ Hùng Vương',       'Pending',  NULL),
      (16, '2026-03-05', '2026-03-06', 'Đưa con đi tiêm phòng',           'Approved', 17),
      (18, '2026-03-22', '2026-03-22', 'Làm giấy tờ cá nhân',             'Pending',  NULL),
      (19, '2026-02-20', '2026-02-21', 'Nghỉ ốm',                         'Approved', 2),
      (12, '2026-04-10', '2026-04-12', 'Du lịch Đà Lạt',                  'Pending',  NULL),
      (3,  '2026-04-05', '2026-04-05', 'Họp phụ huynh cho con',           'Approved', 1),
      (20, '2026-03-15', '2026-03-17', 'Về quê thăm gia đình',            'Pending',  NULL)`
  );
  console.log('Đã thêm 15 đơn nghỉ phép mẫu.');

  // Leave balances (năm 2026 cho 20 NV)
  await connection.query(
    `INSERT INTO leave_balances (user_id, year, total_days, used_days) VALUES
      (1,  2026, 15, 0),
      (2,  2026, 14, 1),
      (3,  2026, 14, 1),
      (4,  2026, 12, 3),
      (5,  2026, 12, 1),
      (6,  2026, 12, 0),
      (7,  2026, 14, 0),
      (8,  2026, 14, 0),
      (9,  2026, 12, 1),
      (10, 2026, 12, 0),
      (11, 2026, 12, 1),
      (12, 2026, 12, 0),
      (13, 2026, 12, 0),
      (14, 2026, 12, 0),
      (15, 2026, 12, 0),
      (16, 2026, 12, 2),
      (17, 2026, 15, 0),
      (18, 2026, 12, 0),
      (19, 2026, 12, 2),
      (20, 2026, 12, 0)`
  );
  console.log('Đã thêm số ngày phép 2026 cho 20 NV.');

  // Notifications (15 thông báo)
  await connection.query(
    `INSERT INTO notifications (user_id, title, message, is_read) VALUES
      (4,  'Đơn nghỉ phép bị từ chối',     'Đơn xin nghỉ ngày 01/02/2026 đã bị từ chối bởi quản lý Lê Hoàng Cường.', 1),
      (5,  'Đơn nghỉ phép được duyệt',     'Đơn xin nghỉ ngày 15-16/03/2026 đã được HR Trần Thị Bình duyệt.', 0),
      (4,  'Hợp đồng sắp hết hạn',         'Hợp đồng lao động của bạn sẽ hết hạn vào 11/04/2026. Vui lòng liên hệ HR.', 0),
      (3,  'Đơn nghỉ phép cần duyệt',      'Phạm Minh Dũng đã gửi đơn xin nghỉ ngày 10-12/03/2026.', 0),
      (5,  'Hợp đồng sắp hết hạn',         'Hợp đồng của bạn sẽ hết hạn vào 20/03/2026. Vui lòng liên hệ HR để gia hạn.', 0),
      (3,  'Nhân viên mới trong phòng',     'Đỗ Quang Minh đã gia nhập phòng IT từ ngày 05/03/2024.', 1),
      (7,  'Đơn nghỉ phép cần duyệt',      'Bùi Thị Thu Hà gửi đơn xin nghỉ ngày 14/02/2026.', 1),
      (1,  'Báo cáo nhân sự tháng 3/2026', 'Tổng số nhân viên: 20. Đơn nghỉ phép chờ duyệt: 7. Hợp đồng sắp hết hạn: 5.', 0),
      (2,  'Nhắc nhở gia hạn hợp đồng',    '5 hợp đồng sẽ hết hạn trong 30 ngày tới. Vui lòng xử lý gia hạn.', 0),
      (9,  'Đơn nghỉ phép được duyệt',     'Đơn xin nghỉ ngày 14/03/2026 đã được quản lý Lê Hoàng Cường duyệt.', 0),
      (17, 'Đơn nghỉ phép cần duyệt',      'Đặng Thị Kim Ngân gửi đơn xin nghỉ ngày 01-03/04/2026.', 0),
      (8,  'Đơn nghỉ phép cần duyệt',      'Hoàng Đức Thắng gửi đơn xin nghỉ ngày 20-21/03/2026.', 0),
      (11, 'Đơn nghỉ phép được duyệt',     'Đơn xin nghỉ ngày 14/02/2026 đã được quản lý Nguyễn Thị Hương duyệt.', 1),
      (16, 'Đơn nghỉ phép được duyệt',     'Đơn xin nghỉ ngày 05-06/03/2026 đã được trưởng phòng Đinh Thị Phương duyệt.', 1),
      (19, 'Đơn nghỉ phép được duyệt',     'Đơn xin nghỉ ốm ngày 20-21/02/2026 đã được HR duyệt.', 1)`
  );
  console.log('Đã thêm 15 thông báo mẫu.');

  // Documents (10 tài liệu mẫu)
  await connection.query(
    `INSERT INTO documents (user_id, doc_type, doc_name, file_url) VALUES
      (4,  'CCCD',      'CCCD_PhamMinhDung.pdf',     '/uploads/docs/cccd_dung.pdf'),
      (4,  'Bằng cấp',  'BangDH_PhamMinhDung.pdf',   '/uploads/docs/bangdh_dung.pdf'),
      (5,  'CCCD',      'CCCD_VoThiMai.pdf',         '/uploads/docs/cccd_mai.pdf'),
      (9,  'CCCD',      'CCCD_LyThiNgocLan.pdf',     '/uploads/docs/cccd_lan.pdf'),
      (9,  'Bằng cấp',  'BangDH_LyThiNgocLan.pdf',   '/uploads/docs/bangdh_lan.pdf'),
      (15, 'Chứng chỉ', 'ChungChi_KeToan_Ngan.pdf',  '/uploads/docs/chungchi_ngan.pdf'),
      (3,  'CCCD',      'CCCD_LeHoangCuong.pdf',     '/uploads/docs/cccd_cuong.pdf'),
      (1,  'Hộ khẩu',   'HoKhau_NguyenVanAn.pdf',    '/uploads/docs/hokhau_an.pdf'),
      (10, 'Bằng cấp',  'BangDH_DoQuangMinh.pdf',    '/uploads/docs/bangdh_minh.pdf'),
      (20, 'CCCD',      'CCCD_NgoVanTai.pdf',        '/uploads/docs/cccd_tai.pdf')`
  );
  console.log('Đã thêm 10 tài liệu mẫu.');

  await connection.end();

  console.log('\n===== SEED HOÀN TẤT =====');
  console.log('Tổng: 20 NV | 5 phòng ban | 26 HĐ | 12 lịch sử | 15 đơn phép | 15 thông báo | 10 tài liệu');
  console.log('\nTài khoản đăng nhập mẫu:');
  console.log('  Admin:    admin@company.com     / password123');
  console.log('  HR:       hr@company.com        / password123');
  console.log('  Manager:  manager@company.com   / password123  (IT)');
  console.log('  Manager:  huong@company.com     / password123  (Marketing)');
  console.log('  Manager:  hai@company.com       / password123  (Sales)');
  console.log('  Manager:  phuong@company.com    / password123  (Kế toán)');
  console.log('  Employee: dung@company.com      / password123');
  console.log('  Employee: mai@company.com       / password123');
  console.log('  Employee: thang@company.com     / password123');
  console.log('  Employee: lan@company.com       / password123');
  console.log('  Employee: minh@company.com      / password123');
  console.log('  Employee: ha@company.com        / password123');
  console.log('  Employee: khoa@company.com      / password123');
  console.log('  Employee: tam@company.com       / password123');
  console.log('  Employee: phuc@company.com      / password123');
  console.log('  Employee: ngan@company.com      / password123');
  console.log('  Employee: trung@company.com     / password123');
  console.log('  Employee: nghia@company.com     / password123');
  console.log('  Employee: nhi@company.com       / password123');
  console.log('  Employee: tai@company.com       / password123');
}

seed().catch((err) => {
  console.error('Lỗi seed:', err.message);
  process.exit(1);
});
