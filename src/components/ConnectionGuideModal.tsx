import React, { useState } from 'react';
import {
  Cloud,
  CheckCircle2,
  Server,
  Zap,
  HardDrive,
  ExternalLink,
  X,
  HelpCircle,
  Save,
} from 'lucide-react';

interface ConnectionGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  isConnected: boolean;
  isVercelOrLocal: boolean;
  connectedClientsCount?: number;
  customWsUrl: string;
  onSaveCustomWsUrl: (url: string) => void;
}

export const ConnectionGuideModal: React.FC<ConnectionGuideModalProps> = ({
  isOpen,
  onClose,
  isConnected,
  isVercelOrLocal,
  connectedClientsCount = 1,
  customWsUrl,
  onSaveCustomWsUrl,
}) => {
  const [urlInput, setUrlInput] = useState(customWsUrl);
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveCustomWsUrl(urlInput);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#0A192F]/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-hidden my-auto">
        {/* Header */}
        <div className="bg-[#0A192F] text-white p-4 sm:p-5 flex items-center justify-between border-b-2 border-red-600">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-slate-800 flex items-center justify-center border border-slate-700">
              <Cloud className="w-5 h-5 text-red-500" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white font-display">
                Estado de Conexión y Despliegue
              </h3>
              <p className="text-xs text-slate-300">
                Sincronización en la Nube y Soporte para Vercel
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 space-y-4 text-xs">
          {/* Badge de Estado Actual */}
          <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className={`w-3.5 h-3.5 rounded-full shrink-0 ${
                  isConnected
                    ? 'bg-emerald-500 shadow-sm shadow-emerald-500/50'
                    : isVercelOrLocal
                    ? 'bg-blue-500 shadow-sm shadow-blue-500/50'
                    : 'bg-amber-400 animate-pulse'
                }`}
              />
              <div>
                <div className="font-bold text-slate-900 text-sm">
                  {isConnected
                    ? 'Conectado a la Nube (WebSockets Activo)'
                    : isVercelOrLocal
                    ? 'Modo Local / Vercel (Totalmente Operativo)'
                    : 'Conectando con el Servidor...'}
                </div>
                <div className="text-slate-500 text-[11px]">
                  {isConnected
                    ? `${connectedClientsCount} dispositivo(s) sincronizados en tiempo real`
                    : 'Los datos, escaneos QR y ventas se guardan de forma segura en este navegador'}
                </div>
              </div>
            </div>
          </div>

          {/* Explicación Vercel */}
          <div className="space-y-3 bg-blue-50/70 border border-blue-200 rounded-xl p-3.5 text-slate-700">
            <div className="font-bold text-blue-900 flex items-center gap-1.5 text-xs">
              <HelpCircle className="w-4 h-4 text-blue-600 shrink-0" />
              ¿Por qué Vercel no conecta WebSockets automáticamente?
            </div>
            <p className="text-[11px] leading-relaxed">
              <strong>Vercel</strong> es una plataforma de alojamiento web estático y funciones sin servidor (serverless). Por arquitectura, Vercel no permite mantener conexiones WebSocket continuas en segundo plano.
            </p>
            <div className="bg-white p-2.5 rounded-lg border border-blue-200/80 text-[11px] space-y-1">
              <div className="font-semibold text-slate-800 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Tu aplicación está 100% protegida y adaptada:
              </div>
              <p className="text-slate-600">
                El sistema detecta Vercel de forma automática y activa el <strong>motor de persistencia local</strong>. Puedes escanear QRs con la cámara, controlar jugadores bloqueando duplicados, registrar entradas y vender bebidas sin perder ningún dato.
              </p>
            </div>
          </div>

          {/* Opciones para Sincronización Multidispositivo */}
          <div className="space-y-2">
            <h4 className="font-bold text-slate-900 flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-amber-500" />
              ¿Necesitas sincronizar varios celulares a la vez en la nube?
            </h4>
            <p className="text-slate-600 text-[11px]">
              Para que varios operadores con celulares distintos compartan la misma información en el mismo segundo:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              <div className="p-2.5 rounded-lg border border-slate-200 bg-white">
                <div className="font-bold text-slate-800 text-[11px] flex items-center gap-1">
                  <Server className="w-3.5 h-3.5 text-red-600" />
                  Render.com o Railway
                </div>
                <p className="text-slate-500 text-[10px] mt-0.5">
                  Alojan el archivo <code className="bg-slate-100 px-1 rounded">server.ts</code> con soporte nativo de WebSockets continuo y gratuito.
                </p>
              </div>

              <div className="p-2.5 rounded-lg border border-slate-200 bg-white">
                <div className="font-bold text-slate-800 text-[11px] flex items-center gap-1">
                  <HardDrive className="w-3.5 h-3.5 text-blue-600" />
                  Frontend en Vercel
                </div>
                <p className="text-slate-500 text-[10px] mt-0.5">
                  Puedes mantener el diseño en Vercel y conectarlo a tu servidor en Render/Railway abajo.
                </p>
              </div>
            </div>
          </div>

          {/* Configuración de URL WebSocket Opcional */}
          <form onSubmit={handleSave} className="pt-2 border-t border-slate-200 space-y-2">
            <label className="block font-bold text-slate-800 text-[11px]">
              Conectar a un Servidor WebSocket Externo (Opcional)
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="wss://tu-servidor.onrender.com"
                className="flex-1 px-3 py-2 text-xs border border-slate-300 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-[#0A192F]"
              />
              <button
                type="submit"
                className="px-3.5 py-2 bg-[#0A192F] hover:bg-slate-800 text-white rounded-lg font-semibold flex items-center gap-1 cursor-pointer transition-colors shrink-0"
              >
                <Save className="w-3.5 h-3.5" />
                Guardar
              </button>
            </div>
            {savedSuccess && (
              <span className="text-[11px] text-emerald-600 font-semibold block">
                ¡Configuración guardada! Reiniciando conexión...
              </span>
            )}
            <p className="text-[10px] text-slate-400">
              Deja este campo en blanco para usar la conexión por defecto o el modo local de Vercel.
            </p>
          </form>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-4 sm:px-6 py-3 border-t border-slate-200 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-lg cursor-pointer transition-colors text-xs"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
};
