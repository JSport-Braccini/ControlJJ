import express from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import {
  Tournament,
  TournamentState,
  AppServerData,
  Player,
  SpectatorTier,
  BeverageProduct,
  AuthUser,
  ConnectedUserPresence,
  SystemConfig,
} from './src/types/championship.js';
import {
  DEFAULT_TOURNAMENT,
  createInitialTournamentState,
} from './src/data/initialData.js';
import {
  DEFAULT_SYSTEM_CONFIG,
  INITIAL_AUTH_USERS,
} from './src/data/authUsers.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;
const app = express();
const server = createServer(app);

app.use(express.json());

// Persistent Local File DB (Guarantees no data loss across server restarts)
const DB_FILE = path.resolve(__dirname, 'data', 'copacontrol_store.json');

function loadPersistedState(): AppServerData {
  try {
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (parsed && parsed.tournaments && parsed.statesByTournament) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Could not read disk state:', err);
  }
  return {
    config: { ...DEFAULT_SYSTEM_CONFIG },
    users: [...INITIAL_AUTH_USERS],
    tournaments: [DEFAULT_TOURNAMENT],
    activeTournamentId: DEFAULT_TOURNAMENT.id,
    statesByTournament: {
      [DEFAULT_TOURNAMENT.id]: createInitialTournamentState(DEFAULT_TOURNAMENT),
    },
    connectedClientsCount: 0,
    onlineUsers: [],
  };
}

const serverData: AppServerData = loadPersistedState();

function persistState() {
  try {
    const dir = path.dirname(DB_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(DB_FILE, JSON.stringify(serverData, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving disk state:', err);
  }
}

// WebSocket Server attached to same HTTP server
const wss = new WebSocketServer({ server });
const clientMetadata = new Map<WebSocket, { user?: AuthUser; connectedAt: string }>();

function getOnlinePresences(): ConnectedUserPresence[] {
  const result: ConnectedUserPresence[] = [];
  let index = 1;
  clientMetadata.forEach((meta) => {
    if (meta.user) {
      result.push({
        socketId: `conn-${index++}`,
        user: meta.user,
        connectedAt: meta.connectedAt,
      });
    }
  });
  return result;
}

function broadcast(type: string, payload: unknown, skipSender?: WebSocket) {
  const message = JSON.stringify({ type, payload });
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN && client !== skipSender) {
      client.send(message);
    }
  });
}

function broadcastFullState() {
  persistState();
  const payload = {
    ...serverData,
    connectedClientsCount: wss.clients.size,
    onlineUsers: getOnlinePresences(),
  };
  broadcast('STATE_SYNC', payload);
}

wss.on('connection', (ws) => {
  clientMetadata.set(ws, { connectedAt: new Date().toTimeString().slice(0, 8) });

  ws.send(
    JSON.stringify({
      type: 'STATE_SYNC',
      payload: {
        ...serverData,
        connectedClientsCount: wss.clients.size,
        onlineUsers: getOnlinePresences(),
      },
    })
  );

  broadcastFullState();

  ws.on('message', (raw) => {
    try {
      const data = JSON.parse(raw.toString());
      handleClientAction(data, ws);
    } catch (err) {
      console.error('Error handling WS message:', err);
    }
  });

  ws.on('close', () => {
    clientMetadata.delete(ws);
    broadcastFullState();
  });
});

