import axios from 'axios';

// Pastikan URL ini sesuai dengan port backend Express Anda
const API_URL = "http://localhost:5000/api";

const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Interceptor: Setiap request akan otomatis disisipkan ID User & Token
api.interceptors.request.use((config) => {
  const user = JSON.parse(localStorage.getItem("user"));
  if (user) {
    // Header simulasi untuk Middleware backend
    config.headers['x-user-id'] = user.id; 
  }
  return config;
});

export default api;