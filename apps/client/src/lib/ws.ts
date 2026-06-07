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

function getWsBase(): string {
  const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = window.location.host;
  return `${proto}//${host}`;
}

export function createProgressWS(options: ProgressWSOptions) {
  const { puzzleId, onLock, onComplete } = options;
  let ws: WebSocket | null = null;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let disposed = false;

  function connect() {
    if (disposed) return;
    const url = `${getWsBase()}/ws/progress/${puzzleId}`;
    ws = new WebSocket(url);

    ws.onopen = () => {
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
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
      if (disposed) return;
      reconnectTimer = setTimeout(connect, 3000);
    };

    ws.onerror = () => {
      ws?.close();
    };
  }

  function send(msg: WsMessage) {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(msg));
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
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
    ws?.close();
    ws = null;
  }

  connect();

  return { sendLock, sendComplete, close };
}