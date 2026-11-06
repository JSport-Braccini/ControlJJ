import React, { useState } from 'react';
import {
  Download,
  Users,
  Ticket,
  CupSoda,
  DollarSign,
  Trophy,
  ShieldAlert,
  Calendar,
  MapPin,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  ShieldCheck,
  Receipt,
  FileSpreadsheet,
  RotateCcw,
  X,
  AlertTriangle,
  UserCheck,
} from 'lucide-react';
import {
  Tournament,
  Player,
  SpectatorTier,
  SpectatorEntry,
  BeverageProduct,
  BeverageSale,
  ExpenseItem,
  ScanFeedback,
  UserRole,
} from '../types/championship';

interface SummaryDashboardProps {
  tournament: Tournament;
  players: Player[];
  spectatorTiers: SpectatorTier[];
  spectatorEntries: SpectatorEntry[];
  beverages: BeverageProduct[];
  beverageSales: BeverageSale[];
  expenses?: ExpenseItem[];
  lastFeedback?: ScanFeedback | null;
  currentUserRole: UserRole;
  currentUserName: string;
  connectedClientsCount?: number;
  onQuickScan?: (qrCode: string, quantity?: number) => void;
  onGoToPlayers: () => void;
  onGoToSpectators: () => void;
  onGoToBeverages: () => void;
  onGoToExpenses: () => void;
  onGoToReport: () => void;
  onGoToTournaments: () => void;
  onResetAllData?: () => void;
}

