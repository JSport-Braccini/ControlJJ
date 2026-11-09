import { useEffect, useRef, useState, useCallback } from 'react';
import { AppServerData, TournamentState } from '../types/championship';
import { DEFAULT_TOURNAMENT, createInitialTournamentState } from '../data/initialData';
import { DEFAULT_SYSTEM_CONFIG, INITIAL_AUTH_USERS } from '../data/authUsers';
import { applyAppAction } from '../utils/actionReducer';
import { db } from '../firebase/config';
import { doc, onSnapshot, setDoc, getDoc } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../firebase/errorHandler';

const STORAGE_KEY = 'jj_copacontrol_state_v3';
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
  const [isCloudSynced, setIsCloudSynced] = useState(false);
  const [isVercelOrLocal, setIsVercelOrLocal] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string>(() => new Date().toTimeString().slice(0, 8));
  const [customWsUrl, setCustomWsUrlState] = useState<string>(() => {
    return localStorage.getItem(CUSTOM_WS_KEY) || import.meta.env.VITE_WS_URL || '';
  });

  const wsRef = useRef<WebSocket | null>(null);
  const channelRef = useRef<BroadcastChannel | null>(null);
  const isUpdatingFromCloudRef = useRef<boolean>(false);
  const hasInitializedCloudRef = useRef<boolean>(false);

  // Cross-tab synchronization via BroadcastChannel
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

  // 1. FIREBASE FIRESTORE REAL-TIME SYNCHRONIZATION (Authoritative Cloud Source of Truth)
  useEffect(() => {
    const stateDocRef = doc(db, 'system', 'state');

    // Subscribe to Firestore changes in real-time
    const unsubscribe = onSnapshot(
      stateDocRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const cloudData = snapshot.data() as AppServerData;
          if (
            cloudData &&
            cloudData.tournaments &&
            Array.isArray(cloudData.tournaments) &&
            cloudData.statesByTournament
          ) {
            isUpdatingFromCloudRef.current = true;
            setServerData(cloudData);
            saveToStorage(cloudData);
            setIsConnected(true);
            setIsCloudSynced(true);
            setLastSyncTime(new Date().toTimeString().slice(0, 8));
            setTimeout(() => {
              isUpdatingFromCloudRef.current = false;
            }, 100);
          }
        } else {
          // If Firestore is empty on first deployment, seed it with current initial state
          if (!hasInitializedCloudRef.current) {
            hasInitializedCloudRef.current = true;
            const seed = loadInitialState();
            setDoc(stateDocRef, seed)
              .then(() => {
                setIsConnected(true);
                setIsCloudSynced(true);
              })
              .catch((err) => {
                handleFirestoreError(err, OperationType.WRITE, 'system/state');
              });
          }
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, 'system/state');
        setIsCloudSynced(false);
      }
    );

    return () => {
      unsubscribe();
    };
  }, []);

  // 2. WEBSOCKET FALLBACK & SECONDARY SYNC
  const connectWs = useCallback(() => {
    try {
      let targetWsUrl = customWsUrl;
      if (!targetWsUrl && typeof window !== 'undefined') {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        targetWsUrl = `${protocol}//${window.location.host}`;
      }

      if (targetWsUrl && !window.location.hostname.endsWith('vercel.app')) {
        const ws = new WebSocket(targetWsUrl);

        ws.onopen = () => {
          setIsConnected(true);
        };

        ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            if (message.type === 'STATE_SYNC' && message.payload && !isCloudSynced) {
              setServerData(message.payload);
              saveToStorage(message.payload);
              setLastSyncTime(new Date().toTimeString().slice(0, 8));
            }
          } catch (err) {
            console.error('Error parsing WS message:', err);
          }
        };

        ws.onclose = () => {
          wsRef.current = null;
        };

        ws.onerror = () => {
          wsRef.current = null;
        };

        wsRef.current = ws;
      }
    } catch {
      // WS fallback failure is non-fatal since Firestore handles sync
    }
  }, [customWsUrl, isCloudSynced]);

  useEffect(() => {
    connectWs();
    return () => {
      if (wsRef.current) wsRef.current.close();
    };
  }, [connectWs]);

  // MUTATION DISPATCHER
  const sendAction = useCallback(
    (type: string, payload: unknown) => {
      setServerData((prev) => {
        const next = applyAppAction(prev, { type, payload: payload as any });
        saveToStorage(next);

        // Broadcast to other browser tabs
        if (channelRef.current) {
          channelRef.current.postMessage({ type: 'STATE_SYNC', payload: next });
        }

        // Send via WebSocket if open
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          try {
            wsRef.current.send(JSON.stringify({ type, payload }));
          } catch {
            // ignore
          }
        }

        // CRITICAL: Synchronize directly with Firestore in the cloud
        const stateDocRef = doc(db, 'system', 'state');
        setDoc(stateDocRef, next, { merge: true }).catch((err) => {
          handleFirestoreError(err, OperationType.UPDATE, 'system/state');
        });

        return next;
      });

      setLastSyncTime(new Date().toTimeString().slice(0, 8));
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
    isConnected: isConnected || isCloudSynced,
    isCloudSynced,
    isVercelOrLocal,
    lastSyncTime,
    customWsUrl,
    setCustomWsUrl,
    sendAction,
  };
}
