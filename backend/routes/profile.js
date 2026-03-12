const express = require('express');
const pool = require('../config/db');
const { authenticate, requirePermission } = require('../middlewares/auth');

const router = express.Router();

// GET /api/profile — Xem hồ sơ cá nhân
router.get('/', authenticate, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT u.id, u.full_name, u.email, u.phone, u.address, u.gender,
              u.date_of_birth, u.id_card_number, u.bank_account_number,
              u.bank_name, u.avatar_url, u.start_date, u.department_id,
              r.name AS role, d.name AS department
       FROM users u
       JOIN roles r ON u.role_id = r.id
       LEFT JOIN departments d ON u.department_id = d.id
       WHERE u.id = ?`,
      [req.user.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Không tìm thấy hồ sơ.' });
    }

    // Leave balance
    const currentYear = new Date().getFullYear();
    const [balanceRows] = await pool.query(
      'SELECT total_days, used_days FROM leave_balances WHERE user_id = ? AND year = ?',
      [req.user.id, currentYear]
    );
    const leaveBalance = balanceRows[0] || { total_days: 12, used_days: 0 };

    res.json({
      ...rows[0],
      leave_balance: {
        total_days: leaveBalance.total_days,
        used_days: leaveBalance.used_days,
        remaining_days: leaveBalance.total_days - leaveBalance.used_days,
      },
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Lỗi server.' });
  }
});

// PUT /api/profile — Cập nhật hồ sơ cá nhân (chỉ các trường cho phép)
router.put('/', authenticate, requirePermission('profile.edit_self'), async (req, res) => {
  try {
    const { phone, address, bank_account_number, bank_name } = req.body;

    const fields = [];
    const values = [];

    if (phone !== undefined) { fields.push('phone = ?'); values.push(phone); }
    if (address !== undefined) { fields.push('address = ?'); values.push(address); }
    if (bank_account_number !== undefined) { fields.push('bank_account_number = ?'); values.push(bank_account_number); }
    if (bank_name !== undefined) { fields.push('bank_name = ?'); values.push(bank_name); }

    if (fields.length === 0) {
      return res.status(400).json({ message: 'Không có thông tin nào để cập nhật.' });
    }

    values.push(req.user.id);
    await pool.query(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, values);

    res.json({ message: 'Cập nhật hồ sơ thành công.' });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Lỗi server.' });
  }
});

module.exports = router;
