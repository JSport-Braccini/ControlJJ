import { AuthUser, SystemConfig } from '../types/championship.js';

export const DEFAULT_SYSTEM_CONFIG: SystemConfig = {
  systemName: 'JJ Executive Sports',
  tagline: 'Plataforma Corporativa de Control de Asistencia, Aforo y Ventas QR',
  logoUrl: '/images/logo.jpg',
  primaryColor: '#0A192F', // Navy Blue
  accentColor: '#DC2626',  // Red
  yapePhone: '987 654 321',
  yapeHolder: 'Organización JJ Deportes',
  plinPhone: '987 654 321',
  plinHolder: 'Organización JJ Deportes',
  bankName: 'BCP Banco de Crédito del Perú',
  bankAccount: '193-98234812-0-45',
  bankCci: '002-193-0098234812045-12',
  bankHolder: 'Organización JJ Deportes EIRL',
};

// Initial admin user
export const INITIAL_AUTH_USERS: AuthUser[] = [
  {
    id: 'usr-admin-master',
    username: 'admin',
    displayName: 'Administrador General',
    role: 'ADMIN',
    password: 'admin', // default password
    avatarColor: '#0A192F',
    createdAt: '2026-11-05T08:00:00Z',
    active: true,
  },
];
