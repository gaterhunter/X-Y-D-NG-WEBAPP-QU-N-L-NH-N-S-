const express = require('express');
const bcrypt = require('bcryptjs');
const pool = require('../config/db');
const { authenticate, authorize } = require('../middlewares/auth');

const router = express.Router();

// GET /api/employees — Lấy danh sách nhân viên (HR/Admin)
router.get('/', authenticate, authorize('Admin', 'HR'), async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT u.id, u.full_name, u.email, u.start_date,
              r.name AS role,
              d.name AS department
       FROM users u
       JOIN roles r ON u.role_id = r.id
       LEFT JOIN departments d ON u.department_id = d.id
       ORDER BY u.id`
    );
    res.json(rows);
  } catch (error) {
    console.error('Get employees error:', error);
    res.status(500).json({ message: 'Lỗi server.' });
  }
});

// GET /api/employees/:id — Lấy chi tiết 1 nhân viên
router.get('/:id', authenticate, async (req, res) => {
  try {
    const employeeId = Number(req.params.id);

    // Nhân viên thường chỉ xem được chính mình
    if (req.user.role === 'Employee' && req.user.id !== employeeId) {
      return res.status(403).json({ message: 'Bạn không có quyền xem thông tin người khác.' });
    }

    const [rows] = await pool.query(
      `SELECT u.id, u.full_name, u.email, u.start_date,
              r.name AS role,
              d.name AS department, u.department_id
       FROM users u
       JOIN roles r ON u.role_id = r.id
       LEFT JOIN departments d ON u.department_id = d.id
       WHERE u.id = ?`,
      [employeeId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Không tìm thấy nhân viên.' });
    }

    res.json(rows[0]);
  } catch (error) {
    console.error('Get employee error:', error);
    res.status(500).json({ message: 'Lỗi server.' });
  }
});

// POST /api/employees — Thêm nhân viên mới (HR/Admin)
router.post('/', authenticate, authorize('Admin', 'HR'), async (req, res) => {
  try {
    const { full_name, email, password, role_id, department_id, start_date } = req.body;

    if (!full_name || !email || !password || !role_id || !start_date) {
      return res.status(400).json({ message: 'Vui lòng điền đầy đủ thông tin bắt buộc.' });
    }

    // Kiểm tra email trùng
    const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(409).json({ message: 'Email đã tồn tại trong hệ thống.' });
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    const [result] = await pool.query(
      `INSERT INTO users (full_name, email, password_hash, role_id, department_id, start_date)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [full_name, email, password_hash, role_id, department_id || null, start_date]
    );

    res.status(201).json({
      message: 'Thêm nhân viên thành công.',
      employeeId: result.insertId,
    });
  } catch (error) {
    console.error('Create employee error:', error);
    res.status(500).json({ message: 'Lỗi server.' });
  }
});

// PUT /api/employees/:id — Cập nhật thông tin nhân viên
router.put('/:id', authenticate, authorize('Admin', 'HR'), async (req, res) => {
  try {
    const employeeId = Number(req.params.id);
    const { full_name, email, role_id, department_id, start_date } = req.body;

    // Kiểm tra nhân viên tồn tại
    const [existing] = await pool.query('SELECT id FROM users WHERE id = ?', [employeeId]);
    if (existing.length === 0) {
      return res.status(404).json({ message: 'Không tìm thấy nhân viên.' });
    }

    // Kiểm tra email trùng (nếu đổi email)
    if (email) {
      const [emailCheck] = await pool.query(
        'SELECT id FROM users WHERE email = ? AND id != ?',
        [email, employeeId]
      );
      if (emailCheck.length > 0) {
        return res.status(409).json({ message: 'Email đã được sử dụng bởi nhân viên khác.' });
      }
    }

    const fields = [];
    const values = [];

    if (full_name)     { fields.push('full_name = ?');     values.push(full_name); }
    if (email)         { fields.push('email = ?');         values.push(email); }
    if (role_id)       { fields.push('role_id = ?');       values.push(role_id); }
    if (department_id !== undefined) { fields.push('department_id = ?'); values.push(department_id); }
    if (start_date)    { fields.push('start_date = ?');    values.push(start_date); }

    if (fields.length === 0) {
      return res.status(400).json({ message: 'Không có thông tin nào để cập nhật.' });
    }

    values.push(employeeId);
    await pool.query(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, values);

    res.json({ message: 'Cập nhật nhân viên thành công.' });
  } catch (error) {
    console.error('Update employee error:', error);
    res.status(500).json({ message: 'Lỗi server.' });
  }
});

// DELETE /api/employees/:id — Xóa nhân viên
router.delete('/:id', authenticate, authorize('Admin', 'HR'), async (req, res) => {
  try {
    const employeeId = Number(req.params.id);

    const [existing] = await pool.query('SELECT id FROM users WHERE id = ?', [employeeId]);
    if (existing.length === 0) {
      return res.status(404).json({ message: 'Không tìm thấy nhân viên.' });
    }

    // Xóa trưởng phòng reference trước
    await pool.query('UPDATE departments SET manager_id = NULL WHERE manager_id = ?', [employeeId]);

    await pool.query('DELETE FROM users WHERE id = ?', [employeeId]);

    res.json({ message: 'Xóa nhân viên thành công.' });
  } catch (error) {
    console.error('Delete employee error:', error);
    res.status(500).json({ message: 'Lỗi server.' });
  }
});

module.exports = router;
