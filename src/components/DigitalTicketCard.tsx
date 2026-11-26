import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import {
  Ticket,
  CheckCircle2,
  AlertTriangle,
  Share2,
  Calendar,
  User,
  DollarSign,
  Download,
  Copy,
  Check,
  FileDown,
  Loader2,
} from 'lucide-react';
import { DigitalTicket, Tournament, SystemConfig } from '../types/championship';
import { CorporateLogo } from './CorporateLogo';
import { renderDigitalTicketImage } from '../utils/ticketImageRenderer';
import { printOrDownloadTicketPdf } from '../utils/printHelper';

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
  const [copiedImage, setCopiedImage] = useState<boolean>(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState<boolean>(false);
  const [isPrinting, setIsPrinting] = useState<boolean>(false);
  const [printDone, setPrintDone] = useState<boolean>(false);

  // Reliable instant QR URL fallback
  const fallbackQrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(ticket.qrCode)}`;
  const effectiveQrSrc = qrDataUrl || fallbackQrUrl;

  useEffect(() => {
    // Generate QR using canvas
    QRCode.toDataURL(ticket.qrCode, {
      width: 280,
      margin: 1,
      color: {
        dark: '#0A192F',
        light: '#FFFFFF',
      },
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => {
        console.warn('Local QR generation error, using fallback:', err);
        setQrDataUrl(fallbackQrUrl);
      });
  }, [ticket.qrCode, fallbackQrUrl]);

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
      `📷 *VER / ABRIR IMAGEN OFICIAL DEL QR:*\n${fallbackQrUrl}\n\n` +
      `⚡ *Instrucciones:* Muestra la imagen de este código QR al ingresar para ser escaneado por los operadores autorizados en la puerta.`;

    const phoneClean = ticket.buyerPhone.replace(/\D/g, '');
    const targetUrl = phoneClean
      ? `https://api.whatsapp.com/send?phone=51${phoneClean}&text=${encodeURIComponent(message)}`
      : `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;

    window.open(targetUrl, '_blank');
  };

  const handleCopyQrImage = async () => {
    try {
      const { blob } = await renderDigitalTicketImage({
        ticket,
        tournament,
        systemConfig,
      });
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blob }),
      ]);
      setCopiedImage(true);
      setTimeout(() => setCopiedImage(false), 4500);
    } catch (err) {
      console.warn('Full ticket image clipboard copy failed, falling back to QR blob/link:', err);
      try {
        const response = await fetch(effectiveQrSrc);
        const blob = await response.blob();
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob }),
        ]);
        setCopiedImage(true);
        setTimeout(() => setCopiedImage(false), 4500);
      } catch {
        try {
          await navigator.clipboard.writeText(fallbackQrUrl);
          setCopiedImage(true);
          setTimeout(() => setCopiedImage(false), 4500);
        } catch {
          // ignore
        }
      }
    }
  };

  const handleDownloadQrImage = async () => {
    setIsGeneratingImage(true);
    try {
      const { dataUrl } = await renderDigitalTicketImage({
        ticket,
        tournament,
        systemConfig,
      });
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `Boleto-QR-${ticket.qrCode}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      console.warn('Full ticket image render failed, falling back to QR PNG:', err);
      const a = document.createElement('a');
      a.href = effectiveQrSrc;
      a.target = '_blank';
      a.download = `Boleto-QR-${ticket.qrCode}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const handlePrint = async () => {
    setIsPrinting(true);
    try {
      await printOrDownloadTicketPdf(ticket, tournament, systemConfig);
      setPrintDone(true);
      setTimeout(() => setPrintDone(false), 3000);
    } catch (err) {
      console.warn('Error generando PDF para imprimir:', err);
      try {
        window.print();
      } catch {
        // ignore
      }
    } finally {
      setIsPrinting(false);
    }
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
          <img
            src={effectiveQrSrc}
            alt={`QR ${ticket.qrCode}`}
            className="w-48 h-48 object-contain rounded-lg shadow-xs border border-white bg-white"
            loading="eager"
          />
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

        {/* Botones de Acción (WhatsApp / Copiar Imagen / Descargar / Imprimir) */}
        <div className="space-y-2 pt-1 print:hidden">
          {/* Botón Principal WhatsApp */}
          <button
            type="button"
            onClick={handleShareWhatsApp}
            className="w-full py-2.5 px-3 bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer text-xs sm:text-sm"
          >
            <Share2 className="w-4 h-4 shrink-0" />
            <span>Compartir al WhatsApp (con Imagen QR)</span>
          </button>

          {/* Botón Exclusivo para PC: Copiar la Imagen PNG al Portapapeles */}
          <button
            type="button"
            onClick={handleCopyQrImage}
            className={`w-full py-2 px-3 text-xs font-bold rounded-xl transition-all border flex items-center justify-center gap-2 cursor-pointer shadow-2xs ${
              copiedImage
                ? 'bg-emerald-600 text-white border-emerald-600'
                : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-300'
            }`}
            title="Copia la imagen del QR para pegarla directamente con Ctrl+V en WhatsApp Web o Telegram"
          >
            {copiedImage ? (
              <>
                <Check className="w-4 h-4 text-white shrink-0" />
                <span>¡Imagen QR Copiada! Pega con Ctrl+V en WhatsApp</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 text-slate-600 shrink-0" />
                <span>Copiar Imagen QR (para pegar con Ctrl+V en WhatsApp)</span>
              </>
            )}
          </button>

          {/* Botones de Descargar Imagen e Imprimir */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handleDownloadQrImage}
              disabled={isGeneratingImage}
              className="py-2 px-2.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-60 text-slate-800 font-semibold rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer border border-slate-200 transition-colors"
            >
              {isGeneratingImage ? (
                <Loader2 className="w-3.5 h-3.5 text-slate-600 animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5 text-slate-600" />
              )}
              <span>{isGeneratingImage ? 'Generando...' : 'Guardar Imagen'}</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              disabled={isPrinting}
              className={`py-2 px-2.5 font-semibold rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer border transition-colors ${
                printDone
                  ? 'bg-emerald-600 text-white border-emerald-600'
                  : 'bg-slate-100 hover:bg-slate-200 disabled:opacity-60 text-slate-800 border-slate-200'
              }`}
            >
              {isPrinting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : printDone ? (
                <Check className="w-3.5 h-3.5 text-white" />
              ) : (
                <FileDown className="w-3.5 h-3.5 text-slate-600" />
              )}
              <span>
                {isPrinting ? 'Generando PDF...' : printDone ? 'PDF Listo' : 'Imprimir / PDF'}
              </span>
            </button>
          </div>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="w-full py-2 px-4 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl text-xs cursor-pointer transition-colors"
            >
              Cerrar
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
