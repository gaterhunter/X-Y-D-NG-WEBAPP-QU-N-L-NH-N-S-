const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');

const router = express.Router();

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Vui lòng nhập email và mật khẩu.' });
    }

    const [rows] = await pool.query(
      `SELECT u.id, u.full_name, u.email, u.password_hash, u.department_id,
              u.phone, u.avatar_url, u.role_id,
              r.name AS role
       FROM users u
       JOIN roles r ON u.role_id = r.id
       WHERE u.email = ?`,
      [email]
    );

    if (rows.length === 0) {
      return res.status(401).json({ message: 'Email hoặc mật khẩu không đúng.' });
    }

    const user = rows[0];
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ message: 'Email hoặc mật khẩu không đúng.' });
    }

    // Load permissions for this role
    const [permRows] = await pool.query(
      `SELECT p.code FROM permissions p
       JOIN role_permissions rp ON p.id = rp.permission_id
       WHERE rp.role_id = ?`,
      [user.role_id]
    );
    const permissions = permRows.map((r) => r.code);

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
        role_id: user.role_id,
        department_id: user.department_id,
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    res.json({
      message: 'Đăng nhập thành công.',
      token,
      user: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        role: user.role,
        role_id: user.role_id,
        department_id: user.department_id,
        permissions,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Lỗi server.' });
  }
});

module.exports = router;
