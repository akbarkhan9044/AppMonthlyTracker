// Base URL for the backend (Netlify Functions).
// - Web (served from Netlify): leave VITE_API_BASE unset → '' → same-origin
//   relative calls like `/api/summary`.
// - Mobile app (Expo/Capacitor, a different origin): set VITE_API_BASE (or the
//   platform's public env var) to your deployed site, e.g.
//   VITE_API_BASE=https://trackerakbar.netlify.app
// This is PUBLIC config (just a URL) — never put secret keys here; those stay
// in Netlify env vars and are only read inside the functions.
export const API_BASE = (import.meta.env.VITE_API_BASE || '').replace(/\/$/, '');

export const apiUrl = (path) => `${API_BASE}${path}`;
