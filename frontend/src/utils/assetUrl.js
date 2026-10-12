// Same reasoning as api/axios.js: locally this resolves to '' (empty),
// so `${assetBase}/uploads/covers/x.jpg` stays the relative
// '/uploads/covers/x.jpg' the Vite dev proxy already handles. In
// production (Netlify + Render on different domains), VITE_API_URL is set
// to the full backend URL at build time, and we strip the trailing
// '/api' off it since these files are served from the backend's root,
// not under /api.
const apiUrl = import.meta.env.VITE_API_URL || '';
export const assetBase = apiUrl.replace(/\/api\/?$/, '');
