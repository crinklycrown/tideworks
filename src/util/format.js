export const pad = (n) => String(n).padStart(2, '0');
export const esc = (s) => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const fmt = (n) => Math.floor(n).toLocaleString('de-DE');
export const fmt1 = (n) => (Math.round(n * 100) / 100).toLocaleString('de-DE');
