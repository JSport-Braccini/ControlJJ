import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  ShieldAlert,
  AlertTriangle,
  X,
  CreditCard,
  Banknote,
  QrCode,
  User,
  Clock,
  AlertCircle
} from 'lucide-react';
import { ScanFeedback, DigitalTicket, PaymentMethod, Player, BeverageProduct } from '../types/championship';

interface ScanFeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  feedback: ScanFeedback | null;
  ticket?: DigitalTicket | null;
  player?: Player | null;
  beverage?: BeverageProduct | null;
  onConfirmDoorPayment?: (ticketId: string, paymentMethod: PaymentMethod) => void;
}

export const ScanFeedbackModal: React.FC<ScanFeedbackModalProps> = ({
  isOpen,
  onClose,
  feedback,
  ticket,
  player,
  beverage,
  onConfirmDoorPayment,
}) => {
  const [processingPayment, setProcessingPayment] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  // Synthesized audio feedback for instant reliable sounds on all devices
  useEffect(() => {
    if (!isOpen || !feedback) return;

    // Reset payment local state
    setProcessingPayment(false);
    setPaymentSuccess(false);

    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      const status = feedback.status;

      if (status === 'success') {
        // High pleasant double-beep
        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
        osc.frequency.setValueAtTime(880, ctx.currentTime + 0.12); // A5
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.35);
      } else if (status === 'duplicate') {
        // Deep warning buzzer
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, ctx.currentTime);
        osc.frequency.setValueAtTime(110, ctx.currentTime + 0.18);
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.5);
      } else if (status === 'warning') {
        // Alert chime
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, ctx.currentTime);
        osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.14);
        gain.gain.setValueAtTime(0.25, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.4);
      } else {
        // Error sound
        osc.type = 'square';
        osc.frequency.setValueAtTime(200, ctx.currentTime);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.3);
      }
    } catch {
      // Audio autoplay policy might restrict without prior interaction
    }

    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        if (feedback.status === 'duplicate' || feedback.status === 'error') {
          navigator.vibrate([150, 100, 150]);
        } else {
          navigator.vibrate([80]);
        }
      } catch {
        // ignore
      }
    }
  }, [isOpen, feedback]);

  // Handle keyboard shortcuts (Enter or Esc to dismiss)
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'Enter' && (!feedback || feedback.status !== 'warning')) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, feedback, onClose]);

  if (!isOpen || !feedback) return null;

  const isDuplicate = feedback.status === 'duplicate';
  const isWarning = feedback.status === 'warning' || (ticket && ticket.paymentStatus === 'RESERVED_UNPAID' && !ticket.assisted && !paymentSuccess);
  const isSuccess = (feedback.status === 'success' || paymentSuccess) && !isDuplicate && !isWarning;

  const handleDoorPay = async (method: PaymentMethod) => {
    if (!ticket || !onConfirmDoorPayment) return;
    setProcessingPayment(true);
    try {
      await onConfirmDoorPayment(ticket.id, method);
      setPaymentSuccess(true);
    } catch (err) {
      console.error(err);
    } finally {
      setProcessingPayment(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150 overflow-y-auto">
      <div
        className={`w-full max-w-lg rounded-2xl overflow-y-auto max-h-[92vh] my-auto shadow-2xl border transition-all duration-200 transform scale-100 ${
          isDuplicate
            ? 'bg-slate-900 border-red-500/80 text-white'
            : isWarning
            ? 'bg-slate-900 border-amber-500/80 text-white'
            : isSuccess
            ? 'bg-slate-900 border-emerald-500/80 text-white'
            : 'bg-slate-900 border-slate-700 text-white'
        }`}
      >
        {/* Banner Superior con Color de Estado */}
        <div
          className={`p-5 sm:p-6 text-center flex flex-col items-center justify-center relative ${
            isDuplicate
              ? 'bg-gradient-to-b from-red-600 to-red-700 text-white shadow-lg shadow-red-900/50'
              : isWarning
              ? 'bg-gradient-to-b from-amber-500 to-amber-600 text-white shadow-lg shadow-amber-900/50'
              : isSuccess
              ? 'bg-gradient-to-b from-emerald-600 to-emerald-700 text-white shadow-lg shadow-emerald-900/50'
              : 'bg-gradient-to-b from-slate-700 to-slate-800 text-white'
          }`}
        >
          <button
            type="button"
            onClick={onClose}
            className="absolute top-3 right-3 p-1.5 rounded-full bg-black/20 hover:bg-black/40 text-white/90 hover:text-white transition-colors cursor-pointer"
            title="Cerrar modal"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Ícono de Estado en tamaño gigante */}
          <div className="w-16 h-16 rounded-full bg-white/15 backdrop-blur-xs flex items-center justify-center shadow-inner mb-3">
            {isDuplicate ? (
              <ShieldAlert className="w-10 h-10 text-white animate-bounce" />
            ) : isWarning ? (
              <AlertCircle className="w-10 h-10 text-white animate-pulse" />
            ) : isSuccess ? (
              <CheckCircle2 className="w-10 h-10 text-white" />
            ) : (
              <AlertTriangle className="w-10 h-10 text-white" />
            )}
          </div>

          {/* Categoría Badge */}
          <span className="text-[11px] font-bold uppercase tracking-wider bg-black/25 px-2.5 py-0.5 rounded-full mb-1">
            {feedback.category === 'JUGADOR'
              ? '⚽ CONTROL DE ASISTENCIA — JUGADOR'
              : feedback.category === 'ESPECTADOR'
              ? '🎟️ CONTROL DE BOLETERÍA — ESPECTADOR'
              : feedback.category === 'BEBIDA'
              ? '🥤 CONTROL DE VENTAS — BEBIDAS'
              : '🔍 VERIFICACIÓN DE CÓDIGO QR'}
          </span>

          <h3 className="text-xl sm:text-2xl font-black tracking-tight text-center mt-1">
            {isDuplicate
              ? '⛔ ¡ACCESO DENEGADO! QR YA INGRESADO'
              : isWarning
              ? '⚠️ ¡PAGO PENDIENTE! ENTRADA SEPARADA'
              : isSuccess
              ? (paymentSuccess ? '✅ ¡PAGO REGISTRADO Y ACCESO PERMITIDO!' : '✅ ¡ACCESO PERMITIDO!')
              : '❌ CÓDIGO NO VÁLIDO'}
          </h3>

          <p className="text-xs sm:text-sm text-white/90 font-medium text-center max-w-md mt-1">
            {isDuplicate
              ? 'Este código QR ya fue escaneado anteriormente. El sistema bloquea el reingreso para evitar clonaciones o fraudes.'
              : isWarning
              ? 'Este boleto fue separado por la página web sin cancelar. Debe realizar el pago en puerta para habilitar el ingreso.'
              : isSuccess
              ? 'Verificación completada satisfactoriamente en tiempo real.'
              : feedback.message}
          </p>
        </div>

        {/* Cuerpo del Modal con Detalles Completos */}
        <div className="p-4 sm:p-6 space-y-4 max-h-[60vh] overflow-y-auto">
          {/* Alerta de Duplicado Especial */}
          {isDuplicate && (
            <div className="p-3.5 bg-red-950/60 border border-red-500/50 rounded-xl space-y-2">
              <div className="flex items-center gap-2 text-red-300 font-bold text-xs uppercase">
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                <span>Bloqueo de Reingreso Automático</span>
              </div>
              <p className="text-xs text-red-200 leading-relaxed">
                {feedback.message}
              </p>
              {feedback.detail && (
                <p className="text-[11px] text-red-300/80 font-mono bg-red-950/80 p-2 rounded-lg">
                  {feedback.detail}
                </p>
              )}
            </div>
          )}

          {/* Información del Boleto Digital (si aplica) */}
          {ticket && (
            <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-3.5 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-700">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-slate-400" />
                  <span className="text-xs font-bold text-slate-200">{ticket.buyerName}</span>
                </div>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full font-mono ${
                    ticket.paymentStatus === 'PAID' || paymentSuccess
                      ? 'bg-emerald-900/60 text-emerald-300 border border-emerald-600/50'
                      : 'bg-amber-900/60 text-amber-300 border border-amber-600/50'
                  }`}
                >
                  {ticket.paymentStatus === 'PAID' || paymentSuccess ? 'PAGADO' : 'SEPARADO (PENDIENTE)'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-slate-400 text-[11px] block">DNI / Documento:</span>
                  <span className="font-semibold text-slate-200 font-mono">{ticket.buyerDni || 'No registrado'}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px] block">Teléfono / WhatsApp:</span>
                  <span className="font-semibold text-slate-200 font-mono">{ticket.buyerPhone || 'No registrado'}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px] block">Jornada / Fecha:</span>
                  <span className="font-semibold text-slate-200">{ticket.eventDayLabel || ticket.eventDate}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px] block">Canal de Venta:</span>
                  <span className="font-semibold text-slate-200">{ticket.channel === 'WEB' ? 'Venta Web' : 'Taquilla Local'}</span>
                </div>
              </div>

              {/* Desglose de Entradas */}
              <div className="bg-slate-900/70 p-2.5 rounded-lg border border-slate-700/60">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Desglose del Boleto:
                </span>
                {ticket.items && ticket.items.length > 0 ? (
                  <div className="space-y-1">
                    {ticket.items.map((it, idx) => (
                      <div key={idx} className="flex justify-between text-xs">
                        <span className="text-slate-300">
                          {it.quantity}x {it.label}
                        </span>
                        <span className="font-mono font-semibold text-slate-200">
                          S/ {it.subtotal.toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-300">
                      {ticket.quantity}x {ticket.label}
                    </span>
                    <span className="font-mono font-semibold text-slate-200">
                      S/ {ticket.totalAmount.toFixed(2)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-xs font-bold pt-1.5 mt-1.5 border-t border-slate-700/80 text-emerald-400">
                  <span>Total a Pagar / Pagado:</span>
                  <span className="font-mono text-sm">S/ {ticket.totalAmount.toFixed(2)}</span>
                </div>
              </div>

              {/* Botones de Cobro en Puerta para Boletos Separados */}
              {isWarning && onConfirmDoorPayment && !paymentSuccess && (
                <div className="pt-2 border-t border-slate-700/80 space-y-2">
                  <div className="flex items-center gap-1.5 text-amber-300 text-xs font-bold">
                    <Banknote className="w-4 h-4 text-amber-400" />
                    <span>Cobrar en Puerta y Habilitar Asistencia:</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <button
                      type="button"
                      disabled={processingPayment}
                      onClick={() => handleDoorPay('EFECTIVO_PUERTA')}
                      className="px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all cursor-pointer"
                    >
                      <Banknote className="w-4 h-4" />
                      <span>Cobrar S/ {ticket.totalAmount.toFixed(2)} en Efectivo</span>
                    </button>
                    <button
                      type="button"
                      disabled={processingPayment}
                      onClick={() => handleDoorPay('YAPE')}
                      className="px-3.5 py-2.5 bg-purple-700 hover:bg-purple-600 disabled:opacity-50 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all cursor-pointer"
                    >
                      <CreditCard className="w-4 h-4" />
                      <span>Cobrar S/ {ticket.totalAmount.toFixed(2)} con Yape / Plin</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Información del Jugador (si aplica) */}
          {player && (
            <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-3.5 space-y-2 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-slate-700">
                <span className="text-xs font-bold text-slate-200">Ficha Oficial de Jugador</span>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-blue-900/60 text-blue-300 border border-blue-600/50">
                  DORSAL #{player.jerseyNumber}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-slate-400 text-[11px] block">Nombre:</span>
                  <span className="font-semibold text-slate-100">{player.name}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px] block">Equipo:</span>
                  <span className="font-semibold text-slate-100">{player.team}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px] block">DNI:</span>
                  <span className="font-semibold text-slate-100 font-mono">{player.dni || 'No registrado'}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px] block">Posición:</span>
                  <span className="font-semibold text-slate-100">{player.position}</span>
                </div>
              </div>
              {player.checkedIn && (
                <div className="pt-2 text-[11px] text-slate-400 flex items-center gap-1.5 border-t border-slate-700/60">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>Hora de ingreso registrado: {player.checkInTime || feedback.timestamp}</span>
                </div>
              )}
            </div>
          )}

          {/* Información de Bebida (si aplica) */}
          {beverage && (
            <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-3.5 space-y-2 text-xs">
              <div className="flex justify-between items-center pb-2 border-b border-slate-700">
                <span className="font-bold text-slate-200">{beverage.name}</span>
                <span className="font-mono text-emerald-400 font-bold">S/ {beverage.price.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Presentación: {beverage.presentation}</span>
                <span className="font-semibold">Stock actual: {beverage.stock} unidades</span>
              </div>
            </div>
          )}

          {/* Mensaje descriptivo si no es duplicado */}
          {!isDuplicate && !isWarning && (
            <div className="p-3 bg-slate-800/60 border border-slate-700 rounded-xl text-xs text-slate-300">
              <p className="font-medium">{feedback.message}</p>
              {feedback.detail && (
                <p className="text-[11px] text-slate-400 mt-1">{feedback.detail}</p>
              )}
            </div>
          )}

          {/* Código QR y Hora */}
          <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono pt-1">
            <span className="flex items-center gap-1">
              <QrCode className="w-3.5 h-3.5" />
              <span>{feedback.qrCode}</span>
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              <span>{feedback.timestamp}</span>
            </span>
          </div>
        </div>

        {/* Footer con Botón de Acción Principal */}
        <div className="p-3.5 sm:p-4 bg-slate-950 border-t border-slate-800 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className={`w-full sm:w-auto px-6 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all cursor-pointer shadow-md ${
              isDuplicate
                ? 'bg-red-600 hover:bg-red-500 text-white'
                : isWarning
                ? 'bg-slate-700 hover:bg-slate-600 text-white'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white'
            }`}
          >
            {isDuplicate ? 'Entendido (Bloquear Acceso)' : isWarning ? 'Cerrar Ventana' : 'Continuar Escaneando (Enter)'}
          </button>
        </div>
      </div>
    </div>
  );
};
