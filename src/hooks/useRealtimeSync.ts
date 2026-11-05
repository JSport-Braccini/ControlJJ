import { useEffect, useRef, useState, useCallback } from 'react';
import { AppServerData, TournamentState } from '../types/championship';
import { DEFAULT_TOURNAMENT, createInitialTournamentState } from '../data/initialData';
import { DEFAULT_SYSTEM_CONFIG, INITIAL_AUTH_USERS } from '../data/authUsers';
import { applyAppAction } from '../utils/actionReducer';

const STORAGE_KEY = 'jj_copacontrol_state_v2';
const CUSTOM_WS_KEY = 'jj_custom_ws_url';

function loadInitialState(): AppServerData {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (
        parsed &&
        typeof parsed === 'object' &&
        parsed.statesByTournament &&
        parsed.tournaments &&
        Array.isArray(parsed.tournaments) &&
        parsed.tournaments.length > 0
      ) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Error reading from localStorage:', err);
  }

  return {
    config: { ...DEFAULT_SYSTEM_CONFIG },
    users: [...INITIAL_AUTH_USERS],
    tournaments: [DEFAULT_TOURNAMENT],
    activeTournamentId: DEFAULT_TOURNAMENT.id,
    statesByTournament: {
      [DEFAULT_TOURNAMENT.id]: createInitialTournamentState(DEFAULT_TOURNAMENT),
    },
    connectedClientsCount: 1,
    onlineUsers: [],
  };
}

export function useRealtimeSync() {
  const [serverData, setServerData] = useState<AppServerData>(loadInitialState);
  const [isConnected, setIsConnected] = useState(false);
  const [isVercelOrLocal, setIsVercelOrLocal] = useState(() => {
    return typeof window !== 'undefined' && window.location.hostname.endsWith('vercel.app');
  });
  const [lastSyncTime, setLastSyncTime] = useState<string>(() => new Date().toTimeString().slice(0, 8));
  const [customWsUrl, setCustomWsUrlState] = useState<string>(() => {
    return localStorage.getItem(CUSTOM_WS_KEY) || import.meta.env.VITE_WS_URL || '';
  });

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const channelRef = useRef<BroadcastChannel | null>(null);
  const connectionAttemptsRef = useRef<number>(0);

  // Cross-tab synchronization via BroadcastChannel (works everywhere, including Vercel)
  useEffect(() => {
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        const bc = new BroadcastChannel('jj_copacontrol_bc');
        channelRef.current = bc;
        bc.onmessage = (event) => {
          if (event.data && event.data.type === 'STATE_SYNC' && event.data.payload) {
            setServerData(event.data.payload);
            setLastSyncTime(new Date().toTimeString().slice(0, 8));
          }
        };
      }
    } catch (err) {
      console.warn('BroadcastChannel not supported:', err);
    }

    return () => {
      if (channelRef.current) {
        channelRef.current.close();
      }
    };
  }, []);

  const saveToStorage = (data: AppServerData) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (err) {
      console.warn('Storage save error:', err);
    }
  };

  const connect = useCallback(() => {
    const isVercelHost = window.location.hostname.endsWith('vercel.app');

    // If on Vercel and no custom WS URL is configured, Vercel cannot host WebSockets directly.
    if (isVercelHost && !customWsUrl) {
      setIsVercelOrLocal(true);
      setIsConnected(false);
      return;
    }

    try {
      let targetWsUrl = customWsUrl;
      if (!targetWsUrl) {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        targetWsUrl = `${protocol}//${window.location.host}`;
      }

      const ws = new WebSocket(targetWsUrl);

      ws.onopen = () => {
        setIsConnected(true);
        setIsVercelOrLocal(false);
        connectionAttemptsRef.current = 0;
        setLastSyncTime(new Date().toTimeString().slice(0, 8));
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          if (message.type === 'STATE_SYNC') {
            setServerData(message.payload);
            saveToStorage(message.payload);
            setLastSyncTime(new Date().toTimeString().slice(0, 8));
          } else if (message.type === 'PRESENCE_UPDATE') {
            setServerData((prev) => ({
              ...prev,
              connectedClientsCount: message.payload.count,
            }));
          }
        } catch (err) {
          console.error('Error parsing WS frame:', err);
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        connectionAttemptsRef.current += 1;

        // If on Vercel or after 3 failed attempts, enable local/Vercel resilient mode
        if (isVercelHost || connectionAttemptsRef.current >= 3) {
          setIsVercelOrLocal(true);
        }

        // Reconnect after delay only if not explicitly on Vercel without custom URL
        if (!isVercelHost || customWsUrl) {
          if (!reconnectTimeoutRef.current) {
            reconnectTimeoutRef.current = setTimeout(() => {
              reconnectTimeoutRef.current = null;
              connect();
            }, 5000);
          }
        }
      };

      ws.onerror = () => {
        setIsConnected(false);
        if (isVercelHost || connectionAttemptsRef.current >= 2) {
          setIsVercelOrLocal(true);
        }
      };

      wsRef.current = ws;
    } catch (err) {
      console.warn('Could not establish WebSocket connection, falling back to local engine:', err);
      setIsVercelOrLocal(true);
      setIsConnected(false);
    }
  }, [customWsUrl]);

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect]);

  const sendAction = useCallback(
    (type: string, payload: unknown) => {
      // If WebSocket is open and connected to server, send across cloud
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type, payload }));
      } else {
        // Local Reducer Execution (Guarantees 100% functionality on Vercel or offline!)
        setServerData((prev) => {
          const next = applyAppAction(prev, { type, payload: payload as any });
          saveToStorage(next);

          // Broadcast to other tabs in the same browser
          if (channelRef.current) {
            channelRef.current.postMessage({ type: 'STATE_SYNC', payload: next });
          }

          return next;
        });
        setLastSyncTime(new Date().toTimeString().slice(0, 8));
      }
    },
    []
  );

  const setCustomWsUrl = (url: string) => {
    const clean = url.trim();
    if (clean) {
      localStorage.setItem(CUSTOM_WS_KEY, clean);
    } else {
      localStorage.removeItem(CUSTOM_WS_KEY);
    }
    setCustomWsUrlState(clean);
    if (wsRef.current) {
      wsRef.current.close();
    }
  };

  const activeTournamentState: TournamentState =
    serverData.statesByTournament[serverData.activeTournamentId] ||
    createInitialTournamentState(DEFAULT_TOURNAMENT);

  return {
    serverData,
    systemConfig: serverData.config,
    users: serverData.users,
    activeTournamentState,
    activeTournament: activeTournamentState.tournament,
    isConnected,
    isVercelOrLocal,
    lastSyncTime,
    customWsUrl,
    setCustomWsUrl,
    sendAction,
  };
}
