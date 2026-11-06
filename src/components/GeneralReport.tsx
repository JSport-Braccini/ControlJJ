import React from 'react';
import {
  FileSpreadsheet,
  Download,
  Printer,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Users,
  Ticket,
  CupSoda,
  Receipt,
  Scale,
  Award,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';
import {
  Tournament,
  Player,
  SpectatorTier,
  SpectatorEntry,
  BeverageProduct,
  BeverageSale,
  ExpenseItem,
} from '../types/championship';

interface GeneralReportProps {
  tournament: Tournament;
  players: Player[];
  spectatorTiers: SpectatorTier[];
  spectatorEntries: SpectatorEntry[];
  beverages: BeverageProduct[];
  beverageSales: BeverageSale[];
  expenses: ExpenseItem[];
}

export const GeneralReport: React.FC<GeneralReportProps> = ({
  tournament,
  players = [],
  spectatorTiers = [],
  spectatorEntries = [],
  beverages = [],
  beverageSales = [],
  expenses = [],
}) => {
  // Ingresos
  const totalTicketRevenue = spectatorEntries.reduce((acc, e) => acc + e.totalAmount, 0);
  const totalBeverageRevenue = beverages.reduce((acc, b) => acc + b.soldCount * b.price, 0);
  const grossRevenue = totalTicketRevenue + totalBeverageRevenue;

  // Gastos
  const totalExpenses = expenses.reduce((acc, e) => acc + e.amount, 0);

  // Resultado General / Utilidad Neta
  const netResult = grossRevenue - totalExpenses;
  const isProfitable = netResult >= 0;

  // Desglose Espectadores
  const totalSpectators = spectatorEntries.reduce((acc, e) => acc + e.quantity, 0);
  const totalFreeSpectators = spectatorEntries
    .filter((e) => e.ticketType === 'GRATIS' || e.price === 0)
    .reduce((acc, e) => acc + e.quantity, 0);
  const totalChildSpectators = spectatorEntries
    .filter((e) => e.isChild)
    .reduce((acc, e) => acc + e.quantity, 0);
  const totalAdultSpectators = spectatorEntries
    .filter((e) => e.ticketType === 'ADULTO')
    .reduce((acc, e) => acc + e.quantity, 0);
  const totalVipSpectators = spectatorEntries
    .filter((e) => e.ticketType === 'VIP')
    .reduce((acc, e) => acc + e.quantity, 0);

  // Desglose Jugadores
  const totalPlayers = players.length;
  const checkedInPlayers = players.filter((p) => p.checkedIn).length;
  const attendanceRate = totalPlayers > 0 ? Math.round((checkedInPlayers / totalPlayers) * 100) : 0;

  // Desglose Bebidas
  const totalBeverageUnits = beverages.reduce((acc, b) => acc + b.soldCount, 0);

  // Gastos por categoría
  const expensesByCategory = expenses.reduce((acc, e) => {
    acc[e.category] = (acc[e.category] || 0) + e.amount;
    return acc;
  }, {} as Record<string, number>);

  const categoryLabels: Record<string, string> = {
    ARBITRAJE: 'Arbitraje y Jueces',
    CANCHA: 'Alquiler de Cancha',
    LOGISTICA: 'Logística y Materiales',
    PREMIOS: 'Premios y Trofeos',
    PERSONAL: 'Personal y Seguridad',
    OTROS: 'Otros Gastos',
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportCsv = () => {
    const lines: string[] = [
      `ESTADO FINANCIERO Y RESULTADO GENERAL DEL CAMPEONATO`,
      `Torneo: ${tournament.name} (${tournament.edition})`,
      `Sede: ${tournament.venue} | Fecha: ${tournament.date}`,
      `Generado: ${new Date().toLocaleString('es-PE')}`,
      '',
      '1. RESULTADO Y BALANCE GENERAL FINANCIERO',
      `Ingresos Totales por Entradas (S/),${totalTicketRevenue.toFixed(2)}`,
      `Ingresos Totales por Bebidas (S/),${totalBeverageRevenue.toFixed(2)}`,
      `Total Ingresos Brutos (S/),${grossRevenue.toFixed(2)}`,
      `Total Gastos Generales Deducibles (S/),${totalExpenses.toFixed(2)}`,
      `RESULTADO GENERAL (UTILIDAD NETA) (S/),${netResult.toFixed(2)}`,
      `Estado Financiero,${isProfitable ? 'SUPERAVIT / GANANCIA' : 'DEFICIT OPERATIVO'}`,
      '',
      '2. DESGLOSE DE TAQUILLA Y ENTRADAS',
      'Tipo de Entrada,Tarifa (S/),Personas Ingresadas,Subtotal (S/)',
      `Entrada Adulto / General,10.00,${totalAdultSpectators},${(totalAdultSpectators * 10).toFixed(2)}`,
      `Entrada Niño / Menor,5.00,${totalChildSpectators},${(totalChildSpectators * 5).toFixed(2)}`,
      `Entrada Tribuna VIP,20.00,${totalVipSpectators},${(totalVipSpectators * 20).toFixed(2)}`,
      `Entrada Libre / Cortesía,0.00,${totalFreeSpectators},0.00`,
      `Total Espectadores,,${totalSpectators},${totalTicketRevenue.toFixed(2)}`,
      '',
      '3. DESGLOSE DE VENTA DE BEBIDAS',
      'Bebida,Presentacion,Precio (S/),Unidades Vendidas,Subtotal (S/)',
      ...beverages.map(
        (b) =>
          `"${b.name}","${b.presentation}",${b.price.toFixed(2)},${b.soldCount},${(
            b.soldCount * b.price
          ).toFixed(2)}`
      ),
      `Total Bebidas,,${totalBeverageUnits},${totalBeverageRevenue.toFixed(2)}`,
      '',
      '4. DESGLOSE DE GASTOS GENERALES',
      'Fecha,Categoria,Concepto,Monto (S/)',
      ...expenses.map(
        (e) => `"${e.date}","${categoryLabels[e.category] || e.category}","${e.concept}",${e.amount.toFixed(2)}`
      ),
      `Total Gastos,,,${totalExpenses.toFixed(2)}`,
      '',
      '5. CONTROL DE ASISTENCIA DE JUGADORES',
      `Jugadores Habilitados Presentes,${checkedInPlayers},Tasa Asistencia,${attendanceRate}%`,
      `Total Jugadores Inscritos,${totalPlayers}`,
    ];

    const blob = new Blob(['\uFEFF' + lines.join('\n')], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Resultado_General_${tournament.name.replace(/\s+/g, '_')}_${tournament.date}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 w-full max-w-full">
      {/* Header con Acciones */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="bg-slate-900 text-white text-[10px] font-bold px-2 py-0.5 rounded font-mono uppercase tracking-wider">
              Balance Oficial
            </span>
            <span className="text-xs text-slate-400">· {tournament.name}</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 font-display mt-1 flex items-center gap-2">
            <FileSpreadsheet className="w-6 h-6 text-emerald-600" />
            Reporte y Resultado General del Campeonato
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Consolidado financiero definitivo: Ingresos totales, gastos generales y utilidad neta final.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 text-xs font-semibold rounded-xl shadow-xs transition-colors cursor-pointer min-h-[40px]"
          >
            <Download className="w-4 h-4 text-slate-500" />
            Exportar CSV
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer min-h-[40px]"
          >
            <Printer className="w-4 h-4 text-white" />
            Imprimir Reporte
          </button>
        </div>
      </div>

      {/* HERO CARD: RESULTADO GENERAL (UTILIDAD NETA) */}
      <div
        className={`rounded-2xl p-5 sm:p-7 text-white shadow-lg relative overflow-hidden border-2 ${
          isProfitable ? 'bg-[#0A192F] border-emerald-500' : 'bg-[#1e0a0a] border-red-500'
        }`}
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10 text-xs font-bold tracking-wider uppercase font-mono">
              <Scale className="w-3.5 h-3.5 text-amber-400" />
              Resultado Financiero Final
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight font-display">
              {isProfitable ? 'Superávit Operativo (Ganancia Neta)' : 'Déficit del Campeonato'}
            </h2>
            <p className="text-xs text-slate-300 max-w-xl">
              Cálculo definitivo de ingresos brutos por taquilla y bebidas deduciendo todos los costos de arbitraje, cancha y logística.
            </p>
          </div>

          <div className="bg-black/30 backdrop-blur-md rounded-2xl p-4 sm:p-5 border border-white/10 flex flex-col items-start lg:items-end min-w-[240px]">
            <span className="text-xs text-slate-300 uppercase tracking-wider font-semibold font-mono">
              Utilidad Neta (Ingresos - Gastos)
            </span>
            <div
              className={`text-3xl sm:text-4xl font-extrabold font-mono-tabular mt-1 ${
                isProfitable ? 'text-emerald-400' : 'text-red-400'
              }`}
            >
              S/ {netResult.toFixed(2)}
            </div>
            <span className="text-[11px] text-slate-400 mt-1">
              Ingresos S/ {grossRevenue.toFixed(2)} − Gastos S/ {totalExpenses.toFixed(2)}
            </span>
          </div>
        </div>

        {/* 3 Pilares Financieros */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-5 mt-5 border-t border-white/10 text-xs">
          <div className="bg-white/5 rounded-xl p-3 border border-white/5">
            <span className="text-slate-400 block text-[11px]">1. Ingresos por Entradas</span>
            <span className="text-lg font-bold font-mono-tabular text-emerald-400 mt-0.5 block">
              + S/ {totalTicketRevenue.toFixed(2)}
            </span>
            <span className="text-[10px] text-slate-400 font-mono-tabular">
              {totalSpectators} asistentes ({totalFreeSpectators} cortesías)
            </span>
          </div>

          <div className="bg-white/5 rounded-xl p-3 border border-white/5">
            <span className="text-slate-400 block text-[11px]">2. Ingresos por Bebidas</span>
            <span className="text-lg font-bold font-mono-tabular text-emerald-400 mt-0.5 block">
              + S/ {totalBeverageRevenue.toFixed(2)}
            </span>
            <span className="text-[10px] text-slate-400 font-mono-tabular">
              {totalBeverageUnits} unidades despachadas
            </span>
          </div>

          <div className="bg-white/5 rounded-xl p-3 border border-white/5">
            <span className="text-slate-400 block text-[11px]">3. Gastos Generales Deducibles</span>
            <span className="text-lg font-bold font-mono-tabular text-red-400 mt-0.5 block">
              - S/ {totalExpenses.toFixed(2)}
            </span>
            <span className="text-[10px] text-slate-400 font-mono-tabular">
              {expenses.length} egresos operativos
            </span>
          </div>
        </div>
      </div>

      {/* Grid de 2 Columnas: Desglose de Taquilla y Bebidas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Desglose Taquilla */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Ticket className="w-5 h-5 text-emerald-600" />
              <div>
                <h3 className="font-bold text-sm text-slate-900">
                  Resumen de Taquilla y Espectadores
                </h3>
                <p className="text-[11px] text-slate-500">
                  Conteo por modalidad de boleto
                </p>
              </div>
            </div>
            <span className="text-xs font-mono-tabular font-bold text-emerald-700">
              S/ {totalTicketRevenue.toFixed(2)}
            </span>
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg">
              <div>
                <span className="font-bold text-slate-800">Entradas General Adultos</span>
                <span className="text-[11px] text-slate-500 block">Tarifa regular mayores de 12 años</span>
              </div>
              <div className="text-right font-mono-tabular">
                <span className="font-bold text-slate-900 block">{totalAdultSpectators} personas</span>
                <span className="text-emerald-700 font-semibold text-[11px]">
                  S/ {spectatorEntries.filter((e) => e.ticketType === 'ADULTO').reduce((a, b) => a + b.totalAmount, 0).toFixed(2)}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg">
              <div>
                <span className="font-bold text-slate-800">Entradas Niños / Menores</span>
                <span className="text-[11px] text-slate-500 block">Tarifa infantil protegida</span>
              </div>
              <div className="text-right font-mono-tabular">
                <span className="font-bold text-slate-900 block">{totalChildSpectators} personas</span>
                <span className="text-emerald-700 font-semibold text-[11px]">
                  S/ {spectatorEntries.filter((e) => e.isChild).reduce((a, b) => a + b.totalAmount, 0).toFixed(2)}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg">
              <div>
                <span className="font-bold text-slate-800">Entradas Tribuna VIP</span>
                <span className="text-[11px] text-slate-500 block">Zona techada y preferencial</span>
              </div>
              <div className="text-right font-mono-tabular">
                <span className="font-bold text-slate-900 block">{totalVipSpectators} personas</span>
                <span className="text-emerald-700 font-semibold text-[11px]">
                  S/ {spectatorEntries.filter((e) => e.ticketType === 'VIP').reduce((a, b) => a + b.totalAmount, 0).toFixed(2)}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between p-2.5 bg-emerald-50/70 border border-emerald-200 rounded-lg">
              <div>
                <span className="font-bold text-emerald-950">Entradas Gratis / Cortesía</span>
                <span className="text-[11px] text-emerald-800 block">Delegaciones, dirigentes e invitados</span>
              </div>
              <div className="text-right font-mono-tabular">
                <span className="font-bold text-emerald-950 block">{totalFreeSpectators} personas</span>
                <span className="text-emerald-700 font-semibold text-[11px]">S/ 0.00 (Cortesía)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Desglose Bebidas */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <CupSoda className="w-5 h-5 text-amber-600" />
              <div>
                <h3 className="font-bold text-sm text-slate-900">
                  Resumen de Venta de Bebidas
                </h3>
                <p className="text-[11px] text-slate-500">
                  Despachadas por producto
                </p>
              </div>
            </div>
            <span className="text-xs font-mono-tabular font-bold text-amber-700">
              S/ {totalBeverageRevenue.toFixed(2)}
            </span>
          </div>

          <div className="space-y-2 text-xs">
            {beverages.map((bev) => (
              <div
                key={bev.id}
                className="flex items-center justify-between p-2 bg-slate-50 rounded-lg text-xs"
              >
                <div>
                  <span className="font-bold text-slate-800">{bev.name}</span>
                  <span className="text-[10px] text-slate-400 block">{bev.presentation}</span>
                </div>
                <div className="text-right font-mono-tabular">
                  <span className="font-bold text-slate-900 block">{bev.soldCount} unidades</span>
                  <span className="text-emerald-700 font-semibold text-[11px]">
                    S/ {(bev.soldCount * bev.price).toFixed(2)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Grid de 2 Columnas: Gastos y Asistencia de Jugadores */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Gastos por Rubro */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Receipt className="w-5 h-5 text-red-600" />
              <h3 className="font-bold text-sm text-slate-900">
                Gastos Operativos por Rubro
              </h3>
            </div>
            <span className="text-xs font-mono-tabular font-bold text-red-600">
              Total: S/ {totalExpenses.toFixed(2)}
            </span>
          </div>

          <div className="space-y-2 text-xs">
            {Object.keys(expensesByCategory).length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">
                Sin gastos registrados en este torneo.
              </p>
            ) : (
              Object.entries(expensesByCategory).map(([cat, amt]) => (
                <div key={cat} className="flex items-center justify-between p-2 bg-red-50/50 rounded-lg">
                  <span className="font-semibold text-slate-800">
                    {categoryLabels[cat] || cat}
                  </span>
                  <span className="font-mono-tabular font-bold text-red-600">
                    S/ {amt.toFixed(2)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Resumen Asistencia Jugadores */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600" />
              <h3 className="font-bold text-sm text-slate-900">
                Asistencia de Jugadores en Cancha
              </h3>
            </div>
            <span className="text-xs font-mono-tabular font-bold text-blue-700">
              {attendanceRate}% Asistencia
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-100">
              <span className="text-slate-500 block text-[11px]">Jugadores Presentes</span>
              <span className="text-xl font-bold font-mono-tabular text-blue-900 block mt-1">
                {checkedInPlayers}
              </span>
              <span className="text-[10px] text-slate-400 font-mono-tabular">
                Habilitados en campo oficial
              </span>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-slate-500 block text-[11px]">Pendientes / Ausentes</span>
              <span className="text-xl font-bold font-mono-tabular text-slate-700 block mt-1">
                {totalPlayers - checkedInPlayers}
              </span>
              <span className="text-[10px] text-slate-400 font-mono-tabular">
                De {totalPlayers} inscritos
              </span>
            </div>
          </div>

          <div className="p-2.5 bg-slate-50 rounded-lg text-xs text-slate-600 flex items-center justify-between font-mono-tabular">
            <span>Intentos duplicados bloqueados por QR:</span>
            <span className="font-bold text-red-600">
              {players.reduce((a, b) => a + b.duplicateAttempts, 0)} bloqueos
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
