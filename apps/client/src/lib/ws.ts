type WsMessage =
  | { type: 'lock'; pieceId: string; targetX: number; targetY: number }
  | { type: 'complete' };

type WsIncomingMessage =
  | { type: 'lock'; pieceId: string; targetX: number; targetY: number; userId: string }
  | { type: 'complete'; userId: string };

interface ProgressWSOptions {
  puzzleId: string;
  onLock?: (data: { pieceId: string; targetX: number; targetY: number }) => void;
  onComplete?: () => void;
}

const MAX_RETRIES = 20;
const BASE_DELAY = 1000;
const MAX_DELAY = 30000;
const HEARTBEAT_INTERVAL = 30000;

function getWsBase(): string {
  const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = window.location.host;
  return `${proto}//${host}`;
}

export function createProgressWS(options: ProgressWSOptions) {
  const { puzzleId, onLock, onComplete } = options;
  let ws: WebSocket | null = null;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  let disposed = false;
  let retryCount = 0;
  let messageQueue: WsMessage[] = [];

  function scheduleReconnect() {
    if (disposed) return;
    const delay = Math.min(BASE_DELAY * Math.pow(2, retryCount), MAX_DELAY);
    retryCount++;
    reconnectTimer = setTimeout(connect, delay);
  }

  function startHeartbeat() {
    stopHeartbeat();
    heartbeatTimer = setInterval(() => {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'ping' }));
      }
    }, HEARTBEAT_INTERVAL);
  }

  function stopHeartbeat() {
    if (heartbeatTimer) {
      clearInterval(heartbeatTimer);
      heartbeatTimer = null;
    }
  }

  function flushQueue() {
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    while (messageQueue.length > 0) {
      const msg = messageQueue.shift()!;
      ws.send(JSON.stringify(msg));
    }
  }

  function connect() {
    if (disposed) return;
    const url = `${getWsBase()}/ws/progress/${puzzleId}`;
    ws = new WebSocket(url);

    ws.onopen = () => {
      retryCount = 0;
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
      startHeartbeat();
      flushQueue();
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data) as WsIncomingMessage;
        if (msg.type === 'lock') {
          onLock?.({ pieceId: msg.pieceId, targetX: msg.targetX, targetY: msg.targetY });
        } else if (msg.type === 'complete') {
          onComplete?.();
        }
      } catch {
        // ignore malformed messages
      }
    };

    ws.onclose = () => {
      stopHeartbeat();
      if (disposed) return;
      if (retryCount >= MAX_RETRIES) return;
      scheduleReconnect();
    };

    ws.onerror = () => {
      ws?.close();
    };
  }

  function send(msg: WsMessage) {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(msg));
    } else {
      messageQueue.push(msg);
    }
  }

  function sendLock(pieceId: string, targetX: number, targetY: number) {
    send({ type: 'lock', pieceId, targetX, targetY });
  }

  function sendComplete() {
    send({ type: 'complete' });
  }

  function close() {
    disposed = true;
    stopHeartbeat();
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
    messageQueue = [];
    ws?.close();
    ws = null;
  }

  connect();

  return { sendLock, sendComplete, close };
}