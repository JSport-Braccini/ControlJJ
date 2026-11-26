import React, { useState } from 'react';
import {
  Calendar,
  MapPin,
  Ticket,
  ArrowRight,
  LogIn,
  ShieldCheck,
  Quote,
  Camera,
  Megaphone,
  Trophy,
  ChevronRight,
} from 'lucide-react';
import {
  Tournament,
  TournamentState,
  SystemConfig,
  PortalPromotion,
  PastChampionshipHighlight,
} from '../types/championship';
import { CorporateLogo } from './CorporateLogo';
import { resolvePortalImage } from '../utils/portalImages';

interface PublicPortalProps {
  tournaments: Tournament[];
  statesByTournament: Record<string, TournamentState>;
  activeTournamentId: string;
  systemConfig: SystemConfig;
  onSelectTournamentToBuy: (tournamentId: string) => void;
  onOpenStaffLogin: () => void;
}

interface ImageWithFallbackProps {
  src: string;
  alt: string;
  className?: string;
}

const PortalImage: React.FC<ImageWithFallbackProps> = ({ src, alt, className = '' }) => {
  const [failed, setFailed] = useState(false);

  if (failed || !src) {
    return (
      <div
        className={`w-full h-full bg-gradient-to-br from-[#0A192F] via-[#13294B] to-slate-900 flex flex-col items-center justify-center text-slate-300 p-4 ${className}`}
      >
        <Camera className="w-8 h-8 text-red-500/80 mb-2" />
        <span className="text-xs font-medium text-center text-slate-300/90 line-clamp-2">
          {alt}
        </span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={className}
    />
  );
};

export const PublicPortal: React.FC<PublicPortalProps> = ({
  tournaments,
  statesByTournament,
  activeTournamentId,
  systemConfig,
  onSelectTournamentToBuy,
  onOpenStaffLogin,
}) => {
  const activeTournaments = tournaments.filter((t) => t.status !== 'ARCHIVED');
  const displayTournaments = activeTournaments.length > 0 ? activeTournaments : tournaments;
  const featuredTournament =
    displayTournaments.find((t) => t.id === activeTournamentId) || displayTournaments[0];

  const promotions: PortalPromotion[] = (systemConfig.promotions || []).filter(
    (p) => p.active !== false
  );
  const pastChampionships: PastChampionshipHighlight[] = systemConfig.pastChampionships || [];

  const heroTitle =
    systemConfig.heroTitle || 'Vive la emoción de los campeonatos oficiales en vivo';
  const heroSubtitle =
    systemConfig.heroSubtitle ||
    'Consulta las próximas fechas, separa tu lugar o compra tus entradas digitales con código QR al instante.';
  const heroCtaLabel = systemConfig.heroCtaLabel || 'Ver Campeonatos y Entradas';
  const heroBg = resolvePortalImage(systemConfig.heroBannerUrl, 'preset:hero_volleyball');

  const getLowestTicketPrice = (tournament: Tournament): number | null => {
    const tState = statesByTournament[tournament.id];
    const candidates: number[] = [];

    if (tournament.eventDays && tournament.eventDays.length > 0) {
      tournament.eventDays.forEach((d) => {
        if (d.adultEnabled !== false && typeof d.adultPrice === 'number') {
          candidates.push(d.adultPrice);
        }
        if (d.childEnabled !== false && typeof d.childPrice === 'number') {
          candidates.push(d.childPrice);
        }
        if (d.vipEnabled !== false && typeof d.vipPrice === 'number') {
          candidates.push(d.vipPrice);
        }
      });
    } else if (tState?.spectatorTiers) {
      tState.spectatorTiers.forEach((tier) => {
        if (tier.enabled !== false && tier.type !== 'GRATIS') {
          candidates.push(tier.price);
        }
      });
    }

    if (candidates.length === 0) return null;
    return Math.min(...candidates);
  };

  const getEnabledModalitiesSummary = (tournament: Tournament): string => {
    const tState = statesByTournament[tournament.id];
    const day = tournament.eventDays?.[0];
    const labels: string[] = [];

    if (day) {
      if (day.adultEnabled !== false) labels.push(`General S/ ${Number(day.adultPrice).toFixed(2)}`);
      if (day.childEnabled !== false) labels.push(`Niño S/ ${Number(day.childPrice).toFixed(2)}`);
      if (day.vipEnabled !== false) labels.push(`VIP S/ ${Number(day.vipPrice).toFixed(2)}`);
    } else if (tState?.spectatorTiers) {
      tState.spectatorTiers
        .filter((t) => t.enabled !== false && t.type !== 'GRATIS')
        .forEach((t) => labels.push(`${t.label} S/ ${Number(t.price).toFixed(2)}`));
    }

    return labels.length > 0 ? labels.join(' · ') : 'Consultar disponibilidad en boletería';
  };

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] text-slate-900 font-sans">
      {/* Top Bar Corporativa de 3 Zonas */}
      <header className="sticky top-0 z-40 bg-[#0A192F] text-white border-b-2 border-red-600 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          {/* Zona 1: Identidad de Marca en 1 sola línea */}
          <a
            href="#top"
            className="flex items-center gap-3 shrink-0 min-w-0 focus:outline-none"
          >
            <div className="w-9 h-9 rounded-lg overflow-hidden bg-white p-0.5 border border-slate-700 shrink-0 flex items-center justify-center">
              <CorporateLogo
                src={systemConfig.logoUrl}
                alt={systemConfig.systemName}
                className="w-full h-full object-cover rounded-md"
              />
            </div>
            <span className="text-sm sm:text-base font-bold tracking-tight text-white truncate font-display whitespace-nowrap">
              {systemConfig.systemName}
            </span>
          </a>

          {/* Zona 2: Enlaces de Navegación Limpios */}
          <nav className="hidden md:flex items-center gap-6 text-xs font-semibold text-slate-300">
            <button
              type="button"
              onClick={() => scrollToSection('campeonatos')}
              className="hover:text-white transition-colors whitespace-nowrap cursor-pointer py-1"
            >
              Campeonatos
            </button>
            {promotions.length > 0 && (
              <button
                type="button"
                onClick={() => scrollToSection('publicidad')}
                className="hover:text-white transition-colors whitespace-nowrap cursor-pointer py-1"
              >
                Promociones
              </button>
            )}
            <button
              type="button"
              onClick={() => scrollToSection('galeria-pasada')}
              className="hover:text-white transition-colors whitespace-nowrap cursor-pointer py-1"
            >
              Campeonatos Pasados
            </button>
          </nav>

          {/* Zona 3: Ícono de Ingreso Esquina Superior Derecha para Control de Boletas y Bebidas */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onOpenStaffLogin}
              className="inline-flex items-center gap-2 px-3 py-2 min-h-[40px] bg-slate-800/90 hover:bg-red-600 text-white border border-slate-700 hover:border-red-500 rounded-lg text-xs font-semibold transition-colors cursor-pointer shadow-xs whitespace-nowrap"
              title="Ingreso para Control de Boletas y Bebidas"
              aria-label="Ingreso para Control de Boletas y Bebidas"
            >
              <ShieldCheck className="w-4 h-4 text-red-400 group-hover:text-white shrink-0" />
              <span className="hidden sm:inline">Control Boletas y Bebidas</span>
              <LogIn className="w-3.5 h-3.5 text-slate-300 shrink-0" />
            </button>
          </div>
        </div>
      </header>

      {/* Hero Editorial con Imagen Generada y Scrim Gradiente */}
      <section
        id="top"
        className="relative bg-[#0A192F] text-white overflow-hidden border-b border-slate-800"
      >
        <div className="absolute inset-0">
          <PortalImage
            src={heroBg}
            alt={heroTitle}
            className="w-full h-full object-cover object-center opacity-75"
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                'linear-gradient(90deg, rgba(10, 25, 47, 0.94) 0%, rgba(10, 25, 47, 0.78) 55%, rgba(10, 25, 47, 0.35) 100%)',
            }}
          />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-14 sm:py-20 lg:py-24">
          <div className="max-w-2xl space-y-5">
            <p className="text-xs font-bold uppercase tracking-widest text-red-400 font-mono">
              {systemConfig.systemName} · Portal Oficial de Espectadores
            </p>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white leading-[1.1] text-balance font-display">
              {heroTitle}
            </h1>
            <p className="text-sm sm:text-base text-slate-200 leading-relaxed max-w-xl">
              {heroSubtitle}
            </p>

            <div className="pt-2 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => scrollToSection('campeonatos')}
                className="inline-flex items-center gap-2 px-5 py-3 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white text-sm font-bold rounded-xl transition-all cursor-pointer shadow-lg"
              >
                <Ticket className="w-4 h-4 shrink-0" />
                <span>{heroCtaLabel}</span>
                <ArrowRight className="w-4 h-4 shrink-0" />
              </button>

              {featuredTournament && (
                <button
                  type="button"
                  onClick={() => onSelectTournamentToBuy(featuredTournament.id)}
                  className="inline-flex items-center gap-2 px-4 py-3 bg-white/10 hover:bg-white/20 text-white border border-white/25 text-sm font-semibold rounded-xl transition-all cursor-pointer backdrop-blur-xs"
                >
                  <span>Entradas para {featuredTournament.name}</span>
                  <ChevronRight className="w-4 h-4 shrink-0" />
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Sección 1: Próximos Campeonatos y Compra / Reserva de Entradas */}
      <section id="campeonatos" className="max-w-7xl w-full mx-auto px-4 sm:px-6 py-12 sm:py-16">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b border-slate-200">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-red-600 font-mono">
              Calendario y Boletería
            </p>
            <h2 className="mt-1 text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 font-display text-balance">
              Campeonatos Disponibles
            </h2>
            <p className="mt-1 text-sm text-slate-600 max-w-2xl">
              Selecciona el campeonato de tu interés para comprar tu entrada digital o separar tu lugar y pagar al ingresar.
            </p>
          </div>
        </div>

        {displayTournaments.length === 0 ? (
          <div className="mt-8 bg-white border border-slate-200 rounded-2xl p-10 text-center">
            <Trophy className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-base font-bold text-slate-800">
              No hay campeonatos publicados en este momento
            </p>
            <p className="text-xs text-slate-500 mt-1">
              El administrador publicará las próximas fechas oficiales muy pronto.
            </p>
          </div>
        ) : (
          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {displayTournaments.map((t) => {
              const lowestPrice = getLowestTicketPrice(t);
              const daysCount = t.eventDays?.length || 1;
              const isHighlighted = t.id === featuredTournament?.id;

              return (
                <article
                  key={t.id}
                  className={`bg-white rounded-2xl border transition-all flex flex-col justify-between overflow-hidden ${
                    isHighlighted
                      ? 'border-[#0A192F] shadow-md ring-1 ring-[#0A192F]/10'
                      : 'border-slate-200 shadow-xs hover:border-slate-300 hover:shadow-md'
                  }`}
                >
                  <div className="p-6 space-y-4">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-red-600 font-mono">
                        {t.edition} · {t.category}
                      </span>
                      {t.status === 'ACTIVE' && (
                        <span className="text-[11px] font-bold text-emerald-700">
                          Venta Abierta
                        </span>
                      )}
                    </div>

                    <div>
                      <h3 className="text-xl font-extrabold text-slate-900 leading-snug font-display">
                        {t.name}
                      </h3>
                      {t.notes && (
                        <p className="mt-2 text-xs text-slate-600 leading-relaxed line-clamp-2">
                          {t.notes}
                        </p>
                      )}
                    </div>

                    <dl className="pt-3 border-t border-slate-100 space-y-2 text-xs text-slate-600">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                        <span className="font-medium text-slate-800">{t.venue}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                        <span className="font-mono-tabular">
                          {t.date} · {daysCount} {daysCount === 1 ? 'jornada programada' : 'jornadas programadas'}
                        </span>
                      </div>
                    </dl>

                    <div className="pt-3 border-t border-slate-100">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                        Tarifas vigentes
                      </p>
                      <p className="mt-1 text-xs font-semibold text-slate-800 font-mono-tabular">
                        {getEnabledModalitiesSummary(t)}
                      </p>
                    </div>
                  </div>

                  <div className="px-6 py-4 bg-slate-50 border-t border-slate-200/80 flex items-center justify-between gap-3">
                    <div>
                      <span className="block text-[10px] uppercase font-bold tracking-wider text-slate-500">
                        {lowestPrice !== null ? 'Entradas desde' : 'Boletería'}
                      </span>
                      <span className="text-lg font-extrabold text-[#0A192F] font-mono-tabular">
                        {lowestPrice !== null ? `S/ ${lowestPrice.toFixed(2)}` : 'Ver opciones'}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => onSelectTournamentToBuy(t.id)}
                      className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer shadow-xs whitespace-nowrap"
                    >
                      <Ticket className="w-3.5 h-3.5 shrink-0" />
                      <span>Comprar o Separar</span>
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* Sección 2: Publicidad y Anuncios Administrables */}
      {promotions.length > 0 && (
        <section
          id="publicidad"
          className="bg-white border-y border-slate-200 py-12 sm:py-16"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 pb-6 border-b border-slate-100">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-red-600 font-mono flex items-center gap-1.5">
                  <Megaphone className="w-3.5 h-3.5" />
                  <span>Anuncios y Promociones Oficiales</span>
                </p>
                <h2 className="mt-1 text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 font-display">
                  Destacados de la Temporada
                </h2>
              </div>
            </div>

            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
              {promotions.map((promo) => {
                const targetTournamentId =
                  promo.linkedTournamentId &&
                  tournaments.some((t) => t.id === promo.linkedTournamentId)
                    ? promo.linkedTournamentId
                    : featuredTournament?.id;

                return (
                  <div
                    key={promo.id}
                    className="group rounded-2xl border border-slate-200 bg-slate-50 overflow-hidden flex flex-col sm:flex-row shadow-xs hover:shadow-md transition-all"
                  >
                    <div className="sm:w-5/12 aspect-[16/10] sm:aspect-auto bg-[#0A192F] overflow-hidden shrink-0">
                      <PortalImage
                        src={resolvePortalImage(promo.imageUrl, 'preset:past_action')}
                        alt={promo.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    </div>

                    <div className="p-5 sm:p-6 flex flex-col justify-between flex-1 gap-4">
                      <div>
                        <p className="text-[11px] font-bold uppercase tracking-wider text-red-600 font-mono">
                          {promo.categoryLabel || 'Publicidad Oficial'}
                        </p>
                        <h3 className="mt-1.5 text-lg font-extrabold text-slate-900 leading-snug font-display">
                          {promo.title}
                        </h3>
                        <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                          {promo.subtitle}
                        </p>
                      </div>

                      {targetTournamentId && (
                        <div>
                          <button
                            type="button"
                            onClick={() => onSelectTournamentToBuy(targetTournamentId)}
                            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0A192F] hover:text-red-600 transition-colors cursor-pointer"
                          >
                            <span>{promo.ctaLabel || 'Comprar / Separar Entradas'}</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Sección 3: Campeonatos Pasados · Fotos y Comentarios */}
      <section
        id="galeria-pasada"
        className="max-w-7xl w-full mx-auto px-4 sm:px-6 py-12 sm:py-16"
      >
        <div className="pb-6 border-b border-slate-200">
          <p className="text-xs font-bold uppercase tracking-wider text-red-600 font-mono">
            Archivo de Ediciones Anteriores
          </p>
          <h2 className="mt-1 text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 font-display text-balance">
            Campeonatos Pasados: Fotos y Comentarios
          </h2>
          <p className="mt-1 text-sm text-slate-600 max-w-2xl">
            Revive los mejores momentos de nuestras jornadas anteriores y las impresiones de jugadores, delegados y espectadores.
          </p>
        </div>

        {pastChampionships.length === 0 ? (
          <div className="mt-8 bg-white border border-slate-200 rounded-2xl p-8 text-center text-sm text-slate-500">
            Aún no se han publicado fotos o comentarios de campeonatos pasados.
          </div>
        ) : (
          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
            {pastChampionships.map((item) => (
              <figure
                key={item.id}
                className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs flex flex-col justify-between"
              >
                <div>
                  <div className="aspect-[4/3] bg-[#0A192F] overflow-hidden">
                    <PortalImage
                      src={resolvePortalImage(item.photoUrl, 'preset:past_trophy')}
                      alt={`${item.championshipName} · ${item.editionOrDate}`}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <div className="p-5 space-y-3">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 font-mono">
                      <span className="text-red-600">{item.championshipName}</span>
                      <span aria-hidden="true" className="mx-1.5 text-slate-300">·</span>
                      <span>{item.editionOrDate}</span>
                    </div>

                    <blockquote className="text-xs sm:text-sm text-slate-700 leading-relaxed flex gap-2">
                      <Quote className="w-4 h-4 text-red-500/70 shrink-0 mt-0.5" />
                      <span>“{item.comment}”</span>
                    </blockquote>
                  </div>
                </div>

                <figcaption className="px-5 py-3 bg-slate-50 border-t border-slate-100 text-xs">
                  <span className="font-bold text-slate-900">{item.authorName}</span>
                  {item.authorRole && (
                    <>
                      <span aria-hidden="true" className="mx-1.5 text-slate-400">·</span>
                      <span className="text-slate-500">{item.authorRole}</span>
                    </>
                  )}
                </figcaption>
              </figure>
            ))}
          </div>
        )}
      </section>

      {/* Footer Institucional */}
      <footer className="mt-auto bg-[#0A192F] text-slate-300 border-t border-slate-800 py-8 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-white p-0.5 overflow-hidden shrink-0">
              <CorporateLogo
                src={systemConfig.logoUrl}
                alt={systemConfig.systemName}
                className="w-full h-full object-cover rounded-md"
              />
            </div>
            <div>
              <p className="font-bold text-white">{systemConfig.systemName}</p>
              <p className="text-[11px] text-slate-400">{systemConfig.tagline}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onOpenStaffLogin}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            <ShieldCheck className="w-4 h-4 text-red-400" />
            <span>Ingreso de Personal: Control de Boletas y Bebidas</span>
          </button>
        </div>
      </footer>
    </div>
  );
};
