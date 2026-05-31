// Base URL for the backend (the SAME Netlify Functions the website uses).
// Public config only — never put secret keys here; those stay in Netlify env
// vars and are read only inside the functions.
//
// Override per environment with an Expo public env var:
//   EXPO_PUBLIC_API_BASE=https://trackerakbar.netlify.app
// Falls back to the production site below.
export const API_BASE = (
  process.env.EXPO_PUBLIC_API_BASE || 'https://trackerakbar.netlify.app'
).replace(/\/$/, '');

export const apiUrl = (path) => `${API_BASE}${path}`;
