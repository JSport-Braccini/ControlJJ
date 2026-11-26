import React, { useState, useEffect } from 'react';
import {
  Trophy,
  Users,
  Ticket,
  CupSoda,
  LayoutDashboard,
  LogOut,
  UserCog,
  Settings,
  Camera,
  CheckCircle2,
  Receipt,
  FileSpreadsheet,
  Megaphone,
  RotateCcw,
  AlertTriangle,
  X,
} from 'lucide-react';
import {
  ActiveTab,
  UserRole,
  Tournament,
  Player,
  SpectatorTier,
  BeverageProduct,
  AuthUser,
  SystemConfig,
  ExpenseItem,
} from './types/championship';
import { useRealtimeSync } from './hooks/useRealtimeSync';
import { SummaryDashboard } from './components/SummaryDashboard';
import { PlayersManager } from './components/PlayersManager';
import { SpectatorsManager } from './components/SpectatorsManager';
import { BeveragesManager } from './components/BeveragesManager';
import { ExpensesManager } from './components/ExpensesManager';
import { GeneralReport } from './components/GeneralReport';
import { TournamentsManager } from './components/TournamentsManager';
import { UsersManager } from './components/UsersManager';
import { SystemSettingsModal } from './components/SystemSettingsModal';
import { LoginModal } from './components/LoginModal';
import { CameraQrModal } from './components/CameraQrModal';
import { ConnectionGuideModal } from './components/ConnectionGuideModal';
import { CorporateLogo } from './components/CorporateLogo';
import { DigitalTicketsManager } from './components/DigitalTicketsManager';
import { PublicTicketStore } from './components/PublicTicketStore';
import { PublicPortal } from './components/PublicPortal';
import { PortalContentManager } from './components/PortalContentManager';
import { ScanFeedbackModal } from './components/ScanFeedbackModal';
import { DigitalTicket, PaymentMethod, ScanFeedback } from './types/championship';

const AUTH_STORAGE_KEY = 'copacontrol_auth_user_v2';