function handleClientAction(
  action: { type: string; payload: any },
  sender: WebSocket
) {
  const { type, payload } = action;

  switch (type) {
    case 'IDENTIFY_USER': {
      const meta = clientMetadata.get(sender);
      if (meta) {
        meta.user = payload.user;
        broadcastFullState();
      }
      break;
    }

    // UPDATE SYSTEM CONFIG (SYSTEM NAME, LOGO, ETC.)
    case 'UPDATE_SYSTEM_CONFIG': {
      serverData.config = {
        ...serverData.config,
        ...payload.config,
      };
      broadcastFullState();
      break;
    }

    // USER MANAGEMENT (ADMIN ONLY)
    case 'CREATE_USER': {
      const newUser: AuthUser = payload.user;
      // prevent duplicate username
      if (!serverData.users.some((u) => u.username.toLowerCase() === newUser.username.toLowerCase())) {
        serverData.users.push(newUser);
        broadcastFullState();
      }
      break;
    }

    case 'UPDATE_USER': {
      const updatedUser: AuthUser = payload.user;
      const idx = serverData.users.findIndex((u) => u.id === updatedUser.id);
      if (idx !== -1) {
        serverData.users[idx] = {
          ...serverData.users[idx],
          ...updatedUser,
        };
        broadcastFullState();
      }
      break;
    }

    case 'DELETE_USER': {
      const { userId } = payload;
      // cannot delete the primary admin
      if (serverData.users.length > 1) {
        const target = serverData.users.find((u) => u.id === userId);
        if (target && target.username.toLowerCase() !== 'admin') {
          serverData.users = serverData.users.filter((u) => u.id !== userId);
          broadcastFullState();
        }
      }
      break;
    }

    case 'SELECT_TOURNAMENT': {
      if (serverData.statesByTournament[payload.tournamentId]) {
        serverData.activeTournamentId = payload.tournamentId;
        broadcastFullState();
      }
      break;
    }

    case 'CREATE_TOURNAMENT': {
      const newTournament: Tournament = payload.tournament;
      serverData.tournaments.unshift(newTournament);
      serverData.statesByTournament[newTournament.id] = createInitialTournamentState(newTournament);
      serverData.activeTournamentId = newTournament.id;
      broadcastFullState();
      break;
    }

    case 'DELETE_TOURNAMENT': {
      const { tournamentId } = payload;
      if (serverData.tournaments.length <= 1) return;
      serverData.tournaments = serverData.tournaments.filter((t) => t.id !== tournamentId);
      delete serverData.statesByTournament[tournamentId];
      if (serverData.activeTournamentId === tournamentId) {
        serverData.activeTournamentId = serverData.tournaments[0].id;
      }
      broadcastFullState();
      break;
    }

    case 'UPDATE_TOURNAMENT': {
      const updated: Tournament = payload.tournament;
      const idx = serverData.tournaments.findIndex((t) => t.id === updated.id);
      if (idx !== -1) {
        serverData.tournaments[idx] = updated;
        if (serverData.statesByTournament[updated.id]) {
          serverData.statesByTournament[updated.id].tournament = updated;
        }
        broadcastFullState();
      }
      break;
    }

    case 'PROCESS_QR_SCAN': {
      const { tournamentId, qrCode, quantity = 1, registeredBy } = payload;
      const state = serverData.statesByTournament[tournamentId];
      if (!state) return;

      const code = String(qrCode).trim().toUpperCase();
      const nowTime = new Date().toTimeString().slice(0, 8);
      const qty = Math.max(1, Number(quantity) || 1);

      // Check Player
      const matchedPlayer = state.players.find((p) => p.qrCode.toUpperCase() === code);
      if (matchedPlayer) {
        if (matchedPlayer.checkedIn) {
          matchedPlayer.duplicateAttempts += 1;
          const feedback = {
            id: `fb-${Date.now()}`,
            status: 'duplicate' as const,
            category: 'JUGADOR' as const,
            title: '¡YA ESTÁ REGISTRADO! — Asistencia Duplicada Bloqueada',
            message: `El jugador ${matchedPlayer.name} (#${matchedPlayer.jerseyNumber} · ${matchedPlayer.team}) ya registró su ingreso a las ${matchedPlayer.checkInTime}.`,
            detail: 'El sistema impide ingresos duplicados por normativa de torneo.',
            timestamp: nowTime,
            qrCode: code,
          };
          state.scanHistory.unshift(feedback);
          broadcastFullState();
          return;
        }

        matchedPlayer.checkedIn = true;
        matchedPlayer.checkInTime = nowTime;
        const feedback = {
          id: `fb-${Date.now()}`,
          status: 'success' as const,
          category: 'JUGADOR' as const,
          title: 'Asistencia de Jugador Registrada',
          message: `${matchedPlayer.name} (#${matchedPlayer.jerseyNumber} · ${matchedPlayer.team}) habilitado en cancha oficial. Operador: ${registeredBy || 'Módulo'}`,
          timestamp: nowTime,
          qrCode: code,
        };
        state.scanHistory.unshift(feedback);
        broadcastFullState();
        return;
      }

      // Check Digital Ticket
      const matchedTicket = (state.digitalTickets || []).find((dt) => dt.qrCode.toUpperCase() === code);
      if (matchedTicket) {
        if (matchedTicket.assisted) {
          const feedback = {
            id: `fb-${Date.now()}`,
            status: 'duplicate' as const,
            category: 'ESPECTADOR' as const,
            title: '¡BOLETO YA FUE UTILIZADO! — Entrada Marcada',
            message: `El boleto de ${matchedTicket.buyerName} (${matchedTicket.quantity}x ${matchedTicket.label}) ya registró su ingreso a las ${matchedTicket.checkInTime || 'anteriormente'}.`,
            detail: `Código: ${matchedTicket.qrCode} · Fecha: ${matchedTicket.eventDayLabel}`,
            timestamp: nowTime,
            qrCode: code,
          };
          state.scanHistory.unshift(feedback);
          broadcastFullState();
          return;
        }

        if (matchedTicket.paymentStatus === 'PAID') {
          matchedTicket.assisted = true;
          matchedTicket.checkInTime = nowTime;
          matchedTicket.validatedBy = registeredBy || 'Módulo Puerta';

          const alreadyRecorded = state.spectatorEntries.some((se) => se.qrCode === matchedTicket.qrCode);
          if (!alreadyRecorded) {
            if (matchedTicket.items && matchedTicket.items.length > 0) {
              matchedTicket.items.forEach((it, idx) => {
                state.spectatorEntries.unshift({
                  id: `se-${Date.now()}-${idx}`,
                  tournamentId,
                  qrCode: matchedTicket.qrCode,
                  ticketType: it.ticketType,
                  label: `${it.label} (${matchedTicket.eventDayLabel})`,
                  price: it.unitPrice,
                  isChild: it.ticketType === 'NINO',
                  quantity: it.quantity,
                  totalAmount: it.subtotal,
                  timestamp: nowTime,
                  registeredBy: `Web / ${matchedTicket.paymentMethod}`,
                });
              });
            } else {
              state.spectatorEntries.unshift({
                id: `se-${Date.now()}`,
                tournamentId,
                qrCode: matchedTicket.qrCode,
                ticketType: matchedTicket.ticketType,
                label: `${matchedTicket.label} (${matchedTicket.eventDayLabel})`,
                price: matchedTicket.unitPrice,
                isChild: matchedTicket.ticketType === 'NINO',
                quantity: matchedTicket.quantity,
                totalAmount: matchedTicket.totalAmount,
                timestamp: nowTime,
                registeredBy: `Web / ${matchedTicket.paymentMethod}`,
              });
            }
          }

          const breakdownText = matchedTicket.items && matchedTicket.items.length > 0
            ? matchedTicket.items.map((it) => `${it.quantity}x ${it.label}`).join(', ')
            : `${matchedTicket.quantity}x ${matchedTicket.label}`;

          const feedback = {
            id: `fb-${Date.now()}`,
            status: 'success' as const,
            category: 'ESPECTADOR' as const,
            title: '¡ACCESO PERMITIDO - ENTRADA PAGADA!',
            message: `${matchedTicket.buyerName} (${breakdownText} · Total ${matchedTicket.quantity} pers.) — Cancelado vía ${matchedTicket.paymentMethod}. Total: S/ ${matchedTicket.totalAmount.toFixed(2)}`,
            detail: `DNI/Tel: ${matchedTicket.buyerDni || matchedTicket.buyerPhone || 'Registrado'} · Habilitado en Tribuna`,
            timestamp: nowTime,
            qrCode: code,
          };
          state.scanHistory.unshift(feedback);
          broadcastFullState();
          return;
        } else {
          // RESERVED_UNPAID
          const breakdownText = matchedTicket.items && matchedTicket.items.length > 0
            ? matchedTicket.items.map((it) => `${it.quantity}x ${it.label}`).join(', ')
            : `${matchedTicket.quantity}x ${matchedTicket.label}`;

          const feedback = {
            id: `fb-${Date.now()}`,
            status: 'error' as const,
            category: 'ESPECTADOR' as const,
            title: '⚠️ ¡ALERTA: PAGO PENDIENTE! Entrada Separada vía Web',
            message: `El boleto de ${matchedTicket.buyerName} está SEPARADO y debe abonar S/ ${matchedTicket.totalAmount.toFixed(2)} en puerta (${breakdownText} · Total ${matchedTicket.quantity} pers.).`,
            detail: `ID:${matchedTicket.id}|TOTAL:${matchedTicket.totalAmount}|BUYER:${matchedTicket.buyerName}|QTY:${matchedTicket.quantity}|LABEL:${matchedTicket.label}`,
            timestamp: nowTime,
            qrCode: code,
          };
          state.scanHistory.unshift(feedback);
          broadcastFullState();
          return;
        }
      }

      // Check Spectator Tier
      const matchedTier = state.spectatorTiers.find((t) => t.qrCode.toUpperCase() === code);
      if (matchedTier) {
        const totalAmount = matchedTier.price * qty;
        state.spectatorEntries.unshift({
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
        });
        const feedback = {
          id: `fb-${Date.now()}`,
          status: 'success' as const,
          category: 'ESPECTADOR' as const,
          title: 'Ingreso de Espectador Registrado',
          message: `+${qty} ${matchedTier.label} (${matchedTier.isChild ? 'Niño / Menor' : 'Adulto / General'}) — Total: S/ ${totalAmount.toFixed(2)}`,
          timestamp: nowTime,
          qrCode: code,
        };
        state.scanHistory.unshift(feedback);
        broadcastFullState();
        return;
      }

      // Check Beverage
      const matchedBev = state.beverages.find((b) => b.qrCode.toUpperCase() === code);
      if (matchedBev) {
        if (matchedBev.stock < qty) {
          const feedback = {
            id: `fb-${Date.now()}`,
            status: 'error' as const,
            category: 'BEBIDA' as const,
            title: `Stock insuficiente de ${matchedBev.name}`,
            message: `Solo quedan ${matchedBev.stock} unidades disponibles en inventario.`,
            timestamp: nowTime,
            qrCode: code,
          };
          state.scanHistory.unshift(feedback);
          broadcastFullState();
          return;
        }

        matchedBev.stock -= qty;
        matchedBev.soldCount += qty;
        const totalAmount = matchedBev.price * qty;
        state.beverageSales.unshift({
          id: `bs-${Date.now()}`,
          tournamentId,
          beverageId: matchedBev.id,
          beverageName: matchedBev.name,
          qrCode: matchedBev.qrCode,
          quantity: qty,
          unitPrice: matchedBev.price,
          totalAmount,
          timestamp: nowTime,
          registeredBy: registeredBy || 'Módulo Bebidas',
        });
        const feedback = {
          id: `fb-${Date.now()}`,
          status: 'success' as const,
          category: 'BEBIDA' as const,
          title: `Venta de ${matchedBev.name} Registrada`,
          message: `${qty} × ${matchedBev.name} (${matchedBev.presentation}) — Total: S/ ${totalAmount.toFixed(2)}`,
          timestamp: nowTime,
          qrCode: code,
        };
        state.scanHistory.unshift(feedback);
        broadcastFullState();
        return;
      }

      // Unknown
      const feedback = {
        id: `fb-${Date.now()}`,
        status: 'error' as const,
        category: 'DESCONOCIDO' as const,
        title: 'Código QR no reconocido',
        message: `El código "${code}" no está registrado en este torneo.`,
        timestamp: nowTime,
        qrCode: code,
      };
      state.scanHistory.unshift(feedback);
      broadcastFullState();
      break;
    }

    // CRUD PLAYERS
    case 'ADD_PLAYER': {
      const { tournamentId, player } = payload;
      const state = serverData.statesByTournament[tournamentId];
      if (state) {
        state.players.unshift(player);
        broadcastFullState();
      }
      break;
    }

    case 'UPDATE_PLAYER': {
      const { tournamentId, player } = payload;
      const state = serverData.statesByTournament[tournamentId];
      if (state) {
        const idx = state.players.findIndex((p) => p.id === player.id);
        if (idx !== -1) {
          state.players[idx] = { ...state.players[idx], ...player };
          broadcastFullState();
        }
      }
      break;
    }

    case 'DELETE_PLAYER': {
      const { tournamentId, playerId } = payload;
      const state = serverData.statesByTournament[tournamentId];
      if (state) {
        state.players = state.players.filter((p) => p.id !== playerId);
        broadcastFullState();
      }
      break;
    }

    // CRUD TICKETS
    case 'UPDATE_TICKET_PRICE': {
      const { tournamentId, tierId, price, label, description } = payload;
      const state = serverData.statesByTournament[tournamentId];
      if (state) {
        const tier = state.spectatorTiers.find((t) => t.id === tierId);
        if (tier) {
          if (price !== undefined) tier.price = Number(price);
          if (label !== undefined) tier.label = label;
          if (description !== undefined) tier.description = description;
          broadcastFullState();
        }
      }
      break;
    }

    case 'ADD_TICKET_TIER': {
      const { tournamentId, tier } = payload;
      const state = serverData.statesByTournament[tournamentId];
      if (state) {
        state.spectatorTiers.push(tier);
        broadcastFullState();
      }
      break;
    }

    case 'DELETE_TICKET_TIER': {
      const { tournamentId, tierId } = payload;
      const state = serverData.statesByTournament[tournamentId];
      if (state) {
        state.spectatorTiers = state.spectatorTiers.filter((t) => t.id !== tierId);
        broadcastFullState();
      }
      break;
    }

    // CRUD BEVERAGES
    case 'UPDATE_BEVERAGE': {
      const { tournamentId, beverageId, price, stock, name, presentation } = payload;
      const state = serverData.statesByTournament[tournamentId];
      if (state) {
        const bev = state.beverages.find((b) => b.id === beverageId);
        if (bev) {
          if (price !== undefined) bev.price = Number(price);
          if (stock !== undefined) bev.stock = Number(stock);
          if (name !== undefined) bev.name = name;
          if (presentation !== undefined) bev.presentation = presentation;
          broadcastFullState();
        }
      }
      break;
    }

    case 'ADD_BEVERAGE': {
      const { tournamentId, beverage } = payload;
      const state = serverData.statesByTournament[tournamentId];
      if (state) {
        state.beverages.push(beverage);
        broadcastFullState();
      }
      break;
    }

    case 'DELETE_BEVERAGE': {
      const { tournamentId, beverageId } = payload;
      const state = serverData.statesByTournament[tournamentId];
      if (state) {
        state.beverages = state.beverages.filter((b) => b.id !== beverageId);
        broadcastFullState();
      }
      break;
    }

    case 'ADD_EXPENSE': {
      const { tournamentId, expense } = payload;
      const state = serverData.statesByTournament[tournamentId];
      if (state) {
        state.expenses = [expense, ...(state.expenses || [])];
        broadcastFullState();
      }
      break;
    }

    case 'UPDATE_EXPENSE': {
      const { tournamentId, expense } = payload;
      const state = serverData.statesByTournament[tournamentId];
      if (state && state.expenses) {
        state.expenses = state.expenses.map((e) => (e.id === expense.id ? { ...e, ...expense } : e));
        broadcastFullState();
      }
      break;
    }

    case 'DELETE_EXPENSE': {
      const { tournamentId, expenseId } = payload;
      const state = serverData.statesByTournament[tournamentId];
      if (state && state.expenses) {
        state.expenses = state.expenses.filter((e) => e.id !== expenseId);
        broadcastFullState();
      }
      break;
    }

    // DIGITAL TICKETS (WEB & VENUE)
    case 'CREATE_DIGITAL_TICKET': {
      const { tournamentId, ticket } = payload;
      const state = serverData.statesByTournament[tournamentId];
      if (state) {
        state.digitalTickets = [ticket, ...(state.digitalTickets || [])];
        if (ticket.channel === 'VENUE' && ticket.paymentStatus === 'PAID') {
          if (ticket.items && ticket.items.length > 0) {
            ticket.items.forEach((it: any, idx: number) => {
              state.spectatorEntries.unshift({
                id: `se-${Date.now()}-${idx}`,
                tournamentId,
                qrCode: ticket.qrCode,
                ticketType: it.ticketType,
                label: `${it.label} (${ticket.eventDayLabel})`,
                price: it.unitPrice,
                isChild: it.ticketType === 'NINO',
                quantity: it.quantity,
                totalAmount: it.subtotal,
                timestamp: new Date().toTimeString().slice(0, 8),
                registeredBy: `Taquilla Local (${ticket.paymentMethod})`,
              });
            });
          } else {
            state.spectatorEntries.unshift({
              id: `se-${Date.now()}`,
              tournamentId,
              qrCode: ticket.qrCode,
              ticketType: ticket.ticketType,
              label: `${ticket.label} (${ticket.eventDayLabel})`,
              price: ticket.unitPrice,
              isChild: ticket.ticketType === 'NINO',
              quantity: ticket.quantity,
              totalAmount: ticket.totalAmount,
              timestamp: new Date().toTimeString().slice(0, 8),
              registeredBy: `Taquilla Local (${ticket.paymentMethod})`,
            });
          }
        }
        broadcastFullState();
      }
      break;
    }

    case 'CONFIRM_DOOR_PAYMENT_AND_CHECKIN': {
      const { tournamentId, ticketId, paymentMethod = 'EFECTIVO_PUERTA', operatorName } = payload;
      const state = serverData.statesByTournament[tournamentId];
      if (state && state.digitalTickets) {
        const nowTime = new Date().toTimeString().slice(0, 8);
        const ticket = state.digitalTickets.find((t) => t.id === ticketId);
        if (ticket) {
          ticket.paymentStatus = 'PAID';
          ticket.paidAtDoor = true;
          ticket.paidAtDoorTime = nowTime;
          ticket.paidAtDoorMethod = paymentMethod;
          ticket.assisted = true;
          ticket.checkInTime = nowTime;
          ticket.validatedBy = operatorName || 'Puerta de Acceso';

          if (ticket.items && ticket.items.length > 0) {
            ticket.items.forEach((it: any, idx: number) => {
              state.spectatorEntries.unshift({
                id: `se-door-${Date.now()}-${idx}`,
                tournamentId,
                qrCode: ticket.qrCode,
                ticketType: it.ticketType,
                label: `${it.label} (Cancelado en Puerta)`,
                price: it.unitPrice,
                isChild: it.ticketType === 'NINO',
                quantity: it.quantity,
                totalAmount: it.subtotal,
                timestamp: nowTime,
                registeredBy: `${operatorName || 'Puerta'} / Cobro ${paymentMethod}`,
              });
            });
          } else {
            state.spectatorEntries.unshift({
              id: `se-door-${Date.now()}`,
              tournamentId,
              qrCode: ticket.qrCode,
              ticketType: ticket.ticketType,
              label: `${ticket.label} (Cancelado en Puerta)`,
              price: ticket.unitPrice,
              isChild: ticket.ticketType === 'NINO',
              quantity: ticket.quantity,
              totalAmount: ticket.totalAmount,
              timestamp: nowTime,
              registeredBy: `${operatorName || 'Puerta'} / Cobro ${paymentMethod}`,
            });
          }

          const feedback = {
            id: `fb-${Date.now()}`,
            status: 'success' as const,
            category: 'ESPECTADOR' as const,
            title: '¡PAGO COBRADO EN PUERTA E INGRESO REGISTRADO!',
            message: `${ticket.buyerName} abonó S/ ${ticket.totalAmount.toFixed(2)} por ${paymentMethod}. Ingreso habilitado.`,
            timestamp: nowTime,
            qrCode: ticket.qrCode,
          };
          state.scanHistory.unshift(feedback);
          broadcastFullState();
        }
      }
      break;
    }

    case 'DELETE_DIGITAL_TICKET': {
      const { tournamentId, ticketId } = payload;
      const state = serverData.statesByTournament[tournamentId];
      if (state && state.digitalTickets) {
        state.digitalTickets = state.digitalTickets.filter((tk) => tk.id !== ticketId);
        broadcastFullState();
      }
      break;
    }

    case 'UPDATE_EVENT_DAYS': {
      const { tournamentId, eventDays } = payload;
      const state = serverData.statesByTournament[tournamentId];
      if (state) {
        state.tournament.eventDays = eventDays;
        const tIdx = serverData.tournaments.findIndex((t) => t.id === tournamentId);
        if (tIdx !== -1) {
          serverData.tournaments[tIdx].eventDays = eventDays;
        }
        broadcastFullState();
      }
      break;
    }

    case 'RESET_ALL_DATA_TO_ZERO': {
      const { tournamentId } = payload;
      const state = serverData.statesByTournament[tournamentId];
      if (state) {
        state.players = state.players.map((p) => ({
          ...p,
          checkedIn: false,
          checkInTime: undefined,
          duplicateAttempts: 0,
        }));
        state.spectatorEntries = [];
        state.beverages = state.beverages.map((b) => ({
          ...b,
          soldCount: 0,
        }));
        state.beverageSales = [];
        state.expenses = [];
        state.digitalTickets = [];
        state.scanHistory = [];
        broadcastFullState();
      }
      break;
    }

    case 'RESET_TOURNAMENT_DATA': {
      const { tournamentId } = payload;
      const t = serverData.tournaments.find((tour) => tour.id === tournamentId);
      if (t) {
        serverData.statesByTournament[tournamentId] = createInitialTournamentState(t);
        broadcastFullState();
      }
      break;
    }

    default:
      break;
  }
}

