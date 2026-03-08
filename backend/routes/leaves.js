const express = require('express');
const pool = require('../config/db');
const { authenticate, authorize } = require('../middlewares/auth');

const router = express.Router();

// POST /api/leaves — Nhân viên gửi yêu cầu nghỉ phép
router.post('/', authenticate, async (req, res) => {
  try {
    const { start_date, end_date, reason } = req.body;

    if (!start_date || !end_date || !reason) {
      return res.status(400).json({ message: 'Vui lòng điền đầy đủ thông tin nghỉ phép.' });
    }

    if (new Date(end_date) < new Date(start_date)) {
      return res.status(400).json({ message: 'Ngày kết thúc phải sau ngày bắt đầu.' });
    }

    const [result] = await pool.query(
      `INSERT INTO leave_requests (user_id, start_date, end_date, reason, status)
       VALUES (?, ?, ?, ?, 'Pending')`,
      [req.user.id, start_date, end_date, reason]
    );

    res.status(201).json({
      message: 'Gửi yêu cầu nghỉ phép thành công.',
      leaveId: result.insertId,
    });
  } catch (error) {
    console.error('Create leave request error:', error);
    res.status(500).json({ message: 'Lỗi server.' });
  }
});

// GET /api/leaves/me — Nhân viên xem lịch sử nghỉ phép của mình
router.get('/me', authenticate, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, start_date, end_date, reason, status
       FROM leave_requests
       WHERE user_id = ?
       ORDER BY start_date DESC`,
      [req.user.id]
    );
    res.json(rows);
  } catch (error) {
    console.error('Get my leaves error:', error);
    res.status(500).json({ message: 'Lỗi server.' });
  }
});

// GET /api/leaves — HR/Admin xem toàn bộ yêu cầu nghỉ phép
router.get('/', authenticate, authorize('Admin', 'HR'), async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT lr.id, lr.start_date, lr.end_date, lr.reason, lr.status,
              u.id AS user_id, u.full_name, u.email,
              d.name AS department
       FROM leave_requests lr
       JOIN users u ON lr.user_id = u.id
       LEFT JOIN departments d ON u.department_id = d.id
       ORDER BY lr.start_date DESC`
    );
    res.json(rows);
  } catch (error) {
    console.error('Get all leaves error:', error);
    res.status(500).json({ message: 'Lỗi server.' });
  }
});

// PUT /api/leaves/:id/status — HR/Admin duyệt hoặc từ chối đơn nghỉ
router.put('/:id/status', authenticate, authorize('Admin', 'HR'), async (req, res) => {
  try {
    const leaveId = Number(req.params.id);
    const { status } = req.body;

    if (!['Approved', 'Rejected'].includes(status)) {
      return res.status(400).json({ message: 'Trạng thái chỉ có thể là Approved hoặc Rejected.' });
    }

    const [existing] = await pool.query(
      'SELECT id, status FROM leave_requests WHERE id = ?',
      [leaveId]
    );

    if (existing.length === 0) {
      return res.status(404).json({ message: 'Không tìm thấy yêu cầu nghỉ phép.' });
    }

    if (existing[0].status !== 'Pending') {
      return res.status(400).json({ message: 'Chỉ có thể duyệt đơn đang ở trạng thái Pending.' });
    }

    await pool.query(
      'UPDATE leave_requests SET status = ? WHERE id = ?',
      [status, leaveId]
    );

    res.json({
      message: status === 'Approved' ? 'Đã duyệt đơn nghỉ phép.' : 'Đã từ chối đơn nghỉ phép.',
    });
  } catch (error) {
    console.error('Update leave status error:', error);
    res.status(500).json({ message: 'Lỗi server.' });
  }
});

module.exports = router;
