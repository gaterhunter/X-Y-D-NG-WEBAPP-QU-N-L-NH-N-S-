import { useEffect, useState } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function EmployeesPage() {
  const { user } = useAuth();
  const isAdminHR = ['Admin', 'HR'].includes(user.role);
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ full_name: '', email: '', password: '', role_id: 4, department_id: '', start_date: '' });

  const fetchData = async () => {
    const [empRes, deptRes] = await Promise.all([api.get('/employees'), api.get('/departments')]);
    setEmployees(empRes.data);
    setDepartments(deptRes.data);
  };

  useEffect(() => { fetchData(); }, []);

  const openCreate = () => {
    setEditingId(null);
    setForm({ full_name: '', email: '', password: '', role_id: 4, department_id: '', start_date: '' });
    setShowModal(true);
  };

  const openEdit = (emp) => {
    setEditingId(emp.id);
    setForm({
      full_name: emp.full_name,
      email: emp.email,
      password: '',
      role_id: emp.role === 'Admin' ? 1 : emp.role === 'HR' ? 2 : emp.role === 'Manager' ? 3 : 4,
      department_id: emp.department_id || '',
      start_date: emp.start_date?.split('T')[0] || '',
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = { ...form, department_id: form.department_id || null };
    if (editingId) {
      const { password, ...rest } = payload;
      await api.put(`/employees/${editingId}`, rest);
    } else {
      await api.post('/employees', payload);
    }
    setShowModal(false);
    fetchData();
  };

  const handleDelete = async (id) => {
    if (!confirm('Bạn có chắc muốn xóa nhân viên này?')) return;
    await api.delete(`/employees/${id}`);
    fetchData();
  };

  const roleBadge = (role) => {
    const colors = { Admin: 'bg-red-100 text-red-700', HR: 'bg-purple-100 text-purple-700', Manager: 'bg-indigo-100 text-indigo-700', Employee: 'bg-blue-100 text-blue-700' };
    return <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[role] || 'bg-gray-100'}`}>{role}</span>;
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Quản lý Nhân viên</h1>
        {isAdminHR && (
          <button onClick={openCreate} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition cursor-pointer">
            + Thêm nhân viên
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Họ tên</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Email</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Phòng ban</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Vai trò</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Ngày vào</th>
              {isAdminHR && <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Thao tác</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {employees.map((emp) => (
              <tr key={emp.id} className="hover:bg-gray-50 transition">
                <td className="px-6 py-4 font-medium text-gray-800">{emp.full_name}</td>
                <td className="px-6 py-4 text-gray-600">{emp.email}</td>
                <td className="px-6 py-4 text-gray-600">{emp.department || '—'}</td>
                <td className="px-6 py-4">{roleBadge(emp.role)}</td>
                <td className="px-6 py-4 text-gray-600">{new Date(emp.start_date).toLocaleDateString('vi-VN')}</td>
                {isAdminHR && (
                  <td className="px-6 py-4 text-right space-x-2">
                    <button onClick={() => openEdit(emp)} className="text-blue-600 hover:text-blue-800 text-sm font-medium cursor-pointer">Sửa</button>
                    <button onClick={() => handleDelete(emp.id)} className="text-red-600 hover:text-red-800 text-sm font-medium cursor-pointer">Xóa</button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        {employees.length === 0 && <p className="text-center py-8 text-gray-400">Chưa có nhân viên nào.</p>}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold text-gray-800 mb-4">{editingId ? 'Sửa nhân viên' : 'Thêm nhân viên mới'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <input type="text" placeholder="Họ và tên" required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />
              <input type="email" placeholder="Email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />
              {!editingId && (
                <input type="password" placeholder="Mật khẩu" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />
              )}
              <select value={form.role_id} onChange={(e) => setForm({ ...form, role_id: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500">
                <option value={1}>Admin</option>
                <option value={2}>HR</option>
                <option value={3}>Manager</option>
                <option value={4}>Employee</option>
              </select>
              <select value={form.department_id} onChange={(e) => setForm({ ...form, department_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">-- Chọn phòng ban --</option>
                {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
              <input type="date" required value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />
              <div className="flex gap-3 pt-2">
                <button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-medium transition cursor-pointer">
                  {editingId ? 'Cập nhật' : 'Thêm mới'}
                </button>
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 rounded-lg font-medium transition cursor-pointer">
                  Hủy
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
