import React, { useState } from 'react';
import {
  Ticket,
  Plus,
  Trash2,
  Edit2,
  X,
  Users,
  Baby,
  Sparkles,
  ScanLine,
  CheckCircle2,
  QrCode,
  Shield,
  Camera,
  Gift,
  Share2,
  Smartphone,
  Minus,
} from 'lucide-react';
import {
  SpectatorTier,
  SpectatorEntry,
  SpectatorTicketType,
  UserRole,
  DigitalTicket,
  DigitalTicketItem,
  Tournament,
  SystemConfig,
  PaymentMethod,
} from '../types/championship';
import { QrCodeImage } from './QrCodeImage';
import { CameraQrModal } from './CameraQrModal';
import { DigitalTicketCard } from './DigitalTicketCard';

interface SpectatorsManagerProps {
  tournamentId: string;
  tournament?: Tournament;
  systemConfig?: SystemConfig;
  tiers: SpectatorTier[];
  entries: SpectatorEntry[];
  currentUserRole: UserRole;
  onRegisterSpectator: (type: SpectatorTicketType, quantity: number) => void;
  onUpdateTierPrice: (tierId: string, newPrice: number, label?: string, description?: string) => void;
  onAddTicketTier: (tier: SpectatorTier) => void;
  onDeleteTicketTier: (tierId: string) => void;
  onSellVenueTicket?: (ticket: DigitalTicket) => void;
}

