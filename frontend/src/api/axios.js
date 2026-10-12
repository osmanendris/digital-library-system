import axios from 'axios';

// Local dev: VITE_API_URL is unset, so this stays '/api' exactly as
// before, handled by the Vite dev server's proxy (see vite.config.js).
// Production (Netlify + Render on different domains): VITE_API_URL is set
// at build time to the full Render backend URL, e.g.
// https://your-backend.onrender.com/api
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('dl_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
