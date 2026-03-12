const express = require('express');
const pool = require('../config/db');
const { authenticate, requirePermission } = require('../middlewares/auth');

const router = express.Router();

// GET /api/work-history — Xem lịch sử công tác
router.get('/', authenticate, requirePermission('work_history.view_all', 'work_history.view_self'), async (req, res) => {
  try {
    const canViewAll = req.userPermissions.includes('work_history.view_all');

    let query, params;
    if (canViewAll) {
      query = `SELECT wh.*, u.full_name,
                      fd.name AS from_department, td.name AS to_department
               FROM work_history wh
               JOIN users u ON wh.user_id = u.id
               LEFT JOIN departments fd ON wh.from_department_id = fd.id
               LEFT JOIN departments td ON wh.to_department_id = td.id
               ORDER BY wh.event_date DESC`;
      params = [];
    } else {
      query = `SELECT wh.*,
                      fd.name AS from_department, td.name AS to_department
               FROM work_history wh
               LEFT JOIN departments fd ON wh.from_department_id = fd.id
               LEFT JOIN departments td ON wh.to_department_id = td.id
               WHERE wh.user_id = ?
               ORDER BY wh.event_date DESC`;
      params = [req.user.id];
    }

    const [rows] = await pool.query(query, params);
    res.json(rows);
  } catch (error) {
    console.error('Get work history error:', error);
    res.status(500).json({ message: 'Lỗi server.' });
  }
});

// GET /api/work-history/user/:userId — Xem lịch sử của 1 NV cụ thể
router.get('/user/:userId', authenticate, requirePermission('work_history.view_all'), async (req, res) => {
  try {
    const userId = Number(req.params.userId);
    const [rows] = await pool.query(
      `SELECT wh.*,
              fd.name AS from_department, td.name AS to_department
       FROM work_history wh
       LEFT JOIN departments fd ON wh.from_department_id = fd.id
       LEFT JOIN departments td ON wh.to_department_id = td.id
       WHERE wh.user_id = ?
       ORDER BY wh.event_date DESC`,
      [userId]
    );
    res.json(rows);
  } catch (error) {
    console.error('Get user work history error:', error);
    res.status(500).json({ message: 'Lỗi server.' });
  }
});

// POST /api/work-history — Thêm lịch sử công tác
router.post('/', authenticate, requirePermission('work_history.create'), async (req, res) => {
  try {
    const { user_id, event_type, event_date, from_position, to_position, from_department_id, to_department_id, notes } = req.body;

    if (!user_id || !event_type || !event_date) {
      return res.status(400).json({ message: 'Vui lòng điền đầy đủ thông tin bắt buộc.' });
    }

    const [result] = await pool.query(
      `INSERT INTO work_history (user_id, event_type, event_date, from_position, to_position, from_department_id, to_department_id, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [user_id, event_type, event_date, from_position || null, to_position || null, from_department_id || null, to_department_id || null, notes || null]
    );

    res.status(201).json({ message: 'Thêm lịch sử công tác thành công.', id: result.insertId });
  } catch (error) {
    console.error('Create work history error:', error);
    res.status(500).json({ message: 'Lỗi server.' });
  }
});

module.exports = router;
