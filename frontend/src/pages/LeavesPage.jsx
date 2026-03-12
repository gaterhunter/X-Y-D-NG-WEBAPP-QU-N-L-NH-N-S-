import { useEffect, useState } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function LeavesPage() {
  const { user } = useAuth();
  const isManager = ['Admin', 'HR', 'Manager'].includes(user.role);
  const [leaves, setLeaves] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ start_date: '', end_date: '', reason: '' });

  const fetchLeaves = async () => {
    const url = isManager ? '/leaves' : '/leaves/me';
    const { data } = await api.get(url);
    setLeaves(data);
  };

  useEffect(() => { fetchLeaves(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    await api.post('/leaves', form);
    setForm({ start_date: '', end_date: '', reason: '' });
    setShowModal(false);
    fetchLeaves();
  };

  const handleStatus = async (id, status) => {
    await api.put(`/leaves/${id}/status`, { status });
    fetchLeaves();
  };

  const statusBadge = (status) => {
    const colors = {
      Pending: 'bg-yellow-100 text-yellow-700',
      Approved: 'bg-green-100 text-green-700',
      Rejected: 'bg-red-100 text-red-700',
    };
    const labels = { Pending: 'Chờ duyệt', Approved: 'Đã duyệt', Rejected: 'Từ chối' };
    return <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[status]}`}>{labels[status]}</span>;
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Quản lý Nghỉ phép</h1>
        <button onClick={() => setShowModal(true)} className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition cursor-pointer">
          + Xin nghỉ phép
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {isManager && <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Nhân viên</th>}
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Từ ngày</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Đến ngày</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Lý do</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Trạng thái</th>
              {isManager && <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Thao tác</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {leaves.map((leave) => (
              <tr key={leave.id} className="hover:bg-gray-50 transition">
                {isManager && <td className="px-6 py-4 font-medium text-gray-800">{leave.full_name}</td>}
                <td className="px-6 py-4 text-gray-600">{new Date(leave.start_date).toLocaleDateString('vi-VN')}</td>
                <td className="px-6 py-4 text-gray-600">{new Date(leave.end_date).toLocaleDateString('vi-VN')}</td>
                <td className="px-6 py-4 text-gray-600">{leave.reason}</td>
                <td className="px-6 py-4">{statusBadge(leave.status)}</td>
                {isManager && (
                  <td className="px-6 py-4 text-right space-x-2">
                    {leave.status === 'Pending' && (
                      <>
                        <button onClick={() => handleStatus(leave.id, 'Approved')} className="text-green-600 hover:text-green-800 text-sm font-medium cursor-pointer">Duyệt</button>
                        <button onClick={() => handleStatus(leave.id, 'Rejected')} className="text-red-600 hover:text-red-800 text-sm font-medium cursor-pointer">Từ chối</button>
                      </>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        {leaves.length === 0 && <p className="text-center py-8 text-gray-400">Chưa có đơn nghỉ phép nào.</p>}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold text-gray-800 mb-4">Xin nghỉ phép</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Từ ngày</label>
                <input type="date" required value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-yellow-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Đến ngày</label>
                <input type="date" required value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-yellow-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Lý do</label>
                <textarea required rows={3} value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-yellow-500 resize-none"
                  placeholder="Nhập lý do xin nghỉ..." />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-white py-2 rounded-lg font-medium transition cursor-pointer">Gửi đơn</button>
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 rounded-lg font-medium transition cursor-pointer">Hủy</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
