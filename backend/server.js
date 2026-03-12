const express = require('express');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const employeeRoutes = require('./routes/employees');
const departmentRoutes = require('./routes/departments');
const leaveRoutes = require('./routes/leaves');
const profileRoutes = require('./routes/profile');
const contractRoutes = require('./routes/contracts');
const workHistoryRoutes = require('./routes/workHistory');
const documentRoutes = require('./routes/documents');
const notificationRoutes = require('./routes/notifications');

const app = express();

// Middleware
// Production: chỉ cho phép domain cụ thể (FRONTEND_URL)
// Dev/CI: mở hoàn toàn
const corsOptions = process.env.FRONTEND_URL
  ? { origin: process.env.FRONTEND_URL.split(','), credentials: true }
  : {};

app.use(cors(corsOptions));
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/leaves', leaveRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/contracts', contractRoutes);
app.use('/api/work-history', workHistoryRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/notifications', notificationRoutes);

// Health check
app.get('/', (req, res) => {
  res.send('HRM Backend is running!');
});

// Start server (chỉ listen khi chạy trực tiếp, không listen khi import để test)
if (require.main === module) {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`Server đang chạy tại http://localhost:${PORT}`);
  });
}

module.exports = app;
