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

        // Phải trả về 401 Unauthorized
        expect(response.statusCode).toBe(401);

        // Phải có thông báo lỗi
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
