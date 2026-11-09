import React, { useState } from 'react';
import {
  Ticket,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  QrCode,
  DollarSign,
  User,
  Phone,
  CreditCard,
  Upload,
  ArrowRight,
  ShieldCheck,
  Building,
  Sparkles,
} from 'lucide-react';
import {
  Tournament,
  TournamentState,
  SystemConfig,
  DigitalTicket,
  DigitalTicketItem,
  SpectatorTicketType,
  PaymentMethod,
  TicketPaymentStatus,
} from '../types/championship';
import { DigitalTicketCard } from './DigitalTicketCard';
import { CorporateLogo } from './CorporateLogo';
import { Plus, Minus } from 'lucide-react';

interface PublicTicketStoreProps {
  tournaments: Tournament[];
  activeTournament: Tournament;
  activeTournamentState: TournamentState;
  systemConfig: SystemConfig;
  onSelectTournament: (id: string) => void;
  onCreateTicket: (ticket: DigitalTicket) => void;
  onBackToLogin?: () => void;
}

export const PublicTicketStore: React.FC<PublicTicketStoreProps> = ({
  tournaments,
  activeTournament,
  activeTournamentState,
  systemConfig,
  onSelectTournament,
  onCreateTicket,
  onBackToLogin,
}) => {
  // Event Days from active tournament or fallback
  const eventDays = activeTournament.eventDays && activeTournament.eventDays.length > 0
    ? activeTournament.eventDays
    : [
        {
          id: 'day-default',
          label: `Jornada Oficial (${activeTournament.date})`,
          date: activeTournament.date,
          adultPrice: 10,
          childPrice: 5,
          vipPrice: 20,
        },
      ];

  const [selectedDayId, setSelectedDayId] = useState<string>(eventDays[0]?.id || 'day-default');
  const selectedDay = eventDays.find((d) => d.id === selectedDayId) || eventDays[0];

  // Cantidades individuales por tipo de entrada para combinar en una sola compra
  const [qtyAdulto, setQtyAdulto] = useState<number>(1);
  const [qtyNino, setQtyNino] = useState<number>(0);
  const [qtyVip, setQtyVip] = useState<number>(0);
  const [qtyGratis, setQtyGratis] = useState<number>(0);

  const [buyerName, setBuyerName] = useState<string>('');
  const [buyerPhone, setBuyerPhone] = useState<string>('');
  const [buyerDni, setBuyerDni] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('YAPE');
  const [payAtDoor, setPayAtDoor] = useState<boolean>(false);
  const [voucherUrl, setVoucherUrl] = useState<string>('');
  const [voucherFileName, setVoucherFileName] = useState<string>('');
  const [createdTicket, setCreatedTicket] = useState<DigitalTicket | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // Cálculos dinámicos combinados
  const priceAdulto = selectedDay?.adultPrice ?? 10;
  const priceNino = selectedDay?.childPrice ?? 5;
  const priceVip = selectedDay?.vipPrice ?? 20;
  const priceGratis = 0;

  const totalQuantity = qtyAdulto + qtyNino + qtyVip + qtyGratis;
  const totalAmount =
    qtyAdulto * priceAdulto +
    qtyNino * priceNino +
    qtyVip * priceVip;

  const handleVoucherUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setVoucherFileName(file.name);
      const reader = new FileReader();
      reader.onload = (event) => {
        setVoucherUrl(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGenerateTicket = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (totalQuantity === 0) {
      setFormError('Por favor selecciona al menos 1 entrada para continuar con la compra.');
      return;
    }
    if (!buyerName.trim()) {
      setFormError('Por favor ingresa tu nombre completo.');
      return;
    }
    if (!buyerPhone.trim()) {
      setFormError('Por favor ingresa tu número de WhatsApp para enviarte el boleto.');
      return;
    }

    const uniqueId = `TK-WEB-${Date.now().toString().slice(-6)}${Math.floor(Math.random() * 90 + 10)}`;
    const paymentStatus: TicketPaymentStatus = payAtDoor ? 'RESERVED_UNPAID' : 'PAID';

    // Desglose de ítems comprados
    const items: DigitalTicketItem[] = [];
    if (qtyAdulto > 0) {
      items.push({
        ticketType: 'ADULTO',
        label: 'General Adulto',
        quantity: qtyAdulto,
        unitPrice: priceAdulto,
        subtotal: qtyAdulto * priceAdulto,
      });
    }
    if (qtyNino > 0) {
      items.push({
        ticketType: 'NINO',
        label: 'Niño / Menor',
        quantity: qtyNino,
        unitPrice: priceNino,
        subtotal: qtyNino * priceNino,
      });
    }
    if (qtyVip > 0) {
      items.push({
        ticketType: 'VIP',
        label: 'Tribuna VIP',
        quantity: qtyVip,
        unitPrice: priceVip,
        subtotal: qtyVip * priceVip,
      });
    }
    if (qtyGratis > 0) {
      items.push({
        ticketType: 'GRATIS',
        label: 'Cortesía',
        quantity: qtyGratis,
        unitPrice: 0,
        subtotal: 0,
      });
    }

    const primaryType: SpectatorTicketType = items.length === 1 ? items[0].ticketType : 'MIXTO';
    const summaryLabel = items.map((it) => `${it.quantity}x ${it.label}`).join(' + ');

    const newTicket: DigitalTicket = {
      id: `ticket-${Date.now()}`,
      tournamentId: activeTournament.id,
      qrCode: uniqueId,
      ticketType: primaryType,
      label: summaryLabel,
      eventDayId: selectedDay?.id,
      eventDayLabel: selectedDay?.label || 'Jornada Oficial',
      eventDate: selectedDay?.date || activeTournament.date,
      buyerName: buyerName.trim(),
      buyerPhone: buyerPhone.trim(),
      buyerDni: buyerDni.trim(),
      quantity: totalQuantity,
      unitPrice: totalQuantity > 0 ? totalAmount / totalQuantity : 0,
      totalAmount,
      paymentStatus,
      paymentMethod: payAtDoor ? 'EFECTIVO_PUERTA' : paymentMethod,
      voucherUrl: voucherUrl || undefined,
      channel: 'WEB',
      assisted: false,
      createdAt: new Date().toISOString(),
      items,
    };

    onCreateTicket(newTicket);
    setCreatedTicket(newTicket);
  };

  if (createdTicket) {
    return (
      <div className="min-h-screen bg-[#0A192F] py-8 px-4 flex flex-col items-center justify-center">
        <div className="w-full max-w-sm mb-4">
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-4 text-center text-white mb-4">
            <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-1.5" />
            <h2 className="text-lg font-bold">¡Boleto Generado con Éxito!</h2>
            <p className="text-xs text-slate-300">
              Guarda este código QR o compártelo a tu WhatsApp para presentarlo en la puerta.
            </p>
          </div>

          <DigitalTicketCard
            ticket={createdTicket}
            tournament={activeTournament}
            systemConfig={systemConfig}
            onClose={() => setCreatedTicket(null)}
          />

          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => {
                setCreatedTicket(null);
                setBuyerName('');
                setBuyerPhone('');
                setVoucherUrl('');
                setVoucherFileName('');
              }}
              className="px-5 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-semibold cursor-pointer border border-white/20 transition-all"
            >
              Comprar Otro Boleto
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 py-6 px-3 sm:px-6">
      <div className="max-w-2xl mx-auto space-y-5">
        {/* Header Superior */}
        <div className="bg-[#0A192F] rounded-2xl p-5 text-white shadow-xl border-b-2 border-red-600 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-white p-0.5 shadow-md flex items-center justify-center shrink-0">
              <CorporateLogo
                src={systemConfig.logoUrl}
                alt="Logo"
                className="w-full h-full object-cover rounded-lg"
              />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-red-400 tracking-wider font-mono">
                Boletería Oficial Online
              </span>
              <h1 className="text-lg sm:text-xl font-bold font-display text-white">
                {systemConfig.systemName}
              </h1>
              <p className="text-xs text-slate-300">{systemConfig.tagline}</p>
            </div>
          </div>

          {onBackToLogin && (
            <button
              type="button"
              onClick={onBackToLogin}
              className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 cursor-pointer transition-colors"
            >
              Salir al Login
            </button>
          )}
        </div>

        {/* Selector de Torneo si hay más de 1 */}
        {tournaments.length > 1 && (
          <div className="bg-white rounded-xl p-3 border border-slate-200 shadow-2xs flex items-center gap-3">
            <span className="text-xs font-bold text-slate-700 whitespace-nowrap">Torneo:</span>
            <select
              value={activeTournament.id}
              onChange={(e) => onSelectTournament(e.target.value)}
              className="flex-1 text-xs py-1.5 px-3 border border-slate-300 rounded-lg bg-slate-50 font-semibold"
            >
              {tournaments.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.venue})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Formulario Principal de Compra */}
        <form
          onSubmit={handleGenerateTicket}
          className="bg-white rounded-2xl border border-slate-200 shadow-lg p-5 sm:p-6 space-y-5"
        >
          {formError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-900 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {/* 1. Seleccionar Día del Evento (Precios específicos según la fecha) */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-red-600" />
              1. Selecciona la Jornada / Día del Evento:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {eventDays.map((day) => {
                const isSelected = selectedDayId === day.id;
                return (
                  <button
                    key={day.id}
                    type="button"
                    onClick={() => setSelectedDayId(day.id)}
                    className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                      isSelected
                        ? 'border-red-600 bg-red-50/50 shadow-xs ring-2 ring-red-600/20'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="text-xs font-bold text-slate-900 leading-tight">
                      {day.label}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1 font-mono">{day.date}</div>
                    <div className="mt-2 text-[11px] font-bold text-[#0A192F] flex items-center justify-between border-t border-slate-200/80 pt-1.5">
                      <span>General: S/ {day.adultPrice.toFixed(2)}</span>
                      <span className="text-red-600">VIP: S/ {day.vipPrice.toFixed(2)}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Selección de Tipos de Entradas (Combinación de varios tipos en una sola compra) */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Ticket className="w-4 h-4 text-red-600" />
                2. Selecciona tus Entradas (Combina varios tipos en una sola compra):
              </label>
              <span className="text-[11px] text-slate-500 font-medium">
                Agrega las entradas que necesites para tu grupo
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* Tarjeta 1: Adulto General */}
              <div
                className={`p-3 rounded-xl border transition-all ${
                  qtyAdulto > 0
                    ? 'border-[#0A192F] bg-blue-50/40 shadow-xs'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">General Adulto</span>
                    <span className="text-[11px] text-slate-500 font-mono">
                      S/ {priceAdulto.toFixed(2)} c/u
                    </span>
                  </div>
                  <div className="text-right font-mono font-bold text-xs text-slate-900">
                    S/ {(qtyAdulto * priceAdulto).toFixed(2)}
                  </div>
                </div>

                <div className="mt-2.5 flex items-center justify-between pt-2 border-t border-slate-200/70">
                  <span className="text-[11px] text-slate-500 font-medium">Cantidad:</span>
                  <div className="flex items-center gap-1.5 bg-white border border-slate-300 rounded-lg p-0.5 shadow-2xs">
                    <button
                      type="button"
                      onClick={() => setQtyAdulto((prev) => Math.max(0, prev - 1))}
                      disabled={qtyAdulto === 0}
                      className="w-7 h-7 rounded-md bg-slate-100 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center text-slate-700 font-bold text-xs cursor-pointer transition-colors"
                      title="Quitar"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="w-8 text-center font-bold text-xs font-mono text-slate-900">
                      {qtyAdulto}
                    </span>
                    <button
                      type="button"
                      onClick={() => setQtyAdulto((prev) => Math.min(50, prev + 1))}
                      className="w-7 h-7 rounded-md bg-[#0A192F] hover:bg-slate-800 text-white flex items-center justify-center font-bold text-xs cursor-pointer transition-colors"
                      title="Agregar"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Tarjeta 2: Niño / Menor */}
              <div
                className={`p-3 rounded-xl border transition-all ${
                  qtyNino > 0
                    ? 'border-emerald-600 bg-emerald-50/40 shadow-xs'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">Niño / Menor de Edad</span>
                    <span className="text-[11px] text-slate-500 font-mono">
                      S/ {priceNino.toFixed(2)} c/u
                    </span>
                  </div>
                  <div className="text-right font-mono font-bold text-xs text-emerald-800">
                    S/ {(qtyNino * priceNino).toFixed(2)}
                  </div>
                </div>

                <div className="mt-2.5 flex items-center justify-between pt-2 border-t border-slate-200/70">
                  <span className="text-[11px] text-slate-500 font-medium">Cantidad:</span>
                  <div className="flex items-center gap-1.5 bg-white border border-slate-300 rounded-lg p-0.5 shadow-2xs">
                    <button
                      type="button"
                      onClick={() => setQtyNino((prev) => Math.max(0, prev - 1))}
                      disabled={qtyNino === 0}
                      className="w-7 h-7 rounded-md bg-slate-100 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center text-slate-700 font-bold text-xs cursor-pointer transition-colors"
                      title="Quitar"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="w-8 text-center font-bold text-xs font-mono text-slate-900">
                      {qtyNino}
                    </span>
                    <button
                      type="button"
                      onClick={() => setQtyNino((prev) => Math.min(50, prev + 1))}
                      className="w-7 h-7 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center font-bold text-xs cursor-pointer transition-colors"
                      title="Agregar"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Tarjeta 3: Tribuna VIP */}
              <div
                className={`p-3 rounded-xl border transition-all ${
                  qtyVip > 0
                    ? 'border-red-600 bg-red-50/40 shadow-xs'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-xs font-bold text-slate-900 block flex items-center gap-1">
                      Tribuna VIP Preferencial
                      <Sparkles className="w-3 h-3 text-red-600" />
                    </span>
                    <span className="text-[11px] text-slate-500 font-mono">
                      S/ {priceVip.toFixed(2)} c/u
                    </span>
                  </div>
                  <div className="text-right font-mono font-bold text-xs text-red-700">
                    S/ {(qtyVip * priceVip).toFixed(2)}
                  </div>
                </div>

                <div className="mt-2.5 flex items-center justify-between pt-2 border-t border-slate-200/70">
                  <span className="text-[11px] text-slate-500 font-medium">Cantidad:</span>
                  <div className="flex items-center gap-1.5 bg-white border border-slate-300 rounded-lg p-0.5 shadow-2xs">
                    <button
                      type="button"
                      onClick={() => setQtyVip((prev) => Math.max(0, prev - 1))}
                      disabled={qtyVip === 0}
                      className="w-7 h-7 rounded-md bg-slate-100 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center text-slate-700 font-bold text-xs cursor-pointer transition-colors"
                      title="Quitar"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="w-8 text-center font-bold text-xs font-mono text-slate-900">
                      {qtyVip}
                    </span>
                    <button
                      type="button"
                      onClick={() => setQtyVip((prev) => Math.min(50, prev + 1))}
                      className="w-7 h-7 rounded-md bg-red-600 hover:bg-red-700 text-white flex items-center justify-center font-bold text-xs cursor-pointer transition-colors"
                      title="Agregar"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Tarjeta 4: Cortesía / Libre Acceso */}
              <div
                className={`p-3 rounded-xl border transition-all ${
                  qtyGratis > 0
                    ? 'border-purple-600 bg-purple-50/40 shadow-xs'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">Cortesía / Entrada Libre</span>
                    <span className="text-[11px] text-purple-700 font-semibold">
                      S/ 0.00 (Gratis)
                    </span>
                  </div>
                  <div className="text-right font-mono font-bold text-xs text-purple-700">
                    S/ 0.00
                  </div>
                </div>

                <div className="mt-2.5 flex items-center justify-between pt-2 border-t border-slate-200/70">
                  <span className="text-[11px] text-slate-500 font-medium">Cantidad:</span>
                  <div className="flex items-center gap-1.5 bg-white border border-slate-300 rounded-lg p-0.5 shadow-2xs">
                    <button
                      type="button"
                      onClick={() => setQtyGratis((prev) => Math.max(0, prev - 1))}
                      disabled={qtyGratis === 0}
                      className="w-7 h-7 rounded-md bg-slate-100 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center text-slate-700 font-bold text-xs cursor-pointer transition-colors"
                      title="Quitar"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="w-8 text-center font-bold text-xs font-mono text-slate-900">
                      {qtyGratis}
                    </span>
                    <button
                      type="button"
                      onClick={() => setQtyGratis((prev) => Math.min(50, prev + 1))}
                      className="w-7 h-7 rounded-md bg-purple-600 hover:bg-purple-700 text-white flex items-center justify-center font-bold text-xs cursor-pointer transition-colors"
                      title="Agregar"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Resumen del Carrito de Boletos */}
            <div className="bg-slate-900 text-white p-3.5 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md">
              <div className="space-y-0.5">
                <div className="text-xs font-bold text-slate-200 flex items-center gap-2">
                  <span>Resumen de Compra:</span>
                  <span className="px-2 py-0.5 rounded-full bg-red-600 text-[10px] font-bold text-white">
                    {totalQuantity} {totalQuantity === 1 ? 'Entrada' : 'Entradas en Total'}
                  </span>
                </div>
                <div className="text-[11px] text-slate-400">
                  {totalQuantity === 0 ? (
                    <span className="text-amber-400 font-medium">
                      ⚠️ Selecciona al menos 1 entrada con los botones (+) de arriba
                    </span>
                  ) : (
                    [
                      qtyAdulto > 0 ? `${qtyAdulto}x Adulto` : null,
                      qtyNino > 0 ? `${qtyNino}x Niño` : null,
                      qtyVip > 0 ? `${qtyVip}x VIP` : null,
                      qtyGratis > 0 ? `${qtyGratis}x Cortesía` : null,
                    ]
                      .filter(Boolean)
                      .join(' · ')
                  )}
                </div>
              </div>

              <div className="text-right w-full sm:w-auto border-t sm:border-t-0 pt-2 sm:pt-0">
                <span className="text-[10px] uppercase tracking-wider text-slate-400 block font-semibold">
                  Monto Total a Cancelar
                </span>
                <span className="text-lg font-extrabold text-white font-mono">
                  S/ {totalAmount.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* 3. Datos del Comprador */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <User className="w-4 h-4 text-red-600" />
              3. Datos del Comprador (Para verificación al ingresar):
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <span className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Nombre Completo *
                </span>
                <input
                  type="text"
                  required
                  value={buyerName}
                  onChange={(e) => setBuyerName(e.target.value)}
                  placeholder="Ej: Juan Pérez"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0A192F]"
                />
              </div>

              <div>
                <span className="block text-[11px] font-semibold text-slate-600 mb-1">
                  WhatsApp / Celular *
                </span>
                <input
                  type="tel"
                  required
                  value={buyerPhone}
                  onChange={(e) => setBuyerPhone(e.target.value)}
                  placeholder="Ej: 987654321"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl font-mono focus:outline-none focus:ring-2 focus:ring-[#0A192F]"
                />
              </div>

              <div>
                <span className="block text-[11px] font-semibold text-slate-600 mb-1">
                  DNI / Identificación
                </span>
                <input
                  type="text"
                  value={buyerDni}
                  onChange={(e) => setBuyerDni(e.target.value)}
                  placeholder="Ej: 71234567"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl font-mono focus:outline-none focus:ring-2 focus:ring-[#0A192F]"
                />
              </div>
            </div>
          </div>

          {/* 4. Modalidad de Pago: Pagar Ahora (Yape/Plin/Transfer) vs Separar y Pagar en Puerta */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <CreditCard className="w-4 h-4 text-red-600" />
              4. Modalidad de Pago:
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setPayAtDoor(false)}
                className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                  !payAtDoor
                    ? 'border-emerald-600 bg-emerald-50/60 shadow-xs ring-2 ring-emerald-600/20'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-emerald-950 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Pagar Ahora (Yape, Plin o Transferencia)
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 mt-1">
                  Acceso directo y rápido por la puerta con entrada 100% confirmada.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setPayAtDoor(true)}
                className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                  payAtDoor
                    ? 'border-amber-500 bg-amber-50/60 shadow-xs ring-2 ring-amber-500/20'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-amber-950 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    Separar y Pagar el Día del Evento
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 mt-1">
                  Reserva tu entrada ahora y cancelas en efectivo, Yape o Plin al llegar a la puerta.
                </p>
              </button>
            </div>

            {/* Si elige pagar ahora: opciones de Yape / Plin / Transferencia */}
            {!payAtDoor && (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <span className="block text-xs font-bold text-slate-800">
                  Selecciona la vía de pago para enviar tu abono de S/ {totalAmount.toFixed(2)}:
                </span>

                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('YAPE')}
                    className={`py-2 px-3 rounded-xl border text-center text-xs font-bold cursor-pointer transition-all ${
                      paymentMethod === 'YAPE'
                        ? 'bg-[#742384] text-white border-[#742384] shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200'
                    }`}
                  >
                    Yape
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('PLIN')}
                    className={`py-2 px-3 rounded-xl border text-center text-xs font-bold cursor-pointer transition-all ${
                      paymentMethod === 'PLIN'
                        ? 'bg-[#00D4B2] text-slate-900 border-[#00D4B2] shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200'
                    }`}
                  >
                    Plin
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('TRANSFER')}
                    className={`py-2 px-3 rounded-xl border text-center text-xs font-bold cursor-pointer transition-all ${
                      paymentMethod === 'TRANSFER'
                        ? 'bg-[#0A192F] text-white border-[#0A192F] shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200'
                    }`}
                  >
                    Transferencia BCP
                  </button>
                </div>

                {/* Datos de la cuenta seleccionada */}
                <div className="bg-white p-3 rounded-lg border border-slate-200 text-xs space-y-1">
                  {paymentMethod === 'YAPE' && (
                    <>
                      <div className="font-bold text-[#742384] flex items-center justify-between">
                        <span>Número Yape Oficial:</span>
                        <span className="font-mono text-sm">{systemConfig.yapePhone || '987 654 321'}</span>
                      </div>
                      <div className="text-slate-600 text-[11px]">
                        Titular: <strong>{systemConfig.yapeHolder || 'Organización JJ Deportes'}</strong>
                      </div>
                    </>
                  )}

                  {paymentMethod === 'PLIN' && (
                    <>
                      <div className="font-bold text-[#009e85] flex items-center justify-between">
                        <span>Número Plin Oficial:</span>
                        <span className="font-mono text-sm">{systemConfig.plinPhone || '987 654 321'}</span>
                      </div>
                      <div className="text-slate-600 text-[11px]">
                        Titular: <strong>{systemConfig.plinHolder || 'Organización JJ Deportes'}</strong>
                      </div>
                    </>
                  )}

                  {paymentMethod === 'TRANSFER' && (
                    <>
                      <div className="font-bold text-[#0A192F] flex items-center justify-between">
                        <span>{systemConfig.bankName || 'BCP Banco de Crédito'}:</span>
                        <span className="font-mono text-xs">{systemConfig.bankAccount || '193-98234812-0-45'}</span>
                      </div>
                      {systemConfig.bankCci && (
                        <div className="text-slate-600 text-[11px]">
                          CCI: <span className="font-mono">{systemConfig.bankCci}</span>
                        </div>
                      )}
                      <div className="text-slate-600 text-[11px]">
                        Titular: <strong>{systemConfig.bankHolder || 'Organización JJ Deportes EIRL'}</strong>
                      </div>
                    </>
                  )}
                </div>

                {/* Adjuntar Voucher */}
                <div className="space-y-1.5 pt-1">
                  <label className="block text-[11px] font-semibold text-slate-700">
                    Adjuntar Foto o Captura de Voucher (Opcional):
                  </label>
                  <div className="flex items-center gap-2">
                    <label className="cursor-pointer px-3 py-2 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 flex items-center gap-1.5 shadow-2xs">
                      <Upload className="w-3.5 h-3.5 text-slate-500" />
                      <span>{voucherFileName ? 'Cambiar Voucher' : 'Subir Comprobante'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleVoucherUpload}
                        className="hidden"
                      />
                    </label>
                    {voucherFileName && (
                      <span className="text-xs text-emerald-700 font-medium truncate max-w-xs">
                        ✓ {voucherFileName}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Botón de Envío */}
          <button
            type="submit"
            disabled={totalQuantity === 0}
            className={`w-full py-3.5 px-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 ${
              totalQuantity === 0
                ? 'bg-slate-300 text-slate-500 cursor-not-allowed font-semibold text-xs'
                : 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-bold text-sm uppercase tracking-wider cursor-pointer group'
            }`}
          >
            <span>
              {totalQuantity === 0
                ? 'Selecciona al menos 1 entrada con los botones (+) de arriba'
                : payAtDoor
                ? `Confirmar Separación (${totalQuantity} ${totalQuantity === 1 ? 'entrada' : 'entradas'}) · S/ ${totalAmount.toFixed(2)}`
                : `Generar Boleto Digital (${totalQuantity} ${totalQuantity === 1 ? 'entrada' : 'entradas'}) · S/ ${totalAmount.toFixed(2)}`}
            </span>
            {totalQuantity > 0 && (
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
