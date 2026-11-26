import React, { useState, useEffect, useRef } from 'react';
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
  Plus,
  Minus,
  Loader2,
  Copy,
  Check,
  Bot,
  FileSearch,
  Lock,
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
  EventDayPricing,
} from '../types/championship';
import { DigitalTicketCard } from './DigitalTicketCard';
import { CorporateLogo } from './CorporateLogo';

interface PublicTicketStoreProps {
  tournaments: Tournament[];
  activeTournament: Tournament;
  activeTournamentState: TournamentState;
  systemConfig: SystemConfig;
  onSelectTournament: (id: string) => void;
  onCreateTicket: (ticket: DigitalTicket) => void;
  onBackToLogin?: () => void;
  backLabel?: string;
  onUpdateEventDays?: (tournamentId: string, days: EventDayPricing[]) => void;
  isAdmin?: boolean;
}

export const PublicTicketStore: React.FC<PublicTicketStoreProps> = ({
  tournaments,
  activeTournament,
  activeTournamentState,
  systemConfig,
  onSelectTournament,
  onCreateTicket,
  onBackToLogin,
  backLabel = 'Salir al Login',
  onUpdateEventDays,
  isAdmin = false,
}) => {
  // Safe tiers references
  const tierAdulto = activeTournamentState?.spectatorTiers?.find((t) => t.type === 'ADULTO');
  const tierNino = activeTournamentState?.spectatorTiers?.find((t) => t.type === 'NINO');
  const tierVip = activeTournamentState?.spectatorTiers?.find((t) => t.type === 'VIP');

  const defaultVipPrice = tierVip?.price ?? 20;
  const defaultAdultPrice = tierAdulto?.price ?? 10;
  const defaultChildPrice = tierNino?.price ?? 5;

  // Event Days from active tournament or fallback
  const eventDays: EventDayPricing[] = activeTournament.eventDays && activeTournament.eventDays.length > 0
    ? activeTournament.eventDays.map((d) => ({
        ...d,
        vipPrice: d.vipPrice !== undefined ? Number(d.vipPrice) : defaultVipPrice,
        adultPrice: d.adultPrice !== undefined ? Number(d.adultPrice) : defaultAdultPrice,
        childPrice: d.childPrice !== undefined ? Number(d.childPrice) : defaultChildPrice,
        adultEnabled: d.adultEnabled !== undefined ? d.adultEnabled : (tierAdulto?.enabled !== false),
        childEnabled: d.childEnabled !== undefined ? d.childEnabled : (tierNino?.enabled !== false),
        vipEnabled: d.vipEnabled !== undefined ? d.vipEnabled : (tierVip?.enabled !== false),
      }))
    : [
        {
          id: 'day-default',
          label: `Jornada Oficial (${activeTournament.date})`,
          date: activeTournament.date,
          adultPrice: defaultAdultPrice,
          childPrice: defaultChildPrice,
          vipPrice: defaultVipPrice,
          adultEnabled: tierAdulto?.enabled !== false,
          childEnabled: tierNino?.enabled !== false,
          vipEnabled: tierVip?.enabled !== false,
        },
      ];

  const [selectedDayId, setSelectedDayId] = useState<string>(eventDays[0]?.id || 'day-default');

  // Keep selectedDayId synchronized if tournament changes
  useEffect(() => {
    if (eventDays.length > 0 && !eventDays.some((d) => d.id === selectedDayId)) {
      setSelectedDayId(eventDays[0].id);
    }
  }, [eventDays, selectedDayId]);

  const selectedDay = eventDays.find((d) => d.id === selectedDayId) || eventDays[0];

  const isAdultEnabled = selectedDay?.adultEnabled !== false;
  const isChildEnabled = selectedDay?.childEnabled !== false;
  const isVipEnabled = selectedDay?.vipEnabled !== false;

  // Cantidades individuales por tipo de entrada para combinar en una sola compra
  const [qtyAdulto, setQtyAdulto] = useState<number>(() =>
    eventDays[0]?.adultEnabled !== false ? 1 : 0
  );
  const [qtyNino, setQtyNino] = useState<number>(0);
  const [qtyVip, setQtyVip] = useState<number>(0);

  // Limpiar automáticamente cantidades de modalidades bloqueadas al cambiar de jornada o configuración
  useEffect(() => {
    if (!isAdultEnabled && qtyAdulto > 0) setQtyAdulto(0);
    if (!isChildEnabled && qtyNino > 0) setQtyNino(0);
    if (!isVipEnabled && qtyVip > 0) setQtyVip(0);
  }, [isAdultEnabled, isChildEnabled, isVipEnabled, qtyAdulto, qtyNino, qtyVip]);

  const [buyerName, setBuyerName] = useState<string>('');
  const [buyerPhone, setBuyerPhone] = useState<string>('');
  const [buyerDni, setBuyerDni] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('YAPE');
  const [payAtDoor, setPayAtDoor] = useState<boolean>(false);
  const [voucherUrl, setVoucherUrl] = useState<string>('');
  const [voucherFileName, setVoucherFileName] = useState<string>('');
  const [createdTicket, setCreatedTicket] = useState<DigitalTicket | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // Estados para reconocimiento y verificación de comprobantes con Inteligencia Artificial / OCR
  const [isVerifyingVoucher, setIsVerifyingVoucher] = useState<boolean>(false);
  const [voucherVerification, setVoucherVerification] = useState<{
    isValid: boolean;
    isLegitimateVoucher?: boolean;
    amountMatches?: boolean;
    recipientMatches?: boolean;
    detectedAmount?: number | null;
    expectedAmount?: number;
    verifiedMethod?: PaymentMethod;
    detectedRecipientName?: string | null;
    officialHolder?: string;
    detectedOperationNumber?: string | null;
    detectedDate?: string | null;
    confidence?: string;
    reason?: string;
    verificationEngine?: string;
  } | null>(null);
  const [adminManualApproval, setAdminManualApproval] = useState<boolean>(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const verificationSeqRef = useRef<number>(0);

  const copyToClipboard = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  // Normaliza la imagen a JPEG de alto contraste para optimizar el reconocimiento de texto y montos
  const normalizeVoucherImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('No se pudo leer el archivo seleccionado.'));
      reader.onload = (ev) => {
        const rawDataUrl = ev.target?.result as string;
        const img = new Image();
        img.onerror = () => resolve(rawDataUrl);
        img.onload = () => {
          try {
            const maxDim = 1600;
            let width = img.naturalWidth || img.width;
            let height = img.naturalHeight || img.height;
            if (width > maxDim || height > maxDim) {
              const scale = Math.min(maxDim / width, maxDim / height);
              width = Math.round(width * scale);
              height = Math.round(height * scale);
            }
            const canvas = document.createElement('canvas');
            canvas.width = Math.max(1, width);
            canvas.height = Math.max(1, height);
            const ctx = canvas.getContext('2d');
            if (!ctx) {
              resolve(rawDataUrl);
              return;
            }
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            resolve(canvas.toDataURL('image/jpeg', 0.92));
          } catch {
            resolve(rawDataUrl);
          }
        };
        img.src = rawDataUrl;
      };
      reader.readAsDataURL(file);
    });
  };

  const triggerVoucherVerification = async (
    dataUrl: string,
    amount: number,
    method: PaymentMethod,
    bName: string
  ) => {
    const reqId = ++verificationSeqRef.current;
    setIsVerifyingVoucher(true);
    setVoucherVerification(null);
    setAdminManualApproval(false);
    setFormError(null);

    const officialHolder =
      method === 'TRANSFER'
        ? systemConfig.bankHolder || 'Organización JJ Deportes EIRL'
        : method === 'YAPE'
        ? systemConfig.yapeHolder || 'Organización JJ Deportes'
        : systemConfig.plinHolder || 'Organización JJ Deportes';

    const officialPhone = method === 'YAPE' ? systemConfig.yapePhone : systemConfig.plinPhone;

    try {
      const res = await fetch('/api/voucher/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageBase64: dataUrl,
          expectedAmount: amount,
          paymentMethod: method,
          officialHolder,
          officialPhone,
          bankName: systemConfig.bankName,
          bankAccount: systemConfig.bankAccount,
          bankCci: systemConfig.bankCci,
          buyerName: bName,
        }),
      });

      const data = await res.json();
      if (reqId !== verificationSeqRef.current) return;
      setVoucherVerification({
        ...data,
        expectedAmount: amount,
        verifiedMethod: method,
      });
    } catch (err) {
      if (reqId !== verificationSeqRef.current) return;
      console.error('Error al verificar voucher:', err);
      setVoucherVerification({
        isValid: false,
        expectedAmount: amount,
        verifiedMethod: method,
        reason: 'No se pudo conectar con el servicio de verificación de comprobantes. Comprueba tu conexión a internet.',
      });
    } finally {
      if (reqId === verificationSeqRef.current) {
        setIsVerifyingVoucher(false);
      }
    }
  };

  // Cálculos dinámicos combinados 100% seguros y sincronizados con la venta
  const priceAdulto = Number(selectedDay?.adultPrice ?? defaultAdultPrice);
  const priceNino = Number(selectedDay?.childPrice ?? defaultChildPrice);
  const priceVip = Number(selectedDay?.vipPrice ?? defaultVipPrice);

  const effectiveQtyAdulto = isAdultEnabled ? qtyAdulto : 0;
  const effectiveQtyNino = isChildEnabled ? qtyNino : 0;
  const effectiveQtyVip = isVipEnabled ? qtyVip : 0;

  const totalQuantity = effectiveQtyAdulto + effectiveQtyNino + effectiveQtyVip;
  const totalAmount =
    Math.round(
      (effectiveQtyAdulto * priceAdulto +
        effectiveQtyNino * priceNino +
        effectiveQtyVip * priceVip) *
        100
    ) / 100;

  // Re-verificar automáticamente si cambia el total o el método de pago después de haber subido el voucher
  useEffect(() => {
    if (payAtDoor || !voucherUrl || totalAmount <= 0) return;
    if (
      voucherVerification &&
      Math.abs((voucherVerification.expectedAmount ?? -1) - totalAmount) <= 0.01 &&
      voucherVerification.verifiedMethod === paymentMethod
    ) {
      return;
    }

    const timer = setTimeout(() => {
      triggerVoucherVerification(voucherUrl, totalAmount, paymentMethod, buyerName);
    }, 350);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalAmount, paymentMethod, payAtDoor, voucherUrl]);

  const isVoucherVerifiedForCurrentOrder = Boolean(
    voucherVerification &&
      voucherVerification.isValid &&
      Math.abs((voucherVerification.expectedAmount ?? -1) - totalAmount) <= 0.01 &&
      voucherVerification.verifiedMethod === paymentMethod
  );

  const handleVoucherUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setFormError('Solo se permiten archivos de imagen (PNG, JPG, WebP) del comprobante de pago.');
      return;
    }

    setVoucherFileName(file.name);
    setFormError(null);
    try {
      const normalizedDataUrl = await normalizeVoucherImage(file);
      setVoucherUrl(normalizedDataUrl);
      if (!payAtDoor && totalAmount > 0) {
        triggerVoucherVerification(normalizedDataUrl, totalAmount, paymentMethod, buyerName);
      }
    } catch {
      setFormError('No se pudo leer la imagen seleccionada. Intenta con otra captura.');
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
    if (!payAtDoor) {
      if (!voucherUrl) {
        setFormError('Es obligatorio subir la foto o captura del voucher de pago (Yape, Plin o Transferencia) para validar y generar tus entradas.');
        return;
      }
      if (isVerifyingVoucher) {
        setFormError('El sistema aún está verificando el nombre y el monto en tu comprobante. Por favor espera unos segundos.');
        return;
      }
      if (!isVoucherVerifiedForCurrentOrder && !(isAdmin && adminManualApproval)) {
        setFormError(
          voucherVerification?.reason ||
            `El comprobante no es válido para S/ ${totalAmount.toFixed(2)} (${paymentMethod}). Sube un voucher que muestre el monto exacto y el titular oficial.`
        );
        return;
      }
    }

    const uniqueId = `TK-WEB-${Date.now().toString().slice(-6)}${Math.floor(Math.random() * 90 + 10)}`;
    const paymentStatus: TicketPaymentStatus = payAtDoor ? 'RESERVED_UNPAID' : 'PAID';

    // Desglose de ítems comprados (solo modalidades habilitadas)
    const items: DigitalTicketItem[] = [];
    if (effectiveQtyAdulto > 0) {
      items.push({
        ticketType: 'ADULTO',
        label: 'General Adulto',
        quantity: effectiveQtyAdulto,
        unitPrice: priceAdulto,
        subtotal: effectiveQtyAdulto * priceAdulto,
      });
    }
    if (effectiveQtyNino > 0) {
      items.push({
        ticketType: 'NINO',
        label: 'Niño / Menor',
        quantity: effectiveQtyNino,
        unitPrice: priceNino,
        subtotal: effectiveQtyNino * priceNino,
      });
    }
    if (effectiveQtyVip > 0) {
      items.push({
        ticketType: 'VIP',
        label: 'Tribuna VIP',
        quantity: effectiveQtyVip,
        unitPrice: priceVip,
        subtotal: effectiveQtyVip * priceVip,
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
                setVoucherVerification(null);
                setAdminManualApproval(false);
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
              {backLabel}
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
                const adultPriceVal = Number(day.adultPrice ?? defaultAdultPrice);
                const childPriceVal = Number(day.childPrice ?? defaultChildPrice);
                const vipPriceVal = Number(day.vipPrice ?? defaultVipPrice);
                const dAdultOn = day.adultEnabled !== false;
                const dChildOn = day.childEnabled !== false;
                const dVipOn = day.vipEnabled !== false;
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
                    <div className="mt-2 text-[10px] font-bold text-[#0A192F] flex flex-wrap items-center gap-x-2 gap-y-0.5 border-t border-slate-200/80 pt-1.5">
                      {dAdultOn && <span>General: S/ {adultPriceVal.toFixed(2)}</span>}
                      {dChildOn && <span className="text-emerald-700">Niño: S/ {childPriceVal.toFixed(2)}</span>}
                      {dVipOn && <span className="text-red-600 font-extrabold">VIP: S/ {vipPriceVal.toFixed(2)}</span>}
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

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {/* Tarjeta 1: Adulto General */}
              <div
                className={`p-3 rounded-xl border transition-all ${
                  !isAdultEnabled
                    ? 'border-slate-200 bg-slate-100 opacity-65'
                    : qtyAdulto > 0
                    ? 'border-[#0A192F] bg-blue-50/40 shadow-xs'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">General Adulto</span>
                    {isAdultEnabled ? (
                      <span className="text-[11px] text-slate-500 font-mono">
                        S/ {priceAdulto.toFixed(2)} c/u
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-700 bg-red-100 px-1.5 py-0.5 rounded mt-0.5">
                        <Lock className="w-2.5 h-2.5" />
                        Bloqueada
                      </span>
                    )}
                  </div>
                  <div className="text-right font-mono font-bold text-xs text-slate-900">
                    {isAdultEnabled ? `S/ ${(qtyAdulto * priceAdulto).toFixed(2)}` : 'No disp.'}
                  </div>
                </div>

                <div className="mt-2.5 flex items-center justify-between pt-2 border-t border-slate-200/70">
                  <span className="text-[11px] text-slate-500 font-medium">
                    {isAdultEnabled ? 'Cantidad:' : 'Modalidad cerrada'}
                  </span>
                  <div className="flex items-center gap-1.5 bg-white border border-slate-300 rounded-lg p-0.5 shadow-2xs">
                    <button
                      type="button"
                      onClick={() => setQtyAdulto((prev) => Math.max(0, prev - 1))}
                      disabled={!isAdultEnabled || qtyAdulto === 0}
                      className="w-7 h-7 rounded-md bg-slate-100 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center text-slate-700 font-bold text-xs cursor-pointer transition-colors"
                      title="Quitar"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="w-8 text-center font-bold text-xs font-mono text-slate-900">
                      {isAdultEnabled ? qtyAdulto : 0}
                    </span>
                    <button
                      type="button"
                      onClick={() => setQtyAdulto((prev) => Math.min(50, prev + 1))}
                      disabled={!isAdultEnabled}
                      className="w-7 h-7 rounded-md bg-[#0A192F] hover:bg-slate-800 disabled:bg-slate-300 disabled:cursor-not-allowed text-white flex items-center justify-center font-bold text-xs cursor-pointer transition-colors"
                      title={isAdultEnabled ? 'Agregar' : 'Modalidad bloqueada'}
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Tarjeta 2: Niño / Menor */}
              <div
                className={`p-3 rounded-xl border transition-all ${
                  !isChildEnabled
                    ? 'border-slate-200 bg-slate-100 opacity-65'
                    : qtyNino > 0
                    ? 'border-emerald-600 bg-emerald-50/40 shadow-xs'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">Niño / Menor de Edad</span>
                    {isChildEnabled ? (
                      <span className="text-[11px] text-slate-500 font-mono">
                        S/ {priceNino.toFixed(2)} c/u
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-700 bg-red-100 px-1.5 py-0.5 rounded mt-0.5">
                        <Lock className="w-2.5 h-2.5" />
                        Bloqueada
                      </span>
                    )}
                  </div>
                  <div className="text-right font-mono font-bold text-xs text-emerald-800">
                    {isChildEnabled ? `S/ ${(qtyNino * priceNino).toFixed(2)}` : 'No disp.'}
                  </div>
                </div>

                <div className="mt-2.5 flex items-center justify-between pt-2 border-t border-slate-200/70">
                  <span className="text-[11px] text-slate-500 font-medium">
                    {isChildEnabled ? 'Cantidad:' : 'Modalidad cerrada'}
                  </span>
                  <div className="flex items-center gap-1.5 bg-white border border-slate-300 rounded-lg p-0.5 shadow-2xs">
                    <button
                      type="button"
                      onClick={() => setQtyNino((prev) => Math.max(0, prev - 1))}
                      disabled={!isChildEnabled || qtyNino === 0}
                      className="w-7 h-7 rounded-md bg-slate-100 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center text-slate-700 font-bold text-xs cursor-pointer transition-colors"
                      title="Quitar"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="w-8 text-center font-bold text-xs font-mono text-slate-900">
                      {isChildEnabled ? qtyNino : 0}
                    </span>
                    <button
                      type="button"
                      onClick={() => setQtyNino((prev) => Math.min(50, prev + 1))}
                      disabled={!isChildEnabled}
                      className="w-7 h-7 rounded-md bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white flex items-center justify-center font-bold text-xs cursor-pointer transition-colors"
                      title={isChildEnabled ? 'Agregar' : 'Modalidad bloqueada'}
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Tarjeta 3: Tribuna VIP */}
              <div
                className={`p-3 rounded-xl border transition-all ${
                  !isVipEnabled
                    ? 'border-slate-200 bg-slate-100 opacity-65'
                    : qtyVip > 0
                    ? 'border-red-600 bg-red-50/40 shadow-xs'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-xs font-bold text-slate-900 block flex items-center gap-1">
                      Tribuna VIP Preferencial
                      {isVipEnabled && <Sparkles className="w-3 h-3 text-red-600" />}
                    </span>
                    {isVipEnabled ? (
                      <span className="text-[11px] text-slate-500 font-mono">
                        S/ {priceVip.toFixed(2)} c/u
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-700 bg-red-100 px-1.5 py-0.5 rounded mt-0.5">
                        <Lock className="w-2.5 h-2.5" />
                        Bloqueada
                      </span>
                    )}
                  </div>
                  <div className="text-right font-mono font-bold text-xs text-red-700">
                    {isVipEnabled ? `S/ ${(qtyVip * priceVip).toFixed(2)}` : 'No disp.'}
                  </div>
                </div>

                <div className="mt-2.5 flex items-center justify-between pt-2 border-t border-slate-200/70">
                  <span className="text-[11px] text-slate-500 font-medium">
                    {isVipEnabled ? 'Cantidad:' : 'Modalidad cerrada'}
                  </span>
                  <div className="flex items-center gap-1.5 bg-white border border-slate-300 rounded-lg p-0.5 shadow-2xs">
                    <button
                      type="button"
                      onClick={() => setQtyVip((prev) => Math.max(0, prev - 1))}
                      disabled={!isVipEnabled || qtyVip === 0}
                      className="w-7 h-7 rounded-md bg-slate-100 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center text-slate-700 font-bold text-xs cursor-pointer transition-colors"
                      title="Quitar"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="w-8 text-center font-bold text-xs font-mono text-slate-900">
                      {isVipEnabled ? qtyVip : 0}
                    </span>
                    <button
                      type="button"
                      onClick={() => setQtyVip((prev) => Math.min(50, prev + 1))}
                      disabled={!isVipEnabled}
                      className="w-7 h-7 rounded-md bg-red-600 hover:bg-red-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white flex items-center justify-center font-bold text-xs cursor-pointer transition-colors"
                      title={isVipEnabled ? 'Agregar' : 'Modalidad bloqueada'}
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
                <div className="bg-white p-3.5 rounded-xl border border-slate-200 text-xs space-y-2 shadow-2xs">
                  {paymentMethod === 'YAPE' && (
                    <div className="space-y-1.5">
                      <div className="font-bold text-[#742384] flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          📱 Número Yape Oficial:
                        </span>
                        <div className="flex items-center gap-1">
                          <span className="font-mono text-sm font-bold bg-purple-50 px-2 py-0.5 rounded border border-purple-200 text-[#742384]">
                            {systemConfig.yapePhone || '987 654 321'}
                          </span>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(systemConfig.yapePhone || '987 654 321', 'yapePhone')}
                            className="p-1 text-slate-500 hover:text-purple-700 cursor-pointer"
                            title="Copiar número Yape"
                          >
                            {copiedField === 'yapePhone' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>
                      <div className="p-2 bg-purple-50/60 rounded-lg border border-purple-100 flex items-center justify-between">
                        <span className="text-slate-600 text-[11px]">
                          Titular Oficial Yape: <strong>{systemConfig.yapeHolder || 'Organización JJ Deportes'}</strong>
                        </span>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(systemConfig.yapeHolder || 'Organización JJ Deportes', 'yapeHolder')}
                          className="px-2 py-0.5 text-[10px] bg-white text-purple-800 rounded border border-purple-200 hover:bg-purple-50 flex items-center gap-1 cursor-pointer"
                        >
                          {copiedField === 'yapeHolder' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                          <span>{copiedField === 'yapeHolder' ? 'Copiado' : 'Copiar'}</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {paymentMethod === 'PLIN' && (
                    <div className="space-y-1.5">
                      <div className="font-bold text-[#009e85] flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          📱 Número Plin Oficial:
                        </span>
                        <div className="flex items-center gap-1">
                          <span className="font-mono text-sm font-bold bg-teal-50 px-2 py-0.5 rounded border border-teal-200 text-[#009e85]">
                            {systemConfig.plinPhone || '987 654 321'}
                          </span>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(systemConfig.plinPhone || '987 654 321', 'plinPhone')}
                            className="p-1 text-slate-500 hover:text-teal-700 cursor-pointer"
                            title="Copiar número Plin"
                          >
                            {copiedField === 'plinPhone' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>
                      <div className="p-2 bg-teal-50/60 rounded-lg border border-teal-100 flex items-center justify-between">
                        <span className="text-slate-600 text-[11px]">
                          Titular Oficial Plin: <strong>{systemConfig.plinHolder || 'Organización JJ Deportes'}</strong>
                        </span>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(systemConfig.plinHolder || 'Organización JJ Deportes', 'plinHolder')}
                          className="px-2 py-0.5 text-[10px] bg-white text-teal-800 rounded border border-teal-200 hover:bg-teal-50 flex items-center gap-1 cursor-pointer"
                        >
                          {copiedField === 'plinHolder' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                          <span>{copiedField === 'plinHolder' ? 'Copiado' : 'Copiar'}</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {paymentMethod === 'TRANSFER' && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between pb-1 border-b border-slate-200">
                        <span className="font-bold text-[#0A192F] text-xs flex items-center gap-1.5">
                          🏦 {systemConfig.bankName || 'BCP Banco de Crédito del Perú'}
                        </span>
                        <span className="text-[10px] uppercase font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                          Transferencia Bancaria
                        </span>
                      </div>

                      {/* Nombre del Titular de la Cuenta Destacado */}
                      <div className="p-2.5 bg-blue-50/80 border border-blue-200 rounded-lg">
                        <span className="text-[10px] font-bold text-blue-900 uppercase block">
                          Nombre Oficial de la Cuenta / Titular:
                        </span>
                        <div className="flex items-center justify-between mt-0.5">
                          <strong className="text-xs sm:text-sm text-blue-950 font-display">
                            {systemConfig.bankHolder || 'Organización JJ Deportes EIRL'}
                          </strong>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(systemConfig.bankHolder || 'Organización JJ Deportes EIRL', 'bankHolder')}
                            className="px-2 py-0.5 text-[10px] font-semibold bg-white border border-blue-300 text-blue-800 rounded hover:bg-blue-100 transition-colors flex items-center gap-1 cursor-pointer shadow-2xs"
                          >
                            {copiedField === 'bankHolder' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                            <span>{copiedField === 'bankHolder' ? 'Copiado' : 'Copiar Nombre'}</span>
                          </button>
                        </div>
                        <p className="text-[10px] text-blue-700 mt-1">
                          * El comprobante de transferencia debe emitirse a favor de este titular exacto para que el sistema lo valide.
                        </p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        <div className="p-2 bg-slate-50 border border-slate-200 rounded-lg">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-semibold text-slate-500">N° de Cuenta:</span>
                            <button
                              type="button"
                              onClick={() => copyToClipboard(systemConfig.bankAccount || '193-98234812-0-45', 'bankAccount')}
                              className="text-[10px] text-blue-700 hover:underline flex items-center gap-0.5 cursor-pointer"
                            >
                              {copiedField === 'bankAccount' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                              <span>{copiedField === 'bankAccount' ? 'Copiado' : 'Copiar'}</span>
                            </button>
                          </div>
                          <span className="font-mono font-bold text-slate-900 block mt-0.5">
                            {systemConfig.bankAccount || '193-98234812-0-45'}
                          </span>
                        </div>

                        {systemConfig.bankCci && (
                          <div className="p-2 bg-slate-50 border border-slate-200 rounded-lg">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-semibold text-slate-500">CCI Interbancario:</span>
                              <button
                                type="button"
                                onClick={() => copyToClipboard(systemConfig.bankCci || '', 'bankCci')}
                                className="text-[10px] text-blue-700 hover:underline flex items-center gap-0.5 cursor-pointer"
                              >
                                {copiedField === 'bankCci' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                                <span>{copiedField === 'bankCci' ? 'Copiado' : 'Copiar'}</span>
                              </button>
                            </div>
                            <span className="font-mono font-bold text-slate-900 block mt-0.5">
                              {systemConfig.bankCci}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Adjuntar Voucher Obligatorio */}
                <div className="space-y-2 pt-2 border-t border-slate-200">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-red-700 flex items-center gap-1.5">
                      <Upload className="w-4 h-4 text-red-600" />
                      Comprobante / Voucher de Pago (OBLIGATORIO) *:
                    </label>
                    {voucherUrl && (
                      <span className="text-[11px] font-bold text-emerald-700 flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Voucher Adjuntado
                      </span>
                    )}
                  </div>

                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    Para activar y emitir tus boletos de forma segura, es obligatorio adjuntar la captura o comprobante de tu abono por Yape, Plin o Transferencia.
                  </p>

                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2.5">
                    <label className={`cursor-pointer px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition-all ${
                      voucherUrl
                        ? 'bg-emerald-50 text-emerald-800 border-2 border-emerald-500 hover:bg-emerald-100'
                        : 'bg-red-600 hover:bg-red-700 text-white shadow-md'
                    }`}>
                      <Upload className="w-4 h-4" />
                      <span>{voucherFileName ? 'Cambiar Imagen de Voucher' : 'Subir Imagen de Voucher *'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        required={!payAtDoor}
                        onChange={handleVoucherUpload}
                        className="hidden"
                      />
                    </label>

                    {voucherFileName && (
                      <span className="text-xs text-slate-800 font-mono font-semibold truncate max-w-xs bg-slate-100 px-2.5 py-1.5 rounded-lg border border-slate-200">
                        📎 {voucherFileName}
                      </span>
                    )}
                  </div>

                  {voucherUrl ? (
                    <div className="mt-2 space-y-2">
                      <div className="p-2 bg-white rounded-xl border border-emerald-300 inline-block shadow-2xs">
                        <span className="block text-[10px] text-emerald-700 font-bold uppercase mb-1">
                          Vista Previa del Voucher:
                        </span>
                        <img
                          src={voucherUrl}
                          alt="Comprobante de pago adjuntado"
                          className="h-28 max-w-xs object-contain rounded-lg border border-slate-200"
                        />
                      </div>

                      {/* Tarjeta de Reconocimiento y Verificación IA */}
                      {isVerifyingVoucher && (
                        <div className="p-3 bg-blue-50 border-2 border-blue-300 rounded-xl flex items-center gap-3 animate-pulse">
                          <Loader2 className="w-5 h-5 text-blue-600 animate-spin shrink-0" />
                          <div>
                            <span className="text-xs font-bold text-blue-900 block flex items-center gap-1.5">
                              <Bot className="w-3.5 h-3.5 text-blue-600" />
                              Analizando comprobante con Inteligencia Artificial...
                            </span>
                            <span className="text-[11px] text-blue-700">
                              Reconociendo monto exacto (S/ {totalAmount.toFixed(2)}) y nombre del titular oficial...
                            </span>
                          </div>
                        </div>
                      )}

                      {voucherVerification && !isVerifyingVoucher && (
                        <div
                          className={`p-3.5 rounded-xl border-2 transition-all ${
                            voucherVerification.isValid || adminManualApproval
                              ? 'bg-emerald-50 border-emerald-500 text-emerald-950'
                              : 'bg-red-50 border-red-500 text-red-950'
                          }`}
                        >
                          <div className="flex items-start gap-2.5">
                            <div className="shrink-0 mt-0.5">
                              {voucherVerification.isValid || adminManualApproval ? (
                                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                              ) : (
                                <AlertTriangle className="w-5 h-5 text-red-600" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0 space-y-1.5">
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-xs">
                                  {voucherVerification.isValid || adminManualApproval
                                    ? '✅ ¡COMPROBANTE VERIFICADO Y APROBADO!'
                                    : '❌ COMPROBANTE NO APROBADO POR EL SISTEMA'}
                                </span>
                                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/80 font-bold border">
                                  {voucherVerification.isValid || adminManualApproval ? 'COINCIDENCIA 100%' : 'DISCREPANCIA'}
                                </span>
                              </div>

                              <p className="text-xs leading-relaxed font-medium">
                                {voucherVerification.reason}
                              </p>

                              {/* Desglose de lo detectado por la IA */}
                              <div className="mt-2 pt-2 border-t border-black/10 grid grid-cols-2 gap-2 text-[11px] font-mono">
                                <div className="p-1.5 rounded bg-white/70 border border-black/5">
                                  <span className="text-[10px] text-slate-500 block">Monto en Voucher:</span>
                                  <span className={`font-bold ${voucherVerification.amountMatches ? 'text-emerald-700' : 'text-red-700'}`}>
                                    {voucherVerification.detectedAmount !== null && voucherVerification.detectedAmount !== undefined
                                      ? `S/ ${voucherVerification.detectedAmount.toFixed(2)}`
                                      : 'No detectado'}
                                  </span>
                                  <span className="text-[9px] text-slate-400 block">Esperado: S/ {totalAmount.toFixed(2)}</span>
                                </div>

                                <div className="p-1.5 rounded bg-white/70 border border-black/5">
                                  <span className="text-[10px] text-slate-500 block">Destinatario en Voucher:</span>
                                  <span className={`font-bold truncate block ${voucherVerification.recipientMatches ? 'text-emerald-700' : 'text-red-700'}`}>
                                    {voucherVerification.detectedRecipientName || 'No detectado'}
                                  </span>
                                  <span className="text-[9px] text-slate-400 block truncate">
                                    Oficial: {paymentMethod === 'TRANSFER' ? (systemConfig.bankHolder || 'Organización JJ Deportes EIRL') : paymentMethod === 'YAPE' ? (systemConfig.yapeHolder || 'Organización JJ Deportes') : (systemConfig.plinHolder || 'Organización JJ Deportes')}
                                  </span>
                                </div>
                              </div>

                              {voucherVerification.detectedOperationNumber && (
                                <div className="text-[10px] text-slate-600 pt-0.5">
                                  N° Operación: <strong className="font-mono">{voucherVerification.detectedOperationNumber}</strong>
                                  {voucherVerification.detectedDate ? ` · Fecha: ${voucherVerification.detectedDate}` : ''}
                                </div>
                              )}

                              {/* Opción de re-verificar o forzar administrador */}
                              <div className="pt-2 flex flex-wrap items-center gap-3">
                                <button
                                  type="button"
                                  onClick={() => triggerVoucherVerification(voucherUrl, totalAmount, paymentMethod, buyerName)}
                                  className="text-[11px] font-semibold text-blue-700 hover:text-blue-900 underline flex items-center gap-1 cursor-pointer"
                                >
                                  <FileSearch className="w-3.5 h-3.5" />
                                  <span>Re-analizar comprobante</span>
                                </button>

                                {isAdmin && !voucherVerification.isValid && !adminManualApproval && (
                                  <button
                                    type="button"
                                    onClick={() => setAdminManualApproval(true)}
                                    className="text-[11px] font-semibold text-amber-800 bg-amber-100 hover:bg-amber-200 px-2 py-0.5 rounded border border-amber-300 cursor-pointer"
                                  >
                                    ⚙️ Modo Admin: Forzar Aprobación Manual
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="p-2.5 bg-red-50 border border-red-200 rounded-xl text-red-800 text-[11px] font-semibold flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                      <span>⚠️ La compra está bloqueada hasta que adjuntes la captura del voucher de pago.</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Botón de Envío */}
          {(() => {
            const isVoucherMissing = !payAtDoor && !voucherUrl;
            const isVerifying = !payAtDoor && isVerifyingVoucher;
            const isVoucherRejectedOrUnverified =
              !payAtDoor &&
              Boolean(voucherUrl) &&
              !isVerifying &&
              !isVoucherVerifiedForCurrentOrder &&
              !(isAdmin && adminManualApproval);
            const isBlocked = Boolean(
              totalQuantity === 0 || isVoucherMissing || isVerifying || isVoucherRejectedOrUnverified
            );

            return (
              <button
                type="submit"
                disabled={isBlocked}
                className={`w-full py-3.5 px-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 ${
                  isBlocked
                    ? 'bg-slate-300 text-slate-600 cursor-not-allowed font-semibold text-xs border border-slate-400/40'
                    : 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-bold text-sm uppercase tracking-wider cursor-pointer group shadow-md'
                }`}
              >
                <span>
                  {totalQuantity === 0
                    ? 'Selecciona al menos 1 entrada con los botones (+) de arriba'
                    : isVoucherMissing
                    ? '⚠️ Bloqueado: Adjunta la imagen del voucher arriba para continuar'
                    : isVerifying
                    ? '⏳ Verificando monto y titular en el comprobante...'
                    : isVoucherRejectedOrUnverified
                    ? '⛔ Bloqueado: Voucher rechazado o no coincide con el monto/titular oficial'
                    : payAtDoor
                    ? `Confirmar Separación (${totalQuantity} ${totalQuantity === 1 ? 'entrada' : 'entradas'}) · S/ ${totalAmount.toFixed(2)}`
                    : `Generar Boleto Digital (${totalQuantity} ${totalQuantity === 1 ? 'entrada' : 'entradas'}) · S/ ${totalAmount.toFixed(2)}`}
                </span>
                {!isBlocked && (
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                )}
              </button>
            );
          })()}
        </form>
      </div>
    </div>
  );
};
