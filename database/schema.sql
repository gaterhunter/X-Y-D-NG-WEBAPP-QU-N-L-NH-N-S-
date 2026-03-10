-- =============================================
-- CƠ SỞ DỮ LIỆU QUẢN LÝ NHÂN SỰ
-- =============================================

CREATE DATABASE IF NOT EXISTS hr_management
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE hr_management;

-- =============================================
-- 1. Bảng roles (Phân quyền)
-- =============================================
CREATE TABLE roles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE
);

-- =============================================
-- 2. Bảng departments (Phòng ban)
-- =============================================
CREATE TABLE departments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    manager_id INT NULL
);

-- =============================================
-- 3. Bảng users (Nhân viên)
-- =============================================
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(191) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role_id INT NOT NULL,
    department_id INT NULL,
    start_date DATE NOT NULL,

    CONSTRAINT fk_users_role
        FOREIGN KEY (role_id) REFERENCES roles(id)
        ON DELETE RESTRICT ON UPDATE CASCADE,

    CONSTRAINT fk_users_department
        FOREIGN KEY (department_id) REFERENCES departments(id)
        ON DELETE SET NULL ON UPDATE CASCADE
);

-- Thêm Foreign Key cho departments.manager_id sau khi bảng users đã tồn tại
ALTER TABLE departments
    ADD CONSTRAINT fk_departments_manager
        FOREIGN KEY (manager_id) REFERENCES users(id)
        ON DELETE SET NULL ON UPDATE CASCADE;

-- =============================================
-- 4. Bảng leave_requests (Yêu cầu nghỉ phép)
-- =============================================
CREATE TABLE leave_requests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    reason TEXT NOT NULL,
    status ENUM('Pending', 'Approved', 'Rejected') NOT NULL DEFAULT 'Pending',

    CONSTRAINT fk_leave_requests_user
        FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE CASCADE ON UPDATE CASCADE,

    CONSTRAINT chk_dates CHECK (end_date >= start_date)
);

-- =============================================
-- DỮ LIỆU MẪU
-- =============================================

-- Thêm vai trò
INSERT INTO roles (name) VALUES
    ('Admin'),
    ('HR'),
    ('Employee');

-- Thêm phòng ban (chưa có manager)
INSERT INTO departments (name) VALUES
    ('IT'),
    ('Marketing'),
    ('Sales');

-- Thêm nhân viên mẫu (password = 'password123' đã hash bằng bcrypt)
INSERT INTO users (full_name, email, password_hash, role_id, department_id, start_date) VALUES
    ('Nguyễn Văn An',  'admin@company.com',   '$2b$10$examplehashAdmin1234567890abcdefghijklmnop', 1, 1, '2020-01-15'),
    ('Trần Thị Bình',  'hr@company.com',      '$2b$10$examplehashHR1234567890abcdefghijklmnopqr', 2, 2, '2021-03-01'),
    ('Lê Hoàng Cường', 'cuong@company.com',   '$2b$10$examplehashEmp1234567890abcdefghijklmnopq', 3, 1, '2022-06-10'),
    ('Phạm Minh Dũng', 'dung@company.com',    '$2b$10$examplehashEmp2234567890abcdefghijklmnopq', 3, 3, '2023-01-20');

-- Gán trưởng phòng
UPDATE departments SET manager_id = 1 WHERE name = 'IT';
UPDATE departments SET manager_id = 2 WHERE name = 'Marketing';
UPDATE departments SET manager_id = 4 WHERE name = 'Sales';

-- Thêm yêu cầu nghỉ phép mẫu
INSERT INTO leave_requests (user_id, start_date, end_date, reason, status) VALUES
    (3, '2026-03-10', '2026-03-12', 'Việc gia đình',   'Pending'),
    (4, '2026-03-15', '2026-03-16', 'Khám sức khỏe',   'Approved'),
    (3, '2026-02-01', '2026-02-02', 'Nghỉ phép năm',   'Rejected');
