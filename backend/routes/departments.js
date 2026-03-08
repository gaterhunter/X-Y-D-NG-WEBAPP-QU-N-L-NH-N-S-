const express = require('express');
const pool = require('../config/db');
const { authenticate, authorize } = require('../middlewares/auth');

const router = express.Router();

// GET /api/departments — Lấy danh sách phòng ban
router.get('/', authenticate, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT d.id, d.name, d.manager_id,
              u.full_name AS manager_name
       FROM departments d
       LEFT JOIN users u ON d.manager_id = u.id
       ORDER BY d.id`
    );
    res.json(rows);
  } catch (error) {
    console.error('Get departments error:', error);
    res.status(500).json({ message: 'Lỗi server.' });
  }
});

// POST /api/departments — Tạo phòng ban mới (Admin/HR)
router.post('/', authenticate, authorize('Admin', 'HR'), async (req, res) => {
  try {
    const { name, manager_id } = req.body;

    if (!name) {
      return res.status(400).json({ message: 'Vui lòng nhập tên phòng ban.' });
    }

    // Kiểm tra tên trùng
    const [existing] = await pool.query('SELECT id FROM departments WHERE name = ?', [name]);
    if (existing.length > 0) {
      return res.status(409).json({ message: 'Tên phòng ban đã tồn tại.' });
    }

    // Kiểm tra manager_id hợp lệ nếu có
    if (manager_id) {
      const [managerCheck] = await pool.query('SELECT id FROM users WHERE id = ?', [manager_id]);
      if (managerCheck.length === 0) {
        return res.status(400).json({ message: 'Trưởng phòng không tồn tại.' });
      }
    }

    const [result] = await pool.query(
      'INSERT INTO departments (name, manager_id) VALUES (?, ?)',
      [name, manager_id || null]
    );

    res.status(201).json({
      message: 'Tạo phòng ban thành công.',
      departmentId: result.insertId,
    });
  } catch (error) {
    console.error('Create department error:', error);
    res.status(500).json({ message: 'Lỗi server.' });
  }
});

module.exports = router;
