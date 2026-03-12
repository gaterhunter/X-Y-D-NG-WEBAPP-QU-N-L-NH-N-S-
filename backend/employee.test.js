const request = require('supertest');
const app = require('./server'); // Import app từ server.js

describe('API Quản lý Nhân viên', () => {

    // Test Case 1 (Happy path): Kiểm tra route gốc
    it('Nên trả về status 200 và thông báo khi gọi GET /', async () => {
        const response = await request(app).get('/');

        expect(response.statusCode).toBe(200);
        expect(response.text).toBe('HRM Backend is running!');
    });

    // Test Case 2 (Negative path): Gọi GET /api/employees không có token → 401
    it('Nên trả về status 401 khi gọi GET /api/employees mà không có token', async () => {
        const response = await request(app).get('/api/employees');

        expect(response.statusCode).toBe(401);
        expect(response.body.message).toBeDefined();
    });

    // Test Case 3 (Negative path): Gọi POST /api/employees không có token → 401
    it('Nên trả về status 401 khi gọi POST /api/employees mà không có token', async () => {
        const response = await request(app)
            .post('/api/employees')
            .send({ full_name: 'Test User', email: 'test@test.com' });

        expect(response.statusCode).toBe(401);
    });

    // Test Case 4 (Negative path): Gọi API với token sai → 401
    it('Nên trả về status 401 khi gọi với token không hợp lệ', async () => {
        const response = await request(app)
            .get('/api/employees')
            .set('Authorization', 'Bearer invalid_token_here');

        expect(response.statusCode).toBe(401);
        expect(response.body.message).toBeDefined();
    });

});

describe('API Nghỉ phép', () => {

    // Test Case 5: Gọi POST /api/leaves không có token → 401
    it('Nên trả về status 401 khi gửi đơn nghỉ phép mà chưa đăng nhập', async () => {
        const response = await request(app)
            .post('/api/leaves')
            .send({ start_date: '2026-04-01', end_date: '2026-04-02', reason: 'Nghỉ phép' });

        expect(response.statusCode).toBe(401);
    });

});

describe('API Hồ sơ cá nhân (Profile)', () => {

    // Test Case 6: Gọi GET /api/profile không có token → 401
    it('Nên trả về 401 khi xem hồ sơ mà chưa đăng nhập', async () => {
        const response = await request(app).get('/api/profile');
        expect(response.statusCode).toBe(401);
    });

    // Test Case 7: Gọi PUT /api/profile không có token → 401
    it('Nên trả về 401 khi cập nhật hồ sơ mà chưa đăng nhập', async () => {
        const response = await request(app)
            .put('/api/profile')
            .send({ phone: '0999999999' });
        expect(response.statusCode).toBe(401);
    });

});

describe('API Hợp đồng (Contracts)', () => {

    // Test Case 8: Gọi GET /api/contracts không có token → 401
    it('Nên trả về 401 khi xem hợp đồng mà chưa đăng nhập', async () => {
        const response = await request(app).get('/api/contracts');
        expect(response.statusCode).toBe(401);
    });

    // Test Case 9: Gọi POST /api/contracts không có token → 401
    it('Nên trả về 401 khi tạo hợp đồng mà chưa đăng nhập', async () => {
        const response = await request(app)
            .post('/api/contracts')
            .send({ user_id: 1, contract_type: 'Có thời hạn', start_date: '2026-01-01' });
        expect(response.statusCode).toBe(401);
    });

    // Test Case 10: Gọi GET /api/contracts/expiring không có token → 401
    it('Nên trả về 401 khi xem HĐ sắp hết hạn mà chưa đăng nhập', async () => {
        const response = await request(app).get('/api/contracts/expiring');
        expect(response.statusCode).toBe(401);
    });

});

describe('API Thông báo (Notifications)', () => {

    // Test Case 11: Gọi GET /api/notifications không có token → 401
    it('Nên trả về 401 khi xem thông báo mà chưa đăng nhập', async () => {
        const response = await request(app).get('/api/notifications');
        expect(response.statusCode).toBe(401);
    });

    // Test Case 12: Gọi GET /api/notifications/unread-count không có token → 401
    it('Nên trả về 401 khi xem số thông báo chưa đọc mà chưa đăng nhập', async () => {
        const response = await request(app).get('/api/notifications/unread-count');
        expect(response.statusCode).toBe(401);
    });

    // Test Case 13: Gọi POST /api/notifications không có token → 401
    it('Nên trả về 401 khi gửi thông báo mà chưa đăng nhập', async () => {
        const response = await request(app)
            .post('/api/notifications')
            .send({ user_id: 1, title: 'Test', message: 'Test notification' });
        expect(response.statusCode).toBe(401);
    });

});

describe('API Lịch sử công tác (Work History)', () => {

    // Test Case 14: Gọi GET /api/work-history không có token → 401
    it('Nên trả về 401 khi xem lịch sử công tác mà chưa đăng nhập', async () => {
        const response = await request(app).get('/api/work-history');
        expect(response.statusCode).toBe(401);
    });

    // Test Case 15: Gọi POST /api/work-history không có token → 401
    it('Nên trả về 401 khi thêm lịch sử công tác mà chưa đăng nhập', async () => {
        const response = await request(app)
            .post('/api/work-history')
            .send({ user_id: 1, event_type: 'Promotion', event_date: '2026-01-01' });
        expect(response.statusCode).toBe(401);
    });

});

describe('API Tài liệu (Documents)', () => {

    // Test Case 16: Gọi GET /api/documents không có token → 401
    it('Nên trả về 401 khi xem tài liệu mà chưa đăng nhập', async () => {
        const response = await request(app).get('/api/documents');
        expect(response.statusCode).toBe(401);
    });

    // Test Case 17: Gọi POST /api/documents không có token → 401
    it('Nên trả về 401 khi upload tài liệu mà chưa đăng nhập', async () => {
        const response = await request(app)
            .post('/api/documents')
            .send({ doc_type: 'CCCD', doc_name: 'test.pdf', file_url: '/files/test.pdf' });
        expect(response.statusCode).toBe(401);
    });

});

describe('API Đăng nhập (Auth)', () => {

    // Test Case 18: Đăng nhập với thông tin sai → 401
    it('Nên trả về 401 khi đăng nhập sai mật khẩu', async () => {
        const response = await request(app)
            .post('/api/auth/login')
            .send({ email: 'admin@company.com', password: 'sai_mat_khau' });
        expect(response.statusCode).toBe(401);
    });

    // Test Case 19: Đăng nhập thiếu thông tin → 400
    it('Nên trả về lỗi khi đăng nhập thiếu email', async () => {
        const response = await request(app)
            .post('/api/auth/login')
            .send({ password: 'password123' });
        expect([400, 401]).toContain(response.statusCode);
    });

});
