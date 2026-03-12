const express = require('express');
const pool = require('../config/db');
const { authenticate, requirePermission } = require('../middlewares/auth');

const router = express.Router();

// GET /api/contracts — Xem tất cả hợp đồng (Admin/HR)
router.get('/', authenticate, requirePermission('contracts.view_all', 'contracts.view_self'), async (req, res) => {
  try {
    const canViewAll = req.userPermissions.includes('contracts.view_all');

    let query, params;
    if (canViewAll) {
      query = `SELECT c.*, u.full_name, u.email, d.name AS department
               FROM contracts c
               JOIN users u ON c.user_id = u.id
               LEFT JOIN departments d ON u.department_id = d.id
               ORDER BY c.created_at DESC`;
      params = [];
    } else {
      query = `SELECT c.*, u.full_name
               FROM contracts c
               JOIN users u ON c.user_id = u.id
               WHERE c.user_id = ?
               ORDER BY c.created_at DESC`;
      params = [req.user.id];
    }

    const [rows] = await pool.query(query, params);
    res.json(rows);
  } catch (error) {
    console.error('Get contracts error:', error);
    res.status(500).json({ message: 'Lỗi server.' });
  }
});

// GET /api/contracts/expiring — HĐ sắp hết hạn (trong 30 ngày, Admin/HR)
router.get('/expiring', authenticate, requirePermission('contracts.view_all'), async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT c.*, u.full_name, u.email, d.name AS department
       FROM contracts c
       JOIN users u ON c.user_id = u.id
       LEFT JOIN departments d ON u.department_id = d.id
       WHERE c.status = 'Active'
         AND c.end_date IS NOT NULL
         AND c.end_date <= DATE_ADD(CURDATE(), INTERVAL 30 DAY)
       ORDER BY c.end_date ASC`
    );
    res.json(rows);
  } catch (error) {
    console.error('Get expiring contracts error:', error);
    res.status(500).json({ message: 'Lỗi server.' });
  }
});

// POST /api/contracts — Tạo hợp đồng mới (Admin/HR)
router.post('/', authenticate, requirePermission('contracts.create'), async (req, res) => {
  try {
    const { user_id, contract_type, start_date, end_date, salary, notes } = req.body;

    if (!user_id || !contract_type || !start_date) {
      return res.status(400).json({ message: 'Vui lòng điền đầy đủ thông tin bắt buộc.' });
    }

    const [result] = await pool.query(
      `INSERT INTO contracts (user_id, contract_type, start_date, end_date, salary, notes)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [user_id, contract_type, start_date, end_date || null, salary || null, notes || null]
    );

    res.status(201).json({ message: 'Tạo hợp đồng thành công.', contractId: result.insertId });
  } catch (error) {
    console.error('Create contract error:', error);
    res.status(500).json({ message: 'Lỗi server.' });
  }
});

// PUT /api/contracts/:id — Cập nhật hợp đồng (Admin/HR)
router.put('/:id', authenticate, requirePermission('contracts.edit'), async (req, res) => {
  try {
    const contractId = Number(req.params.id);
    const { contract_type, start_date, end_date, salary, status, notes } = req.body;

    const [existing] = await pool.query('SELECT id FROM contracts WHERE id = ?', [contractId]);
    if (existing.length === 0) {
      return res.status(404).json({ message: 'Không tìm thấy hợp đồng.' });
    }

    const fields = [];
    const values = [];

    if (contract_type) { fields.push('contract_type = ?'); values.push(contract_type); }
    if (start_date) { fields.push('start_date = ?'); values.push(start_date); }
    if (end_date !== undefined) { fields.push('end_date = ?'); values.push(end_date); }
    if (salary !== undefined) { fields.push('salary = ?'); values.push(salary); }
    if (status) { fields.push('status = ?'); values.push(status); }
    if (notes !== undefined) { fields.push('notes = ?'); values.push(notes); }

    if (fields.length === 0) {
      return res.status(400).json({ message: 'Không có thông tin nào để cập nhật.' });
    }

    values.push(contractId);
    await pool.query(`UPDATE contracts SET ${fields.join(', ')} WHERE id = ?`, values);

    res.json({ message: 'Cập nhật hợp đồng thành công.' });
  } catch (error) {
    console.error('Update contract error:', error);
    res.status(500).json({ message: 'Lỗi server.' });
  }
});

module.exports = router;
