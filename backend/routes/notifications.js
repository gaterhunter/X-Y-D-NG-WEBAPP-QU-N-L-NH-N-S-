const express = require('express');
const pool = require('../config/db');
const { authenticate, requirePermission } = require('../middlewares/auth');

const router = express.Router();

// GET /api/notifications — Lấy thông báo của user đăng nhập
router.get('/', authenticate, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50`,
      [req.user.id]
    );
    res.json(rows);
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ message: 'Lỗi server.' });
  }
});

// GET /api/notifications/unread-count — Số thông báo chưa đọc
router.get('/unread-count', authenticate, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT COUNT(*) AS count FROM notifications WHERE user_id = ? AND is_read = 0',
      [req.user.id]
    );
    res.json({ count: rows[0].count });
  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({ message: 'Lỗi server.' });
  }
});

// PUT /api/notifications/:id/read — Đánh dấu đã đọc
router.put('/:id/read', authenticate, async (req, res) => {
  try {
    const notifId = Number(req.params.id);
    await pool.query(
      'UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?',
      [notifId, req.user.id]
    );
    res.json({ message: 'Đã đánh dấu đã đọc.' });
  } catch (error) {
    console.error('Mark read error:', error);
    res.status(500).json({ message: 'Lỗi server.' });
  }
});

// PUT /api/notifications/read-all — Đánh dấu tất cả đã đọc
router.put('/read-all', authenticate, async (req, res) => {
  try {
    await pool.query(
      'UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0',
      [req.user.id]
    );
    res.json({ message: 'Đã đánh dấu tất cả đã đọc.' });
  } catch (error) {
    console.error('Mark all read error:', error);
    res.status(500).json({ message: 'Lỗi server.' });
  }
});

// POST /api/notifications — Gửi thông báo (Admin/HR)
router.post('/', authenticate, requirePermission('notifications.send'), async (req, res) => {
  try {
    const { user_id, title, message } = req.body;

    if (!user_id || !title || !message) {
      return res.status(400).json({ message: 'Vui lòng điền đầy đủ thông tin.' });
    }

    const [result] = await pool.query(
      'INSERT INTO notifications (user_id, title, message) VALUES (?, ?, ?)',
      [user_id, title, message]
    );

    res.status(201).json({ message: 'Gửi thông báo thành công.', notificationId: result.insertId });
  } catch (error) {
    console.error('Send notification error:', error);
    res.status(500).json({ message: 'Lỗi server.' });
  }
});

module.exports = router;
