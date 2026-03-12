const jwt = require('jsonwebtoken');
const pool = require('../config/db');

// Cache permissions per role (cleared on server restart)
const permissionCache = new Map();

// Xác thực token JWT
function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Không có token. Vui lòng đăng nhập.' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // { id, email, role, role_id, department_id }
    next();
  } catch {
    return res.status(401).json({ message: 'Token không hợp lệ hoặc đã hết hạn.' });
  }
}

// Phân quyền theo role (backward-compatible)
function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Bạn không có quyền truy cập chức năng này.' });
    }
    next();
  };
}

// Phân quyền theo permission code
function requirePermission(...permissionCodes) {
  return async (req, res, next) => {
    try {
      const roleId = req.user.role_id;
      let permissions = permissionCache.get(roleId);

      if (!permissions) {
        const [rows] = await pool.query(
          `SELECT p.code FROM permissions p
           JOIN role_permissions rp ON p.id = rp.permission_id
           WHERE rp.role_id = ?`,
          [roleId]
        );
        permissions = rows.map((r) => r.code);
        permissionCache.set(roleId, permissions);
      }

      const hasPermission = permissionCodes.some((code) => permissions.includes(code));
      if (!hasPermission) {
        return res.status(403).json({ message: 'Bạn không có quyền truy cập chức năng này.' });
      }

      req.userPermissions = permissions;
      next();
    } catch (error) {
      console.error('Permission check error:', error);
      res.status(500).json({ message: 'Lỗi server.' });
    }
  };
}

module.exports = { authenticate, authorize, requirePermission };
