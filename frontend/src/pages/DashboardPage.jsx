import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ employees: 0, departments: 0, pendingLeaves: 0 });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const promises = [api.get('/departments')];
        if (['Admin', 'HR'].includes(user.role)) {
          promises.push(api.get('/employees'), api.get('/leaves'));
        } else {
          promises.push(Promise.resolve({ data: [] }), api.get('/leaves/me'));
        }
        const [deptRes, empRes, leaveRes] = await Promise.all(promises);
        setStats({
          employees: empRes.data.length,
          departments: deptRes.data.length,
          pendingLeaves: leaveRes.data.filter((l) => l.status === 'Pending').length,
        });
      } catch {
        /* ignore */
      }
    };
    fetchStats();
  }, [user.role]);

  const cards = [
    { label: 'Nhân viên', value: stats.employees, color: 'blue', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z', show: ['Admin', 'HR'].includes(user.role) },
    { label: 'Phòng ban', value: stats.departments, color: 'green', icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4' },
    { label: 'Đơn chờ duyệt', value: stats.pendingLeaves, color: 'yellow', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
  ];

  const colorMap = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    yellow: 'bg-yellow-50 text-yellow-600',
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-1">Dashboard</h1>
      <p className="text-gray-500 mb-6">Xin chào, {user.full_name}! Vai trò: {user.role}</p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {cards
          .filter((c) => c.show !== false)
          .map((card) => (
            <div key={card.label} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">{card.label}</p>
                  <p className="text-3xl font-bold text-gray-800 mt-1">{card.value}</p>
                </div>
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${colorMap[card.color]}`}>
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={card.icon} />
                  </svg>
                </div>
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}
