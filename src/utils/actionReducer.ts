import {
  AppServerData,
  Tournament,
  Player,
  SpectatorTier,
  BeverageProduct,
  AuthUser,
  ScanFeedback,
} from '../types/championship';
import { createInitialTournamentState } from '../data/initialData';

export function applyAppAction(
  currentState: AppServerData,
  action: { type: string; payload: any }
): AppServerData {
  const { type, payload } = action;

  // Clone top-level structure to ensure immutability
  const nextState: AppServerData = {
    ...currentState,
    config: { ...currentState.config },
    users: [...currentState.users],
    tournaments: [...currentState.tournaments],
    statesByTournament: { ...currentState.statesByTournament },
  };

  switch (type) {
    case 'IDENTIFY_USER': {
      // In local mode, we don't need socket presence tracking
      return nextState;
    }

    case 'UPDATE_SYSTEM_CONFIG': {
      nextState.config = {
        ...nextState.config,
        ...payload.config,
      };
      return nextState;
    }

    case 'CREATE_USER': {
      const newUser: AuthUser = payload.user;
      if (!nextState.users.some((u) => u.username.toLowerCase() === newUser.username.toLowerCase())) {
        nextState.users = [...nextState.users, newUser];
      }
      return nextState;
    }

    case 'UPDATE_USER': {
      const updatedUser: AuthUser = payload.user;
      nextState.users = nextState.users.map((u) => (u.id === updatedUser.id ? { ...u, ...updatedUser } : u));
      return nextState;
    }

    case 'DELETE_USER': {
      const { userId } = payload;
      if (nextState.users.length > 1) {
        const target = nextState.users.find((u) => u.id === userId);
        if (target && target.username.toLowerCase() !== 'admin') {
          nextState.users = nextState.users.filter((u) => u.id !== userId);
        }
      }
      return nextState;
    }

    case 'SELECT_TOURNAMENT': {
      if (nextState.statesByTournament[payload.tournamentId]) {
        nextState.activeTournamentId = payload.tournamentId;
      }
      return nextState;
    }

    case 'CREATE_TOURNAMENT': {
      const newTournament: Tournament = payload.tournament;
      nextState.tournaments = [newTournament, ...nextState.tournaments];
      nextState.statesByTournament[newTournament.id] = createInitialTournamentState(newTournament);
      nextState.activeTournamentId = newTournament.id;
      return nextState;
    }

    case 'DELETE_TOURNAMENT': {
      const { tournamentId } = payload;
      if (nextState.tournaments.length <= 1) return nextState;
      nextState.tournaments = nextState.tournaments.filter((t) => t.id !== tournamentId);
      delete nextState.statesByTournament[tournamentId];
      if (nextState.activeTournamentId === tournamentId) {
        nextState.activeTournamentId = nextState.tournaments[0].id;
      }
      return nextState;
    }

    case 'UPDATE_TOURNAMENT': {
      const updated: Tournament = payload.tournament;
      nextState.tournaments = nextState.tournaments.map((t) => (t.id === updated.id ? updated : t));
      if (nextState.statesByTournament[updated.id]) {
        nextState.statesByTournament[updated.id] = {
          ...nextState.statesByTournament[updated.id],
          tournament: updated,
        };
      }
      return nextState;
    }

    case 'PROCESS_QR_SCAN': {
      const { tournamentId, qrCode, quantity = 1, registeredBy } = payload;
      const tState = nextState.statesByTournament[tournamentId];
      if (!tState) return nextState;

      // Clone tournament state
      const state = {
        ...tState,
        players: [...tState.players],
        spectatorTiers: [...tState.spectatorTiers],
        spectatorEntries: [...tState.spectatorEntries],
        beverages: [...tState.beverages],
        beverageSales: [...tState.beverageSales],
        expenses: [...(tState.expenses || [])],
        scanHistory: [...tState.scanHistory],
      };
      nextState.statesByTournament[tournamentId] = state;

      const code = String(qrCode).trim().toUpperCase();
      const nowTime = new Date().toTimeString().slice(0, 8);
      const qty = Math.max(1, Number(quantity) || 1);

      // Check Player
      const pIdx = state.players.findIndex((p) => p.qrCode.toUpperCase() === code);
      if (pIdx !== -1) {
        const player = { ...state.players[pIdx] };
        if (player.checkedIn) {
          player.duplicateAttempts += 1;
          state.players[pIdx] = player;
          const feedback: ScanFeedback = {
            id: `fb-${Date.now()}`,
            status: 'duplicate',
            category: 'JUGADOR',
            title: '¡YA ESTÁ REGISTRADO! — Asistencia Duplicada Bloqueada',
            message: `El jugador ${player.name} (#${player.jerseyNumber} · ${player.team}) ya registró su ingreso a las ${player.checkInTime}.`,
            detail: 'El sistema impide ingresos duplicados por normativa de torneo.',
            timestamp: nowTime,
            qrCode: code,
          };
          state.scanHistory = [feedback, ...state.scanHistory];
          return nextState;
        }

        player.checkedIn = true;
        player.checkInTime = nowTime;
        state.players[pIdx] = player;
        const feedback: ScanFeedback = {
          id: `fb-${Date.now()}`,
          status: 'success',
          category: 'JUGADOR',
          title: 'Asistencia de Jugador Registrada',
          message: `${player.name} (#${player.jerseyNumber} · ${player.team}) habilitado en cancha oficial. Operador: ${registeredBy || 'Módulo'}`,
          timestamp: nowTime,
          qrCode: code,
        };
        state.scanHistory = [feedback, ...state.scanHistory];
        return nextState;
      }

      // Check Spectator Tier
      const matchedTier = state.spectatorTiers.find((t) => t.qrCode.toUpperCase() === code);
      if (matchedTier) {
        const totalAmount = matchedTier.price * qty;
        state.spectatorEntries = [
          {
            id: `se-${Date.now()}`,
            tournamentId,
            qrCode: matchedTier.qrCode,
            ticketType: matchedTier.type,
            label: matchedTier.label,
            price: matchedTier.price,
            isChild: matchedTier.isChild,
            quantity: qty,
            totalAmount,
            timestamp: nowTime,
            registeredBy: registeredBy || 'Módulo Espectadores',
          },
          ...state.spectatorEntries,
        ];
        const feedback: ScanFeedback = {
          id: `fb-${Date.now()}`,
          status: 'success',
          category: 'ESPECTADOR',
          title: 'Ingreso de Espectador Registrado',
          message: `+${qty} ${matchedTier.label} (${matchedTier.isChild ? 'Niño / Menor' : 'Adulto / General'}) — Total: S/ ${totalAmount.toFixed(2)}`,
          timestamp: nowTime,
          qrCode: code,
        };
        state.scanHistory = [feedback, ...state.scanHistory];
        return nextState;
      }

      // Check Beverage
      const bIdx = state.beverages.findIndex((b) => b.qrCode.toUpperCase() === code);
      if (bIdx !== -1) {
        const bev = { ...state.beverages[bIdx] };
        if (bev.stock < qty) {
          const feedback: ScanFeedback = {
            id: `fb-${Date.now()}`,
            status: 'error',
            category: 'BEBIDA',
            title: `Stock insuficiente de ${bev.name}`,
            message: `Solo quedan ${bev.stock} unidades disponibles en inventario.`,
            timestamp: nowTime,
            qrCode: code,
          };
          state.scanHistory = [feedback, ...state.scanHistory];
          return nextState;
        }

        bev.stock -= qty;
        bev.soldCount += qty;
        state.beverages[bIdx] = bev;
        const totalAmount = bev.price * qty;
        state.beverageSales = [
          {
            id: `bs-${Date.now()}`,
            tournamentId,
            beverageId: bev.id,
            beverageName: bev.name,
            qrCode: bev.qrCode,
            quantity: qty,
            unitPrice: bev.price,
            totalAmount,
            timestamp: nowTime,
            registeredBy: registeredBy || 'Módulo Bebidas',
          },
          ...state.beverageSales,
        ];
        const feedback: ScanFeedback = {
          id: `fb-${Date.now()}`,
          status: 'success',
          category: 'BEBIDA',
          title: `Venta de ${bev.name} Registrada`,
          message: `${qty} × ${bev.name} (${bev.presentation}) — Total: S/ ${totalAmount.toFixed(2)}`,
          timestamp: nowTime,
          qrCode: code,
        };
        state.scanHistory = [feedback, ...state.scanHistory];
        return nextState;
      }

      // Unknown
      const feedback: ScanFeedback = {
        id: `fb-${Date.now()}`,
        status: 'error',
        category: 'DESCONOCIDO',
        title: 'Código QR no reconocido',
        message: `El código "${code}" no está registrado en este torneo.`,
        timestamp: nowTime,
        qrCode: code,
      };
      state.scanHistory = [feedback, ...state.scanHistory];
      return nextState;
    }

    // CRUD PLAYERS
    case 'ADD_PLAYER': {
      const { tournamentId, player } = payload;
      const tState = nextState.statesByTournament[tournamentId];
      if (tState) {
        nextState.statesByTournament[tournamentId] = {
          ...tState,
          players: [player, ...tState.players],
        };
      }
      return nextState;
    }

    case 'UPDATE_PLAYER': {
      const { tournamentId, player } = payload;
      const tState = nextState.statesByTournament[tournamentId];
      if (tState) {
        nextState.statesByTournament[tournamentId] = {
          ...tState,
          players: tState.players.map((p) => (p.id === player.id ? { ...p, ...player } : p)),
        };
      }
      return nextState;
    }

    case 'DELETE_PLAYER': {
      const { tournamentId, playerId } = payload;
      const tState = nextState.statesByTournament[tournamentId];
      if (tState) {
        nextState.statesByTournament[tournamentId] = {
          ...tState,
          players: tState.players.filter((p) => p.id !== playerId),
        };
      }
      return nextState;
    }

    // CRUD TICKETS
    case 'UPDATE_TICKET_PRICE': {
      const { tournamentId, tierId, price, label, description } = payload;
      const tState = nextState.statesByTournament[tournamentId];
      if (tState) {
        nextState.statesByTournament[tournamentId] = {
          ...tState,
          spectatorTiers: tState.spectatorTiers.map((t) => {
            if (t.id === tierId) {
              return {
                ...t,
                price: price !== undefined ? Number(price) : t.price,
                label: label !== undefined ? label : t.label,
                description: description !== undefined ? description : t.description,
              };
            }
            return t;
          }),
        };
      }
      return nextState;
    }

    case 'ADD_TICKET_TIER': {
      const { tournamentId, tier } = payload;
      const tState = nextState.statesByTournament[tournamentId];
      if (tState) {
        nextState.statesByTournament[tournamentId] = {
          ...tState,
          spectatorTiers: [...tState.spectatorTiers, tier],
        };
      }
      return nextState;
    }

    case 'DELETE_TICKET_TIER': {
      const { tournamentId, tierId } = payload;
      const tState = nextState.statesByTournament[tournamentId];
      if (tState) {
        nextState.statesByTournament[tournamentId] = {
          ...tState,
          spectatorTiers: tState.spectatorTiers.filter((t) => t.id !== tierId),
        };
      }
      return nextState;
    }

    // CRUD BEVERAGES
    case 'UPDATE_BEVERAGE': {
      const { tournamentId, beverageId, price, stock, name, presentation } = payload;
      const tState = nextState.statesByTournament[tournamentId];
      if (tState) {
        nextState.statesByTournament[tournamentId] = {
          ...tState,
          beverages: tState.beverages.map((b) => {
            if (b.id === beverageId) {
              return {
                ...b,
                price: price !== undefined ? Number(price) : b.price,
                stock: stock !== undefined ? Number(stock) : b.stock,
                name: name !== undefined ? name : b.name,
                presentation: presentation !== undefined ? presentation : b.presentation,
              };
            }
            return b;
          }),
        };
      }
      return nextState;
    }

    case 'ADD_BEVERAGE': {
      const { tournamentId, beverage } = payload;
      const tState = nextState.statesByTournament[tournamentId];
      if (tState) {
        nextState.statesByTournament[tournamentId] = {
          ...tState,
          beverages: [...tState.beverages, beverage],
        };
      }
      return nextState;
    }

    case 'DELETE_BEVERAGE': {
      const { tournamentId, beverageId } = payload;
      const tState = nextState.statesByTournament[tournamentId];
      if (tState) {
        nextState.statesByTournament[tournamentId] = {
          ...tState,
          beverages: tState.beverages.filter((b) => b.id !== beverageId),
        };
      }
      return nextState;
    }

    // CRUD EXPENSES
    case 'ADD_EXPENSE': {
      const { tournamentId, expense } = payload;
      const tState = nextState.statesByTournament[tournamentId];
      if (tState) {
        nextState.statesByTournament[tournamentId] = {
          ...tState,
          expenses: [expense, ...(tState.expenses || [])],
        };
      }
      return nextState;
    }

    case 'UPDATE_EXPENSE': {
      const { tournamentId, expense } = payload;
      const tState = nextState.statesByTournament[tournamentId];
      if (tState && tState.expenses) {
        nextState.statesByTournament[tournamentId] = {
          ...tState,
          expenses: tState.expenses.map((e) => (e.id === expense.id ? { ...e, ...expense } : e)),
        };
      }
      return nextState;
    }

    case 'DELETE_EXPENSE': {
      const { tournamentId, expenseId } = payload;
      const tState = nextState.statesByTournament[tournamentId];
      if (tState && tState.expenses) {
        nextState.statesByTournament[tournamentId] = {
          ...tState,
          expenses: tState.expenses.filter((e) => e.id !== expenseId),
        };
      }
      return nextState;
    }

    case 'RESET_ALL_DATA_TO_ZERO': {
      const { tournamentId } = payload;
      const tState = nextState.statesByTournament[tournamentId];
      if (tState) {
        nextState.statesByTournament[tournamentId] = {
          ...tState,
          players: tState.players.map((p) => ({
            ...p,
            checkedIn: false,
            checkInTime: undefined,
            duplicateAttempts: 0,
          })),
          spectatorEntries: [],
          beverages: tState.beverages.map((b) => ({
            ...b,
            soldCount: 0,
          })),
          beverageSales: [],
          expenses: [],
          scanHistory: [],
        };
      }
      return nextState;
    }

    case 'RESET_TOURNAMENT_DATA': {
      const { tournamentId } = payload;
      const t = nextState.tournaments.find((tour) => tour.id === tournamentId);
      if (t) {
        nextState.statesByTournament[tournamentId] = createInitialTournamentState(t);
      }
      return nextState;
    }

    default:
      return nextState;
  }
}
