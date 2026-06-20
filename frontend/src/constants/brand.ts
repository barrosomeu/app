// Brand & shared constants for Construções Barros app

export const COLORS = {
  surface: '#F8FAFC',
  onSurface: '#0F172A',
  surfaceSecondary: '#FFFFFF',
  onSurfaceSecondary: '#1E293B',
  surfaceTertiary: '#F1F5F9',
  onSurfaceTertiary: '#334155',
  surfaceInverse: '#1E293B',
  onSurfaceInverse: '#F8FAFC',
  brand: '#1E40AF',
  brandPrimary: '#1E40AF',
  onBrandPrimary: '#FFFFFF',
  brandSecondary: '#FBBF24',
  onBrandSecondary: '#0F172A',
  brandTertiary: '#E0E7FF',
  onBrandTertiary: '#1E40AF',
  success: '#059669',
  warning: '#D97706',
  error: '#DC2626',
  info: '#3B82F6',
  border: '#E2E8F0',
  borderStrong: '#CBD5E1',
  divider: '#F1F5F9',
  muted: '#64748B',
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
};

export const RADIUS = {
  sm: 6,
  md: 12,
  lg: 20,
  pill: 999,
};

export const LOGO_URL =
  'https://customer-assets.emergentagent.com/job_eacdcc40-9d95-4cf9-a7d7-f7e2369a451c/artifacts/bwnztz2z_logo.png';

export const API_BASE =
  (process.env.EXPO_PUBLIC_BACKEND_URL || '') + '/api';

export const STATUS_LABELS: Record<string, string> = {
  rascunho: 'Rascunho',
  enviado: 'Enviado',
  aceite: 'Aceite',
};

export const STATUS_COLORS: Record<string, string> = {
  rascunho: '#64748B',
  enviado: '#3B82F6',
  aceite: '#059669',
};

export const IVA_OPTIONS = [0, 6, 13, 23];

export const UNIDADE_OPTIONS = ['serviço', 'un', 'm²', 'ml', 'h', 'dia', 'kg', 'pç'];

export function fmtEuro(v: number): string {
  const n = Number.isFinite(v) ? v : 0;
  return new Intl.NumberFormat('pt-PT', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
  }).format(n);
}

export function fmtDatePT(iso: string): string {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  if (!y) return iso;
  return `${d}/${m}/${y}`;
}
