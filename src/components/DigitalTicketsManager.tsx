import React, { useState } from 'react';
import {
  Ticket,
  Search,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Share2,
  DollarSign,
  User,
  Phone,
  QrCode,
  CreditCard,
  Building,
  Check,
  X,
  Plus,
} from 'lucide-react';
import {
  Tournament,
  TournamentState,
  DigitalTicket,
  SystemConfig,
  PaymentMethod,
} from '../types/championship';
import { DigitalTicketCard } from './DigitalTicketCard';

interface DigitalTicketsManagerProps {
  tournament: Tournament;
  tournamentState: TournamentState;
  systemConfig: SystemConfig;
  onConfirmDoorPayment: (ticketId: string, paymentMethod: PaymentMethod) => void;
  onDeleteTicket: (ticketId: string) => void;
  onOpenStoreModal?: () => void;
}

export const DigitalTicketsManager: React.FC<DigitalTicketsManagerProps> = ({
  tournament,
  tournamentState,
  systemConfig,
  onConfirmDoorPayment,
  onDeleteTicket,
  onOpenStoreModal,
}) => {
  const [filter, setFilter] = useState<
    'ALL' | 'WEB_PAID' | 'RESERVED_DOOR' | 'DOOR_PAID' | 'ASSISTED'
  >('ALL');
  const [search, setSearch] = useState('');
  const [selectedTicketForView, setSelectedTicketForView] = useState<DigitalTicket | null>(null);

  // Door Payment Modal state
  const [ticketToPayAtDoor, setTicketToPayAtDoor] = useState<DigitalTicket | null>(null);
  const [doorMethod, setDoorMethod] = useState<PaymentMethod>('EFECTIVO_PUERTA');

  const tickets = tournamentState.digitalTickets || [];

  // Metrics computation as requested by the user:
  // 1. Web Paid in Advance
  const webPaidTickets = tickets.filter(
    (t) => t.channel === 'WEB' && t.paymentStatus === 'PAID' && !t.paidAtDoor
  );
  const totalWebPaidRevenue = webPaidTickets.reduce((sum, t) => sum + t.totalAmount, 0);

  // 2. Web Reserved unpaid (to pay at door)
  const webReservedTickets = tickets.filter(
    (t) => t.channel === 'WEB' && t.paymentStatus === 'RESERVED_UNPAID'
  );
  const totalReservedPendingRevenue = webReservedTickets.reduce((sum, t) => sum + t.totalAmount, 0);

  // 3. Paid at Door (both venue direct sales + web reservations paid at door)
  const paidAtDoorTickets = tickets.filter((t) => t.paidAtDoor || t.channel === 'VENUE');
  const totalPaidAtDoorRevenue = paidAtDoorTickets.reduce((sum, t) => sum + t.totalAmount, 0);

  // 4. Overall Attendance
  const totalAssistedTickets = tickets.filter((t) => t.assisted).length;

  // Filtered tickets
  const filteredTickets = tickets.filter((t) => {
    // Tab filter
    if (filter === 'WEB_PAID' && (t.channel !== 'WEB' || t.paymentStatus !== 'PAID' || t.paidAtDoor)) return false;
    if (filter === 'RESERVED_DOOR' && t.paymentStatus !== 'RESERVED_UNPAID') return false;
    if (filter === 'DOOR_PAID' && (!t.paidAtDoor && t.channel !== 'VENUE')) return false;
    if (filter === 'ASSISTED' && !t.assisted) return false;

    // Search query
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      const matchName = t.buyerName.toLowerCase().includes(q);
      const matchCode = t.qrCode.toLowerCase().includes(q);
      const matchPhone = t.buyerPhone.includes(q);
      const matchDni = (t.buyerDni || '').includes(q);
      return matchName || matchCode || matchPhone || matchDni;
    }
    return true;
  });

  const handleConfirmPaySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketToPayAtDoor) return;
    onConfirmDoorPayment(ticketToPayAtDoor.id, doorMethod);
    setTicketToPayAtDoor(null);
  };

  return (
    <div className="space-y-4">
      {/* Visual Ticket Modal */}
      {selectedTicketForView && (
        <div className="fixed inset-0 z-50 bg-[#0A192F]/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <DigitalTicketCard
            ticket={selectedTicketForView}
            tournament={tournament}
            systemConfig={systemConfig}
            onClose={() => setSelectedTicketForView(null)}
          />
        </div>
      )}

      {/* Door Payment Confirmation Modal */}
      {ticketToPayAtDoor && (
        <div className="fixed inset-0 z-50 bg-[#0A192F]/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                <DollarSign className="w-5 h-5 text-emerald-600" />
                <span>Cobro en Puerta de Entrada Separada</span>
              </div>
              <button
                type="button"
                onClick={() => setTicketToPayAtDoor(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 space-y-1 text-xs">
              <div className="flex justify-between font-bold text-amber-950">
                <span>Comprador:</span>
                <span>{ticketToPayAtDoor.buyerName}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Boletos:</span>
                <span className="text-right font-medium">
                  {ticketToPayAtDoor.items && ticketToPayAtDoor.items.length > 0
                    ? ticketToPayAtDoor.items.map((it) => `${it.quantity}x ${it.label}`).join(', ')
                    : `${ticketToPayAtDoor.quantity}x ${ticketToPayAtDoor.label}`}{' '}
                  ({ticketToPayAtDoor.eventDayLabel})
                </span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Código:</span>
                <span className="font-mono font-bold">{ticketToPayAtDoor.qrCode}</span>
              </div>
              <div className="flex justify-between font-extrabold text-[#0A192F] text-sm pt-1 border-t border-amber-200">
                <span>Monto a Cobrar:</span>
                <span>S/ {ticketToPayAtDoor.totalAmount.toFixed(2)}</span>
              </div>
            </div>

            <form onSubmit={handleConfirmPaySubmit} className="space-y-3">
              <label className="block text-xs font-bold text-slate-800">
                Selecciona Método de Pago Recibido en Puerta:
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setDoorMethod('EFECTIVO_PUERTA')}
                  className={`py-2 px-2 text-xs font-bold rounded-xl border text-center cursor-pointer ${
                    doorMethod === 'EFECTIVO_PUERTA'
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                  }`}
                >
                  Efectivo
                </button>
                <button
                  type="button"
                  onClick={() => setDoorMethod('YAPE')}
                  className={`py-2 px-2 text-xs font-bold rounded-xl border text-center cursor-pointer ${
                    doorMethod === 'YAPE'
                      ? 'bg-[#742384] text-white border-[#742384] shadow-xs'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                  }`}
                >
                  Yape
                </button>
                <button
                  type="button"
                  onClick={() => setDoorMethod('PLIN')}
                  className={`py-2 px-2 text-xs font-bold rounded-xl border text-center cursor-pointer ${
                    doorMethod === 'PLIN'
                      ? 'bg-[#00D4B2] text-slate-900 border-[#00D4B2] shadow-xs'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                  }`}
                >
                  Plin
                </button>
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setTicketToPayAtDoor(null)}
                  className="flex-1 py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-2 py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Confirmar Pago y Dar Ingreso</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tarjetas de Métricas de Ventas Web y Puerta */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* 1. Ventas Web Pagadas */}
        <div className="bg-white rounded-2xl border border-slate-200 p-3.5 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Web Pagadas</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl font-extrabold text-slate-900 font-mono">
            S/ {totalWebPaidRevenue.toFixed(2)}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            {webPaidTickets.length} boletos cobrados online
          </div>
        </div>

        {/* 2. Web Separadas por Cobrar */}
        <div className="bg-white rounded-2xl border border-slate-200 p-3.5 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700">
              Separadas (X Cobrar)
            </span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-xl font-extrabold text-amber-700 font-mono">
            S/ {totalReservedPendingRevenue.toFixed(2)}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            {webReservedTickets.length} boletos por cobrar en puerta
          </div>
        </div>

        {/* 3. Cobradas el Día del Evento */}
        <div className="bg-white rounded-2xl border border-slate-200 p-3.5 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700">
              Cobradas en Puerta
            </span>
            <Building className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-xl font-extrabold text-blue-800 font-mono">
            S/ {totalPaidAtDoorRevenue.toFixed(2)}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            {paidAtDoorTickets.length} boletos en taquilla / puerta
          </div>
        </div>

        {/* 4. Asistencia */}
        <div className="bg-white rounded-2xl border border-slate-200 p-3.5 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Asistieron</span>
            <User className="w-4 h-4 text-[#0A192F]" />
          </div>
          <div className="text-xl font-extrabold text-[#0A192F] font-mono">
            {totalAssistedTickets}{' '}
            <span className="text-xs text-slate-400 font-normal">/ {tickets.length}</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            Ingresos confirmados en sala
          </div>
        </div>
      </div>

      {/* Barra de Filtros y Búsqueda */}
      <div className="bg-white rounded-2xl border border-slate-200 p-3.5 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          <button
            type="button"
            onClick={() => setFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap cursor-pointer transition-colors ${
              filter === 'ALL'
                ? 'bg-[#0A192F] text-white'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            Todos ({tickets.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter('WEB_PAID')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap cursor-pointer transition-colors ${
              filter === 'WEB_PAID'
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            Web Pagadas ({webPaidTickets.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter('RESERVED_DOOR')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap cursor-pointer transition-colors ${
              filter === 'RESERVED_DOOR'
                ? 'bg-amber-600 text-white'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            Por Cobrar en Puerta ({webReservedTickets.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter('DOOR_PAID')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap cursor-pointer transition-colors ${
              filter === 'DOOR_PAID'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            Cobradas en Puerta ({paidAtDoorTickets.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter('ASSISTED')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap cursor-pointer transition-colors ${
              filter === 'ASSISTED'
                ? 'bg-purple-600 text-white'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            Asistidos ({totalAssistedTickets})
          </button>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por comprador, DNI, QR..."
              className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0A192F]"
            />
          </div>

          {onOpenStoreModal && (
            <button
              type="button"
              onClick={onOpenStoreModal}
              className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg cursor-pointer flex items-center gap-1 shadow-2xs whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Nueva Venta Web</span>
            </button>
          )}
        </div>
      </div>

      {/* Lista / Tabla de Boletos */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        {filteredTickets.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs">
            <Ticket className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            No hay boletos que coincidan con los filtros aplicados.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredTickets.map((t) => {
              const isPaid = t.paymentStatus === 'PAID';
              const isDoorPending = t.paymentStatus === 'RESERVED_UNPAID';

              return (
                <div
                  key={t.id}
                  className="p-3.5 sm:p-4 hover:bg-slate-50 transition-colors flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 font-mono font-bold text-xs ${
                        isPaid ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      <Ticket className="w-4 h-4" />
                    </div>

                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm">{t.buyerName}</span>
                        {t.buyerDni && (
                          <span className="text-[11px] text-slate-400 font-mono">
                            DNI: {t.buyerDni}
                          </span>
                        )}
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            isPaid
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800 animate-pulse'
                          }`}
                        >
                          {isPaid ? 'Pagado' : 'Por Pagar en Puerta'}
                        </span>
                        {t.assisted && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-purple-100 text-purple-800">
                            ✓ Ingresó ({t.checkInTime})
                          </span>
                        )}
                      </div>

                      <div className="text-slate-500 text-[11px] flex flex-wrap items-center gap-x-2 gap-y-0.5">
                        <span className="font-semibold text-slate-700">
                          {t.items && t.items.length > 0
                            ? `${t.quantity} ${t.quantity === 1 ? 'entrada' : 'entradas'} (${t.items.map((it) => `${it.quantity}x ${it.label}`).join(' + ')})`
                            : `${t.quantity}x ${t.label}`}
                        </span>
                        <span>·</span>
                        <span>{t.eventDayLabel}</span>
                        <span>·</span>
                        <span className="font-mono text-slate-600">{t.qrCode}</span>
                        {t.buyerPhone && (
                          <>
                            <span>·</span>
                            <span className="text-emerald-700 font-medium">
                              Tel: {t.buyerPhone}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 pt-2 sm:pt-0">
                    <div className="text-right">
                      <div className="font-mono font-extrabold text-sm text-[#0A192F]">
                        S/ {t.totalAmount.toFixed(2)}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {t.paymentMethod === 'EFECTIVO_PUERTA'
                          ? 'En Puerta'
                          : `Vía ${t.paymentMethod}`}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {isDoorPending && (
                        <button
                          type="button"
                          onClick={() => setTicketToPayAtDoor(t)}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg cursor-pointer text-xs flex items-center gap-1 shadow-2xs"
                        >
                          <DollarSign className="w-3.5 h-3.5" />
                          <span>Cobrar en Puerta</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => setSelectedTicketForView(t)}
                        className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg cursor-pointer transition-colors"
                        title="Ver Boleto / QR"
                      >
                        <QrCode className="w-4 h-4 text-slate-600" />
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          const message = `🎟️ *BOLETO OFICIAL - ${tournament.name}*\nComprador: ${t.buyerName}\nEntrada: ${t.quantity}x ${t.label} (${t.eventDayLabel})\nMonto: S/ ${t.totalAmount.toFixed(2)}\nCódigo QR: ${t.qrCode}\nEstado: ${isPaid ? 'PAGADO' : 'POR PAGAR EN PUERTA'}`;
                          const cleanPhone = t.buyerPhone.replace(/\D/g, '');
                          const url = cleanPhone
                            ? `https://api.whatsapp.com/send?phone=51${cleanPhone}&text=${encodeURIComponent(message)}`
                            : `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
                          window.open(url, '_blank');
                        }}
                        className="p-1.5 bg-[#25D366]/10 hover:bg-[#25D366]/20 text-[#25D366] rounded-lg cursor-pointer transition-colors"
                        title="Compartir por WhatsApp"
                      >
                        <Share2 className="w-4 h-4 text-[#25D366]" />
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(`¿Eliminar boleto ${t.qrCode} de ${t.buyerName}?`)) {
                            onDeleteTicket(t.id);
                          }
                        }}
                        className="p-1.5 text-slate-300 hover:text-red-600 rounded-lg cursor-pointer transition-colors"
                        title="Eliminar Boleto"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