export const SummaryDashboard: React.FC<SummaryDashboardProps> = ({
  tournament,
  players,
  spectatorTiers,
  spectatorEntries,
  beverages,
  beverageSales,
  expenses = [],
  lastFeedback,
  currentUserRole,
  currentUserName,
  connectedClientsCount = 1,
  onGoToPlayers,
  onGoToSpectators,
  onGoToBeverages,
  onGoToExpenses,
  onGoToReport,
  onGoToTournaments,
  onResetAllData,
}) => {
  const [showResetModal, setShowResetModal] = useState(false);
  const [confirmPhrase, setConfirmPhrase] = useState('');

  const isAdmin = currentUserRole === 'ADMIN';
  const isPlayersUser = currentUserRole === 'CONTROL_JUGADORES';
  const isSpectatorsUser = currentUserRole === 'CONTROL_ESPECTADORES';
  const isBeveragesUser = currentUserRole === 'CONTROL_BEBIDAS';

  // Cálculos de Jugadores
  const totalPlayers = players.length;
  const checkedInPlayers = players.filter((p) => p.checkedIn).length;
  const pendingPlayers = totalPlayers - checkedInPlayers;
  const totalDuplicateAttempts = players.reduce(
    (acc, p) => acc + p.duplicateAttempts,
    0
  );
  const attendancePct =
    totalPlayers > 0 ? Math.round((checkedInPlayers / totalPlayers) * 100) : 0;

  // Cálculos de Espectadores
  const totalSpectatorsCount = spectatorEntries.reduce(
    (acc, e) => acc + e.quantity,
    0
  );
  const totalChildrenCount = spectatorEntries
    .filter((e) => e.isChild)
    .reduce((acc, e) => acc + e.quantity, 0);

  const totalAdultsCount = spectatorEntries
    .filter((e) => e.ticketType === 'ADULTO')
    .reduce((acc, e) => acc + e.quantity, 0);

  const totalVipCount = spectatorEntries
    .filter((e) => e.ticketType === 'VIP')
    .reduce((acc, e) => acc + e.quantity, 0);

  const totalTicketRevenue = spectatorEntries.reduce(
    (acc, e) => acc + e.totalAmount,
    0
  );

  const ticketBreakdown = spectatorTiers.map((tier) => {
    const matching = spectatorEntries.filter(
      (e) => e.ticketType === tier.type || e.qrCode === tier.qrCode
    );
    const qty = matching.reduce((acc, e) => acc + e.quantity, 0);
    const revenue = matching.reduce((acc, e) => acc + e.totalAmount, 0);
    return { ...tier, qty, revenue };
  });

  // Cálculos de Bebidas
  const totalBeverageUnits = beverages.reduce((acc, b) => acc + b.soldCount, 0);
  const totalBeverageRevenue = beverages.reduce(
    (acc, b) => acc + b.soldCount * b.price,
    0
  );

  const totalExpenses = (expenses || []).reduce((acc, e) => acc + e.amount, 0);
  const grandTotalRevenue = totalTicketRevenue + totalBeverageRevenue;
  const netProfit = grandTotalRevenue - totalExpenses;

  const handleExportCsv = () => {
    const lines: string[] = [
      `REPORTE OFICIAL DEL TORNEO - ${tournament.name.toUpperCase()}`,
      `Sede: ${tournament.venue} | Fecha: ${tournament.date} | Edicion: ${tournament.edition}`,
      `Generado: ${new Date().toLocaleString('es-PE')}`,
      '',
      'RESUMEN FINANCIERO Y RESULTADO GENERAL',
      `Ingresos por Taquilla / Boletos (S/),${totalTicketRevenue.toFixed(2)}`,
      `Ingresos por Venta de Bebidas (S/),${totalBeverageRevenue.toFixed(2)}`,
      `Ingresos Brutos Totales (S/),${grandTotalRevenue.toFixed(2)}`,
      `Gastos Generales Operativos (S/),${totalExpenses.toFixed(2)}`,
      `RESULTADO NETO / UTILIDAD (S/),${netProfit.toFixed(2)}`,
      '',
      'CONTROL DE ESPECTADORES Y BOLETERIA',
      'Tipo de Entrada,Tarifa Unitaria (S/),Personas Ingresadas,Subtotal (S/)',
      ...ticketBreakdown.map(
        (t) => `"${t.label}",${t.price.toFixed(2)},${t.qty},${t.revenue.toFixed(2)}`
      ),
      `Total Niños / Menores,,${totalChildrenCount},`,
      `Total General Adultos,,${totalAdultsCount},`,
      `Total Preferencial VIP,,${totalVipCount},`,
      `Total General Espectadores,,${totalSpectatorsCount},${totalTicketRevenue.toFixed(2)}`,
      '',
      'CONTROL DE VENTAS DE BEBIDAS',
      'Producto,Presentacion,Precio (S/),Unidades Vendidas,Stock Disponible,Subtotal (S/)',
      ...beverages.map(
        (b) =>
          `"${b.name}","${b.presentation}",${b.price.toFixed(2)},${b.soldCount},${b.stock},${(
            b.soldCount * b.price
          ).toFixed(2)}`
      ),
      '',
      'GASTOS GENERALES REGISTRADOS',
      'Fecha,Categoria,Concepto,Monto (S/),Notas/Referencia',
      ...(expenses || []).map(
        (exp) =>
          `"${exp.date}","${exp.category}","${exp.concept}",${exp.amount.toFixed(2)},"${exp.notes || '-'}"`
      ),
      '',
      'CONTROL DE ASISTENCIA DE JUGADORES',
      'Codigo QR,Nombre,Equipo,Dorsal,Estado,Hora Ingreso,Intentos Duplicados Bloqueados',
      ...players.map(
        (p) =>
          `${p.qrCode},"${p.name}","${p.team}",${p.jerseyNumber},${
            p.checkedIn ? 'PRESENTE' : 'PENDIENTE'
          },${p.checkInTime || '-'},${p.duplicateAttempts}`
      ),
    ];

    const blob = new Blob(['\uFEFF' + lines.join('\n')], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Reporte_${tournament.name.replace(/\s+/g, '_')}_${tournament.date}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Feedback del último escaneo (notificación discreta si hubo escaneo en el sistema) */}
      {lastFeedback && (
        <div
          className={`p-3 rounded-xl border flex items-start gap-2.5 text-xs ${
            lastFeedback.status === 'duplicate'
              ? 'bg-red-950/80 border-red-500 text-red-100'
              : lastFeedback.status === 'success'
              ? 'bg-emerald-950/80 border-emerald-500 text-emerald-100'
              : 'bg-amber-950/80 border-amber-500 text-amber-100'
          }`}
        >
          <div className="shrink-0 mt-0.5">
            {lastFeedback.status === 'duplicate' ? (
              <ShieldAlert className="w-4 h-4 text-red-400" />
            ) : lastFeedback.status === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            ) : (
              <AlertCircle className="w-4 h-4 text-amber-400" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <span className="font-bold tracking-tight">{lastFeedback.title}</span> — {lastFeedback.message}
          </div>
          <span className="text-[10px] font-mono-tabular opacity-75 shrink-0">
            {lastFeedback.timestamp}
          </span>
        </div>
      )}

      {/* MENÚ PRINCIPAL CON ÍCONOS PARA INGRESAR DIRECTAMENTE */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/90">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse"></span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 font-mono">
                Panel de Administración General
              </span>
            </div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900 font-display mt-0.5">
              Estaciones Operativas del Torneo
            </h2>
            <p className="text-xs text-slate-500">
              Acceso rápido a las estaciones de control, finanzas y reportes consolidados
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {isAdmin && (
              <>
                <button
                  type="button"
                  onClick={handleExportCsv}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl cursor-pointer flex items-center gap-1.5 shadow-2xs hover:shadow-xs transition-all"
                >
                  <Download className="w-3.5 h-3.5 text-slate-500" />
                  <span className="hidden sm:inline">Exportar CSV</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setConfirmPhrase('');
                    setShowResetModal(true);
                  }}
                  className="px-3.5 py-2 text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-xl cursor-pointer flex items-center gap-1.5 shadow-2xs hover:shadow-xs transition-all"
                  title="Restablecer todos los contadores del sistema a cero"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-red-600" />
                  <span>Restablecer a Cero</span>
                </button>
              </>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3.5 mt-3.5">
          {/* Módulo Jugadores */}
          <button
            type="button"
            onClick={onGoToPlayers}
            className="bg-white hover:bg-slate-50/80 border border-slate-200/90 hover:border-blue-500/80 rounded-2xl p-3.5 sm:p-4 text-left transition-all duration-200 shadow-2xs hover:shadow-md hover:-translate-y-0.5 group cursor-pointer flex flex-col justify-between"
          >
            <div className="flex items-center justify-between">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-blue-50 text-blue-800 border border-blue-200/60 flex items-center justify-center font-bold group-hover:scale-105 transition-transform">
                <Users className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-300 group-hover:text-blue-700 group-hover:translate-x-0.5 transition-all" />
            </div>
            <div className="mt-3">
              <h3 className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-blue-900 truncate">
                Control Jugadores
              </h3>
              <p className="text-[10px] sm:text-xs text-slate-500 mt-0.5 truncate font-medium">
                {checkedInPlayers} de {totalPlayers} presentes
              </p>
            </div>
          </button>

          {/* Módulo Espectadores */}
          <button
            type="button"
            onClick={onGoToSpectators}
            className="bg-white hover:bg-slate-50/80 border border-slate-200/90 hover:border-emerald-500/80 rounded-2xl p-3.5 sm:p-4 text-left transition-all duration-200 shadow-2xs hover:shadow-md hover:-translate-y-0.5 group cursor-pointer flex flex-col justify-between"
          >
            <div className="flex items-center justify-between">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200/60 flex items-center justify-center font-bold group-hover:scale-105 transition-transform">
                <Ticket className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-300 group-hover:text-emerald-700 group-hover:translate-x-0.5 transition-all" />
            </div>
            <div className="mt-3">
              <h3 className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-emerald-900 truncate">
                Control Espectadores
              </h3>
              <p className="text-[10px] sm:text-xs text-slate-500 mt-0.5 font-mono-tabular truncate font-medium">
                {totalSpectatorsCount} boletos (S/ {totalTicketRevenue.toFixed(0)})
              </p>
            </div>
          </button>

          {/* Módulo Bebidas */}
          <button
            type="button"
            onClick={onGoToBeverages}
            className="bg-white hover:bg-slate-50/80 border border-slate-200/90 hover:border-amber-500/80 rounded-2xl p-3.5 sm:p-4 text-left transition-all duration-200 shadow-2xs hover:shadow-md hover:-translate-y-0.5 group cursor-pointer flex flex-col justify-between"
          >
            <div className="flex items-center justify-between">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-amber-50 text-amber-800 border border-amber-200/60 flex items-center justify-center font-bold group-hover:scale-105 transition-transform">
                <CupSoda className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-300 group-hover:text-amber-700 group-hover:translate-x-0.5 transition-all" />
            </div>
            <div className="mt-3">
              <h3 className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-amber-900 truncate">
                Control Bebidas
              </h3>
              <p className="text-[10px] sm:text-xs text-slate-500 mt-0.5 font-mono-tabular truncate font-medium">
                {totalBeverageUnits} ventas (S/ {totalBeverageRevenue.toFixed(0)})
              </p>
            </div>
          </button>

          {/* Módulo Gastos Generales */}
          <button
            type="button"
            onClick={onGoToExpenses}
            className="bg-white hover:bg-slate-50/80 border border-slate-200/90 hover:border-rose-500/80 rounded-2xl p-3.5 sm:p-4 text-left transition-all duration-200 shadow-2xs hover:shadow-md hover:-translate-y-0.5 group cursor-pointer flex flex-col justify-between"
          >
            <div className="flex items-center justify-between">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-rose-50 text-rose-700 border border-rose-200/60 flex items-center justify-center font-bold group-hover:scale-105 transition-transform">
                <Receipt className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-300 group-hover:text-rose-700 group-hover:translate-x-0.5 transition-all" />
            </div>
            <div className="mt-3">
              <h3 className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-rose-900 truncate">
                Gastos Generales
              </h3>
              <p className="text-[10px] sm:text-xs text-rose-600 mt-0.5 font-mono-tabular font-semibold truncate">
                S/ {totalExpenses.toFixed(0)} ({expenses.length} reg.)
              </p>
            </div>
          </button>

          {/* Módulo Reporte General */}
          <button
            type="button"
            onClick={onGoToReport}
            className="bg-white hover:bg-slate-50/80 border border-slate-200/90 hover:border-indigo-500/80 rounded-2xl p-3.5 sm:p-4 text-left transition-all duration-200 shadow-2xs hover:shadow-md hover:-translate-y-0.5 group cursor-pointer flex flex-col justify-between"
          >
            <div className="flex items-center justify-between">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-200/60 flex items-center justify-center font-bold group-hover:scale-105 transition-transform">
                <FileSpreadsheet className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-300 group-hover:text-indigo-700 group-hover:translate-x-0.5 transition-all" />
            </div>
            <div className="mt-3">
              <h3 className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-indigo-900 truncate">
                Reporte General
              </h3>
              <p className="text-[10px] sm:text-xs text-slate-500 mt-0.5 font-mono-tabular truncate font-medium">
                Balance & Utilidad
              </p>
            </div>
          </button>

          {/* Módulo Torneos */}
          <button
            type="button"
            onClick={onGoToTournaments}
            className="bg-white hover:bg-slate-50/80 border border-slate-200/90 hover:border-red-500/80 rounded-2xl p-3.5 sm:p-4 text-left transition-all duration-200 shadow-2xs hover:shadow-md hover:-translate-y-0.5 group cursor-pointer flex flex-col justify-between"
          >
            <div className="flex items-center justify-between">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-red-50 text-red-700 border border-red-200/60 flex items-center justify-center font-bold group-hover:scale-105 transition-transform">
                <Trophy className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-300 group-hover:text-red-700 group-hover:translate-x-0.5 transition-all" />
            </div>
            <div className="mt-3">
              <h3 className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-red-900 truncate">
                Gestión Torneos
              </h3>
              <p className="text-[10px] sm:text-xs text-slate-500 mt-0.5 truncate font-medium">
                {tournament.name}
              </p>
            </div>
          </button>
        </div>
      </div>

      {/* 2. VISUALIZACIÓN DE TOTALES SEGÚN EL ROL DEL USUARIO */}
      {/* ========================================================================= */}

      {/* CASO A: USUARIO ADMINISTRADOR -> VE TODOS LOS TOTALES DETALLADOS */}
      {isAdmin && (
        <div className="space-y-4 sm:space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pb-1 border-b border-slate-200/70">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700 font-mono flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-slate-900"></span>
              Balance Financiero y Operativo Oficial
            </span>
            <span className="text-[11px] text-slate-500 font-mono">
              JJ Executive Sports · Sincronizado en Vivo
            </span>
          </div>

          {/* KPI Strip 4 Columnas (Utilidad Neta, Ingresos, Gastos, Jugadores) */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {/* 1. Utilidad Neta / Resultado General */}
            <div className={`border-2 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col justify-between min-h-[120px] sm:min-h-[140px] transition-all ${
              netProfit >= 0
                ? 'bg-gradient-to-br from-emerald-50/90 to-white border-emerald-300/80 shadow-emerald-50'
                : 'bg-gradient-to-br from-red-50/90 to-white border-red-300/80 shadow-red-50'
            }`}>
              <div>
                <div className="text-[11px] sm:text-xs font-bold uppercase tracking-wider flex items-center justify-between text-slate-600">
                  <span className="truncate">Resultado Neto (Utilidad)</span>
                  {netProfit >= 0 ? (
                    <TrendingUp className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <TrendingDown className="w-4 h-4 text-red-600 shrink-0" />
                  )}
                </div>
                <div className={`mt-1.5 sm:mt-2 text-xl sm:text-3xl font-extrabold font-mono-tabular tracking-tight truncate ${
                  netProfit >= 0 ? 'text-emerald-700' : 'text-red-700'
                }`}>
                  S/ {netProfit.toFixed(2)}
                </div>
              </div>
              <div className="mt-2.5 pt-2 border-t border-slate-200/60 text-[11px] text-slate-600 font-mono-tabular flex items-center justify-between truncate">
                <span className="font-semibold">{netProfit >= 0 ? 'Balance Favorable' : 'Déficit Operativo'}</span>
                <span className="text-slate-400">Neto</span>
              </div>
            </div>

            {/* 2. Ingresos Brutos */}
            <div className="bg-white border border-slate-200/90 hover:border-slate-300 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col justify-between min-h-[120px] sm:min-h-[140px] transition-all">
              <div>
                <div className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center justify-between">
                  <span className="truncate">Ingresos Brutos</span>
                  <DollarSign className="w-4 h-4 text-emerald-600 shrink-0" />
                </div>
                <div className="mt-1.5 sm:mt-2 text-xl sm:text-3xl font-extrabold font-mono-tabular text-slate-900 tracking-tight truncate">
                  S/ {grandTotalRevenue.toFixed(2)}
                </div>
              </div>
              <div className="mt-2.5 pt-2 border-t border-slate-100 text-[11px] text-slate-600 font-mono-tabular truncate">
                Taquilla S/ {totalTicketRevenue.toFixed(0)} · Bebidas S/ {totalBeverageRevenue.toFixed(0)}
              </div>
            </div>

            {/* 3. Gastos Generales */}
            <div className="bg-white border border-slate-200/90 hover:border-slate-300 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col justify-between min-h-[120px] sm:min-h-[140px] transition-all">
              <div>
                <div className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center justify-between">
                  <span className="truncate">Gastos Operativos</span>
                  <Receipt className="w-4 h-4 text-rose-600 shrink-0" />
                </div>
                <div className="mt-1.5 sm:mt-2 text-xl sm:text-3xl font-extrabold font-mono-tabular text-rose-700 tracking-tight truncate">
                  S/ {totalExpenses.toFixed(2)}
                </div>
              </div>
              <div className="mt-2.5 pt-2 border-t border-slate-100 text-[11px] text-slate-600 font-mono-tabular truncate">
                {expenses.length} egresos contabilizados
              </div>
            </div>

            {/* 4. Jugadores y Asistencia */}
            <div className="bg-white border border-slate-200/90 hover:border-slate-300 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col justify-between min-h-[120px] sm:min-h-[140px] transition-all">
              <div>
                <div className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center justify-between">
                  <span className="truncate">Asistencia Jugadores</span>
                  <Users className="w-4 h-4 text-blue-600 shrink-0" />
                </div>
                <div className="mt-1.5 sm:mt-2 text-xl sm:text-3xl font-extrabold font-mono-tabular text-slate-900 tracking-tight truncate">
                  {checkedInPlayers}/{totalPlayers}{' '}
                  <span className="text-xs sm:text-sm font-semibold text-emerald-700">
                    ({attendancePct}%)
                  </span>
                </div>
              </div>
              <div className="mt-2.5 pt-2 border-t border-slate-100 text-[11px] font-mono-tabular flex items-center justify-between truncate">
                <span className="text-slate-500 truncate">{pendingPlayers} pend.</span>
                {totalDuplicateAttempts > 0 ? (
                  <span className="text-red-600 font-bold flex items-center gap-0.5 shrink-0">
                    <ShieldAlert className="w-3.5 h-3.5" />
                    {totalDuplicateAttempts} dup
                  </span>
                ) : (
                  <span className="text-slate-400 shrink-0">{totalSpectatorsCount} espect.</span>
                )}
              </div>
            </div>
          </div>

          {/* Tablas Detalladas Exclusivas de Administrador */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Tabla Entradas */}
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs flex flex-col">
              <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Desglose Completo de Boletos de Espectadores
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Detalle financiero por tarifa y categoría
                  </p>
                </div>
                <span className="text-xs font-mono-tabular font-semibold text-slate-700">
                  {totalSpectatorsCount} personas
                </span>
              </div>

              {/* Vista Móvil Desglose Boletos (sm:hidden) */}
              <div className="sm:hidden divide-y divide-slate-100 flex-1">
                {ticketBreakdown.map((row) => (
                  <div key={row.id} className="p-3.5 space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-900">{row.label}</span>
                      <span className="font-mono-tabular font-bold text-emerald-700">
                        S/ {row.revenue.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <span>{row.isChild ? 'Menores / Niños' : row.type === 'VIP' ? 'Zona VIP' : 'General'}</span>
                      <span className="font-mono-tabular">{row.qty} asistentes (S/ {row.price.toFixed(2)} c/u)</span>
                    </div>
                  </div>
                ))}
                <div className="p-3.5 bg-slate-50 flex items-center justify-between text-xs font-bold text-slate-900">
                  <span>Total Boletos ({totalSpectatorsCount} personas)</span>
                  <span className="text-emerald-700 font-mono-tabular">S/ {totalTicketRevenue.toFixed(2)}</span>
                </div>
              </div>

              {/* Vista Desktop Desglose Boletos (hidden sm:block) */}
              <div className="hidden sm:block overflow-x-auto flex-1 w-full">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-semibold text-slate-500">
                      <th className="py-2.5 px-5">Tipo de Entrada</th>
                      <th className="py-2.5 px-3 text-right">Tarifa</th>
                      <th className="py-2.5 px-3 text-right">Personas</th>
                      <th className="py-2.5 px-5 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {ticketBreakdown.map((row) => (
                      <tr key={row.id} className="hover:bg-slate-50/70">
                        <td className="py-2.5 px-5">
                          <div className="font-medium text-slate-900 text-xs">{row.label}</div>
                          <div className="text-[11px] text-slate-400 font-mono-tabular">
                            {row.qrCode} · {row.isChild ? 'Menores / Niños' : row.type === 'VIP' ? 'Zona VIP' : 'General'}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono-tabular text-slate-600 text-xs">
                          S/ {row.price.toFixed(2)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono-tabular font-semibold text-slate-900 text-xs">
                          {row.qty}
                        </td>
                        <td className="py-2.5 px-5 text-right font-mono-tabular font-semibold text-slate-900 text-xs">
                          S/ {row.revenue.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-slate-200 bg-slate-50 text-xs font-bold text-slate-900">
                      <td className="py-2.5 px-5">
                        Total ({totalAdultsCount} Adultos · {totalChildrenCount} Niños · {totalVipCount} VIP)
                      </td>
                      <td className="py-2.5 px-3 text-right">—</td>
                      <td className="py-2.5 px-3 text-right font-mono-tabular">
                        {totalSpectatorsCount}
                      </td>
                      <td className="py-2.5 px-5 text-right font-mono-tabular text-emerald-700">
                        S/ {totalTicketRevenue.toFixed(2)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Tabla Bebidas */}
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs flex flex-col">
              <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Desglose Completo de Bebidas por QR
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Agua, Sporade, Inca Kola, Coca Cola, Volt
                  </p>
                </div>
                <span className="text-xs font-mono-tabular font-semibold text-slate-700">
                  {totalBeverageUnits} unidades
                </span>
              </div>

              {/* Vista Móvil Desglose Bebidas (sm:hidden) */}
              <div className="sm:hidden divide-y divide-slate-100 flex-1">
                {beverages.map((bev) => (
                  <div key={bev.id} className="p-3.5 space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-900">{bev.name}</span>
                      <span className="font-mono-tabular font-bold text-emerald-700">
                        S/ {(bev.soldCount * bev.price).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <span>{bev.presentation} · Stock: {bev.stock}</span>
                      <span className="font-mono-tabular">{bev.soldCount} vendidas (S/ {bev.price.toFixed(2)} c/u)</span>
                    </div>
                  </div>
                ))}
                <div className="p-3.5 bg-slate-50 flex items-center justify-between text-xs font-bold text-slate-900">
                  <span>Total Bebidas ({totalBeverageUnits} uds.)</span>
                  <span className="text-emerald-700 font-mono-tabular">S/ {totalBeverageRevenue.toFixed(2)}</span>
                </div>
              </div>

              {/* Vista Desktop Desglose Bebidas (hidden sm:block) */}
              <div className="hidden sm:block overflow-x-auto flex-1 w-full">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-semibold text-slate-500">
                      <th className="py-2.5 px-5">Bebida</th>
                      <th className="py-2.5 px-3 text-right">Precio</th>
                      <th className="py-2.5 px-3 text-right">Vendidas</th>
                      <th className="py-2.5 px-3 text-right">Stock</th>
                      <th className="py-2.5 px-5 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {beverages.map((bev) => (
                      <tr key={bev.id} className="hover:bg-slate-50/70">
                        <td className="py-2.5 px-5">
                          <div className="font-medium text-slate-900 text-xs">{bev.name}</div>
                          <div className="text-[11px] text-slate-400 font-mono-tabular">
                            {bev.qrCode} · {bev.presentation}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono-tabular text-slate-600 text-xs">
                          S/ {bev.price.toFixed(2)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono-tabular font-semibold text-slate-900 text-xs">
                          {bev.soldCount}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono-tabular text-slate-500 text-xs">
                          {bev.stock}
                        </td>
                        <td className="py-2.5 px-5 text-right font-mono-tabular font-semibold text-slate-900 text-xs">
                          S/ {(bev.soldCount * bev.price).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-slate-200 bg-slate-50 text-xs font-bold text-slate-900">
                      <td className="py-2.5 px-5">Total Bebidas</td>
                      <td className="py-2.5 px-3 text-right">—</td>
                      <td className="py-2.5 px-3 text-right font-mono-tabular">
                        {totalBeverageUnits}
                      </td>
                      <td className="py-2.5 px-3 text-right">—</td>
                      <td className="py-2.5 px-5 text-right font-mono-tabular text-emerald-700">
                        S/ {totalBeverageRevenue.toFixed(2)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>

          {/* Exportación CSV disponible para Admin */}
          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={handleExportCsv}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer shadow-xs"
            >
              <Download className="w-4 h-4 text-slate-500" />
              Exportar Reporte Financiero Completo a CSV
            </button>
          </div>
        </div>
      )}

      {/* CASO B: USUARIO CONTROL JUGADORES -> SOLO TOTALES DE JUGADORES */}
      {isPlayersUser && (
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-700 font-mono">
              Totales de tu Estación: Control de Jugadores
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white border border-blue-200 rounded-xl p-5 shadow-xs">
              <div className="text-xs font-medium text-slate-500 flex items-center justify-between">
                <span>Jugadores Presentes en Cancha</span>
                <UserCheck className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="mt-2 text-3xl font-bold font-mono-tabular text-emerald-700">
                {checkedInPlayers}{' '}
                <span className="text-sm font-semibold text-slate-500">
                  / {totalPlayers} inscritos
                </span>
              </div>
              <div className="mt-1 text-xs text-slate-500 font-mono-tabular">
                Porcentaje de asistencia: {attendancePct}%
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
              <div className="text-xs font-medium text-slate-500">
                Jugadores Pendientes de Ingreso
              </div>
              <div className="mt-2 text-3xl font-bold font-mono-tabular text-slate-900">
                {pendingPlayers}
              </div>
              <div className="mt-1 text-xs text-slate-500">
                Faltan por escanear su credencial QR
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
              <div className="text-xs font-medium text-slate-500 flex items-center justify-between">
                <span>Intentos Duplicados Bloqueados</span>
                <ShieldAlert className="w-4 h-4 text-red-500" />
              </div>
              <div className="mt-2 text-3xl font-bold font-mono-tabular text-red-600">
                {totalDuplicateAttempts}
              </div>
              <div className="mt-1 text-xs text-slate-500">
                Intentos de reingreso bloqueados por el sistema
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CASO C: USUARIO CONTROL ESPECTADORES -> TOTAL DE VENTA Y DETALLE DE NIÑO, VIP Y GENERAL */}
      {isSpectatorsUser && (
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 font-mono">
              Totales de tu Estación: Control de Espectadores y Boletos
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Venta de Boletos */}
            <div className="bg-white border border-emerald-200 rounded-xl p-5 shadow-xs">
              <div className="text-xs font-medium text-slate-500 flex items-center justify-between">
                <span>Total Ventas de Entradas</span>
                <DollarSign className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="mt-2 text-2xl font-bold font-mono-tabular text-emerald-700">
                S/ {totalTicketRevenue.toFixed(2)}
              </div>
              <div className="mt-1 text-xs text-slate-500 font-mono-tabular">
                Recaudado en taquilla de acceso
              </div>
            </div>

            {/* Total Niños */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
              <div className="text-xs font-medium text-slate-500 flex items-center justify-between">
                <span>Total de Niños / Menores</span>
                <Ticket className="w-4 h-4 text-blue-600" />
              </div>
              <div className="mt-2 text-2xl font-bold font-mono-tabular text-slate-900">
                {totalChildrenCount}{' '}
                <span className="text-xs font-normal text-slate-500">niños</span>
              </div>
              <div className="mt-1 text-xs text-slate-500 font-mono-tabular">
                Subtotal: S/{' '}
                {spectatorEntries
                  .filter((e) => e.isChild)
                  .reduce((a, b) => a + b.totalAmount, 0)
                  .toFixed(2)}
              </div>
            </div>

            {/* Total General / Adultos */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
              <div className="text-xs font-medium text-slate-500 flex items-center justify-between">
                <span>Total Entradas General</span>
                <Ticket className="w-4 h-4 text-slate-600" />
              </div>
              <div className="mt-2 text-2xl font-bold font-mono-tabular text-slate-900">
                {totalAdultsCount}{' '}
                <span className="text-xs font-normal text-slate-500">adultos</span>
              </div>
              <div className="mt-1 text-xs text-slate-500 font-mono-tabular">
                Subtotal: S/{' '}
                {spectatorEntries
                  .filter((e) => e.ticketType === 'ADULTO')
                  .reduce((a, b) => a + b.totalAmount, 0)
                  .toFixed(2)}
              </div>
            </div>

            {/* Total VIP */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
              <div className="text-xs font-medium text-slate-500 flex items-center justify-between">
                <span>Total Entradas VIP</span>
                <Ticket className="w-4 h-4 text-amber-600" />
              </div>
              <div className="mt-2 text-2xl font-bold font-mono-tabular text-amber-700">
                {totalVipCount}{' '}
                <span className="text-xs font-normal text-slate-500">preferenciales</span>
              </div>
              <div className="mt-1 text-xs text-slate-500 font-mono-tabular">
                Subtotal: S/{' '}
                {spectatorEntries
                  .filter((e) => e.ticketType === 'VIP')
                  .reduce((a, b) => a + b.totalAmount, 0)
                  .toFixed(2)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CASO D: USUARIO CONTROL BEBIDAS -> SOLO TOTAL DE VENTA Y UNIDADES DE BEBIDAS */}
      {isBeveragesUser && (
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-700 font-mono">
              Totales de tu Estación: Control de Bebidas
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white border border-amber-200 rounded-xl p-5 shadow-xs">
              <div className="text-xs font-medium text-slate-500 flex items-center justify-between">
                <span>Total de Venta en Bebidas</span>
                <DollarSign className="w-4 h-4 text-amber-600" />
              </div>
              <div className="mt-2 text-2xl font-bold font-mono-tabular text-amber-700">
                S/ {totalBeverageRevenue.toFixed(2)}
              </div>
              <div className="mt-1 text-xs text-slate-500 font-mono-tabular">
                Recaudado por venta QR en este torneo
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
              <div className="text-xs font-medium text-slate-500 flex items-center justify-between">
                <span>Unidades Vendidas</span>
                <CupSoda className="w-4 h-4 text-slate-400" />
              </div>
              <div className="mt-2 text-2xl font-bold font-mono-tabular text-slate-900">
                {totalBeverageUnits} uds.
              </div>
              <div className="mt-1 text-xs text-slate-500 font-mono-tabular">
                Despachadas en puntos de hidratación
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
              <div className="text-xs font-medium text-slate-500">
                Stock Total Disponible
              </div>
              <div className="mt-2 text-2xl font-bold font-mono-tabular text-slate-900">
                {beverages.reduce((a, b) => a + b.stock, 0)} uds.
              </div>
              <div className="mt-1 text-xs text-slate-500">
                Inventario remanente en almacén
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmación: Restablecer Sistema a Cero */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 sm:p-6 space-y-4 border border-slate-200 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5 text-red-600">
                <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Restablecer Sistema a CERO
                  </h3>
                  <p className="text-xs text-red-600 font-semibold">
                    Acción irreversible para torneos en curso
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowResetModal(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs text-slate-600 space-y-2 bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
              <p className="font-semibold text-slate-800">
                Al confirmar, se ejecutarán los siguientes reinicios:
              </p>
              <ul className="list-disc pl-4 space-y-1 text-slate-600">
                <li><strong>Jugadores:</strong> Asistencias reiniciadas a Pendiente y duplicados a 0.</li>
                <li><strong>Espectadores:</strong> Historial de boletos y conteos a 0.</li>
                <li><strong>Bebidas:</strong> Unidades vendidas a 0 y ventas reiniciadas.</li>
                <li><strong>Gastos:</strong> Lista de gastos operativos reiniciada a 0.</li>
              </ul>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700">
                Para confirmar, escribe la palabra <span className="font-mono text-red-600 font-bold">CONFIRMAR</span>:
              </label>
              <input
                type="text"
                value={confirmPhrase}
                onChange={(e) => setConfirmPhrase(e.target.value)}
                placeholder="Escribe CONFIRMAR"
                className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowResetModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={confirmPhrase.trim().toUpperCase() !== 'CONFIRMAR'}
                onClick={() => {
                  if (onResetAllData) {
                    onResetAllData();
                  }
                  setShowResetModal(false);
                }}
                className="px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg cursor-pointer shadow-xs flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Restablecer Todo a Cero</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
