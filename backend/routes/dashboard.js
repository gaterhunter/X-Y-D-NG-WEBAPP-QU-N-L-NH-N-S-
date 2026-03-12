const express = require('express');
const pool = require('../config/db');
const { authenticate } = require('../middlewares/auth');

const router = express.Router();

// GET /api/dashboard — Dữ liệu tổng hợp cho Dashboard
router.get('/', authenticate, async (req, res) => {
  try {
    const canViewAll = req.userPermissions.includes('employees.view_all');
    const canViewDept = req.userPermissions.includes('employees.view_department');
    const isAdminHR = canViewAll;

    // 1. KPI counts
    const [totalEmp] = await pool.query('SELECT COUNT(*) AS count FROM users');
    const [totalDept] = await pool.query('SELECT COUNT(*) AS count FROM departments');

    // Pending leaves - scoped by role
    let pendingQuery, pendingParams;
    if (canViewAll) {
      pendingQuery = "SELECT COUNT(*) AS count FROM leave_requests WHERE status = 'Pending'";
      pendingParams = [];
    } else if (canViewDept) {
      pendingQuery = `SELECT COUNT(*) AS count FROM leave_requests lr
        JOIN users u ON lr.user_id = u.id
        WHERE lr.status = 'Pending' AND u.department_id = (SELECT department_id FROM users WHERE id = ?)`;
      pendingParams = [req.user.id];
    } else {
      pendingQuery = "SELECT COUNT(*) AS count FROM leave_requests WHERE status = 'Pending' AND user_id = ?";
      pendingParams = [req.user.id];
    }
    const [pendingLeaves] = await pool.query(pendingQuery, pendingParams);

    // Expiring contracts (30 days)
    let expiringCount = 0;
    if (isAdminHR) {
      const [exp] = await pool.query(
        `SELECT COUNT(*) AS count FROM contracts
         WHERE status = 'Active' AND end_date IS NOT NULL
         AND end_date <= DATE_ADD(CURDATE(), INTERVAL 30 DAY)`
      );
      expiringCount = exp[0].count;
    }

    // Unread notifications
    const [unread] = await pool.query(
      'SELECT COUNT(*) AS count FROM notifications WHERE user_id = ? AND is_read = 0',
      [req.user.id]
    );

    // New hires this month
    const [newHires] = await pool.query(
      `SELECT COUNT(*) AS count FROM users
       WHERE MONTH(start_date) = MONTH(CURDATE()) AND YEAR(start_date) = YEAR(CURDATE())`
    );

    // 2. Employees by department (Pie Chart)
    const [deptDistribution] = await pool.query(
      `SELECT d.name, COUNT(u.id) AS value
       FROM departments d LEFT JOIN users u ON d.id = u.department_id
       GROUP BY d.id, d.name ORDER BY value DESC`
    );

    // 3. Employees by gender (Doughnut)
    const [genderDist] = await pool.query(
      `SELECT COALESCE(gender, 'Không rõ') AS name, COUNT(*) AS value
       FROM users GROUP BY gender`
    );

    // 4. Contract status distribution (Bar)
    const [contractStatus] = await pool.query(
      `SELECT status AS name, COUNT(*) AS value FROM contracts GROUP BY status`
    );

    // 5. Leave status distribution (Bar)
    const [leaveStatus] = await pool.query(
      `SELECT status AS name, COUNT(*) AS value FROM leave_requests GROUP BY status`
    );

    // 6. Monthly hiring trend (Line Chart - last 12 months)
    const [hiringTrend] = await pool.query(
      `SELECT DATE_FORMAT(start_date, '%Y-%m') AS month, COUNT(*) AS value
       FROM users
       WHERE start_date >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
       GROUP BY month ORDER BY month ASC`
    );

    // 7. Recent activities (latest notifications, leave requests, contracts)
    const [recentLeaves] = await pool.query(
      `SELECT lr.id, u.full_name, lr.start_date, lr.end_date, lr.status, lr.reason, lr.created_at
       FROM leave_requests lr JOIN users u ON lr.user_id = u.id
       ORDER BY lr.created_at DESC LIMIT 5`
    );

    const [recentNotifs] = await pool.query(
      `SELECT id, title, message, is_read, created_at
       FROM notifications WHERE user_id = ?
       ORDER BY created_at DESC LIMIT 5`,
      [req.user.id]
    );

    // 8. Upcoming contract expirations (Admin/HR only)
    let upcomingExpirations = [];
    if (isAdminHR) {
      const [rows] = await pool.query(
        `SELECT c.id, u.full_name, c.contract_type, c.end_date, c.salary, d.name AS department
         FROM contracts c
         JOIN users u ON c.user_id = u.id
         LEFT JOIN departments d ON u.department_id = d.id
         WHERE c.status = 'Active' AND c.end_date IS NOT NULL
         AND c.end_date <= DATE_ADD(CURDATE(), INTERVAL 60 DAY)
         ORDER BY c.end_date ASC LIMIT 5`
      );
      upcomingExpirations = rows;
    }

    res.json({
      kpi: {
        totalEmployees: totalEmp[0].count,
        totalDepartments: totalDept[0].count,
        pendingLeaves: pendingLeaves[0].count,
        expiringContracts: expiringCount,
        unreadNotifications: unread[0].count,
        newHiresThisMonth: newHires[0].count,
      },
      charts: {
        departmentDistribution: deptDistribution,
        genderDistribution: genderDist,
        contractStatus,
        leaveStatus,
        hiringTrend,
      },
      recent: {
        leaves: recentLeaves,
        notifications: recentNotifs,
        upcomingExpirations,
      },
    });
  } catch (error) {
    console.error('Dashboard API error:', error);
    res.status(500).json({ message: 'Lỗi server.' });
  }
});

module.exports = router;
