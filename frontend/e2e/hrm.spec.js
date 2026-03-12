import { test, expect } from '@playwright/test';

// ===== ĐĂNG NHẬP =====
test.describe('Trang Đăng nhập', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('Hiển thị form đăng nhập', async ({ page }) => {
    await expect(page.getByText('HRM System')).toBeVisible();
    await expect(page.getByPlaceholder('you@company.com')).toBeVisible();
    await expect(page.getByPlaceholder('••••••••')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Đăng nhập' })).toBeVisible();
  });

  test('Báo lỗi khi nhập sai mật khẩu', async ({ page }) => {
    await page.getByPlaceholder('you@company.com').fill('admin@company.com');
    await page.getByPlaceholder('••••••••').fill('wrong_password');
    await page.getByRole('button', { name: 'Đăng nhập' }).click();

    await expect(page.getByText(/email hoặc mật khẩu/i).first()).toBeVisible({ timeout: 10000 });
  });

  test('Đăng nhập Admin thành công → chuyển về Dashboard', async ({ page }) => {
    await page.getByPlaceholder('you@company.com').fill('admin@company.com');
    await page.getByPlaceholder('••••••••').fill('password123');
    await page.getByRole('button', { name: 'Đăng nhập' }).click();

    // Phải chuyển về dashboard và thấy tên user
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
    await expect(page.getByText('Nguyễn Văn An', { exact: true })).toBeVisible();
  });
});

// ===== QUẢN LÝ NHÂN VIÊN =====
test.describe('Quản lý Nhân viên (Admin)', () => {
  test.beforeEach(async ({ page }) => {
    // Đăng nhập Admin trước
    await page.goto('/login');
    await page.getByPlaceholder('you@company.com').fill('admin@company.com');
    await page.getByPlaceholder('••••••••').fill('password123');
    await page.getByRole('button', { name: 'Đăng nhập' }).click();
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  });

  test('Xem danh sách nhân viên', async ({ page }) => {
    await page.getByRole('link', { name: 'Nhân viên' }).click();
    await expect(page.getByText('Quản lý Nhân viên')).toBeVisible();
    await expect(page.getByText('admin@company.com')).toBeVisible();
  });
});

// ===== XIN NGHỈ PHÉP =====
test.describe('Xin nghỉ phép (Employee)', () => {
  test.beforeEach(async ({ page }) => {
    // Đăng nhập bằng tài khoản Employee
    await page.goto('/login');
    await page.getByPlaceholder('you@company.com').fill('dung@company.com');
    await page.getByPlaceholder('••••••••').fill('password123');
    await page.getByRole('button', { name: 'Đăng nhập' }).click();
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  });

  test('Gửi đơn xin nghỉ phép thành công', async ({ page }) => {
    await page.getByRole('link', { name: 'Nghỉ phép' }).click();
    await expect(page.getByText('Quản lý Nghỉ phép')).toBeVisible();

    // Mở form xin nghỉ
    await page.getByRole('button', { name: '+ Xin nghỉ phép' }).click();
    await expect(page.getByRole('heading', { name: 'Xin nghỉ phép' })).toBeVisible();

    // Điền form
    await page.locator('input[type="date"]').first().fill('2026-04-01');
    await page.locator('input[type="date"]').last().fill('2026-04-02');
    await page.getByPlaceholder('Nhập lý do xin nghỉ...').fill('E2E Test - Nghỉ phép tự động');

    // Gửi đơn
    await page.getByRole('button', { name: 'Gửi đơn' }).click();

    // Đơn mới phải xuất hiện trong danh sách với trạng thái "Chờ duyệt"
    await expect(page.getByRole('cell', { name: 'E2E Test - Nghỉ phép tự động' }).first()).toBeVisible();
    await expect(page.getByText('Chờ duyệt').first()).toBeVisible();
  });
});

// ===== DUYỆT ĐƠN NGHỈ PHÉP =====
test.describe('Duyệt đơn nghỉ phép (Admin)', () => {
  test('Admin duyệt đơn nghỉ phép', async ({ page }) => {
    // Đăng nhập Admin
    await page.goto('/login');
    await page.getByPlaceholder('you@company.com').fill('admin@company.com');
    await page.getByPlaceholder('••••••••').fill('password123');
    await page.getByRole('button', { name: 'Đăng nhập' }).click();
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();

    // Vào trang nghỉ phép
    await page.getByRole('link', { name: 'Nghỉ phép' }).click();
    await expect(page.getByText('Quản lý Nghỉ phép')).toBeVisible();

    // Tìm đơn đang Pending và duyệt
    const pendingRow = page.locator('tr', { hasText: 'Chờ duyệt' }).first();
    if (await pendingRow.count() > 0) {
      await pendingRow.getByRole('button', { name: 'Duyệt' }).click();
      // Sau khi duyệt, trạng thái phải đổi thành "Đã duyệt"
      await expect(page.getByText('Đã duyệt').first()).toBeVisible();
    }
  });
});

// ===== ĐĂNG XUẤT =====
test.describe('Đăng xuất', () => {
  test('Đăng xuất thành công → quay về trang login', async ({ page }) => {
    await page.goto('/login');
    await page.getByPlaceholder('you@company.com').fill('admin@company.com');
    await page.getByPlaceholder('••••••••').fill('password123');
    await page.getByRole('button', { name: 'Đăng nhập' }).click();
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();

    // Click đăng xuất
    await page.getByRole('button', { name: 'Đăng xuất' }).click();

    // Phải quay về trang login
    await expect(page.getByPlaceholder('you@company.com')).toBeVisible();
  });
});
