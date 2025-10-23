// Centralized feature flags
// Uses Vite env var; defaults to false (hosted flows)
export const USE_EMBEDDED_PAYMENTS = (import.meta.env.VITE_USE_EMBEDDED_PAYMENTS === 'true');