export function App() {
  const {
    serverData,
    systemConfig,
    users,
    activeTournamentState,
    activeTournament,
    isConnected,
    isVercelOrLocal,
    lastSyncTime,
    customWsUrl,
    setCustomWsUrl,
    sendAction,
  } = useRealtimeSync();

  const [showConnectionModal, setShowConnectionModal] = useState(false);

  // Authentication State: Portal público como pantalla inicial + acceso de personal desde icono superior derecho
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [portalView, setPortalView] = useState<'portal' | 'store'>('portal');
  const [showStaffLoginModal, setShowStaffLoginModal] = useState(false);

  const [activeTab, setActiveTab] = useState<ActiveTab>('resumen');
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showGlobalCamera, setShowGlobalCamera] = useState(false);
  const [showStoreModal, setShowStoreModal] = useState(false);
  const [showGlobalResetModal, setShowGlobalResetModal] = useState(false);
  const [globalResetPhrase, setGlobalResetPhrase] = useState('');

  // Scan feedback modal state for universal feedback and duplicate blocking
  const [activeScanFeedback, setActiveScanFeedback] = useState<ScanFeedback | null>(null);
  const [activeScanTicket, setActiveScanTicket] = useState<DigitalTicket | null>(null);
  const [activeScanPlayer, setActiveScanPlayer] = useState<Player | null>(null);
  const [activeScanBeverage, setActiveScanBeverage] = useState<BeverageProduct | null>(null);
  const [showScanFeedbackModal, setShowScanFeedbackModal] = useState<boolean>(false);

  const currentRole: UserRole = currentUser?.role || 'ADMIN';
  const isAdmin = currentRole === 'ADMIN';

  // Strict role isolation: Force non-admin operators to their dedicated module
  useEffect(() => {
    if (!isAdmin) {
      if (currentRole === 'CONTROL_JUGADORES' && activeTab !== 'jugadores') {
        setActiveTab('jugadores');
      } else if (currentRole === 'CONTROL_ESPECTADORES' && activeTab !== 'espectadores') {
        setActiveTab('espectadores');
      } else if (currentRole === 'CONTROL_BEBIDAS' && activeTab !== 'bebidas') {
        setActiveTab('bebidas');
      }
    }
  }, [currentRole, isAdmin, activeTab]);

  // Notify server of current user presence
  useEffect(() => {
    if (currentUser && isConnected) {
      sendAction('IDENTIFY_USER', { user: currentUser });
    }
  }, [currentUser, isConnected, sendAction]);

  const handleLoginSuccess = (user: AuthUser) => {
    setCurrentUser(user);
    setShowStaffLoginModal(false);
    try {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
    } catch {
      // ignore
    }
    if (user.role === 'CONTROL_JUGADORES') setActiveTab('jugadores');
    else if (user.role === 'CONTROL_ESPECTADORES') setActiveTab('espectadores');
    else if (user.role === 'CONTROL_BEBIDAS') setActiveTab('bebidas');
    else setActiveTab('resumen');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setPortalView('portal');
    setShowStaffLoginModal(false);
    localStorage.removeItem(AUTH_STORAGE_KEY);
  };

  // System Config Action
  const handleUpdateConfig = (newConfig: Partial<SystemConfig>) => {
    sendAction('UPDATE_SYSTEM_CONFIG', { config: newConfig });
  };

  // User Management Actions (Admin Only)
  const handleCreateUser = (newUser: AuthUser) => {
    sendAction('CREATE_USER', { user: newUser });
  };

  const handleUpdateUser = (updatedUser: AuthUser) => {
    sendAction('UPDATE_USER', { user: updatedUser });
  };

  const handleDeleteUser = (userId: string) => {
    sendAction('DELETE_USER', { userId });
  };

  // Multi-tournament actions via WebSocket
  const handleSelectTournament = (tournamentId: string) => {
    sendAction('SELECT_TOURNAMENT', { tournamentId });
  };

  const handleCreateTournament = (tournament: Tournament) => {
    sendAction('CREATE_TOURNAMENT', { tournament });
  };

  const handleUpdateTournament = (tournament: Tournament) => {
    sendAction('UPDATE_TOURNAMENT', { tournament });
  };

  const handleDeleteTournament = (tournamentId: string) => {
    sendAction('DELETE_TOURNAMENT', { tournamentId });
  };

  // QR Scanning & Auto-Distribution with instant visual and audio feedback
  const handleProcessQr = (qrCode: string, quantity = 1) => {
    const roleName = currentUser?.displayName || 'Operador';
    const code = String(qrCode).trim().toUpperCase();
    const nowTime = new Date().toTimeString().slice(0, 8);
    const qty = Math.max(1, Number(quantity) || 1);

    // Reset previous modal entity state
    setActiveScanTicket(null);
    setActiveScanPlayer(null);
    setActiveScanBeverage(null);

    // 1. Check Player
    const matchedPlayer = activeTournamentState.players.find(
      (p) => p.qrCode.toUpperCase() === code
    );
    if (matchedPlayer) {
      setActiveScanPlayer(matchedPlayer);
      if (matchedPlayer.checkedIn) {
        setActiveScanFeedback({
          id: `fb-${Date.now()}`,
          status: 'duplicate',
          category: 'JUGADOR',
          title: '¡YA ESTÁ REGISTRADO! — Asistencia Duplicada Bloqueada',
          message: `El jugador ${matchedPlayer.name} (#${matchedPlayer.jerseyNumber} · ${matchedPlayer.team}) ya registró su ingreso a las ${matchedPlayer.checkInTime || 'previamente'}.`,
          detail: 'El sistema bloquea ingresos duplicados por normativa de torneo.',
          timestamp: nowTime,
          qrCode: code,
        });
      } else {
        setActiveScanFeedback({
          id: `fb-${Date.now()}`,
          status: 'success',
          category: 'JUGADOR',
          title: 'Asistencia de Jugador Registrada',
          message: `${matchedPlayer.name} (#${matchedPlayer.jerseyNumber} · ${matchedPlayer.team}) habilitado en cancha oficial. Operador: ${roleName}`,
          detail: `DNI: ${matchedPlayer.dni || 'Registrado'} · Posición: ${matchedPlayer.position}`,
          timestamp: nowTime,
          qrCode: code,
        });
      }
      setShowScanFeedbackModal(true);
      sendAction('PROCESS_QR_SCAN', {
        tournamentId: activeTournament.id,
        qrCode: code,
        quantity: qty,
        registeredBy: roleName,
      });
      return;
    }

    // 2. Check Digital Ticket (Web or Venue)
    const matchedTicket = (activeTournamentState.digitalTickets || []).find(
      (dt) => dt.qrCode.toUpperCase() === code
    );
    if (matchedTicket) {
      setActiveScanTicket(matchedTicket);
      if (matchedTicket.assisted) {
        const breakdownText = matchedTicket.items && matchedTicket.items.length > 0
          ? matchedTicket.items.map((it) => `${it.quantity}x ${it.label}`).join(', ')
          : `${matchedTicket.quantity}x ${matchedTicket.label}`;

        setActiveScanFeedback({
          id: `fb-${Date.now()}`,
          status: 'duplicate',
          category: 'ESPECTADOR',
          title: '¡BOLETO YA FUE UTILIZADO! — Entrada Marcada',
          message: `El boleto de ${matchedTicket.buyerName} (${breakdownText}) ya registró su ingreso a las ${matchedTicket.checkInTime || 'anteriormente'}.`,
          detail: `Código: ${matchedTicket.qrCode} · Jornada: ${matchedTicket.eventDayLabel}`,
          timestamp: nowTime,
          qrCode: code,
        });
      } else if (matchedTicket.paymentStatus === 'RESERVED_UNPAID') {
        const breakdownText = matchedTicket.items && matchedTicket.items.length > 0
          ? matchedTicket.items.map((it) => `${it.quantity}x ${it.label}`).join(', ')
          : `${matchedTicket.quantity}x ${matchedTicket.label}`;

        setActiveScanFeedback({
          id: `fb-${Date.now()}`,
          status: 'warning',
          category: 'ESPECTADOR',
          title: '⚠️ ¡ALERTA: PAGO PENDIENTE! Entrada Separada vía Web',
          message: `El boleto de ${matchedTicket.buyerName} está SEPARADO y debe abonar S/ ${matchedTicket.totalAmount.toFixed(2)} en puerta (${breakdownText} · Total ${matchedTicket.quantity} pers.).`,
          detail: `ID:${matchedTicket.id}|TOTAL:${matchedTicket.totalAmount}|BUYER:${matchedTicket.buyerName}`,
          timestamp: nowTime,
          qrCode: code,
        });
      } else {
        const breakdownText = matchedTicket.items && matchedTicket.items.length > 0
          ? matchedTicket.items.map((it) => `${it.quantity}x ${it.label}`).join(', ')
          : `${matchedTicket.quantity}x ${matchedTicket.label}`;

        setActiveScanFeedback({
          id: `fb-${Date.now()}`,
          status: 'success',
          category: 'ESPECTADOR',
          title: '¡ACCESO PERMITIDO - ENTRADA PAGADA!',
          message: `${matchedTicket.buyerName} (${breakdownText} · Total ${matchedTicket.quantity} personas) — Cancelado vía ${matchedTicket.paymentMethod}. Total: S/ ${matchedTicket.totalAmount.toFixed(2)}`,
          detail: `DNI/Tel: ${matchedTicket.buyerDni || matchedTicket.buyerPhone || 'Registrado'} · Habilitado en Tribuna`,
          timestamp: nowTime,
          qrCode: code,
        });
      }
      setShowScanFeedbackModal(true);
      sendAction('PROCESS_QR_SCAN', {
        tournamentId: activeTournament.id,
        qrCode: code,
        quantity: qty,
        registeredBy: roleName,
      });
      return;
    }

    // 3. Check Spectator Tier
    const matchedTier = activeTournamentState.spectatorTiers.find(
      (t) => t.qrCode.toUpperCase() === code
    );
    if (matchedTier) {
      const totalAmount = matchedTier.price * qty;
      setActiveScanFeedback({
        id: `fb-${Date.now()}`,
        status: 'success',
        category: 'ESPECTADOR',
        title: 'Ingreso de Espectador Registrado',
        message: `+${qty} ${matchedTier.label} (${matchedTier.isChild ? 'Niño / Menor' : 'Adulto / General'}) — Total: S/ ${totalAmount.toFixed(2)}`,
        timestamp: nowTime,
        qrCode: code,
      });
      setShowScanFeedbackModal(true);
      sendAction('PROCESS_QR_SCAN', {
        tournamentId: activeTournament.id,
        qrCode: code,
        quantity: qty,
        registeredBy: roleName,
      });
      return;
    }

    // 4. Check Beverage
    const matchedBev = activeTournamentState.beverages.find(
      (b) => b.qrCode.toUpperCase() === code
    );
    if (matchedBev) {
      setActiveScanBeverage(matchedBev);
      if (matchedBev.stock < qty) {
        setActiveScanFeedback({
          id: `fb-${Date.now()}`,
          status: 'error',
          category: 'BEBIDA',
          title: `Stock insuficiente de ${matchedBev.name}`,
          message: `Solo quedan ${matchedBev.stock} unidades disponibles en inventario.`,
          timestamp: nowTime,
          qrCode: code,
        });
      } else {
        const totalAmount = matchedBev.price * qty;
        setActiveScanFeedback({
          id: `fb-${Date.now()}`,
          status: 'success',
          category: 'BEBIDA',
          title: `Venta de ${matchedBev.name} Registrada`,
          message: `${qty} × ${matchedBev.name} (${matchedBev.presentation}) — Total: S/ ${totalAmount.toFixed(2)}`,
          timestamp: nowTime,
          qrCode: code,
        });
      }
      setShowScanFeedbackModal(true);
      sendAction('PROCESS_QR_SCAN', {
        tournamentId: activeTournament.id,
        qrCode: code,
        quantity: qty,
        registeredBy: roleName,
      });
      return;
    }

    // 5. Unknown QR Code
    setActiveScanFeedback({
      id: `fb-${Date.now()}`,
      status: 'error',
      category: 'DESCONOCIDO',
      title: 'Código QR no reconocido',
      message: `El código "${code}" no está registrado en este torneo.`,
      timestamp: nowTime,
      qrCode: code,
    });
    setShowScanFeedbackModal(true);
    sendAction('PROCESS_QR_SCAN', {
      tournamentId: activeTournament.id,
      qrCode: code,
      quantity: qty,
      registeredBy: roleName,
    });
  };

  const handleConfirmDoorPaymentFromModal = (ticketId: string, paymentMethod: PaymentMethod) => {
    const roleName = currentUser?.displayName || 'Operador Puerta';
    sendAction('CONFIRM_DOOR_PAYMENT_AND_CHECKIN', {
      tournamentId: activeTournament.id,
      ticketId,
      paymentMethod,
      operatorName: roleName,
    });
    if (activeScanFeedback) {
      setActiveScanFeedback({
        ...activeScanFeedback,
        status: 'success',
        title: '¡PAGO COBRADO EN PUERTA E INGRESO REGISTRADO!',
        message: `Pago registrado vía ${paymentMethod}. Acceso a tribuna habilitado.`,
      });
    }
  };

  // Players Actions
  const handleAddPlayer = (
    playerData: Omit<Player, 'id' | 'qrCode' | 'checkedIn' | 'duplicateAttempts'>
  ) => {
    const currentList = activeTournamentState.players;
    const nextNum = currentList.length + 1;
    const qrCode = `JUG-${String(nextNum).padStart(3, '0')}`;
    const newPlayer: Player = {
      ...playerData,
      id: `p-${Date.now()}`,
      qrCode,
      checkedIn: false,
      duplicateAttempts: 0,
    };
    sendAction('ADD_PLAYER', {
      tournamentId: activeTournament.id,
      player: newPlayer,
    });
  };

  const handleUpdatePlayer = (player: Player) => {
    sendAction('UPDATE_PLAYER', {
      tournamentId: activeTournament.id,
      player,
    });
  };

  const handleDeletePlayer = (playerId: string) => {
    sendAction('DELETE_PLAYER', {
      tournamentId: activeTournament.id,
      playerId,
    });
  };

  // Spectator Tiers Actions
  const handleRegisterSpectator = (tierType: string, quantity: number) => {
    const tier = activeTournamentState.spectatorTiers.find((t) => t.type === tierType);
    if (tier) {
      handleProcessQr(tier.qrCode, quantity);
    }
  };

  const handleUpdateTierPrice = (
    tierId: string,
    newPrice: number,
    label?: string,
    description?: string,
    enabled?: boolean
  ) => {
    sendAction('UPDATE_TICKET_PRICE', {
      tournamentId: activeTournament.id,
      tierId,
      price: newPrice,
      label,
      description,
      enabled,
    });
  };

  const handleAddTicketTier = (tier: SpectatorTier) => {
    sendAction('ADD_TICKET_TIER', {
      tournamentId: activeTournament.id,
      tier,
    });
  };

  const handleDeleteTicketTier = (tierId: string) => {
    sendAction('DELETE_TICKET_TIER', {
      tournamentId: activeTournament.id,
      tierId,
    });
  };

  // Beverages Actions
  const handleSellBeverage = (
    beverageId: string,
    quantity: number,
    buyerNote?: string
  ) => {
    const bev = activeTournamentState.beverages.find((b) => b.id === beverageId);
    if (bev) {
      handleProcessQr(bev.qrCode, quantity);
    }
  };

  const handleUpdateBeverage = (
    beverageId: string,
    price: number,
    stock: number,
    name?: string,
    presentation?: string
  ) => {
    sendAction('UPDATE_BEVERAGE', {
      tournamentId: activeTournament.id,
      beverageId,
      price,
      stock,
      name,
      presentation,
    });
  };

  const handleAddBeverage = (beverage: BeverageProduct) => {
    sendAction('ADD_BEVERAGE', {
      tournamentId: activeTournament.id,
      beverage,
    });
  };

  const handleDeleteBeverage = (beverageId: string) => {
    sendAction('DELETE_BEVERAGE', {
      tournamentId: activeTournament.id,
      beverageId,
    });
  };

  // General Expenses Actions (Admin)
  const handleAddExpense = (expense: ExpenseItem) => {
    sendAction('ADD_EXPENSE', {
      tournamentId: activeTournament.id,
      expense,
    });
  };

  const handleUpdateExpense = (expense: ExpenseItem) => {
    sendAction('UPDATE_EXPENSE', {
      tournamentId: activeTournament.id,
      expense,
    });
  };

  const handleDeleteExpense = (expenseId: string) => {
    sendAction('DELETE_EXPENSE', {
      tournamentId: activeTournament.id,
      expenseId,
    });
  };

  // Reset System to Zero (Admin)
  const handleResetDataToZero = () => {
    sendAction('RESET_ALL_DATA_TO_ZERO', {
      tournamentId: activeTournament.id,
    });
  };

  // Portal Público de Publicidad, Campeonatos y Boletería Directa cuando no hay sesión de control iniciada
  if (!currentUser) {
    return (
      <>
        {portalView === 'store' ? (
          <PublicTicketStore
            tournaments={serverData.tournaments}
            activeTournament={activeTournament}
            activeTournamentState={activeTournamentState}
            systemConfig={systemConfig}
            onSelectTournament={handleSelectTournament}
            onCreateTicket={(ticket) => {
              sendAction('CREATE_DIGITAL_TICKET', {
                tournamentId: activeTournament.id,
                ticket,
              });
            }}
            onBackToLogin={() => setPortalView('portal')}
            backLabel="← Volver al Portal"
            onUpdateEventDays={(tournamentId, eventDays) => {
              sendAction('UPDATE_EVENT_DAYS', {
                tournamentId,
                eventDays,
              });
            }}
            isAdmin={false}
          />
        ) : (
          <PublicPortal
            tournaments={serverData.tournaments}
            statesByTournament={serverData.statesByTournament}
            activeTournamentId={activeTournament.id}
            systemConfig={systemConfig}
            onSelectTournamentToBuy={(tournamentId) => {
              handleSelectTournament(tournamentId);
              setPortalView('store');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onOpenStaffLogin={() => setShowStaffLoginModal(true)}
          />
        )}

        {showStaffLoginModal && (
          <LoginModal
            systemConfig={systemConfig}
            users={users}
            onLoginSuccess={handleLoginSuccess}
            onClose={() => setShowStaffLoginModal(false)}
          />
        )}
      </>
    );
  }

  // Portal de Compradores / Aficionados Invitados
  if (currentUser?.role === 'INVITADO_VENTA') {
    return (
      <PublicTicketStore
        tournaments={serverData.tournaments}
        activeTournament={activeTournament}
        activeTournamentState={activeTournamentState}
        systemConfig={systemConfig}
        onSelectTournament={handleSelectTournament}
        onCreateTicket={(ticket) => {
          sendAction('CREATE_DIGITAL_TICKET', {
            tournamentId: activeTournament.id,
            ticket,
          });
        }}
        onBackToLogin={handleLogout}
        onUpdateEventDays={(tournamentId, eventDays) => {
          sendAction('UPDATE_EVENT_DAYS', {
            tournamentId,
            eventDays,
          });
        }}
        isAdmin={isAdmin}
      />
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] text-slate-900 font-sans w-full max-w-full overflow-x-hidden">
      {/* Top Bar Principal (Azul Marino Profundo #0A192F con borde Rojo #DC2626) */}
      <header className="no-print bg-[#0A192F] text-white border-b-2 border-red-600 sticky top-0 z-30 shadow-md w-full max-w-full">
        {/* Fila 1: Logo Corporativo + Identidad + Controles Rápidos */}
        <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2 sm:py-0 sm:h-16 flex flex-wrap items-center justify-between gap-2 sm:gap-4 w-full">
          {/* Zona 1: Logo Corporativo JJ y Estación de Usuario */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0 min-w-0">
            <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl overflow-hidden bg-white p-0.5 border border-slate-700 shadow-sm shrink-0 flex items-center justify-center">
              <CorporateLogo
                src={systemConfig.logoUrl}
                alt="Escudo Corporativo JJ"
                className="w-full h-full object-cover rounded-lg"
              />
            </div>

            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-sm sm:text-base font-bold tracking-tight text-white leading-tight truncate max-w-[130px] xs:max-w-[175px] sm:max-w-none font-display">
                  {systemConfig.systemName}
                </span>

                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => setShowConfigModal(true)}
                    className="p-1 text-slate-400 hover:text-white rounded-md hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
                    title="Configurar nombre o logo del sistema"
                  >
                    <Settings className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Indicador de Estación/Rol en Modo Móvil y Desktop */}
              <div className="flex items-center gap-1 text-[10px] leading-tight font-medium">
                {currentRole === 'CONTROL_JUGADORES' && (
                  <span className="text-blue-400 font-semibold truncate flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
                    Estación Jugadores
                  </span>
                )}
                {currentRole === 'CONTROL_ESPECTADORES' && (
                  <span className="text-emerald-400 font-semibold truncate flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                    Estación Espectadores
                  </span>
                )}
                {currentRole === 'CONTROL_BEBIDAS' && (
                  <span className="text-amber-400 font-semibold truncate flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                    Estación Bebidas
                  </span>
                )}
                {isAdmin && (
                  <span className="text-red-300 font-semibold truncate flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
                    Administrador General
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Zona 2: Botón Restablecer (Admin) + Cámara en Vivo + Nube + Avatar + Logout */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 ml-auto">
            {isAdmin && (
              <button
                type="button"
                onClick={() => {
                  setGlobalResetPhrase('');
                  setShowGlobalResetModal(true);
                }}
                className="px-2 sm:px-3 py-1.5 bg-slate-800 hover:bg-red-700 text-red-300 hover:text-white border border-red-500/40 text-xs font-bold rounded-lg transition-all cursor-pointer shadow-xs flex items-center gap-1.5 min-h-[36px]"
                title="Restablecer todos los contadores del torneo activo a cero"
              >
                <RotateCcw className="w-3.5 h-3.5 shrink-0" />
                <span className="hidden xs:inline">Restablecer</span>
              </button>
            )}

            {/* Botón de Escaneo con Cámara (Accesible para TODOS los usuarios) */}
            <button
              type="button"
              onClick={() => setShowGlobalCamera(true)}
              className="px-2.5 sm:px-3 py-1.5 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white text-xs font-bold rounded-lg transition-all cursor-pointer shadow-sm flex items-center gap-1.5 min-h-[36px]"
              title="Abrir cámara del celular para escanear QR"
            >
              <Camera className="w-4 h-4" />
              <span className="hidden sm:inline">Escanear QR</span>
            </button>

            {/* Estado Nube / Vercel Interactivo */}
            <button
              type="button"
              onClick={() => setShowConnectionModal(true)}
              className="flex items-center gap-1.5 px-2 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-lg text-xs font-mono-tabular shrink-0 cursor-pointer transition-colors min-h-[36px]"
              title={
                isConnected
                  ? `Conectado a la nube (${serverData.connectedClientsCount || 1} online) · Clic para ver detalles`
                  : isVercelOrLocal
                  ? 'Modo Local / Vercel (Almacenamiento Local Activo) · Clic para ver detalles'
                  : 'Intentando conectar con el servidor · Clic para ver detalles'
              }
            >
              <span
                className={`w-2 h-2 rounded-full shrink-0 ${
                  isConnected
                    ? 'bg-emerald-400'
                    : isVercelOrLocal
                    ? 'bg-blue-400'
                    : 'bg-amber-400 animate-pulse'
                }`}
              />
              <span className="text-slate-300 text-[11px] hidden md:inline">
                {isConnected ? 'Nube' : isVercelOrLocal ? 'Vercel / Local' : 'Reconectando'}
              </span>
            </button>

            {/* Usuario Actual */}
            <div className="flex items-center gap-1 pl-1 border-l border-slate-700">
              <div
                className="w-7 h-7 sm:w-8 sm:h-8 rounded-full text-white flex items-center justify-center text-xs font-bold shrink-0 border border-slate-600"
                style={{ backgroundColor: currentUser.avatarColor || '#0A192F' }}
                title={`${currentUser.displayName} (@${currentUser.username})`}
              >
                {currentUser.username.slice(0, 2).toUpperCase()}
              </div>

              <div className="hidden xl:flex flex-col text-left">
                <span className="text-xs font-bold text-white leading-tight">
                  {currentUser.displayName}
                </span>
                <span className="text-[10px] text-slate-300 font-mono-tabular">
                  @{currentUser.username}
                </span>
              </div>

              <button
                type="button"
                onClick={handleLogout}
                className="p-1.5 text-slate-400 hover:text-red-400 rounded-md hover:bg-slate-800 transition-colors cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center"
                title="Cerrar sesión"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Fila 2: Sub-Barra de Torneo Ordenada en Celular y PC */}
        <div className="bg-[#050D1A] border-t border-slate-800/80 px-3 sm:px-6 py-1.5 w-full max-w-full">
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs">
            {/* Lado Izquierdo: Torneo */}
            <div className="flex items-center gap-1.5 min-w-0">
              <Trophy className="w-3.5 h-3.5 text-red-500 shrink-0" />
              <span className="text-[10px] sm:text-xs font-semibold text-slate-400 uppercase tracking-tight shrink-0">
                Torneo:
              </span>
              {isAdmin ? (
                <select
                  value={activeTournament.id}
                  onChange={(e) => handleSelectTournament(e.target.value)}
                  className="px-2 py-0.5 font-semibold text-white bg-slate-900 border border-slate-700 rounded-md focus:outline-none focus:ring-1 focus:ring-red-500 shadow-2xs text-xs truncate max-w-[180px] sm:max-w-none"
                >
                  {serverData.tournaments.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.edition})
                    </option>
                  ))}
                </select>
              ) : (
                <span className="text-white font-bold truncate text-[11px] sm:text-xs">
                  {activeTournament.name} ({activeTournament.edition})
                </span>
              )}
            </div>

            {/* Lado Derecho: Sede y Fecha */}
            <div className="flex items-center gap-1.5 text-slate-300 text-[10px] sm:text-[11px] shrink-0">
              <span className="truncate max-w-[120px] sm:max-w-none">
                {activeTournament.venue}
              </span>
              <span aria-hidden="true" className="text-slate-500">·</span>
              <span className="font-mono-tabular">{activeTournament.date}</span>
              {isAdmin && (
                <>
                  <span aria-hidden="true" className="text-slate-500 hidden sm:inline">·</span>
                  <button
                    type="button"
                    onClick={() => setActiveTab('usuarios')}
                    className="text-red-400 hover:text-red-300 font-semibold cursor-pointer underline underline-offset-2 hidden sm:inline"
                  >
                    Usuarios ({users.length})
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Fila 3: Barra Completa de Módulos (Visible y Ajustada tanto en Móvil como en PC sin recortes) */}
        {isAdmin && (
          <nav
            aria-label="Módulos del sistema"
            className="border-t border-slate-800 bg-[#0A192F] w-full max-w-full"
          >
            <div className="max-w-7xl mx-auto px-2.5 sm:px-6 py-1.5 flex items-center gap-1.5 overflow-x-auto lg:flex-wrap no-scrollbar">
              {(
                [
                  ['resumen', 'Principal', LayoutDashboard, ''],
                  ['boletos', `Boletos Web (${(activeTournamentState.digitalTickets || []).length})`, Ticket, 'text-emerald-300'],
                  ['jugadores', 'Jugadores', Users, ''],
                  ['espectadores', 'Espectadores', Ticket, ''],
                  ['bebidas', 'Bebidas', CupSoda, ''],
                  ['gastos', 'Gastos', Receipt, ''],
                  ['reporte', 'Reporte General', FileSpreadsheet, ''],
                  ['torneos', 'Torneos', Trophy, ''],
                  ['portal', 'Publicidad', Megaphone, 'text-amber-300'],
                  ['usuarios', `Usuarios (${users.length})`, UserCog, 'text-red-300'],
                ] as [ActiveTab, string, any, string][]
              ).map(([tabKey, label, Icon, accent]) => (
                <button
                  key={tabKey}
                  type="button"
                  onClick={() => setActiveTab(tabKey)}
                  className={`inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                    activeTab === tabKey
                      ? 'bg-red-600 text-white font-bold shadow-xs'
                      : `${accent || 'text-slate-300'} hover:text-white hover:bg-slate-800`
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span>{label}</span>
                </button>
              ))}
            </div>
          </nav>
        )}
      </header>

      {/* Main Content Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 py-4 sm:py-6 min-w-0">
        {/* VISTAS AISLADAS SEGÚN EL ROL DE USUARIO */}
        {/* Caso 1: ADMIN - Puede ver cualquier tab seleccionada */}
        {isAdmin && (
          <>
            {activeTab === 'resumen' && (
              <SummaryDashboard
                tournament={activeTournament}
                players={activeTournamentState.players}
                spectatorTiers={activeTournamentState.spectatorTiers}
                spectatorEntries={activeTournamentState.spectatorEntries}
                beverages={activeTournamentState.beverages}
                beverageSales={activeTournamentState.beverageSales}
                expenses={activeTournamentState.expenses || []}
                lastFeedback={activeTournamentState.scanHistory[0] || null}
                currentUserRole={currentRole}
                currentUserName={currentUser.displayName}
                connectedClientsCount={serverData.connectedClientsCount}
                onQuickScan={handleProcessQr}
                onOpenGlobalCamera={() => setShowGlobalCamera(true)}
                onGoToPlayers={() => setActiveTab('jugadores')}
                onGoToSpectators={() => setActiveTab('espectadores')}
                onGoToBeverages={() => setActiveTab('bebidas')}
                onGoToExpenses={() => setActiveTab('gastos')}
                onGoToReport={() => setActiveTab('reporte')}
                onGoToTournaments={() => setActiveTab('torneos')}
                onResetAllData={handleResetDataToZero}
              />
            )}

            {activeTab === 'gastos' && (
              <ExpensesManager
                tournamentId={activeTournament.id}
                tournamentName={activeTournament.name}
                expenses={activeTournamentState.expenses || []}
                currentUserRole={currentRole}
                currentUserName={currentUser.displayName}
                onAddExpense={handleAddExpense}
                onUpdateExpense={handleUpdateExpense}
                onDeleteExpense={handleDeleteExpense}
              />
            )}

            {activeTab === 'reporte' && (
              <GeneralReport
                tournament={activeTournament}
                players={activeTournamentState.players}
                spectatorTiers={activeTournamentState.spectatorTiers}
                spectatorEntries={activeTournamentState.spectatorEntries}
                beverages={activeTournamentState.beverages}
                beverageSales={activeTournamentState.beverageSales}
                expenses={activeTournamentState.expenses || []}
                digitalTickets={activeTournamentState.digitalTickets || []}
              />
            )}

            {activeTab === 'boletos' && (
              <DigitalTicketsManager
                tournament={activeTournament}
                tournamentState={activeTournamentState}
                systemConfig={systemConfig}
                isAdmin={isAdmin}
                onConfirmDoorPayment={(ticketId, paymentMethod) => {
                  sendAction('CONFIRM_DOOR_PAYMENT_AND_CHECKIN', {
                    tournamentId: activeTournament.id,
                    ticketId,
                    paymentMethod,
                    registeredBy: currentUser.displayName,
                  });
                }}
                onDeleteTicket={(ticketId) => {
                  sendAction('DELETE_DIGITAL_TICKET', {
                    tournamentId: activeTournament.id,
                    ticketId,
                  });
                }}
                onResetTicketAttendance={(ticketId) => {
                  sendAction('RESET_TICKET_ATTENDANCE', {
                    tournamentId: activeTournament.id,
                    ticketId,
                  });
                }}
                onOpenStoreModal={() => setShowStoreModal(true)}
              />
            )}

            {activeTab === 'jugadores' && (
              <PlayersManager
                tournamentId={activeTournament.id}
                players={activeTournamentState.players}
                currentUserRole={currentRole}
                onAddPlayer={handleAddPlayer}
                onUpdatePlayer={handleUpdatePlayer}
                onDeletePlayer={handleDeletePlayer}
                onClearAttendance={(playerId) => {
                  sendAction('CLEAR_PLAYER_ATTENDANCE', {
                    tournamentId: activeTournament.id,
                    playerId,
                  });
                }}
                onScanPlayer={(qrCode) => handleProcessQr(qrCode, 1)}
              />
            )}

            {activeTab === 'espectadores' && (
              <SpectatorsManager
                tournamentId={activeTournament.id}
                tournament={activeTournament}
                systemConfig={systemConfig}
                tiers={activeTournamentState.spectatorTiers}
                entries={activeTournamentState.spectatorEntries}
                currentUserRole={currentRole}
                onRegisterSpectator={handleRegisterSpectator}
                onUpdateTierPrice={handleUpdateTierPrice}
                onAddTicketTier={handleAddTicketTier}
                onDeleteTicketTier={handleDeleteTicketTier}
                onSellVenueTicket={(ticket) => {
                  sendAction('CREATE_DIGITAL_TICKET', {
                    tournamentId: activeTournament.id,
                    ticket,
                  });
                }}
                onDeleteSpectatorEntry={(entryId) => {
                  sendAction('DELETE_SPECTATOR_ENTRY', {
                    tournamentId: activeTournament.id,
                    entryId,
                  });
                }}
              />
            )}

            {activeTab === 'bebidas' && (
              <BeveragesManager
                tournamentId={activeTournament.id}
                beverages={activeTournamentState.beverages}
                sales={activeTournamentState.beverageSales}
                currentUserRole={currentRole}
                onSellBeverage={handleSellBeverage}
                onUpdateBeverage={handleUpdateBeverage}
                onAddBeverage={handleAddBeverage}
                onDeleteBeverage={handleDeleteBeverage}
              />
            )}

            {activeTab === 'torneos' && (
              <TournamentsManager
                tournaments={serverData.tournaments}
                activeTournamentId={serverData.activeTournamentId}
                currentUserRole={currentRole}
                statesByTournament={serverData.statesByTournament}
                onSelectTournament={handleSelectTournament}
                onCreateTournament={handleCreateTournament}
                onUpdateTournament={handleUpdateTournament}
                onDeleteTournament={handleDeleteTournament}
                onUpdateEventDays={(tournamentId, eventDays) => {
                  sendAction('UPDATE_EVENT_DAYS', {
                    tournamentId,
                    eventDays,
                  });
                }}
              />
            )}

            {activeTab === 'portal' && (
              <PortalContentManager
                config={systemConfig}
                tournaments={serverData.tournaments}
                onUpdateConfig={handleUpdateConfig}
              />
            )}

            {activeTab === 'usuarios' && (
              <UsersManager
                users={users}
                currentUserId={currentUser.id}
                onCreateUser={handleCreateUser}
                onUpdateUser={handleUpdateUser}
                onDeleteUser={handleDeleteUser}
              />
            )}
          </>
        )}

        {/* Caso 2: CONTROL_JUGADORES - SOLO SE VISUALIZA JUGADORES */}
        {currentRole === 'CONTROL_JUGADORES' && (
          <PlayersManager
            tournamentId={activeTournament.id}
            players={activeTournamentState.players}
            currentUserRole={currentRole}
            onAddPlayer={handleAddPlayer}
            onUpdatePlayer={handleUpdatePlayer}
            onDeletePlayer={handleDeletePlayer}
            onScanPlayer={(qrCode) => handleProcessQr(qrCode, 1)}
          />
        )}

        {/* Caso 3: CONTROL_ESPECTADORES - SOLO SE VISUALIZA ESPECTADORES */}
        {currentRole === 'CONTROL_ESPECTADORES' && (
          <SpectatorsManager
            tournamentId={activeTournament.id}
            tournament={activeTournament}
            systemConfig={systemConfig}
            tiers={activeTournamentState.spectatorTiers}
            entries={activeTournamentState.spectatorEntries}
            currentUserRole={currentRole}
            onRegisterSpectator={handleRegisterSpectator}
            onUpdateTierPrice={handleUpdateTierPrice}
            onAddTicketTier={handleAddTicketTier}
            onDeleteTicketTier={handleDeleteTicketTier}
            onSellVenueTicket={(ticket) => {
              sendAction('CREATE_DIGITAL_TICKET', {
                tournamentId: activeTournament.id,
                ticket,
              });
            }}
          />
        )}

        {/* Caso 4: CONTROL_BEBIDAS - SOLO SE VISUALIZA BEBIDAS */}
        {currentRole === 'CONTROL_BEBIDAS' && (
          <BeveragesManager
            tournamentId={activeTournament.id}
            beverages={activeTournamentState.beverages}
            sales={activeTournamentState.beverageSales}
            currentUserRole={currentRole}
            onSellBeverage={handleSellBeverage}
            onUpdateBeverage={handleUpdateBeverage}
            onAddBeverage={handleAddBeverage}
            onDeleteBeverage={handleDeleteBeverage}
          />
        )}
      </main>

      {/* Modal Global de Escaneo con Cámara (disponible para todos desde el Header) */}
      <CameraQrModal
        isOpen={showGlobalCamera}
        onClose={() => setShowGlobalCamera(false)}
        onScan={(code) => {
          handleProcessQr(code, 1);
        }}
        title={`Escáner Cámara — ${
          currentRole === 'CONTROL_JUGADORES'
            ? 'Asistencia de Jugadores'
            : currentRole === 'CONTROL_ESPECTADORES'
            ? 'Boletos y Entradas'
            : currentRole === 'CONTROL_BEBIDAS'
            ? 'Venta de Bebidas'
            : 'Auto-Distribución Inteligente'
        }`}
        subtitle="Apunta la cámara al código QR"
        scanCategory={
          currentRole === 'CONTROL_JUGADORES'
            ? 'JUGADOR'
            : currentRole === 'CONTROL_ESPECTADORES'
            ? 'ESPECTADOR'
            : currentRole === 'CONTROL_BEBIDAS'
            ? 'BEBIDA'
            : 'GENERAL'
        }
      />

      {/* Modal de Retroalimentación de Escaneo, Asistencia, Pagos y Bloqueo de Duplicados */}
      <ScanFeedbackModal
        isOpen={showScanFeedbackModal}
        onClose={() => setShowScanFeedbackModal(false)}
        feedback={activeScanFeedback}
        ticket={activeScanTicket}
        player={activeScanPlayer}
        beverage={activeScanBeverage}
        onConfirmDoorPayment={handleConfirmDoorPaymentFromModal}
      />

      {/* Modal de Configuración del Nombre del Sistema y Logo JJ */}
      {showConfigModal && isAdmin && (
        <SystemSettingsModal
          config={systemConfig}
          onUpdateConfig={handleUpdateConfig}
          onResetAllData={() => {
            setGlobalResetPhrase('');
            setShowGlobalResetModal(true);
          }}
          onClose={() => setShowConfigModal(false)}
        />
      )}

      {/* Modal Global de Confirmación: Restablecer Sistema a Cero */}
      {showGlobalResetModal && isAdmin && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-start sm:items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 sm:p-6 space-y-4 border border-slate-200 shadow-2xl max-h-[92vh] overflow-y-auto my-auto">
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
                    Torneo activo: {activeTournament.name}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowGlobalResetModal(false)}
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
                <li><strong>Espectadores y Boletos:</strong> Historial de boletos, QR digitales y conteos a 0.</li>
                <li><strong>Bebidas:</strong> Unidades vendidas a 0 y ventas reiniciadas.</li>
                <li><strong>Gastos:</strong> Lista de gastos operativos reiniciada a 0.</li>
              </ul>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700">
                Para confirmar, escribe <span className="font-mono text-red-600 font-bold">CONFIRMAR</span>:
              </label>
              <input
                type="text"
                value={globalResetPhrase}
                onChange={(e) => setGlobalResetPhrase(e.target.value)}
                placeholder="Escribe CONFIRMAR"
                className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowGlobalResetModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={globalResetPhrase.trim().toUpperCase() !== 'CONFIRMAR'}
                onClick={() => {
                  handleResetDataToZero();
                  setShowGlobalResetModal(false);
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

      {/* Modal de Estado de Conexión, Vercel y Servidor en la Nube */}
      <ConnectionGuideModal
        isOpen={showConnectionModal}
        onClose={() => setShowConnectionModal(false)}
        isConnected={isConnected}
        isVercelOrLocal={isVercelOrLocal}
        connectedClientsCount={serverData.connectedClientsCount}
        customWsUrl={customWsUrl}
        onSaveCustomWsUrl={setCustomWsUrl}
      />

      {/* Modal de Tienda de Boletos Online / Reserva (Modo Operador / Demo) */}
      {showStoreModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col border border-slate-700">
            <div className="p-3 bg-[#0A192F] text-white flex items-center justify-between border-b border-red-600">
              <span className="font-bold text-sm flex items-center gap-2">
                <Ticket className="w-4 h-4 text-emerald-400" />
                Portal de Venta Online y Reserva de Boletos
              </span>
              <button
                type="button"
                onClick={() => setShowStoreModal(false)}
                className="text-slate-400 hover:text-white px-2.5 py-1 rounded-md text-xs font-bold hover:bg-slate-800 transition-colors cursor-pointer"
              >
                ✕ Cerrar
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-2 sm:p-4 bg-slate-50">
              <PublicTicketStore
                tournaments={serverData.tournaments}
                activeTournament={activeTournament}
                activeTournamentState={activeTournamentState}
                systemConfig={systemConfig}
                onSelectTournament={handleSelectTournament}
                onCreateTicket={(ticket) => {
                  sendAction('CREATE_DIGITAL_TICKET', {
                    tournamentId: activeTournament.id,
                    ticket,
                  });
                  setShowStoreModal(false);
                }}
                onBackToLogin={() => setShowStoreModal(false)}
                onUpdateEventDays={(tournamentId, eventDays) => {
                  sendAction('UPDATE_EVENT_DAYS', {
                    tournamentId,
                    eventDays,
                  });
                }}
                isAdmin={isAdmin}
              />
            </div>
          </div>
        </div>
      )}

      {/* Footer Corporativo Oficial */}
      <footer className="no-print border-t border-slate-200 bg-white py-3 px-3 sm:px-6 mt-auto w-full max-w-full">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-1.5 sm:gap-2">
            <span className="font-bold text-slate-800">{systemConfig.systemName}</span>
            <span aria-hidden="true">·</span>
            <span>Estación: <strong>{currentUser.displayName}</strong></span>
            {lastSyncTime && (
              <>
                <span aria-hidden="true" className="hidden sm:inline">·</span>
                <span className="font-mono-tabular hidden sm:inline">Sync: {lastSyncTime}</span>
              </>
            )}
          </div>

          {isAdmin && (
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setShowConfigModal(true)}
                className="text-slate-600 hover:text-slate-900 underline underline-offset-2 cursor-pointer"
              >
                Personalizar marca y logo
              </button>
            </div>
          )}
        </div>
      </footer>
    </div>
  );
}

export default App;
