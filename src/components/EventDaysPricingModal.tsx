import React, { useState } from 'react';
import {
  Calendar,
  Plus,
  Trash2,
  X,
  CheckCircle2,
  Lock,
  Unlock,
  AlertTriangle,
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
  const initialDays: EventDayPricing[] =
    tournament.eventDays && tournament.eventDays.length > 0
      ? tournament.eventDays.map((d) => ({
          ...d,
          adultEnabled: d.adultEnabled !== false,
          childEnabled: d.childEnabled !== false,
          vipEnabled: d.vipEnabled !== false,
        }))
      : [
          {
            id: 'day-1',
            label: 'Jornada 1 - Cuartos de Final',
            date: tournament.date,
            adultPrice: 10,
            childPrice: 5,
            vipPrice: 20,
            adultEnabled: true,
            childEnabled: true,
            vipEnabled: true,
          },
        ];

  const [days, setDays] = useState<EventDayPricing[]>(initialDays);
  const [successMsg, setSuccessMsg] = useState(false);
  const [warningMsg, setWarningMsg] = useState<string | null>(null);

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
      adultEnabled: true,
      childEnabled: true,
      vipEnabled: true,
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
    setWarningMsg(null);
  };

  const handleToggleModality = (
    index: number,
    field: 'adultEnabled' | 'childEnabled' | 'vipEnabled'
  ) => {
    const day = days[index];
    const current = day[field] !== false;
    const nextVal = !current;

    if (!nextVal) {
      const activeCount = [
        day.adultEnabled !== false,
        day.childEnabled !== false,
        day.vipEnabled !== false,
      ].filter(Boolean).length;
      if (activeCount <= 1) {
        setWarningMsg(
          `En "${day.label}" debe permanecer habilitada al menos 1 modalidad de entrada (General, Niño o VIP).`
        );
        return;
      }
    }

    handleUpdateDay(index, field, nextVal);
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
                {tournament.name} · Tarifa y bloqueo de modalidades por jornada
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
              Personaliza los precios de Adulto/General, Niño y VIP por jornada, o{' '}
              <strong>bloquea</strong> cualquier modalidad si no existiera para esa fecha.
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

          {warningMsg && (
            <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>{warningMsg}</span>
            </div>
          )}

          <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
            {days.map((day, idx) => {
              const adultOn = day.adultEnabled !== false;
              const childOn = day.childEnabled !== false;
              const vipOn = day.vipEnabled !== false;

              return (
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

                  {/* Precios diferenciados + opción de bloqueo por modalidad */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1.5 border-t border-slate-200/80">
                    {/* General / Adulto */}
                    <div
                      className={`p-2 rounded-lg border transition-colors ${
                        adultOn ? 'bg-white border-slate-200' : 'bg-slate-100 border-slate-300 opacity-75'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <label className="text-[10px] font-bold text-slate-700">
                          General / Adulto (S/):
                        </label>
                        <button
                          type="button"
                          onClick={() => handleToggleModality(idx, 'adultEnabled')}
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-colors ${
                            adultOn
                              ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                              : 'bg-red-100 text-red-700 hover:bg-red-200'
                          }`}
                          title={adultOn ? 'Clic para bloquear modalidad General' : 'Clic para habilitar modalidad General'}
                        >
                          {adultOn ? (
                            <>
                              <Unlock className="w-2.5 h-2.5" />
                              <span>Activa</span>
                            </>
                          ) : (
                            <>
                              <Lock className="w-2.5 h-2.5" />
                              <span>Bloqueada</span>
                            </>
                          )}
                        </button>
                      </div>
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        disabled={!adultOn}
                        value={day.adultPrice}
                        onChange={(e) => handleUpdateDay(idx, 'adultPrice', e.target.value)}
                        className="w-full px-2.5 py-1 text-xs border border-slate-300 rounded-lg font-mono font-bold bg-white disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed"
                      />
                    </div>

                    {/* Niño / Menor */}
                    <div
                      className={`p-2 rounded-lg border transition-colors ${
                        childOn ? 'bg-white border-blue-200' : 'bg-slate-100 border-slate-300 opacity-75'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <label className="text-[10px] font-bold text-blue-700">
                          Niño / Menor (S/):
                        </label>
                        <button
                          type="button"
                          onClick={() => handleToggleModality(idx, 'childEnabled')}
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-colors ${
                            childOn
                              ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                              : 'bg-red-100 text-red-700 hover:bg-red-200'
                          }`}
                          title={childOn ? 'Clic para bloquear modalidad Niño' : 'Clic para habilitar modalidad Niño'}
                        >
                          {childOn ? (
                            <>
                              <Unlock className="w-2.5 h-2.5" />
                              <span>Activa</span>
                            </>
                          ) : (
                            <>
                              <Lock className="w-2.5 h-2.5" />
                              <span>Bloqueada</span>
                            </>
                          )}
                        </button>
                      </div>
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        disabled={!childOn}
                        value={day.childPrice}
                        onChange={(e) => handleUpdateDay(idx, 'childPrice', e.target.value)}
                        className="w-full px-2.5 py-1 text-xs border border-blue-200 rounded-lg font-mono font-bold bg-white text-blue-900 disabled:bg-slate-200 disabled:text-slate-400 disabled:border-slate-300 disabled:cursor-not-allowed"
                      />
                    </div>

                    {/* Tribuna VIP */}
                    <div
                      className={`p-2 rounded-lg border transition-colors ${
                        vipOn ? 'bg-white border-red-200' : 'bg-slate-100 border-slate-300 opacity-75'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <label className="text-[10px] font-bold text-red-700">
                          Tribuna VIP (S/):
                        </label>
                        <button
                          type="button"
                          onClick={() => handleToggleModality(idx, 'vipEnabled')}
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-colors ${
                            vipOn
                              ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                              : 'bg-red-100 text-red-700 hover:bg-red-200'
                          }`}
                          title={vipOn ? 'Clic para bloquear modalidad VIP' : 'Clic para habilitar modalidad VIP'}
                        >
                          {vipOn ? (
                            <>
                              <Unlock className="w-2.5 h-2.5" />
                              <span>Activa</span>
                            </>
                          ) : (
                            <>
                              <Lock className="w-2.5 h-2.5" />
                              <span>Bloqueada</span>
                            </>
                          )}
                        </button>
                      </div>
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        disabled={!vipOn}
                        value={day.vipPrice}
                        onChange={(e) => handleUpdateDay(idx, 'vipPrice', e.target.value)}
                        className="w-full px-2.5 py-1 text-xs border border-red-200 rounded-lg font-mono font-bold bg-white text-red-900 disabled:bg-slate-200 disabled:text-slate-400 disabled:border-slate-300 disabled:cursor-not-allowed"
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-semibold text-center flex items-center justify-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              ¡Tarifas y bloqueos actualizados y sincronizados en la nube!
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
