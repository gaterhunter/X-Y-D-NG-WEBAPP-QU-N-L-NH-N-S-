import { useEffect, useState } from 'react';
import api from '../services/api';

export default function ProfilePage() {
  const [profile, setProfile] = useState(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ phone: '', address: '', bank_account_number: '', bank_name: '' });
  const [workHistory, setWorkHistory] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [message, setMessage] = useState('');

  const fetchProfile = async () => {
    const { data } = await api.get('/profile');
    setProfile(data);
    setForm({
      phone: data.phone || '',
      address: data.address || '',
      bank_account_number: data.bank_account_number || '',
      bank_name: data.bank_name || '',
    });
  };

  const fetchHistory = async () => {
    const { data } = await api.get('/work-history');
    setWorkHistory(data);
  };

  const fetchContracts = async () => {
    try {
      const { data } = await api.get('/contracts');
      setContracts(data);
    } catch { /* user might not have permission */ }
  };

  useEffect(() => {
    fetchProfile();
    fetchHistory();
    fetchContracts();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.put('/profile', form);
      setMessage('Cập nhật thành công!');
      setEditing(false);
      fetchProfile();
      setTimeout(() => setMessage(''), 3000);
    } catch {
      setMessage('Cập nhật thất bại.');
    }
  };

  if (!profile) return <div className="text-center py-12 text-gray-400">Đang tải...</div>;

  const genderLabel = { Male: 'Nam', Female: 'Nữ', Other: 'Khác' };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">Hồ sơ cá nhân</h1>

      {message && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
          {message}
        </div>
      )}

      {/* Info Card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-blue-500 flex items-center justify-center text-2xl font-bold text-white">
              {profile.full_name?.charAt(0)}
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800">{profile.full_name}</h2>
              <p className="text-gray-500">{profile.role} — {profile.department || 'Chưa phân phòng'}</p>
            </div>
          </div>
          {!editing && (
            <button onClick={() => setEditing(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition cursor-pointer">
              Chỉnh sửa
            </button>
          )}
        </div>

        {editing ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Số điện thoại</label>
                <input type="text" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Địa chỉ</label>
                <input type="text" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Số tài khoản ngân hàng</label>
                <input type="text" value={form.bank_account_number} onChange={(e) => setForm({ ...form, bank_account_number: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ngân hàng</label>
                <input type="text" value={form.bank_name} onChange={(e) => setForm({ ...form, bank_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition cursor-pointer">Lưu</button>
              <button type="button" onClick={() => setEditing(false)} className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-6 py-2 rounded-lg font-medium transition cursor-pointer">Hủy</button>
            </div>
          </form>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-8">
            <InfoRow label="Email" value={profile.email} />
            <InfoRow label="Điện thoại" value={profile.phone} />
            <InfoRow label="Giới tính" value={genderLabel[profile.gender]} />
            <InfoRow label="Ngày sinh" value={profile.date_of_birth ? new Date(profile.date_of_birth).toLocaleDateString('vi-VN') : '—'} />
            <InfoRow label="CCCD" value={profile.id_card_number} />
            <InfoRow label="Ngày vào làm" value={new Date(profile.start_date).toLocaleDateString('vi-VN')} />
            <InfoRow label="Địa chỉ" value={profile.address} />
            <InfoRow label="Ngân hàng" value={profile.bank_name ? `${profile.bank_name} — ${profile.bank_account_number}` : '—'} />
          </div>
        )}
      </div>

      {/* Leave Balance */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-bold text-gray-800 mb-4">Số ngày phép năm {new Date().getFullYear()}</h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <p className="text-2xl font-bold text-blue-600">{profile.leave_balance.total_days}</p>
            <p className="text-sm text-gray-500">Tổng ngày</p>
          </div>
          <div className="text-center p-4 bg-orange-50 rounded-lg">
            <p className="text-2xl font-bold text-orange-600">{profile.leave_balance.used_days}</p>
            <p className="text-sm text-gray-500">Đã dùng</p>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <p className="text-2xl font-bold text-green-600">{profile.leave_balance.remaining_days}</p>
            <p className="text-sm text-gray-500">Còn lại</p>
          </div>
        </div>
      </div>

      {/* Contracts */}
      {contracts.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Hợp đồng lao động</h3>
          <div className="space-y-3">
            {contracts.map((c) => (
              <div key={c.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-800">{c.contract_type}</p>
                  <p className="text-sm text-gray-500">
                    {new Date(c.start_date).toLocaleDateString('vi-VN')} → {c.end_date ? new Date(c.end_date).toLocaleDateString('vi-VN') : 'Không thời hạn'}
                  </p>
                </div>
                <ContractBadge status={c.status} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Work History */}
      {workHistory.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Lịch sử công tác</h3>
          <div className="space-y-4">
            {workHistory.map((wh) => (
              <div key={wh.id} className="flex gap-4 p-4 bg-gray-50 rounded-lg">
                <div className="w-3 h-3 mt-1.5 rounded-full bg-blue-500 shrink-0" />
                <div>
                  <p className="font-medium text-gray-800">
                    {wh.event_type === 'Promotion' ? 'Thăng chức' :
                     wh.event_type === 'Transfer' ? 'Điều chuyển' :
                     wh.event_type === 'Role Change' ? 'Đổi vai trò' : wh.event_type}
                  </p>
                  <p className="text-sm text-gray-500">
                    {wh.from_position && `${wh.from_position} → `}{wh.to_position}
                    {wh.from_department && ` | ${wh.from_department}`}
                    {wh.to_department && ` → ${wh.to_department}`}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">{new Date(wh.event_date).toLocaleDateString('vi-VN')}</p>
                  {wh.notes && <p className="text-sm text-gray-600 mt-1">{wh.notes}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div>
      <p className="text-sm text-gray-500">{label}</p>
      <p className="font-medium text-gray-800">{value || '—'}</p>
    </div>
  );
}

function ContractBadge({ status }) {
  const colors = {
    Active: 'bg-green-100 text-green-700',
    Expired: 'bg-gray-100 text-gray-700',
    Terminated: 'bg-red-100 text-red-700',
  };
  const labels = { Active: 'Đang hiệu lực', Expired: 'Hết hạn', Terminated: 'Đã chấm dứt' };
  return <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[status]}`}>{labels[status]}</span>;
}
