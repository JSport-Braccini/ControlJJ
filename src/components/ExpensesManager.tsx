import React, { useState } from 'react';
import {
  Receipt,
  Plus,
  Trash2,
  Edit2,
  X,
  DollarSign,
  TrendingDown,
  Calendar,
  Tag,
  Shield,
  FileText,
} from 'lucide-react';
import { ExpenseItem, UserRole } from '../types/championship';

interface ExpensesManagerProps {
  tournamentId: string;
  tournamentName: string;
  expenses: ExpenseItem[];
  currentUserRole: UserRole;
  currentUserName: string;
  onAddExpense: (expense: ExpenseItem) => void;
  onUpdateExpense: (expense: ExpenseItem) => void;
  onDeleteExpense: (expenseId: string) => void;
}

export const ExpensesManager: React.FC<ExpensesManagerProps> = ({
  tournamentId,
  tournamentName,
  expenses = [],
  currentUserRole,
  currentUserName,
  onAddExpense,
  onUpdateExpense,
  onDeleteExpense,
}) => {
  const isAdmin = currentUserRole === 'ADMIN';

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState<ExpenseItem | null>(null);

  // Form add
  const [concept, setConcept] = useState('');
  const [category, setCategory] = useState<ExpenseItem['category']>('ARBITRAJE');
  const [amount, setAmount] = useState<number>(50);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState('');

  // Form edit
  const [editConcept, setEditConcept] = useState('');
  const [editCategory, setEditCategory] = useState<ExpenseItem['category']>('ARBITRAJE');
  const [editAmount, setEditAmount] = useState<number>(0);
  const [editDate, setEditDate] = useState('');
  const [editNotes, setEditNotes] = useState('');

  const totalExpenses = expenses.reduce((acc, e) => acc + e.amount, 0);

  // Category summary
  const byCategory = expenses.reduce((acc, e) => {
    acc[e.category] = (acc[e.category] || 0) + e.amount;
    return acc;
  }, {} as Record<string, number>);

  const topCategory = Object.entries(byCategory).sort((a, b) => b[1] - a[1])[0];

  const handleOpenAdd = () => {
    setConcept('');
    setCategory('ARBITRAJE');
    setAmount(50);
    setDate(new Date().toISOString().slice(0, 10));
    setNotes('');
    setShowAddModal(true);
  };

  const handleOpenEdit = (exp: ExpenseItem) => {
    setEditingExpense(exp);
    setEditConcept(exp.concept);
    setEditCategory(exp.category);
    setEditAmount(exp.amount);
    setEditDate(exp.date);
    setEditNotes(exp.notes || '');
  };

  const handleDelete = (exp: ExpenseItem) => {
    if (confirm(`¿Eliminar el gasto "${exp.concept}" de S/ ${exp.amount.toFixed(2)}?`)) {
      onDeleteExpense(exp.id);
    }
  };

  const handleSaveAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!concept.trim()) return;

    const newExpense: ExpenseItem = {
      id: `exp-${Date.now()}`,
      tournamentId,
      concept: concept.trim(),
      category,
      amount: Math.max(0, Number(amount) || 0),
      date: date || new Date().toISOString().slice(0, 10),
      registeredBy: currentUserName,
      notes: notes.trim() || undefined,
    };

    onAddExpense(newExpense);
    setShowAddModal(false);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingExpense || !editConcept.trim()) return;

    const updated: ExpenseItem = {
      ...editingExpense,
      concept: editConcept.trim(),
      category: editCategory,
      amount: Math.max(0, Number(editAmount) || 0),
      date: editDate,
      notes: editNotes.trim() || undefined,
    };

    onUpdateExpense(updated);
    setEditingExpense(null);
  };

  const categoryLabels: Record<ExpenseItem['category'], string> = {
    ARBITRAJE: 'Arbitraje y Jueces',
    CANCHA: 'Alquiler de Cancha',
    LOGISTICA: 'Logística y Materiales',
    PREMIOS: 'Premios y Trofeos',
    PERSONAL: 'Personal y Seguridad',
    OTROS: 'Otros Gastos',
  };

  return (
    <div className="space-y-6 w-full max-w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="bg-red-100 text-red-800 text-[10px] font-bold px-2 py-0.5 rounded font-mono uppercase tracking-wider">
              Control de Egresos
            </span>
            <span className="text-xs text-slate-400">· {tournamentName}</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 font-display mt-1">
            Gastos Generales del Torneo
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Registra los costos operativos de arbitraje, cancha, logística y personal para calcular la utilidad neta.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenAdd}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white text-xs font-semibold rounded-xl transition-all whitespace-nowrap shrink-0 cursor-pointer shadow-sm min-h-[44px]"
        >
          <Plus className="w-4 h-4 text-white" />
          Registrar Nuevo Gasto
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-xs flex flex-col justify-between">
          <div className="text-xs text-slate-500 flex items-center justify-between">
            <span>Total Gastos Generales</span>
            <TrendingDown className="w-4 h-4 text-red-600" />
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-bold font-mono-tabular text-red-600">
            S/ {totalExpenses.toFixed(2)}
          </div>
          <div className="mt-1 pt-1 border-t border-slate-100 text-[11px] text-slate-400">
            {expenses.length} egresos registrados en este torneo
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-xs flex flex-col justify-between">
          <div className="text-xs text-slate-500 flex items-center justify-between">
            <span>Mayor Rubro de Gasto</span>
            <Tag className="w-4 h-4 text-slate-400" />
          </div>
          <div className="mt-2 text-lg sm:text-xl font-bold text-slate-900 truncate">
            {topCategory ? categoryLabels[topCategory[0] as ExpenseItem['category']] : 'Sin gastos'}
          </div>
          <div className="mt-1 pt-1 border-t border-slate-100 text-[11px] font-mono-tabular text-slate-500">
            {topCategory ? `S/ ${topCategory[1].toFixed(2)} acumulados` : '0 egresos'}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-xs flex flex-col justify-between">
          <div className="text-xs text-slate-500 flex items-center justify-between">
            <span>Promedio por Egreso</span>
            <DollarSign className="w-4 h-4 text-slate-400" />
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-bold font-mono-tabular text-slate-900">
            S/ {expenses.length > 0 ? (totalExpenses / expenses.length).toFixed(2) : '0.00'}
          </div>
          <div className="mt-1 pt-1 border-t border-slate-100 text-[11px] text-slate-400">
            Costo promedio por rubro
          </div>
        </div>
      </div>

      {/* Lista / Tabla de Gastos */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs w-full max-w-full">
        <div className="px-4 sm:px-5 py-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50/60">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Detalle de Gastos Registrados ({expenses.length})
            </h3>
            <p className="text-[11px] text-slate-500">
              Costos deducibles del balance general
            </p>
          </div>
          <span className="text-xs font-mono-tabular font-bold text-red-600">
            Total: S/ {totalExpenses.toFixed(2)}
          </span>
        </div>

        {/* Vista Móvil (sm:hidden) */}
        <div className="sm:hidden divide-y divide-slate-100">
          {expenses.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500">
              No hay gastos registrados para este torneo. Haz clic en "Registrar Nuevo Gasto".
            </div>
          ) : (
            expenses.map((exp) => (
              <div key={exp.id} className="p-3.5 space-y-1.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <span className="text-[10px] font-bold text-red-700 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded">
                      {categoryLabels[exp.category]}
                    </span>
                    <h4 className="font-bold text-xs text-slate-900 mt-1">
                      {exp.concept}
                    </h4>
                  </div>
                  <span className="font-mono-tabular font-bold text-sm text-red-600 shrink-0">
                    - S/ {exp.amount.toFixed(2)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <span className="font-mono-tabular">{exp.date}</span>
                  <span>Por: {exp.registeredBy || 'Admin'}</span>
                </div>
                {exp.notes && (
                  <p className="text-[10px] text-slate-500 italic bg-slate-50 p-1.5 rounded">
                    {exp.notes}
                  </p>
                )}
                <div className="pt-1 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(exp)}
                    className="p-1.5 text-slate-500 hover:text-slate-900 cursor-pointer"
                    title="Editar gasto"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(exp)}
                    className="p-1.5 text-red-500 hover:text-red-700 cursor-pointer"
                    title="Eliminar gasto"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Vista Desktop (hidden sm:block) */}
        <div className="hidden sm:block overflow-x-auto w-full">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-semibold text-slate-500">
                <th className="py-2.5 px-4">Fecha</th>
                <th className="py-2.5 px-3">Rubro / Categoría</th>
                <th className="py-2.5 px-4">Concepto del Gasto</th>
                <th className="py-2.5 px-3">Registrado por</th>
                <th className="py-2.5 px-3 text-right">Monto (S/)</th>
                <th className="py-2.5 px-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {expenses.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    No hay gastos registrados en este torneo. Haz clic en "Registrar Nuevo Gasto" arriba.
                  </td>
                </tr>
              ) : (
                expenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-4 font-mono-tabular text-slate-600">
                      {exp.date}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="inline-block px-2 py-0.5 rounded text-[11px] font-semibold bg-red-50 text-red-700 border border-red-200">
                        {categoryLabels[exp.category]}
                      </span>
                    </td>
                    <td className="py-2.5 px-4">
                      <div className="font-semibold text-slate-900">{exp.concept}</div>
                      {exp.notes && (
                        <div className="text-[11px] text-slate-500 italic">{exp.notes}</div>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 font-mono-tabular">
                      {exp.registeredBy || 'Admin'}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono-tabular font-bold text-red-600 text-sm">
                      S/ {exp.amount.toFixed(2)}
                    </td>
                    <td className="py-2.5 px-4 text-center">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(exp)}
                          className="p-1 text-slate-400 hover:text-slate-800 rounded hover:bg-slate-100 cursor-pointer transition-colors"
                          title="Editar"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(exp)}
                          className="p-1 text-slate-400 hover:text-red-600 rounded hover:bg-red-50 cursor-pointer transition-colors"
                          title="Eliminar"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {expenses.length > 0 && (
              <tfoot>
                <tr className="border-t border-slate-200 bg-slate-50 text-xs font-bold text-slate-900">
                  <td className="py-2.5 px-4" colSpan={4}>
                    Total Gastos Operativos Deducibles
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono-tabular text-red-600 text-sm">
                    S/ {totalExpenses.toFixed(2)}
                  </td>
                  <td className="py-2.5 px-4"></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Modal Registrar Gasto */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-[#0A192F]/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 sm:p-6 space-y-4 border border-slate-200 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-red-600" />
                <h3 className="text-base font-bold text-slate-900 font-display">
                  Registrar Gasto General
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAdd} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Concepto / Descripción del Gasto *
                </label>
                <input
                  type="text"
                  required
                  value={concept}
                  onChange={(e) => setConcept(e.target.value)}
                  placeholder="Ej: Pago terna arbitral, Alquiler Cancha 1, Trofeos..."
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Rubro / Categoría *
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as ExpenseItem['category'])}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 bg-white"
                  >
                    <option value="ARBITRAJE">Arbitraje y Jueces</option>
                    <option value="CANCHA">Alquiler de Cancha</option>
                    <option value="LOGISTICA">Logística / Balones</option>
                    <option value="PREMIOS">Premios y Trofeos</option>
                    <option value="PERSONAL">Personal / Seguridad</option>
                    <option value="OTROS">Otros Gastos</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Monto a Deducir (S/) *
                  </label>
                  <input
                    type="number"
                    required
                    min={0.1}
                    step={0.5}
                    value={amount}
                    onChange={(e) => setAmount(Math.max(0, Number(e.target.value) || 0))}
                    className="w-full px-3 py-2 text-xs font-mono-tabular font-bold border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Fecha del Gasto
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Comprobante o Nota Adicional (Opcional)
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="N° de boleta, recibo por honorarios o detalle..."
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 font-semibold text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 font-bold text-white bg-red-600 rounded-lg hover:bg-red-700 cursor-pointer shadow-sm"
                >
                  Guardar Gasto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Editar Gasto */}
      {editingExpense && (
        <div className="fixed inset-0 z-50 bg-[#0A192F]/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 sm:p-6 space-y-4 border border-slate-200 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 font-display">
                Editar Gasto
              </h3>
              <button
                type="button"
                onClick={() => setEditingExpense(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Concepto *
                </label>
                <input
                  type="text"
                  required
                  value={editConcept}
                  onChange={(e) => setEditConcept(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Categoría
                  </label>
                  <select
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value as ExpenseItem['category'])}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 bg-white"
                  >
                    <option value="ARBITRAJE">Arbitraje y Jueces</option>
                    <option value="CANCHA">Alquiler de Cancha</option>
                    <option value="LOGISTICA">Logística / Balones</option>
                    <option value="PREMIOS">Premios y Trofeos</option>
                    <option value="PERSONAL">Personal / Seguridad</option>
                    <option value="OTROS">Otros Gastos</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Monto (S/) *
                  </label>
                  <input
                    type="number"
                    required
                    min={0.1}
                    step={0.5}
                    value={editAmount}
                    onChange={(e) => setEditAmount(Math.max(0, Number(e.target.value) || 0))}
                    className="w-full px-3 py-2 text-xs font-mono-tabular font-bold border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Fecha
                </label>
                <input
                  type="date"
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Notas
                </label>
                <textarea
                  rows={2}
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingExpense(null)}
                  className="px-4 py-2 font-semibold text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 font-bold text-white bg-slate-900 rounded-lg hover:bg-slate-800 cursor-pointer shadow-sm"
                >
                  Actualizar Gasto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
