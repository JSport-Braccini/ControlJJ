import React, { useState, useRef } from 'react';
import {
  Upload,
  Image as ImageIcon,
  RotateCcw,
  Check,
  Shield,
  FolderOpen,
} from 'lucide-react';
import { SystemConfig } from '../types/championship';
import { DEFAULT_SYSTEM_CONFIG } from '../data/authUsers';
import { CorporateLogo } from './CorporateLogo';

interface SystemSettingsModalProps {
  config: SystemConfig;
  onUpdateConfig: (newConfig: Partial<SystemConfig>) => void;
  onClose: () => void;
}

export const SystemSettingsModal: React.FC<SystemSettingsModalProps> = ({
  config,
  onUpdateConfig,
  onClose,
}) => {
  const [systemName, setSystemName] = useState(config.systemName);
  const [tagline, setTagline] = useState(config.tagline);
  const [logoUrl, setLogoUrl] = useState(config.logoUrl);
  const [showManualUrl, setShowManualUrl] = useState(false);
  const [yapePhone, setYapePhone] = useState(config.yapePhone || '987 654 321');
  const [yapeHolder, setYapeHolder] = useState(config.yapeHolder || 'Organización JJ Deportes');
  const [plinPhone, setPlinPhone] = useState(config.plinPhone || '987 654 321');
  const [plinHolder, setPlinHolder] = useState(config.plinHolder || 'Organización JJ Deportes');
  const [bankName, setBankName] = useState(config.bankName || 'BCP Banco de Crédito');
  const [bankAccount, setBankAccount] = useState(config.bankAccount || '193-98234812-0-45');
  const [bankHolder, setBankHolder] = useState(config.bankHolder || 'Organización JJ Deportes EIRL');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Por favor selecciona un archivo de imagen válido (PNG, JPG, SVG, WebP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      if (typeof event.target?.result === 'string') {
        setLogoUrl(event.target.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!systemName.trim()) return;
    onUpdateConfig({
      systemName: systemName.trim(),
      tagline: tagline.trim(),
      logoUrl: logoUrl.trim() || DEFAULT_SYSTEM_CONFIG.logoUrl,
      yapePhone: yapePhone.trim(),
      yapeHolder: yapeHolder.trim(),
      plinPhone: plinPhone.trim(),
      plinHolder: plinHolder.trim(),
      bankName: bankName.trim(),
      bankAccount: bankAccount.trim(),
      bankHolder: bankHolder.trim(),
    });
    onClose();
  };

  const handleResetDefaults = () => {
    setSystemName(DEFAULT_SYSTEM_CONFIG.systemName);
    setTagline(DEFAULT_SYSTEM_CONFIG.tagline);
    setLogoUrl(DEFAULT_SYSTEM_CONFIG.logoUrl);
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#0A192F]/80 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-hidden">
        {/* Cabecera Modal */}
        <div className="bg-[#0A192F] text-white p-5 flex items-center justify-between border-b-2 border-red-600">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl overflow-hidden bg-white p-0.5 border border-slate-600 shrink-0 shadow-sm">
              <CorporateLogo src={logoUrl || DEFAULT_SYSTEM_CONFIG.logoUrl} alt="Logo Prev" />
            </div>
            <div>
              <h3 className="text-base font-bold tracking-tight text-white font-display">
                Identidad y Nombre del Sistema
              </h3>
              <p className="text-xs text-slate-300">
                Personaliza la marca corporativa y el logo oficial
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white cursor-pointer text-lg p-1"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Nombre Oficial del Sistema *
            </label>
            <input
              type="text"
              required
              value={systemName}
              onChange={(e) => setSystemName(e.target.value)}
              placeholder="Ej: JJ Executive Sports, JJ CopaControl..."
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0A192F]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Lema o Subtítulo Institucional
            </label>
            <input
              type="text"
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              placeholder="Ej: Plataforma Corporativa de Control de Asistencia, Aforo y Ventas QR"
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0A192F]"
            />
          </div>

          {/* Cargar Imagen por medio de Carpeta / Archivo */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <label className="block text-xs font-bold text-slate-900">
                  Logo de la Aplicación
                </label>
                <p className="text-[11px] text-slate-500">
                  Carga el logo desde cualquier carpeta de tu computadora o celular
                </p>
              </div>
              <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                Acepta PNG, JPG, SVG
              </span>
            </div>

            <div className="flex items-center gap-3">
              {/* Preview Box */}
              <div className="w-16 h-16 rounded-xl bg-white p-1 border-2 border-slate-300 overflow-hidden shadow-xs shrink-0 flex items-center justify-center">
                <CorporateLogo src={logoUrl} alt="Vista previa logo" />
              </div>

              {/* Botón de carga desde archivo/carpeta */}
              <div className="flex-1 space-y-1.5">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-2.5 px-3 bg-[#0A192F] hover:bg-slate-800 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer shadow-xs flex items-center justify-center gap-2"
                >
                  <FolderOpen className="w-4 h-4 text-red-500" />
                  <span>Subir Imagen desde mi Carpeta / Equipo</span>
                </button>
                <div className="flex items-center justify-between text-[11px] text-slate-500 px-1">
                  <span>Se guarda automáticamente</span>
                  <button
                    type="button"
                    onClick={() => setShowManualUrl(!showManualUrl)}
                    className="text-slate-600 hover:text-slate-900 underline cursor-pointer"
                  >
                    {showManualUrl ? 'Ocultar URL' : 'O escribir URL manual'}
                  </button>
                </div>
              </div>
            </div>

            {/* Input URL Manual (Opcional) */}
            {showManualUrl && (
              <div className="pt-2 border-t border-slate-200/80">
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  URL o Ruta directa:
                </label>
                <input
                  type="text"
                  value={logoUrl}
                  onChange={(e) => setLogoUrl(e.target.value)}
                  placeholder="/images/logo.jpg o https://..."
                  className="w-full px-2.5 py-1.5 text-xs font-mono border border-slate-300 rounded-lg bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#0A192F]"
                />
              </div>
            )}
          </div>

          {/* Métodos de Pago Oficiales para Ventas Web y Taquilla */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-900">
                Cuentas de Pago para Venta de Boletos
              </label>
              <p className="text-[11px] text-slate-500">
                Se muestran a los aficionados al comprar por la web o transferir
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-purple-900 mb-0.5">
                  Número Yape Oficial:
                </label>
                <input
                  type="text"
                  value={yapePhone}
                  onChange={(e) => setYapePhone(e.target.value)}
                  placeholder="987 654 321"
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-purple-900 mb-0.5">
                  Titular Yape:
                </label>
                <input
                  type="text"
                  value={yapeHolder}
                  onChange={(e) => setYapeHolder(e.target.value)}
                  placeholder="Organización JJ Deportes"
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-teal-900 mb-0.5">
                  Número Plin Oficial:
                </label>
                <input
                  type="text"
                  value={plinPhone}
                  onChange={(e) => setPlinPhone(e.target.value)}
                  placeholder="987 654 321"
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-teal-900 mb-0.5">
                  Titular Plin:
                </label>
                <input
                  type="text"
                  value={plinHolder}
                  onChange={(e) => setPlinHolder(e.target.value)}
                  placeholder="Organización JJ Deportes"
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                />
              </div>

              <div className="sm:col-span-2 space-y-1">
                <label className="block text-[11px] font-semibold text-slate-800">
                  Banco y Número de Cuenta:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    placeholder="BCP Banco de Crédito"
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                  />
                  <input
                    type="text"
                    value={bankAccount}
                    onChange={(e) => setBankAccount(e.target.value)}
                    placeholder="193-98234812-0-45"
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white font-mono"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-between border-t border-slate-100">
            <button
              type="button"
              onClick={handleResetDefaults}
              className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Restablecer Escudo JJ Original
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-semibold text-white bg-[#0A192F] hover:bg-slate-800 rounded-lg cursor-pointer shadow-xs"
              >
                Guardar Cambios
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
