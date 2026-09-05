/** Public build-time configuration for a future HTTP service adapter.
 * No adapter is enabled here: the shared browser demo remains authoritative.
 * VITE_* values are shipped to the browser and must never contain secrets.
 */
export const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? '').trim().replace(/\/+$/, '');