export const SpectatorsManager: React.FC<SpectatorsManagerProps> = ({
  tournamentId,
  tournament,
  systemConfig,
  tiers,
  entries,
  currentUserRole,
  onRegisterSpectator,
  onUpdateTierPrice,
  onAddTicketTier,
  onDeleteTicketTier,
  onSellVenueTicket,
}) => {
  const isAdmin = currentUserRole === 'ADMIN';

  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [editingTier, setEditingTier] = useState<SpectatorTier | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  // Venue ticket sale with WhatsApp sharing (Multi-boletos en una sola compra)
  const [showVenueSaleModal, setShowVenueSaleModal] = useState(false);
  const [venueBuyerName, setVenueBuyerName] = useState('');
  const [venueBuyerPhone, setVenueBuyerPhone] = useState('');
  const [venueTierQuantities, setVenueTierQuantities] = useState<Record<string, number>>({});
  const [venuePaymentMethod, setVenuePaymentMethod] = useState<PaymentMethod>('EFECTIVO_PUERTA');
  const [lastSoldTicket, setLastSoldTicket] = useState<DigitalTicket | null>(null);

  // Direct Ticket Scan Input
  const [ticketScanCode, setTicketScanCode] = useState('');
  const [ticketScanQty, setTicketScanQty] = useState<number>(1);
  const [showCameraScanner, setShowCameraScanner] = useState(false);

  // Form add tier
  const [newLabel, setNewLabel] = useState('');
  const [newPrice, setNewPrice] = useState<number>(10);
  const [newIsChild, setNewIsChild] = useState(false);
  const [newIsGratis, setNewIsGratis] = useState(false);
  const [newDescription, setNewDescription] = useState('');

  // Form edit tier
  const [editLabel, setEditLabel] = useState('');
  const [editPrice, setEditPrice] = useState<number>(10);
  const [editDescription, setEditDescription] = useState('');

  const totalSpectators = entries.reduce((acc, e) => acc + e.quantity, 0);
  const totalFree = entries
    .filter((e) => e.ticketType === 'GRATIS' || e.price === 0)
    .reduce((acc, e) => acc + e.quantity, 0);
  const totalChildren = entries
    .filter((e) => e.isChild)
    .reduce((acc, e) => acc + e.quantity, 0);
  const totalAdultsAndVip = entries
    .filter((e) => (e.ticketType === 'ADULTO' || e.ticketType === 'VIP') && !e.isChild && e.price > 0)
    .reduce((acc, e) => acc + e.quantity, 0);
  const totalRevenue = entries.reduce((acc, e) => acc + e.totalAmount, 0);

  const totalVenueQty = tiers.reduce((acc, t) => acc + (venueTierQuantities[t.id] || 0), 0);
  const totalVenueAmount = tiers.reduce((acc, t) => acc + (venueTierQuantities[t.id] || 0) * t.price, 0);

  const handleOpenAdd = () => {
    if (!isAdmin) {
      alert('Solo el Administrador General puede agregar nuevas modalidades de entradas.');
      return;
    }
    setNewLabel('');
    setNewPrice(10);
    setNewIsChild(false);
    setNewDescription('');
    setShowAddModal(true);
  };

  const handleOpenEdit = (tier: SpectatorTier) => {
    if (!isAdmin) {
      alert('Solo el Administrador General puede modificar tarifas de boletos.');
      return;
    }
    setEditingTier(tier);
    setEditLabel(tier.label);
    setEditPrice(tier.price);
    setEditDescription(tier.description);
  };

  const handleDelete = (tier: SpectatorTier) => {
    if (!isAdmin) {
      alert('Solo el Administrador General puede eliminar modalidades de entradas.');
      return;
    }
    if (confirm(`¿Eliminar la tarifa "${tier.label}"?`)) {
      onDeleteTicketTier(tier.id);
    }
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTier) return;
    onUpdateTierPrice(editingTier.id, editPrice, editLabel, editDescription);
    setEditingTier(null);
  };

  const handleSaveAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLabel.trim()) return;
    let type: SpectatorTicketType = 'ADULTO';
    if (newIsGratis || Number(newPrice) === 0) {
      type = 'GRATIS';
    } else if (newIsChild) {
      type = 'NINO';
    } else if (newLabel.toUpperCase().includes('VIP')) {
      type = 'VIP';
    }
    const codeSuffix = newLabel.trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
    const newTier: SpectatorTier = {
      id: `tier-${Date.now()}`,
      tournamentId,
      type,
      label: newLabel.trim(),
      qrCode: `ESP-${codeSuffix || Date.now().toString().slice(-4)}`,
      price: newIsGratis ? 0 : Math.max(0, Number(newPrice) || 0),
      isChild: newIsChild,
      description: newDescription.trim() || (newIsGratis ? 'Entrada cortesía / libre acceso' : 'Entrada para control de acceso'),
    };
    onAddTicketTier(newTier);
    setShowAddModal(false);
  };

  const handleDirectTicketScan = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = ticketScanCode.trim().toUpperCase();
    if (!clean) return;

    // Check if matches an existing tier
    const foundTier = tiers.find(
      (t) => t.qrCode.toUpperCase() === clean || t.type.toUpperCase() === clean
    );
    if (foundTier) {
      onRegisterSpectator(foundTier.type, ticketScanQty);
    } else {
      // Default to ADULTO
      onRegisterSpectator('ADULTO', ticketScanQty);
    }
    setTicketScanCode('');
  };

  const handleVenueSaleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!venueBuyerName.trim()) return;

    // Filter tiers with quantity > 0
    const items: DigitalTicketItem[] = [];
    tiers.forEach((t) => {
      const qty = venueTierQuantities[t.id] || 0;
      if (qty > 0) {
        items.push({
          ticketType: t.type,
          label: t.label,
          quantity: qty,
          unitPrice: t.price,
          subtotal: qty * t.price,
        });
      }
    });

    const totalQty = items.reduce((acc, it) => acc + it.quantity, 0);
    const totalAmount = items.reduce((acc, it) => acc + it.subtotal, 0);

    if (totalQty === 0) {
      alert('Por favor selecciona al menos 1 entrada con los botones (+) para continuar la venta.');
      return;
    }

    const qrCode = `TK-LOC-${Date.now().toString().slice(-6)}${Math.floor(Math.random() * 90 + 10)}`;
    const primaryType: SpectatorTicketType = items.length === 1 ? items[0].ticketType : 'MIXTO';
    const summaryLabel = items.map((it) => `${it.quantity}x ${it.label}`).join(' + ');

    const newTicket: DigitalTicket = {
      id: `ticket-venue-${Date.now()}`,
      tournamentId,
      qrCode,
      ticketType: primaryType,
      label: summaryLabel,
      eventDayLabel: tournament?.date ? `Jornada ${tournament.date}` : 'Jornada Oficial',
      eventDate: tournament?.date || new Date().toISOString().slice(0, 10),
      buyerName: venueBuyerName.trim(),
      buyerPhone: venueBuyerPhone.trim(),
      buyerDni: '',
      quantity: totalQty,
      unitPrice: totalQty > 0 ? totalAmount / totalQty : 0,
      totalAmount,
      paymentStatus: 'PAID',
      paymentMethod: venuePaymentMethod,
      channel: 'VENUE',
      assisted: false,
      createdAt: new Date().toISOString(),
      items,
    };

    if (onSellVenueTicket) {
      onSellVenueTicket(newTicket);
    } else {
      items.forEach((it) => {
        onRegisterSpectator(it.ticketType, it.quantity);
      });
    }

    setLastSoldTicket(newTicket);
    setShowVenueSaleModal(false);

    // Open WhatsApp directly if phone provided!
    const itemsListText = items.map((it) => `  • ${it.quantity}x ${it.label}: S/ ${it.subtotal.toFixed(2)}`).join('\n');
    const message = `🎟️ *BOLETO DIGITAL OFICIAL - ${tournament?.name || 'JJ CopaControl'}*\n\n` +
      `👤 *Comprador:* ${newTicket.buyerName}\n` +
      `🎫 *Boletos Adquiridos (${newTicket.quantity} entradas):*\n${itemsListText}\n\n` +
      `💰 *Total Cobrado:* S/ ${newTicket.totalAmount.toFixed(2)} (Pago: ${venuePaymentMethod === 'EFECTIVO_PUERTA' ? 'Efectivo en Puerta' : venuePaymentMethod})\n` +
      `🔢 *Código QR Único:* ${newTicket.qrCode}\n` +
      `✅ *Estado:* PAGADO EN TAQUILLA LOCAL\n\n` +
      `Muestra este código al ingresar al partido.`;

    const cleanPhone = venueBuyerPhone.replace(/\D/g, '');
    const targetUrl = cleanPhone
      ? `https://api.whatsapp.com/send?phone=51${cleanPhone}&text=${encodeURIComponent(message)}`
      : `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;

    window.open(targetUrl, '_blank');
  };

  return (
    <div className="space-y-6 w-full max-w-full">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 font-display">
            Control de Espectadores y Boletos
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Registro de taquilla por QR diferenciando niños y adultos. {isAdmin ? 'Panel de Administrador.' : 'Estación del Operador de Espectadores.'}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => {
              if (tiers.length > 0 && Object.keys(venueTierQuantities).length === 0) {
                setVenueTierQuantities({ [tiers[0].id]: 1 });
              }
              setShowVenueSaleModal(true);
            }}
            className="inline-flex items-center justify-center gap-2 px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer shadow-xs min-h-[44px]"
          >
            <Share2 className="w-4 h-4 text-white" />
            <span>Venta y Envío a WhatsApp</span>
          </button>

          {isAdmin ? (
            <button
              type="button"
              onClick={handleOpenAdd}
              className="inline-flex items-center justify-center gap-2 px-3.5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer shadow-xs min-h-[44px]"
            >
              <Plus className="w-4 h-4 text-emerald-400" />
              <span>Nuevo Tipo de Entrada</span>
            </button>
          ) : (
            <div className="text-xs text-slate-500 bg-slate-100 px-3 py-2 rounded-lg border border-slate-200">
              Estación: Control y Venta
            </div>
          )}
        </div>
      </div>

      {/* KPI Bar */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-3 sm:p-4 shadow-xs">
          <div className="text-xs text-slate-500 flex items-center justify-between">
            <span>Total Espectadores</span>
            <Users className="w-4 h-4 text-slate-400" />
          </div>
          <div className="mt-1.5 text-xl sm:text-2xl font-bold font-mono-tabular text-slate-900">
            {totalSpectators}
          </div>
          <div className="mt-0.5 text-[10px] text-slate-400">
            Asistentes en puerta
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3 sm:p-4 shadow-xs">
          <div className="text-xs text-slate-500 flex items-center justify-between">
            <span>Adultos y VIP</span>
            <Ticket className="w-4 h-4 text-slate-600" />
          </div>
          <div className="mt-1.5 text-xl sm:text-2xl font-bold font-mono-tabular text-slate-900">
            {totalAdultsAndVip}
          </div>
          <div className="mt-0.5 text-[10px] text-slate-400">
            Boletos pagados
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3 sm:p-4 shadow-xs">
          <div className="text-xs text-slate-500 flex items-center justify-between">
            <span>Niños / Menores</span>
            <Baby className="w-4 h-4 text-blue-600" />
          </div>
          <div className="mt-1.5 text-xl sm:text-2xl font-bold font-mono-tabular text-blue-700">
            {totalChildren}
          </div>
          <div className="mt-0.5 text-[10px] text-slate-400">
            Tarifa infantil
          </div>
        </div>

        <div className="bg-white border border-emerald-200 rounded-xl p-3 sm:p-4 shadow-xs bg-emerald-50/30">
          <div className="text-xs text-emerald-800 font-semibold flex items-center justify-between">
            <span>Entradas Gratis</span>
            <Gift className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-1.5 text-xl sm:text-2xl font-bold font-mono-tabular text-emerald-700">
            {totalFree}
          </div>
          <div className="mt-0.5 text-[10px] text-emerald-600">
            Cortesías e invitados
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3 sm:p-4 shadow-xs col-span-2 lg:col-span-1">
          <div className="text-xs text-slate-500 flex items-center justify-between">
            <span>Total Recaudado</span>
            <Sparkles className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-1.5 text-xl sm:text-2xl font-bold font-mono-tabular text-emerald-700">
            S/ {totalRevenue.toFixed(2)}
          </div>
          <div className="mt-0.5 text-[10px] text-slate-400">
            Taquilla acumulada
          </div>
        </div>
      </div>

      {/* Escáner Directo de Boletos */}
      <div className="bg-[#0A192F] text-white border-2 border-red-600 rounded-xl p-4 sm:p-5 shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-3">
          <div className="flex items-center gap-2">
            <ScanLine className="w-5 h-5 text-red-500 shrink-0" />
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white font-display">
                Escaneo Rápido de Boletos en Puerta
              </h2>
              <p className="text-[11px] text-slate-300">
                Pasa el lector láser o usa la cámara del celular
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowCameraScanner(true)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg cursor-pointer transition-colors shadow-sm min-h-[44px] shrink-0 active:scale-95"
          >
            <Camera className="w-4 h-4 text-white" />
            Escanear con Cámara
          </button>
        </div>

        <form onSubmit={handleDirectTicketScan} className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <QrCode className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={ticketScanCode}
              onChange={(e) => setTicketScanCode(e.target.value)}
              placeholder="Escanea el boleto QR o ingresa código..."
              className="w-full pl-9 pr-3 py-2.5 text-sm font-mono-tabular bg-slate-900 text-white placeholder:text-slate-500 border border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-slate-900 px-3 py-2 rounded-lg border border-slate-700 text-xs shrink-0">
              <span className="text-slate-400 text-[11px]">Cant:</span>
              <input
                type="number"
                min={1}
                max={50}
                value={ticketScanQty}
                onChange={(e) => setTicketScanQty(Math.max(1, Number(e.target.value) || 1))}
                className="w-10 text-center font-mono-tabular bg-transparent text-white font-bold focus:outline-none"
              />
            </div>

            <button
              type="submit"
              className="flex-1 sm:flex-none px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer shadow-sm flex items-center justify-center gap-2 min-h-[44px]"
            >
              <CheckCircle2 className="w-4 h-4" />
              Validar Entrada
            </button>
          </div>
        </form>
      </div>

      {/* Tarjetas de Boletos QR */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {tiers.map((tier) => {
          const qty = quantities[tier.id] || 1;
          const matchingEntries = entries.filter((e) => e.qrCode === tier.qrCode || e.ticketType === tier.type);
          const tierCount = matchingEntries.reduce((acc, e) => acc + e.quantity, 0);
          const tierRevenue = matchingEntries.reduce((acc, e) => acc + e.totalAmount, 0);

          return (
            <div
              key={tier.id}
              className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 flex flex-col justify-between space-y-4 shadow-xs hover:border-slate-300 transition-colors"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="text-[11px] font-mono-tabular font-semibold text-slate-500 uppercase tracking-tight">
                      {tier.isChild ? 'Categoría Niño / Menor' : 'Categoría General'}
                    </span>
                    <h2 className="text-base sm:text-lg font-bold text-slate-900 mt-0.5">
                      {tier.label}
                    </h2>
                  </div>

                  {isAdmin && (
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(tier)}
                        className="p-1.5 text-slate-400 hover:text-slate-900 rounded-md hover:bg-slate-100 transition-colors cursor-pointer"
                        title="Editar precio y descripción"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      {tiers.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleDelete(tier)}
                          className="p-1.5 text-slate-400 hover:text-red-600 rounded-md hover:bg-red-50 transition-colors cursor-pointer"
                          title="Eliminar tarifa"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  )}
                </div>

                <p className="text-xs text-slate-500 mt-1 min-h-[30px]">{tier.description}</p>

                <div className="mt-3 flex justify-center py-2 bg-slate-50/70 rounded-lg border border-slate-100">
                  <QrCodeImage value={tier.qrCode} size={90} label={tier.label} showDownload />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-600">Precio actual:</span>
                  <span className="text-base font-bold font-mono-tabular text-slate-900">
                    S/ {tier.price.toFixed(2)}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-500 font-mono-tabular">
                  <span>Registrados: {tierCount}</span>
                  <span>Recaudado: S/ {tierRevenue.toFixed(2)}</span>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={qty}
                    onChange={(e) =>
                      setQuantities((prev) => ({
                        ...prev,
                        [tier.id]: Math.max(1, Number(e.target.value) || 1),
                      }))
                    }
                    aria-label={`Cantidad boletos ${tier.label}`}
                    className="w-16 px-2.5 py-2 text-sm font-mono-tabular text-center border border-slate-300 rounded-lg bg-white text-slate-900 min-h-[44px]"
                  />
                  <button
                    type="button"
                    onClick={() => onRegisterSpectator(tier.type, qty)}
                    className="flex-1 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg transition-colors whitespace-nowrap cursor-pointer shadow-xs min-h-[44px] flex items-center justify-center text-center"
                  >
                    Registrar (S/ {(tier.price * qty).toFixed(2)})
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Resumen Consolidado de Conteo por Tipo de Entrada */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs w-full max-w-full">
        <div className="px-4 sm:px-5 py-3.5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-slate-900">
              Conteo Consolidado por Tipo de Entrada
            </h3>
            <p className="text-[11px] sm:text-xs text-slate-500">
              Total acumulado según modalidad de boletos y pases de cortesía
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              {totalSpectators} espectadores presentes
            </span>
          </div>
        </div>

        {/* Tarjetas Móviles y Cuadrícula (sm:hidden) */}
        <div className="sm:hidden p-3.5 space-y-3">
          {tiers.map((tier) => {
            const tierCount = entries
              .filter((e) => e.ticketType === tier.type || e.label === tier.label)
              .reduce((acc, e) => acc + e.quantity, 0);
            const tierRevenue = entries
              .filter((e) => e.ticketType === tier.type || e.label === tier.label)
              .reduce((acc, e) => acc + e.totalAmount, 0);
            const isGratis = tier.type === 'GRATIS' || tier.price === 0;

            return (
              <div
                key={tier.id}
                className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/50 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-slate-900"></span>
                    <span className="font-bold text-slate-900 text-sm">{tier.label}</span>
                  </div>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-200/60 text-slate-700 font-semibold">
                    {tier.qrCode}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-1 border-t border-slate-200/60 text-center">
                  <div className="bg-white p-2 rounded border border-slate-100">
                    <span className="block text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Tarifa</span>
                    <span className="text-xs font-bold text-slate-800">
                      {isGratis ? 'GRATIS' : `S/ ${tier.price.toFixed(2)}`}
                    </span>
                  </div>
                  <div className="bg-white p-2 rounded border border-slate-100">
                    <span className="block text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Entradas</span>
                    <span className="text-base font-bold text-slate-900 font-mono-tabular">
                      {tierCount}
                    </span>
                  </div>
                  <div className="bg-white p-2 rounded border border-slate-100">
                    <span className="block text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Total</span>
                    <span className="text-xs font-bold text-emerald-700 font-mono-tabular">
                      S/ {tierRevenue.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}

          <div className="p-3 bg-slate-900 text-white rounded-lg flex items-center justify-between text-xs font-bold">
            <span>TOTAL GENERAL RECAUDADO</span>
            <span className="font-mono-tabular text-sm text-emerald-400">
              S/ {totalRevenue.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Tabla Desktop (hidden sm:block) */}
        <div className="hidden sm:block overflow-x-auto w-full">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-5">Tipo de Entrada / Modalidad</th>
                <th className="py-3 px-4">Código QR</th>
                <th className="py-3 px-4 text-center">Clasificación</th>
                <th className="py-3 px-4 text-right">Precio Unitario</th>
                <th className="py-3 px-4 text-right">Cantidad de Boletos</th>
                <th className="py-3 px-5 text-right">Total Recaudado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {tiers.map((tier) => {
                const tierCount = entries
                  .filter((e) => e.ticketType === tier.type || e.label === tier.label)
                  .reduce((acc, e) => acc + e.quantity, 0);
                const tierRevenue = entries
                  .filter((e) => e.ticketType === tier.type || e.label === tier.label)
                  .reduce((acc, e) => acc + e.totalAmount, 0);
                const isGratis = tier.type === 'GRATIS' || tier.price === 0;

                return (
                  <tr key={tier.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-5 font-semibold text-slate-900 flex items-center gap-2">
                      <Ticket className="w-4 h-4 text-slate-500" />
                      {tier.label}
                    </td>
                    <td className="py-3 px-4 font-mono-tabular text-xs font-medium text-slate-600">
                      {tier.qrCode}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {isGratis ? (
                        <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                          Cortesía / Gratis
                        </span>
                      ) : tier.isChild ? (
                        <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Menor / Niño
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                          General
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right font-mono-tabular text-slate-700 font-medium">
                      {isGratis ? 'S/ 0.00' : `S/ ${tier.price.toFixed(2)}`}
                    </td>
                    <td className="py-3 px-4 text-right font-mono-tabular font-bold text-slate-900 text-base">
                      {tierCount}
                    </td>
                    <td className="py-3 px-5 text-right font-mono-tabular font-bold text-emerald-700">
                      S/ {tierRevenue.toFixed(2)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-slate-300 bg-slate-100/70 font-bold text-sm text-slate-900">
                <td colSpan={4} className="py-3 px-5 uppercase tracking-wide">
                  Totales Generales de Taquilla
                </td>
                <td className="py-3 px-4 text-right font-mono-tabular text-base text-slate-900">
                  {totalSpectators}
                </td>
                <td className="py-3 px-5 text-right font-mono-tabular text-base text-emerald-700">
                  S/ {totalRevenue.toFixed(2)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Modal Editar Entrada (Solo Administrador) */}
      {editingTier && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 space-y-4 border border-slate-200 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">Editar Tarifa de Entrada</h3>
              <button
                type="button"
                onClick={() => setEditingTier(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nombre del Boleto
                </label>
                <input
                  type="text"
                  required
                  value={editLabel}
                  onChange={(e) => setEditLabel(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Precio (S/)
                </label>
                <input
                  type="number"
                  required
                  min={0}
                  step={0.5}
                  value={editPrice}
                  onChange={(e) => setEditPrice(Math.max(0, Number(e.target.value) || 0))}
                  className="w-full px-3 py-2 text-sm font-mono-tabular border border-slate-300 rounded-lg bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Descripción
                </label>
                <textarea
                  rows={2}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingTier(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 cursor-pointer shadow-xs"
                >
                  Guardar Tarifa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Crear Tarifa (Solo Administrador) */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 space-y-4 border border-slate-200 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">Crear Nueva Tarifa de Entrada</h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAdd} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nombre del Boleto *
                </label>
                <input
                  type="text"
                  required
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  placeholder="Ej: Entrada Preferencial Palco"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Precio del Boleto (S/) *
                </label>
                <input
                  type="number"
                  required
                  min={0}
                  step={0.5}
                  value={newPrice}
                  onChange={(e) => setNewPrice(Math.max(0, Number(e.target.value) || 0))}
                  className="w-full px-3 py-2 text-sm font-mono-tabular border border-slate-300 rounded-lg bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div className="space-y-2 pt-1">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="is-child-box"
                    checked={newIsChild}
                    onChange={(e) => {
                      setNewIsChild(e.target.checked);
                      if (e.target.checked) setNewIsGratis(false);
                    }}
                    className="w-4 h-4 rounded text-emerald-600 border-slate-300 focus:ring-emerald-500"
                  />
                  <label htmlFor="is-child-box" className="text-xs font-medium text-slate-700">
                    Es boleto para niños (contabilizar en estadísticas infantiles)
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="is-gratis-box"
                    checked={newIsGratis}
                    onChange={(e) => {
                      setNewIsGratis(e.target.checked);
                      if (e.target.checked) {
                        setNewPrice(0);
                        setNewIsChild(false);
                      }
                    }}
                    className="w-4 h-4 rounded text-blue-600 border-slate-300 focus:ring-blue-500"
                  />
                  <label htmlFor="is-gratis-box" className="text-xs font-semibold text-blue-900">
                    Entrada Gratis / Cortesía (Costo S/ 0.00 - Invitados y Prensa)
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Descripción
                </label>
                <textarea
                  rows={2}
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Detalles sobre tribuna o acceso..."
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 cursor-pointer shadow-xs"
                >
                  Guardar y Generar QR
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Modal de Escaneo con Cámara en Vivo */}
      <CameraQrModal
        isOpen={showCameraScanner}
        onClose={() => setShowCameraScanner(false)}
        onScan={(code) => {
          const clean = code.trim().toUpperCase();
          const foundTier = tiers.find(
            (t) => t.qrCode.toUpperCase() === clean || t.type.toUpperCase() === clean
          );
          if (foundTier) {
            onRegisterSpectator(foundTier.type, ticketScanQty);
          } else {
            onRegisterSpectator('ADULTO', ticketScanQty);
          }
        }}
        title="Escáner de Boletos y Entradas"
        subtitle="Enfoca el boleto QR del espectador"
        scanCategory="ESPECTADOR"
      />

      {/* Modal Venta en Puerta con Envío Inmediato a WhatsApp */}
      {showVenueSaleModal && (
        <div className="fixed inset-0 z-50 bg-[#0A192F]/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl p-5 space-y-4 my-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#25D366]/10 flex items-center justify-center">
                  <Share2 className="w-4 h-4 text-[#25D366]" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 font-display">
                    Venta en Puerta con Envío a WhatsApp
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Genera el QR oficial y envíalo al WhatsApp del cliente
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowVenueSaleModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleVenueSaleSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Nombre Completo del Cliente *
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={venueBuyerName}
                  onChange={(e) => setVenueBuyerName(e.target.value)}
                  placeholder="Ej: Roberto Quispe"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0A192F]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Número de WhatsApp del Cliente *
                </label>
                <input
                  type="tel"
                  required
                  value={venueBuyerPhone}
                  onChange={(e) => setVenueBuyerPhone(e.target.value)}
                  placeholder="Ej: 987654321"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl font-mono focus:outline-none focus:ring-2 focus:ring-[#0A192F]"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-[11px] font-bold text-slate-700">
                    Selección de Boletos (Combina varios tipos):
                  </label>
                  <span className="text-[10px] text-slate-400 font-medium">
                    {totalVenueQty} seleccionados
                  </span>
                </div>

                <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                  {tiers.map((t) => {
                    const qty = venueTierQuantities[t.id] || 0;
                    return (
                      <div
                        key={t.id}
                        className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 transition-all ${
                          qty > 0 ? 'border-[#0A192F] bg-blue-50/30' : 'border-slate-200 bg-white'
                        }`}
                      >
                        <div className="min-w-0">
                          <span className="text-xs font-bold text-slate-900 block truncate">
                            {t.label}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono">
                            S/ {t.price.toFixed(2)} c/u
                          </span>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <div className="text-right mr-1">
                            <span className="text-xs font-bold font-mono text-slate-900 block">
                              S/ {(qty * t.price).toFixed(2)}
                            </span>
                          </div>

                          <div className="flex items-center gap-1 bg-white border border-slate-300 rounded-lg p-0.5 shadow-2xs">
                            <button
                              type="button"
                              onClick={() =>
                                setVenueTierQuantities((prev) => ({
                                  ...prev,
                                  [t.id]: Math.max(0, (prev[t.id] || 0) - 1),
                                }))
                              }
                              disabled={qty === 0}
                              className="w-6 h-6 rounded bg-slate-100 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center text-slate-700 font-bold text-xs cursor-pointer"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="w-6 text-center font-bold text-xs font-mono text-slate-900">
                              {qty}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                setVenueTierQuantities((prev) => ({
                                  ...prev,
                                  [t.id]: Math.min(50, (prev[t.id] || 0) + 1),
                                }))
                              }
                              className="w-6 h-6 rounded bg-[#0A192F] hover:bg-slate-800 text-white flex items-center justify-center font-bold text-xs cursor-pointer"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Totalizador de Taquilla */}
                <div className="bg-slate-900 text-white p-2.5 rounded-xl flex items-center justify-between text-xs">
                  <div>
                    <span className="text-slate-300 block text-[10px] font-semibold uppercase">Total Entradas</span>
                    <span className="font-bold">{totalVenueQty} personas</span>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-300 block text-[10px] font-semibold uppercase">Total a Cobrar</span>
                    <span className="font-extrabold text-sm font-mono text-emerald-400">
                      S/ {totalVenueAmount.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Método de Pago Recibido:
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setVenuePaymentMethod('EFECTIVO_PUERTA')}
                    className={`py-1.5 px-2 rounded-lg border text-center font-bold text-[11px] cursor-pointer ${
                      venuePaymentMethod === 'EFECTIVO_PUERTA'
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-slate-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    Efectivo
                  </button>
                  <button
                    type="button"
                    onClick={() => setVenuePaymentMethod('YAPE')}
                    className={`py-1.5 px-2 rounded-lg border text-center font-bold text-[11px] cursor-pointer ${
                      venuePaymentMethod === 'YAPE'
                        ? 'bg-[#742384] text-white border-[#742384]'
                        : 'bg-slate-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    Yape
                  </button>
                  <button
                    type="button"
                    onClick={() => setVenuePaymentMethod('PLIN')}
                    className={`py-1.5 px-2 rounded-lg border text-center font-bold text-[11px] cursor-pointer ${
                      venuePaymentMethod === 'PLIN'
                        ? 'bg-[#00D4B2] text-slate-900 border-[#00D4B2]'
                        : 'bg-slate-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    Plin
                  </button>
                </div>
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowVenueSaleModal(false)}
                  className="flex-1 py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={totalVenueQty === 0}
                  className={`flex-2 py-2.5 px-3 rounded-xl shadow-md flex items-center justify-center gap-1.5 text-xs font-bold ${
                    totalVenueQty === 0
                      ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                      : 'bg-[#25D366] hover:bg-[#20bd5a] text-white cursor-pointer'
                  }`}
                >
                  <Share2 className="w-4 h-4" />
                  <span>
                    {totalVenueQty === 0
                      ? 'Selecciona entradas'
                      : `Cobrar S/ ${totalVenueAmount.toFixed(2)} y WhatsApp`}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tarjeta Visual de Boleto Recién Vendido */}
      {lastSoldTicket && tournament && systemConfig && (
        <div className="fixed inset-0 z-50 bg-[#0A192F]/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <DigitalTicketCard
            ticket={lastSoldTicket}
            tournament={tournament}
            systemConfig={systemConfig}
            onClose={() => setLastSoldTicket(null)}
          />
        </div>
      )}
    </div>
  );
};
