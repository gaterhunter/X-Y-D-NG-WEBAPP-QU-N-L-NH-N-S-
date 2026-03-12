import { useEffect, useState } from 'react';
import api from '../services/api';

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);

  const fetchNotifications = async () => {
    const { data } = await api.get('/notifications');
    setNotifications(data);
  };

  useEffect(() => { fetchNotifications(); }, []);

  const markRead = async (id) => {
    await api.put(`/notifications/${id}/read`);
    fetchNotifications();
  };

  const markAllRead = async () => {
    await api.put('/notifications/read-all');
    fetchNotifications();
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">
          Thông báo
          {unreadCount > 0 && (
            <span className="ml-2 text-sm bg-red-500 text-white px-2 py-0.5 rounded-full">{unreadCount}</span>
          )}
        </h1>
        {unreadCount > 0 && (
          <button onClick={markAllRead} className="text-blue-600 hover:text-blue-800 text-sm font-medium cursor-pointer">
            Đánh dấu tất cả đã đọc
          </button>
        )}
      </div>

      <div className="space-y-3">
        {notifications.map((n) => (
          <div
            key={n.id}
            className={`bg-white rounded-xl shadow-sm border p-4 transition cursor-pointer ${
              n.is_read ? 'border-gray-200' : 'border-blue-300 bg-blue-50/50'
            }`}
            onClick={() => !n.is_read && markRead(n.id)}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  {!n.is_read && <div className="w-2 h-2 rounded-full bg-blue-500" />}
                  <h3 className={`font-medium ${n.is_read ? 'text-gray-700' : 'text-gray-900'}`}>{n.title}</h3>
                </div>
                <p className="text-sm text-gray-500 mt-1">{n.message}</p>
              </div>
              <span className="text-xs text-gray-400 shrink-0 ml-4">
                {new Date(n.created_at).toLocaleDateString('vi-VN')}
              </span>
            </div>
          </div>
        ))}
      </div>

      {notifications.length === 0 && (
        <div className="text-center py-12 text-gray-400">Không có thông báo nào.</div>
      )}
    </div>
  );
}
