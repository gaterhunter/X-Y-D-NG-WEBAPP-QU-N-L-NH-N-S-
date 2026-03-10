import axios from 'axios';

// Khi deploy production: VITE_API_URL = https://hrm-backend-xxx.onrender.com/api
// Khi dev local: dùng proxy nên chỉ cần '/api'
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
});

// Tự động gắn token vào mọi request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Tự động redirect về login nếu token hết hạn
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !error.config.url.includes('/auth/login')) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
