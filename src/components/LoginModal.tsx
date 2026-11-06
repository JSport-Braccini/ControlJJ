import React, { useState } from 'react';
import {
  User,
  KeyRound,
  AlertCircle,
  Shield,
  ArrowRight,
  Lock,
  Trophy,
} from 'lucide-react';
import { AuthUser, SystemConfig } from '../types/championship';
import { CorporateLogo } from './CorporateLogo';
import volleyballCourtBg from '../assets/images/volleyball_court_1793981844411.jpg';

interface LoginModalProps {
  systemConfig: SystemConfig;
  users: AuthUser[];
  onLoginSuccess: (user: AuthUser) => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  systemConfig,
  users,
  onLoginSuccess,
}) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const cleanUser = username.trim().toLowerCase();
    const matched = users.find(
      (u) => u.username.toLowerCase() === cleanUser && u.active
    );

    setTimeout(() => {
      if (matched && (matched.password === password.trim() || !matched.password)) {
        onLoginSuccess(matched);
      } else {
        setError('Credenciales incorrectas. Verifique usuario y contraseña o consulte al Administrador.');
      }
      setLoading(false);
    }, 150);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0A192F] bg-cover bg-center bg-no-repeat overflow-hidden"
      style={{
        backgroundImage: `url(${volleyballCourtBg || '/images/volleyball_court.jpg'})`,
      }}
    >
      {/* Velo arquitectónico formal en azul marino (#0A192F) que resalta la cancha de voleibol */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0A192F]/80 via-[#0A192F]/75 to-[#0A192F]/92 backdrop-blur-[3px] pointer-events-none" />

      {/* Contenedor Principal Flotante */}
      <div className="relative z-10 w-full max-w-sm">
        {/* Kicker superior institucional */}
        <div className="text-center mb-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-[11px] font-semibold text-slate-200 tracking-wider uppercase font-mono shadow-sm">
            <Trophy className="w-3.5 h-3.5 text-red-500 shrink-0" />
            <span>Circuito Oficial de Voleibol & Deportes JJ</span>
          </div>
        </div>

        {/* Tarjeta Ejecutiva Corporativa */}
        <div className="bg-white/95 backdrop-blur-md rounded-2xl border border-white/40 shadow-2xl overflow-hidden">
          {/* Cabecera Azul Marino con detalle Rojo */}
          <div className="bg-[#0A192F] text-white p-6 pb-5 text-center relative border-b-2 border-red-600">
            {/* Contenedor del Logo con Fallback Seguro */}
            <div className="w-20 h-20 rounded-2xl mx-auto overflow-hidden bg-white p-1 border-2 border-slate-700 shadow-lg flex items-center justify-center transform transition-transform hover:scale-105">
              <CorporateLogo
                src={systemConfig.logoUrl}
                alt="Logo JJ Corporativo"
                className="w-full h-full object-cover rounded-xl"
              />
            </div>

            <h1 className="mt-3 text-lg sm:text-xl font-bold tracking-tight text-white font-display">
              {systemConfig.systemName}
            </h1>
            <p className="mt-0.5 text-xs text-slate-300 font-medium">
              Acceso Seguro al Panel de Administración
            </p>
          </div>

          {/* Formulario */}
          <div className="p-6 space-y-4">
            {error && (
              <div
                role="alert"
                className="rounded-xl bg-red-50 border border-red-200 p-3 text-xs text-red-900 flex items-start gap-2 shadow-2xs"
              >
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <span className="leading-snug">{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="login-username"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  Usuario Autorizado
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    id="login-username"
                    type="text"
                    required
                    autoFocus
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Ej: admin"
                    className="w-full pl-9 pr-3 py-2.5 text-sm border border-slate-300 rounded-xl bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0A192F] focus:border-transparent transition-all shadow-2xs"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="login-password"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  Contraseña
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    id="login-password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-3 py-2.5 text-sm border border-slate-300 rounded-xl bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0A192F] focus:border-transparent transition-all shadow-2xs font-mono"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 bg-[#0A192F] hover:bg-[#122b50] active:bg-[#071324] text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-md disabled:opacity-50 flex items-center justify-center gap-2 group"
              >
                <span>{loading ? 'Validando Credenciales...' : 'Ingresar al Sistema'}</span>
                <ArrowRight className="w-4 h-4 text-red-500 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </form>

            <div className="pt-2 text-center border-t border-slate-100 flex items-center justify-center gap-1.5 text-[11px] text-slate-500">
              <Lock className="w-3 h-3 text-slate-400" />
              <span>CopaControl JJ Cloud · Acceso Protegido y Cifrado</span>
            </div>
          </div>
        </div>

        {/* Nota pie de pantalla */}
        <p className="mt-3 text-center text-[11px] text-slate-300/80 drop-shadow-xs">
          {systemConfig.tagline}
        </p>
      </div>
    </div>
  );
};
