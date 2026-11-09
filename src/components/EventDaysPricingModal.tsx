import React, { useState } from 'react';
import {
  Calendar,
  Plus,
  Trash2,
  X,
  DollarSign,
  CheckCircle2,
  Ticket,
  Clock,
} from 'lucide-react';
import { Tournament, EventDayPricing } from '../types/championship';

interface EventDaysPricingModalProps {
  isOpen: boolean;
  onClose: () => void;
  tournament: Tournament;
  onSaveDays: (tournamentId: string, eventDays: EventDayPricing[]) => void;
}

export const EventDaysPricingModal: React.FC<EventDaysPricingModalProps> = ({
  isOpen,
  onClose,
  tournament,
  onSaveDays,
}) => {
  const initialDays: EventDayPricing[] = tournament.eventDays && tournament.eventDays.length > 0
    ? [...tournament.eventDays]
    : [
        {
          id: 'day-1',
          label: 'Jornada 1 - Cuartos de Final',
          date: tournament.date,
          adultPrice: 10,
          childPrice: 5,
          vipPrice: 20,
        },
      ];

  const [days, setDays] = useState<EventDayPricing[]>(initialDays);
  const [successMsg, setSuccessMsg] = useState(false);

  if (!isOpen) return null;

  const handleAddDay = () => {
    const nextIdx = days.length + 1;
    const newDay: EventDayPricing = {
      id: `day-${Date.now()}`,
      label: `Jornada ${nextIdx} - Encuentros Oficiales`,
      date: tournament.date,
      adultPrice: 10,
      childPrice: 5,
      vipPrice: 20,
    };
    setDays([...days, newDay]);
  };

  const handleUpdateDay = (index: number, field: keyof EventDayPricing, value: any) => {
    const updated = [...days];
    updated[index] = {
      ...updated[index],
      [field]: field.includes('Price') ? Math.max(0, parseFloat(value) || 0) : value,
    };
    setDays(updated);
  };

  const handleRemoveDay = (index: number) => {
    if (days.length <= 1) {
      alert('Debe existir al menos un día o fecha de evento configurada.');
      return;
    }
    setDays(days.filter((_, idx) => idx !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveDays(tournament.id, days);
    setSuccessMsg(true);
    setTimeout(() => {
      setSuccessMsg(false);
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#0A192F]/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden my-auto">
        {/* Header */}
        <div className="bg-[#0A192F] text-white p-4 sm:p-5 flex items-center justify-between border-b-2 border-red-600">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-slate-800 flex items-center justify-center border border-slate-700">
              <Calendar className="w-5 h-5 text-red-500" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white font-display">
                Precios de Entradas según Días del Evento
              </h3>
              <p className="text-xs text-slate-300">
                {tournament.name} · Tarifa diferenciada por fecha / jornada
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-600">
              Personaliza el nombre de cada fecha y los precios de boletos (Adulto, Niño y VIP).
              Estos precios se mostrarán automáticamente a los compradores en la tienda web y taquilla.
            </p>
            <button
              type="button"
              onClick={handleAddDay}
              className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 cursor-pointer shrink-0 ml-3"
            >
              <Plus className="w-3.5 h-3.5 text-emerald-400" />
              <span>Agregar Día</span>
            </button>
          </div>

          <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
            {days.map((day, idx) => (
              <div
                key={day.id}
                className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div className="sm:col-span-2">
                      <label className="block text-[10px] font-bold uppercase text-slate-500 mb-0.5">
                        Nombre de la Jornada / Partido:
                      </label>
                      <input
                        type="text"
                        required
                        value={day.label}
                        onChange={(e) => handleUpdateDay(idx, 'label', e.target.value)}
                        placeholder="Ej: Jornada 1 - Cuartos de Final"
                        className="w-full px-2.5 py-1.5 text-xs font-bold border border-slate-300 rounded-lg bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-500 mb-0.5">
                        Fecha:
                      </label>
                      <input
                        type="date"
                        required
                        value={day.date}
                        onChange={(e) => handleUpdateDay(idx, 'date', e.target.value)}
                        className="w-full px-2 py-1.5 text-xs border border-slate-300 rounded-lg bg-white font-mono"
                      />
                    </div>
                  </div>

                  {days.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveDay(idx)}
                      className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 cursor-pointer self-center"
                      title="Eliminar este día"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Precios diferenciados para esta jornada */}
                <div className="grid grid-cols-3 gap-2 pt-1 border-t border-slate-200/80">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                      Precio Adulto / General (S/):
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      value={day.adultPrice}
                      onChange={(e) => handleUpdateDay(idx, 'adultPrice', e.target.value)}
                      className="w-full px-2.5 py-1 text-xs border border-slate-300 rounded-lg font-mono font-bold bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-blue-700 mb-0.5">
                      Precio Niño / Menor (S/):
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      value={day.childPrice}
                      onChange={(e) => handleUpdateDay(idx, 'childPrice', e.target.value)}
                      className="w-full px-2.5 py-1 text-xs border border-blue-200 rounded-lg font-mono font-bold bg-white text-blue-900"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-red-700 mb-0.5">
                      Precio Tribuna VIP (S/):
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      value={day.vipPrice}
                      onChange={(e) => handleUpdateDay(idx, 'vipPrice', e.target.value)}
                      className="w-full px-2.5 py-1 text-xs border border-red-200 rounded-lg font-mono font-bold bg-white text-red-900"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-semibold text-center flex items-center justify-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              ¡Tarifas por día actualizadas y sincronizadas en la nube!
            </div>
          )}

          {/* Footer */}
          <div className="pt-2 border-t border-slate-200 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-xs cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-[#0A192F] hover:bg-slate-800 text-white font-bold rounded-lg text-xs cursor-pointer shadow-md"
            >
              Guardar Precios de Jornadas
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
