import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  AreaChart, Area,
} from 'recharts';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#F97316'];
const STATUS_COLORS = { Active: '#10B981', Expired: '#9CA3AF', Terminated: '#EF4444', Pending: '#F59E0B', Approved: '#10B981', Rejected: '#EF4444' };

export default function DashboardPage() {
  const { user } = useAuth();
  const isAdminHR = ['Admin', 'HR'].includes(user.role);

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const { data: d } = await api.get('/dashboard');
        setData(d);
      } catch { /* ignore */ }
      setLoading(false);
    };
    fetchDashboard();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
          <p className="text-gray-500 mt-1">Xin chào, <span className="font-semibold text-gray-700">{user.full_name}</span>!</p>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (!data) return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
      </div>
      <p className="text-gray-500">Không thể tải dữ liệu Dashboard.</p>
    </div>
  );

  const { kpi, charts, recent } = data;

  const kpiCards = [
    { label: 'Tổng nhân sự', value: kpi.totalEmployees, icon: '👥', color: 'from-blue-500 to-blue-600', textColor: 'text-blue-100', sub: `${kpi.totalDepartments} phòng ban` },
    { label: 'Đơn chờ duyệt', value: kpi.pendingLeaves, icon: '⏳', color: 'from-amber-500 to-orange-500', textColor: 'text-amber-100', sub: 'Cần xử lý ngay', pulse: kpi.pendingLeaves > 0 },
    { label: 'HĐ sắp hết hạn', value: kpi.expiringContracts, icon: '⚠️', color: 'from-red-500 to-rose-600', textColor: 'text-red-100', sub: 'Trong 30 ngày tới', show: isAdminHR, pulse: kpi.expiringContracts > 0 },
    { label: 'Thông báo mới', value: kpi.unreadNotifications, icon: '🔔', color: 'from-violet-500 to-purple-600', textColor: 'text-violet-100', sub: 'Chưa đọc' },
    { label: 'NV mới tháng này', value: kpi.newHiresThisMonth, icon: '🆕', color: 'from-emerald-500 to-green-600', textColor: 'text-emerald-100', sub: `Tháng ${new Date().getMonth() + 1}/${new Date().getFullYear()}` },
  ];

  const leaveStatusVN = { Pending: 'Chờ duyệt', Approved: 'Đã duyệt', Rejected: 'Từ chối' };
  const contractStatusVN = { Active: 'Hiệu lực', Expired: 'Hết hạn', Terminated: 'Chấm dứt' };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
        <p className="text-gray-500 mt-1">
          Xin chào, <span className="font-semibold text-gray-700">{user.full_name}</span>!
          Hôm nay là {new Date().toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}.
        </p>
      </div>

      {/* ===== TẦNG 2: KPI CARDS ===== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {kpiCards.filter(c => c.show !== false).map((card, i) => (
          <div key={i} className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${card.color} p-5 text-white shadow-lg hover:shadow-xl transition-shadow duration-300`}>
            {card.pulse && (
              <span className="absolute top-3 right-3 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
              </span>
            )}
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm font-medium ${card.textColor} opacity-90`}>{card.label}</p>
                <p className="text-3xl font-extrabold mt-1">{card.value}</p>
                <p className={`text-xs mt-2 ${card.textColor} opacity-75`}>{card.sub}</p>
              </div>
              <span className="text-4xl opacity-30">{card.icon}</span>
            </div>
          </div>
        ))}
      </div>

      {/* ===== TẦNG 3: BIỂU ĐỒ ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Pie: Nhân viên theo phòng ban */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4">Cơ cấu nhân sự theo Phòng ban</h2>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={charts.departmentDistribution}
                cx="50%" cy="50%"
                innerRadius={60} outerRadius={100}
                paddingAngle={3}
                dataKey="value"
                animationBegin={0} animationDuration={800}
              >
                {charts.departmentDistribution.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} className="hover:opacity-80 transition-opacity cursor-pointer" />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
                formatter={(value, name) => [`${value} nhân viên`, name]}
              />
              <Legend iconType="circle" iconSize={10} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Doughnut: Giới tính */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4">Tỷ lệ Giới tính</h2>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={charts.genderDistribution.map(g => ({ ...g, name: g.name === 'Male' ? 'Nam' : g.name === 'Female' ? 'Nữ' : g.name }))}
                cx="50%" cy="50%"
                outerRadius={100}
                dataKey="value"
                animationBegin={200} animationDuration={800}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                {charts.genderDistribution.map((_, i) => (
                  <Cell key={i} fill={['#3B82F6', '#EC4899', '#9CA3AF'][i]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
                formatter={(value) => [`${value} người`]}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Bar: Trạng thái hợp đồng */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4">Trạng thái Hợp đồng</h2>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={charts.contractStatus.map(c => ({ ...c, name: contractStatusVN[c.name] || c.name }))} barSize={50}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
              <XAxis dataKey="name" tick={{ fill: '#6B7280', fontSize: 13 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#9CA3AF', fontSize: 12 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
                formatter={(value) => [`${value} hợp đồng`]}
                cursor={{ fill: 'rgba(59, 130, 246, 0.05)' }}
              />
              <Bar dataKey="value" radius={[8, 8, 0, 0]} animationDuration={800}>
                {charts.contractStatus.map((entry, i) => (
                  <Cell key={i} fill={STATUS_COLORS[entry.name] || COLORS[i]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Bar: Trạng thái nghỉ phép */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4">Thống kê Nghỉ phép</h2>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={charts.leaveStatus.map(l => ({ ...l, name: leaveStatusVN[l.name] || l.name }))} barSize={50}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
              <XAxis dataKey="name" tick={{ fill: '#6B7280', fontSize: 13 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#9CA3AF', fontSize: 12 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
                formatter={(value) => [`${value} đơn`]}
                cursor={{ fill: 'rgba(59, 130, 246, 0.05)' }}
              />
              <Bar dataKey="value" radius={[8, 8, 0, 0]} animationDuration={800}>
                {charts.leaveStatus.map((entry, i) => (
                  <Cell key={i} fill={STATUS_COLORS[entry.name] || COLORS[i]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Area: Xu hướng tuyển dụng */}
      {charts.hiringTrend.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4">Xu hướng Tuyển dụng (12 tháng gần nhất)</h2>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={charts.hiringTrend}>
              <defs>
                <linearGradient id="colorHiring" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
              <XAxis
                dataKey="month"
                tick={{ fill: '#6B7280', fontSize: 12 }}
                axisLine={false} tickLine={false}
                tickFormatter={(v) => { const [y, m] = v.split('-'); return `T${parseInt(m)}/${y.slice(2)}`; }}
              />
              <YAxis tick={{ fill: '#9CA3AF', fontSize: 12 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
                formatter={(value) => [`${value} người`, 'Tuyển mới']}
                labelFormatter={(v) => { const [y, m] = v.split('-'); return `Tháng ${parseInt(m)}/${y}`; }}
              />
              <Area type="monotone" dataKey="value" stroke="#3B82F6" strokeWidth={2.5} fill="url(#colorHiring)" animationDuration={1200} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* ===== TẦNG 4: HOẠT ĐỘNG GẦN NHẤT & HĐ SẮP HẾT HẠN ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Recent Leave Requests */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4">Đơn nghỉ phép gần nhất</h2>
          <div className="space-y-3">
            {recent.leaves.map((leave) => (
              <div key={leave.id} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors">
                <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                  leave.status === 'Pending' ? 'bg-amber-400' : leave.status === 'Approved' ? 'bg-green-400' : 'bg-red-400'
                }`}></div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{leave.full_name}</p>
                  <p className="text-xs text-gray-500 truncate">{leave.reason}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full ${
                    leave.status === 'Pending' ? 'bg-amber-100 text-amber-700' :
                    leave.status === 'Approved' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {leaveStatusVN[leave.status]}
                  </span>
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(leave.start_date).toLocaleDateString('vi-VN')}
                  </p>
                </div>
              </div>
            ))}
            {recent.leaves.length === 0 && <p className="text-sm text-gray-400 text-center py-4">Chưa có đơn nghỉ phép nào.</p>}
          </div>
        </div>

        {/* Notifications or Upcoming Contract Expirations */}
        {isAdminHR && recent.upcomingExpirations.length > 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-bold text-gray-800 mb-4">
              <span className="text-red-500">⚠</span> Hợp đồng sắp hết hạn
            </h2>
            <div className="space-y-3">
              {recent.upcomingExpirations.map((c) => {
                const daysLeft = Math.ceil((new Date(c.end_date) - new Date()) / (1000 * 60 * 60 * 24));
                return (
                  <div key={c.id} className="flex items-center gap-3 p-3 rounded-xl bg-red-50 hover:bg-red-100 transition-colors">
                    <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${daysLeft <= 7 ? 'bg-red-500 animate-pulse' : daysLeft <= 14 ? 'bg-orange-400' : 'bg-yellow-400'}`}></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{c.full_name}</p>
                      <p className="text-xs text-gray-500">{c.department} — {c.contract_type}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <span className={`text-xs font-bold ${daysLeft <= 7 ? 'text-red-600' : daysLeft <= 14 ? 'text-orange-600' : 'text-yellow-600'}`}>
                        {daysLeft <= 0 ? 'Đã hết hạn' : `Còn ${daysLeft} ngày`}
                      </span>
                      <p className="text-xs text-gray-400 mt-1">{new Date(c.end_date).toLocaleDateString('vi-VN')}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-bold text-gray-800 mb-4">Thông báo gần nhất</h2>
            <div className="space-y-3">
              {recent.notifications.map((n) => (
                <div key={n.id} className={`flex items-start gap-3 p-3 rounded-xl transition-colors ${n.is_read ? 'bg-gray-50' : 'bg-blue-50 hover:bg-blue-100'}`}>
                  <div className={`w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0 ${n.is_read ? 'bg-gray-300' : 'bg-blue-500'}`}></div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${n.is_read ? 'text-gray-500' : 'text-gray-800'}`}>{n.title}</p>
                    <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{n.message}</p>
                  </div>
                  <p className="text-xs text-gray-400 flex-shrink-0 mt-0.5">{new Date(n.created_at).toLocaleDateString('vi-VN')}</p>
                </div>
              ))}
              {recent.notifications.length === 0 && <p className="text-sm text-gray-400 text-center py-4">Không có thông báo mới.</p>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