// REST Authentication Endpoint matching serverData.users
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ success: false, message: 'Usuario y contraseña requeridos' });
  }

  const cleanUser = String(username).toLowerCase().trim();
  const matched = serverData.users.find(
    (u) => u.username.toLowerCase() === cleanUser && u.active
  );

  if (!matched || matched.password !== String(password).trim()) {
    return res.status(401).json({ success: false, message: 'Credenciales inválidas. Comprueba el usuario y contraseña.' });
  }

  return res.json({ success: true, user: matched });
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    connectedClients: wss.clients.size,
    tournamentsCount: serverData.tournaments.length,
    activeTournamentId: serverData.activeTournamentId,
    systemName: serverData.config.systemName,
  });
});

app.get('/api/state', (req, res) => {
  res.json(serverData);
});

// Mount Vite in dev mode
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);

    app.use('*', async (req, res, next) => {
      const url = req.originalUrl;
      try {
        let template = fs.readFileSync(path.resolve(__dirname, 'index.html'), 'utf-8');
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e) {
        if (vite && typeof vite.ssrFixStacktrace === 'function') {
          vite.ssrFixStacktrace(e as Error);
        }
        next(e);
      }
    });
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`JJ CopaControl Server running on http://0.0.0.0:${PORT} with WebSockets`);
  });
}

startServer();
