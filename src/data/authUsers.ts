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
  heroTitle: 'Vive la emoción de los campeonatos oficiales en vivo',
  heroSubtitle:
    'Consulta el calendario de torneos vigentes, separa tu lugar o compra tus entradas digitales con código QR verificado al instante.',
  heroBannerUrl: 'preset:hero_volleyball',
  heroCtaLabel: 'Ver Campeonatos y Entradas',
  promotions: [
    {
      id: 'promo-apertura-2026',
      title: 'Preventa Oficial de Entradas Tribuna VIP',
      subtitle:
        'Asegura tu asiento preferencial en primera fila para la jornada final. Compra directa con Yape, Plin o transferencia con QR inmediato.',
      categoryLabel: 'Boletería Digital',
      imageUrl: 'preset:past_action',
      ctaLabel: 'Comprar / Separar Entrada',
      active: true,
      createdAt: '2026-11-01T10:00:00Z',
    },
    {
      id: 'promo-familia-tribuna',
      title: 'Reserva tu entrada y paga al ingresar en puerta',
      subtitle:
        'Separa tus boletos online sin complicaciones, recibe tu pase QR al instante y regulariza tu pago en el acceso principal del coliseo.',
      categoryLabel: 'Reserva Rápida',
      imageUrl: 'preset:past_crowd',
      ctaLabel: 'Separar Lugar',
      active: true,
      createdAt: '2026-11-02T10:00:00Z',
    },
  ],
  pastChampionships: [
    {
      id: 'past-1',
      championshipName: 'Copa Apertura Interclubes',
      editionOrDate: 'Edición Marzo 2026',
      photoUrl: 'preset:past_trophy',
      comment:
        'Organización impecable desde el ingreso con QR hasta la premiación final. Coliseo lleno y gran ambiente deportivo para toda la familia.',
      authorName: 'Carlos Mendoza',
      authorRole: 'Delegado Club Atlético Norte',
      createdAt: '2026-03-22T18:00:00Z',
    },
    {
      id: 'past-2',
      championshipName: 'Torneo Nocturno Relámpago',
      editionOrDate: 'Edición Julio 2026',
      photoUrl: 'preset:past_action',
      comment:
        'Excelente nivel competitivo en cada partido y cero colas en la entrada gracias a la compra anticipada de boletos digitales.',
      authorName: 'Valeria Paredes',
      authorRole: 'Espectadora · Tribuna VIP',
      createdAt: '2026-07-14T21:30:00Z',
    },
    {
      id: 'past-3',
      championshipName: 'Gran Final Regional',
      editionOrDate: 'Edición Setiembre 2026',
      photoUrl: 'preset:past_crowd',
      comment:
        'La energía de la hinchada fue increíble y el control de boletas y bebidas funcionó súper rápido durante toda la jornada.',
      authorName: 'Jorge Quispe',
      authorRole: 'Asistente Frecuente',
      createdAt: '2026-09-28T20:15:00Z',
    },
  ],
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
