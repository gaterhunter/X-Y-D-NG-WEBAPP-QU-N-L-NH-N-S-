const express = require('express');
const pool = require('../config/db');
const { authenticate, requirePermission } = require('../middlewares/auth');

const router = express.Router();

// GET /api/documents — Xem tài liệu
router.get('/', authenticate, requirePermission('documents.view_all', 'documents.view_self'), async (req, res) => {
  try {
    const canViewAll = req.userPermissions.includes('documents.view_all');

    let query, params;
    if (canViewAll) {
      query = `SELECT doc.*, u.full_name
               FROM documents doc
               JOIN users u ON doc.user_id = u.id
               ORDER BY doc.uploaded_at DESC`;
      params = [];
    } else {
      query = `SELECT * FROM documents WHERE user_id = ? ORDER BY uploaded_at DESC`;
      params = [req.user.id];
    }

    const [rows] = await pool.query(query, params);
    res.json(rows);
  } catch (error) {
    console.error('Get documents error:', error);
    res.status(500).json({ message: 'Lỗi server.' });
  }
});

// POST /api/documents — Upload tài liệu (lưu metadata, file_url giả lập)
router.post('/', authenticate, requirePermission('documents.upload'), async (req, res) => {
  try {
    const { user_id, doc_type, doc_name, file_url } = req.body;

    // Nếu user_id không được cung cấp hoặc user không có quyền view_all, chỉ cho upload cho chính mình
    const targetUserId = req.userPermissions.includes('documents.view_all') ? (user_id || req.user.id) : req.user.id;

    if (!doc_type || !doc_name || !file_url) {
      return res.status(400).json({ message: 'Vui lòng điền đầy đủ thông tin tài liệu.' });
    }

    const [result] = await pool.query(
      `INSERT INTO documents (user_id, doc_type, doc_name, file_url) VALUES (?, ?, ?, ?)`,
      [targetUserId, doc_type, doc_name, file_url]
    );

    res.status(201).json({ message: 'Upload tài liệu thành công.', documentId: result.insertId });
  } catch (error) {
    console.error('Upload document error:', error);
    res.status(500).json({ message: 'Lỗi server.' });
  }
});

// DELETE /api/documents/:id — Xóa tài liệu (Admin/HR hoặc chủ sở hữu)
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const docId = Number(req.params.id);
    const [existing] = await pool.query('SELECT user_id FROM documents WHERE id = ?', [docId]);

    if (existing.length === 0) {
      return res.status(404).json({ message: 'Không tìm thấy tài liệu.' });
    }

    // Only owner or Admin/HR can delete
    if (existing[0].user_id !== req.user.id && !['Admin', 'HR'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Bạn không có quyền xóa tài liệu này.' });
    }

    await pool.query('DELETE FROM documents WHERE id = ?', [docId]);
    res.json({ message: 'Xóa tài liệu thành công.' });
  } catch (error) {
    console.error('Delete document error:', error);
    res.status(500).json({ message: 'Lỗi server.' });
  }
});

module.exports = router;
