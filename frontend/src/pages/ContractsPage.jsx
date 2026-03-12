import { useEffect, useState } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function ContractsPage() {
  const { user } = useAuth();
  const isAdmin = ['Admin', 'HR'].includes(user.role);
  const [contracts, setContracts] = useState([]);
  const [expiring, setExpiring] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ user_id: '', contract_type: 'Có thời hạn', start_date: '', end_date: '', salary: '', notes: '' });

  const fetchContracts = async () => {
    const { data } = await api.get('/contracts');
    setContracts(data);
  };

  const fetchExpiring = async () => {
    if (!isAdmin) return;
    try {
      const { data } = await api.get('/contracts/expiring');
      setExpiring(data);
    } catch { /* ignore */ }
  };

  const fetchEmployees = async () => {
    if (!isAdmin) return;
    try {
      const { data } = await api.get('/employees');
      setEmployees(data);
    } catch { /* ignore */ }
  };

  useEffect(() => {
    fetchContracts();
    fetchExpiring();
    fetchEmployees();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    await api.post('/contracts', {
      ...form,
      salary: form.salary ? Number(form.salary) : null,
      end_date: form.end_date || null,
    });
    setShowModal(false);
    setForm({ user_id: '', contract_type: 'Có thời hạn', start_date: '', end_date: '', salary: '', notes: '' });
    fetchContracts();
    fetchExpiring();
  };

  const statusBadge = (status) => {
    const colors = { Active: 'bg-green-100 text-green-700', Expired: 'bg-gray-100 text-gray-700', Terminated: 'bg-red-100 text-red-700' };
    const labels = { Active: 'Đang hiệu lực', Expired: 'Hết hạn', Terminated: 'Đã chấm dứt' };
    return <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[status]}`}>{labels[status]}</span>;
  };

  const formatSalary = (val) => val ? Number(val).toLocaleString('vi-VN') + ' ₫' : '—';

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Quản lý Hợp đồng</h1>
        {isAdmin && (
          <button onClick={() => setShowModal(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition cursor-pointer">
            + Tạo hợp đồng
          </button>
        )}
      </div>

      {/* Expiring Warning */}
      {expiring.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
          <h3 className="font-semibold text-amber-800 mb-2">⚠ Hợp đồng sắp hết hạn (30 ngày)</h3>
          <div className="space-y-2">
            {expiring.map((c) => (
              <div key={c.id} className="flex items-center justify-between text-sm">
                <span className="text-amber-900 font-medium">{c.full_name} — {c.contract_type}</span>
                <span className="text-amber-700">Hết hạn: {new Date(c.end_date).toLocaleDateString('vi-VN')}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Contracts Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {isAdmin && <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Nhân viên</th>}
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Loại HĐ</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Bắt đầu</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Kết thúc</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Lương</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Trạng thái</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {contracts.map((c) => (
              <tr key={c.id} className="hover:bg-gray-50 transition">
                {isAdmin && <td className="px-6 py-4 font-medium text-gray-800">{c.full_name}</td>}
                <td className="px-6 py-4 text-gray-600">{c.contract_type}</td>
                <td className="px-6 py-4 text-gray-600">{new Date(c.start_date).toLocaleDateString('vi-VN')}</td>
                <td className="px-6 py-4 text-gray-600">{c.end_date ? new Date(c.end_date).toLocaleDateString('vi-VN') : 'Không thời hạn'}</td>
                <td className="px-6 py-4 text-gray-600">{formatSalary(c.salary)}</td>
                <td className="px-6 py-4">{statusBadge(c.status)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {contracts.length === 0 && <p className="text-center py-8 text-gray-400">Chưa có hợp đồng nào.</p>}
      </div>

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold text-gray-800 mb-4">Tạo hợp đồng mới</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <select required value={form.user_id} onChange={(e) => setForm({ ...form, user_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="">-- Chọn nhân viên --</option>
                {employees.map((emp) => <option key={emp.id} value={emp.id}>{emp.full_name}</option>)}
              </select>
              <select value={form.contract_type} onChange={(e) => setForm({ ...form, contract_type: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500">
                <option>Thử việc</option>
                <option>Có thời hạn</option>
                <option>Không thời hạn</option>
              </select>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Bắt đầu</label>
                  <input type="date" required value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Kết thúc</label>
                  <input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
              </div>
              <input type="number" placeholder="Lương (VNĐ)" value={form.salary} onChange={(e) => setForm({ ...form, salary: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" />
              <textarea placeholder="Ghi chú" rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 resize-none" />
              <div className="flex gap-3 pt-2">
                <button type="submit" className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-lg font-medium transition cursor-pointer">Tạo</button>
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 rounded-lg font-medium transition cursor-pointer">Hủy</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
