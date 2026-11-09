import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import {
  Ticket,
  CheckCircle2,
  AlertTriangle,
  Share2,
  Calendar,
  User,
  Phone,
  DollarSign,
  Download,
  Shield,
} from 'lucide-react';
import { DigitalTicket, Tournament, SystemConfig } from '../types/championship';
import { CorporateLogo } from './CorporateLogo';

interface DigitalTicketCardProps {
  ticket: DigitalTicket;
  tournament: Tournament;
  systemConfig: SystemConfig;
  onClose?: () => void;
}

export const DigitalTicketCard: React.FC<DigitalTicketCardProps> = ({
  ticket,
  tournament,
  systemConfig,
  onClose,
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  useEffect(() => {
    QRCode.toDataURL(ticket.qrCode, {
      width: 260,
      margin: 1,
      color: {
        dark: '#0A192F',
        light: '#FFFFFF',
      },
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.error('Error generating QR:', err));
  }, [ticket.qrCode]);

  const handleShareWhatsApp = () => {
    const isPaid = ticket.paymentStatus === 'PAID';
    const statusText = isPaid
      ? '✅ PAGADO Y CONFIRMADO'
      : '⚠️ SEPARADO (PAGAR EN PUERTA EL DÍA DEL PARTIDO)';

    const ticketsBreakdownText = ticket.items && ticket.items.length > 0
      ? ticket.items.map((it) => `  • ${it.quantity}x ${it.label}: S/ ${it.subtotal.toFixed(2)}`).join('\n')
      : `  • ${ticket.quantity}x ${ticket.label}: S/ ${ticket.totalAmount.toFixed(2)}`;

    const message = `🎟️ *BOLETO DIGITAL OFICIAL - ${tournament.name}*\n\n` +
      `👤 *Comprador:* ${ticket.buyerName}\n` +
      `🆔 *DNI / Identificación:* ${ticket.buyerDni || 'N/A'}\n` +
      `📅 *Jornada:* ${ticket.eventDayLabel}\n` +
      `🏟️ *Sede:* ${tournament.venue}\n` +
      `🎫 *Boletos Adquiridos (${ticket.quantity} personas):*\n${ticketsBreakdownText}\n\n` +
      `💰 *Total:* S/ ${ticket.totalAmount.toFixed(2)}\n` +
      `💳 *Estado:* ${statusText}\n` +
      `🔢 *Código Único QR:* ${ticket.qrCode}\n\n` +
      `⚡ *Instrucciones:* Muestra este código QR al ingresar para ser escaneado por los operadores autorizados.`;

    const phoneClean = ticket.buyerPhone.replace(/\D/g, '');
    const targetUrl = phoneClean
      ? `https://api.whatsapp.com/send?phone=51${phoneClean}&text=${encodeURIComponent(message)}`
      : `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;

    window.open(targetUrl, '_blank');
  };

  const handlePrint = () => {
    window.print();
  };

  const isPaid = ticket.paymentStatus === 'PAID';

  return (
    <div className="bg-white rounded-2xl border-2 border-slate-300 shadow-2xl overflow-hidden max-w-sm w-full mx-auto print:shadow-none print:border-black">
      {/* Header Corporativo */}
      <div className="bg-[#0A192F] text-white p-4 text-center relative border-b-2 border-red-600">
        <div className="w-12 h-12 mx-auto rounded-xl bg-white p-0.5 shadow-md mb-2 flex items-center justify-center">
          <CorporateLogo
            src={systemConfig.logoUrl}
            alt="Logo"
            className="w-full h-full object-cover rounded-lg"
          />
        </div>
        <span className="text-[10px] uppercase font-bold tracking-widest text-red-400 block font-mono">
          Boleto Oficial de Acceso
        </span>
        <h3 className="text-base font-extrabold text-white font-display leading-tight mt-0.5">
          {tournament.name}
        </h3>
        <p className="text-[11px] text-slate-300 mt-0.5 font-medium">
          {tournament.edition} · {tournament.venue}
        </p>
      </div>

      {/* Badge de Estado de Pago */}
      <div
        className={`py-2 px-4 text-center font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 ${
          isPaid
            ? 'bg-emerald-600 text-white shadow-inner'
            : 'bg-amber-500 text-slate-950 font-black shadow-inner animate-pulse'
        }`}
      >
        {isPaid ? (
          <>
            <CheckCircle2 className="w-4 h-4 text-white" />
            <span>ENTRADA PAGADA · INGRESO HABILITADO</span>
          </>
        ) : (
          <>
            <AlertTriangle className="w-4 h-4 text-slate-950" />
            <span>SEPARADA · PENDIENTE DE PAGO EN PUERTA</span>
          </>
        )}
      </div>

      {/* Cuerpo del Boleto */}
      <div className="p-4 space-y-3.5 text-xs text-slate-800">
        {/* Código QR Central */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-col items-center justify-center">
          {qrDataUrl ? (
            <img
              src={qrDataUrl}
              alt={`QR ${ticket.qrCode}`}
              className="w-44 h-44 object-contain rounded-lg shadow-xs border border-white"
            />
          ) : (
            <div className="w-44 h-44 bg-slate-200 animate-pulse rounded-lg flex items-center justify-center text-slate-400">
              Generando QR...
            </div>
          )}
          <div className="mt-2 font-mono font-bold text-sm tracking-widest text-[#0A192F] bg-white px-3 py-1 rounded-md border border-slate-200">
            {ticket.qrCode}
          </div>
        </div>

        {/* Detalles del Comprador y Evento */}
        <div className="space-y-1.5 bg-slate-50/80 p-3 rounded-xl border border-slate-200">
          <div className="flex items-center justify-between py-1 border-b border-slate-200/80">
            <span className="text-slate-500 flex items-center gap-1 font-medium">
              <User className="w-3.5 h-3.5 text-slate-400" />
              Comprador:
            </span>
            <span className="font-bold text-slate-900 text-right">{ticket.buyerName}</span>
          </div>

          {ticket.buyerDni && (
            <div className="flex items-center justify-between py-1 border-b border-slate-200/80">
              <span className="text-slate-500 font-medium">DNI / Doc:</span>
              <span className="font-mono font-bold text-slate-900">{ticket.buyerDni}</span>
            </div>
          )}

          <div className="flex items-center justify-between py-1 border-b border-slate-200/80">
            <span className="text-slate-500 flex items-center gap-1 font-medium">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              Fecha / Día:
            </span>
            <span className="font-semibold text-slate-900 text-right">{ticket.eventDayLabel}</span>
          </div>

          {ticket.items && ticket.items.length > 0 ? (
            <div className="py-1.5 border-b border-slate-200/80 space-y-1">
              <span className="text-slate-500 flex items-center gap-1 font-medium">
                <Ticket className="w-3.5 h-3.5 text-slate-400" />
                Desglose ({ticket.quantity} entradas):
              </span>
              <div className="space-y-1 bg-white p-2 rounded-lg border border-slate-200/70">
                {ticket.items.map((it, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-800">
                      {it.quantity}x {it.label}
                    </span>
                    <span className="font-mono font-bold text-slate-900">
                      S/ {it.subtotal.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between py-1 border-b border-slate-200/80">
              <span className="text-slate-500 flex items-center gap-1 font-medium">
                <Ticket className="w-3.5 h-3.5 text-slate-400" />
                Entrada:
              </span>
              <span className="font-bold text-slate-900">
                {ticket.quantity}x {ticket.label}
              </span>
            </div>
          )}

          <div className="flex items-center justify-between py-1 border-b border-slate-200/80">
            <span className="text-slate-500 flex items-center gap-1 font-medium">
              <DollarSign className="w-3.5 h-3.5 text-slate-400" />
              Total a Pagar / Pagado:
            </span>
            <span className="font-extrabold text-[#0A192F] text-sm">
              S/ {ticket.totalAmount.toFixed(2)}
            </span>
          </div>

          <div className="flex items-center justify-between py-1">
            <span className="text-slate-500 font-medium">Método de Pago:</span>
            <span className="font-semibold text-slate-700 capitalize">
              {ticket.paymentMethod === 'EFECTIVO_PUERTA' ? 'Efectivo en Puerta' : ticket.paymentMethod}
            </span>
          </div>

          {ticket.assisted && (
            <div className="mt-1 p-2 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-[11px] font-semibold text-center flex items-center justify-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              Ingreso Registrado a las {ticket.checkInTime}
            </div>
          )}
        </div>

        {/* Botones de Acción (WhatsApp / Descargar) */}
        <div className="space-y-2 pt-1 print:hidden">
          <button
            type="button"
            onClick={handleShareWhatsApp}
            className="w-full py-2.5 px-3 bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
          >
            <Share2 className="w-4 h-4" />
            <span>Compartir al WhatsApp del Comprador</span>
          </button>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="flex-1 py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer border border-slate-200"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Imprimir / PDF</span>
            </button>

            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="py-2 px-4 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl text-xs cursor-pointer"
              >
                Cerrar
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
