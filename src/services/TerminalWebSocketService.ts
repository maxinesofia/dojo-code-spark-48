interface TerminalMessage {
  type: string;
  data?: any;
  sessionId?: string;
  code?: number; // For process exit codes
}

interface TerminalSession {
  sessionId: string;
  vmId?: string;
  connected: boolean;
  startTime: Date;
}

export class TerminalWebSocketService {
  private ws: WebSocket | null = null;
  private session: TerminalSession | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 3;
  private reconnectDelay = 1000;
  
  private onOutputCallback?: (data: string) => void;
  private onErrorCallback?: (error: string) => void;
  private onConnectedCallback?: (sessionId: string) => void;
  private onDisconnectedCallback?: () => void;
  private onConnectionFailedCallback?: () => void;
  private onTerminalStartedCallback?: (data: any) => void;

  constructor() {
    // Don't auto-connect - let the component decide
  }

  public connect() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      return; // Already connected
    }
    try {
      // In production, this would be your backend WebSocket URL
      const wsUrl = process.env.NODE_ENV === 'production' 
        ? 'ws://34.75.249.177/ws/terminal'
        : 'ws://localhost:8080/terminal';
      
      this.ws = new WebSocket(wsUrl);
      
      this.ws.onopen = () => {
        console.log('Terminal WebSocket connected');
        this.reconnectAttempts = 0;
      };

      this.ws.onmessage = (event) => {
        try {
          const message: TerminalMessage = JSON.parse(event.data);
          this.handleMessage(message);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      this.ws.onclose = () => {
        console.log('Terminal WebSocket disconnected');
        this.session = null;
        this.onDisconnectedCallback?.();
        this.attemptReconnect();
      };

      this.ws.onerror = (error) => {
        console.error('Terminal WebSocket error:', error);
        this.onErrorCallback?.('WebSocket connection error');
        // Notify that connection failed so we can fallback to virtual terminal
        this.onConnectionFailedCallback?.();
      };

    } catch (error) {
      console.error('Failed to connect to terminal WebSocket:', error);
      this.onErrorCallback?.('Failed to connect to terminal service');
      // Notify connection failure for fallback
      this.onConnectionFailedCallback?.();
    }
  }

  private handleMessage(message: TerminalMessage) {
    switch (message.type) {
      case 'session_init':
        this.session = {
          sessionId: message.sessionId!,
          connected: true,
          startTime: new Date()
        };
        this.onConnectedCallback?.(message.sessionId!);
        break;

      case 'terminal_started':
        if (this.session) {
          this.session.vmId = message.data?.vmId;
        }
        console.log('Terminal started:', message.data);
        this.onTerminalStartedCallback?.(message.data);
        break;

      case 'output':
        this.onOutputCallback?.(message.data);
        break;

      case 'error':
        this.onErrorCallback?.(message.data);
        break;

      case 'process_exit':
        console.log('Process exited with code:', message.code);
        break;

      case 'terminal_stopped':
        this.session = null;
        this.onDisconnectedCallback?.();
        break;

      default:
        console.log('Unknown message type:', message.type);
    }
  }

  private attemptReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      
      setTimeout(() => {
        this.connect();
      }, this.reconnectDelay * this.reconnectAttempts);
    } else {
      console.error('Max reconnection attempts reached');
      this.onErrorCallback?.('Connection lost. Falling back to virtual terminal.');
      this.onConnectionFailedCallback?.();
    }
  }

  public startTerminal(projectId: string, userId: string) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      this.onErrorCallback?.('WebSocket not connected');
      return;
    }

    this.send({
      type: 'start_terminal',
      data: { projectId, userId }
    });
  }

  public executeCommand(command: string) {
    if (!this.session || !this.ws || this.ws.readyState !== WebSocket.OPEN) {
      this.onErrorCallback?.('Terminal session not active');
      return;
    }

    this.send({
      type: 'command',
      data: command
    });
  }

  public sendInput(input: string) {
    if (!this.session || !this.ws || this.ws.readyState !== WebSocket.OPEN) {
      this.onErrorCallback?.('Terminal session not active');
      return;
    }

    this.send({
      type: 'input',
      data: input
    });
  }

  public resizeTerminal(cols: number, rows: number) {
    if (!this.session || !this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return;
    }

    this.send({
      type: 'resize',
      data: { cols, rows }
    });
  }

  public sendResize(cols: number, rows: number) {
    this.resizeTerminal(cols, rows);
  }

  public stopTerminal() {
    if (!this.session || !this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return;
    }

    this.send({
      type: 'stop'
    });
  }

  private send(message: TerminalMessage) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  public onOutput(callback: (data: string) => void) {
    this.onOutputCallback = callback;
  }

  public onError(callback: (error: string) => void) {
    this.onErrorCallback = callback;
  }

  public onConnected(callback: (sessionId: string) => void) {
    this.onConnectedCallback = callback;
  }

  public onDisconnected(callback: () => void) {
    this.onDisconnectedCallback = callback;
  }

  public onConnectionFailed(callback: () => void) {
    this.onConnectionFailedCallback = callback;
  }

  public onTerminalStarted(callback: (data: any) => void) {
    this.onTerminalStartedCallback = callback;
  }

  public getSession() {
    return this.session;
  }

  public isConnected() {
    return this.ws?.readyState === WebSocket.OPEN && this.session?.connected;
  }

  public disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.session = null;
  }
}