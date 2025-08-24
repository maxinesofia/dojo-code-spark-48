import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Terminal as XTerm } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { WebLinksAddon } from 'xterm-addon-web-links';
import 'xterm/css/xterm.css';
import { WebTerminalService } from '../services/WebTerminalService';
import { FileNode } from '../types/FileTypes';
import { Button } from './ui/button';
import { X, Minimize2, Maximize2, Terminal as TerminalIcon, Wifi, WifiOff } from 'lucide-react';

interface TerminalProps {
  files?: FileNode[];
  onCommandExecuted?: (command: string) => void;
  onFileSystemChange?: (files: FileNode[]) => void;
  onClose?: () => void;
  className?: string;
  showHeader?: boolean;
  sessionId?: string;
}

export function Terminal({ 
  files = [], 
  onCommandExecuted, 
  onFileSystemChange, 
  onClose, 
  className = '',
  showHeader = true,
  sessionId
}: TerminalProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const isInitializedRef = useRef(false);
  const webTerminalService = useRef<WebTerminalService | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const dataHandlerRef = useRef<((data: string) => void) | null>(null);
  
  const [isMinimized, setIsMinimized] = useState(false);
  const [currentCommand, setCurrentCommand] = useState('');
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [connectionState, setConnectionState] = useState({ connected: false, error: null as string | null });

  let terminal: XTerm;
  let fitAddon: FitAddon;

  // Set up terminal WebSocket connection for real commands
  const setupRealTerminal = useCallback(async () => {
    console.log('🔌 Setting up real terminal with WebSocket...');
    
    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.hostname === 'localhost' 
        ? 'localhost:5000' 
        : window.location.host.replace(':3000', ':5000');
      const wsUrl = `${protocol}//${host}/terminal`;
      
      console.log('🔌 Connecting to:', wsUrl);
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('✅ Terminal WebSocket connected');
        setConnectionState({ connected: true, error: null });
        
        // Start terminal session
        ws.send(JSON.stringify({
          type: 'start_terminal',
          data: { projectId: 'default', userId: 'default-user' }
        }));
      };

      ws.onmessage = (event) => {
        const message = JSON.parse(event.data);
        
        switch (message.type) {
          case 'session_init':
            terminal.writeln('\x1b[32m✓ Terminal session initialized\x1b[0m');
            break;
          case 'terminal_started':
            terminal.writeln('\x1b[32m✓ Real terminal ready - you can now type commands!\x1b[0m');
            terminal.writeln('\x1b[36mTry: ls, pwd, git status, node --version, npm --version\x1b[0m');
            break;
          case 'output':
            terminal.write(message.data);
            break;
          case 'error':
            terminal.writeln(`\x1b[31m❌ Error: ${message.data}\x1b[0m`);
            break;
          case 'process_exit':
            terminal.writeln(`\x1b[33m⚠️ Process exited with code ${message.code}\x1b[0m`);
            break;
        }
      };

      ws.onclose = () => {
        console.log('🔌 Terminal WebSocket disconnected');
        setConnectionState({ connected: false, error: null });
      };

      ws.onerror = (error) => {
        console.error('❌ Terminal WebSocket error:', error);
        setConnectionState({ connected: false, error: 'Connection failed' });
      };

    } catch (error) {
      console.error('❌ Failed to setup real terminal:', error);
      setConnectionState({ connected: false, error: 'Setup failed' });
      throw error;
    }
  }, []);

  // Set up virtual terminal as fallback
  const setupVirtualTerminal = useCallback(() => {
    console.log('Setting up virtual terminal as fallback...');
    
    if (!webTerminalService.current) {
      webTerminalService.current = new WebTerminalService(onFileSystemChange);
      webTerminalService.current.setupVirtualFS(files);
    }

    terminal.writeln('\x1b[33m⚠️ Using virtual terminal (commands simulated)\x1b[0m');
    terminal.writeln('\x1b[36mTry: ls, cd, mkdir, touch, cat, npm, git commands\x1b[0m');
    terminal.write(webTerminalService.current.getPrompt());
  }, [files, onFileSystemChange]);

  // Set up input handler for both real and virtual terminal
  const setupInputHandler = useCallback((terminal: XTerm) => {
    const dataHandler = (data: string) => {
      const ws = wsRef.current;
      
      // If real terminal is connected, send input directly
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'command',
          data: { type: 'input', data }
        }));
        return;
      }

      // Fallback to virtual terminal
      if (!webTerminalService.current) return;

      if (data === '\r') { // Enter key
        const command = currentCommand.trim();
        if (command) {
          setCommandHistory(prev => [...prev, command]);
          
          webTerminalService.current!.executeCommand(command).then(output => {
            terminal.writeln('\r' + output);
            
            if (onCommandExecuted) {
              onCommandExecuted(command);
            }
            
            // Update file system if command affects it - simplified
            if (onFileSystemChange && (command.startsWith('touch ') || command.startsWith('mkdir ') || command.startsWith('rm '))) {
              // For now, just call the callback - the file system will be handled by the WebTerminalService internally
              onFileSystemChange(files);
            }
          });
          
          setCurrentCommand('');
        } else {
          terminal.writeln('\r' + webTerminalService.current!.getPrompt());
        }
      } else if (data === '\u007F') { // Backspace
        if (currentCommand.length > 0) {
          setCurrentCommand(prev => prev.slice(0, -1));
          terminal.write('\b \b');
        }
      } else if (data === '\u0003') { // Ctrl+C
        terminal.writeln('^C');
        terminal.write('\r' + webTerminalService.current!.getPrompt());
        setCurrentCommand('');
      } else if (data.charCodeAt(0) >= 32) { // Printable characters
        setCurrentCommand(prev => prev + data);
        terminal.write(data);
      }
    };

    // Store the handler reference and attach it
    dataHandlerRef.current = dataHandler;
    terminal.onData(dataHandler);
  }, [currentCommand, onCommandExecuted, onFileSystemChange]);

  useEffect(() => {
    if (!terminalRef.current || isInitializedRef.current) return;

    console.log('🚀 Initializing terminal');

    // Initialize terminal
    terminal = new XTerm({
      theme: {
        background: '#1e1e1e',
        foreground: '#d4d4d4',
        cursor: '#ffffff',
        selectionBackground: '#264f78',
        black: '#000000',
        red: '#cd3131',
        green: '#0dbc79',
        yellow: '#e5e510',
        blue: '#2472c8',
        magenta: '#bc3fbc',
        cyan: '#11a8cd',
        white: '#e5e5e5',
        brightBlack: '#666666',
        brightRed: '#f14c4c',
        brightGreen: '#23d18b',
        brightYellow: '#f5f543',
        brightBlue: '#3b8eea',
        brightMagenta: '#d670d6',
        brightCyan: '#29b8db',
        brightWhite: '#ffffff'
      },
      fontFamily: '"JetBrains Mono", "Fira Code", "Cascadia Code", "SF Mono", Monaco, Menlo, Consolas, "Ubuntu Mono", monospace',
      fontSize: 14,
      lineHeight: 1.2,
      cursorBlink: true,
      cursorStyle: 'block',
      scrollback: 1000,
      cols: 80,
      rows: 24,
      allowProposedApi: true,
      convertEol: true
    });

    fitAddon = new FitAddon();
    const webLinksAddon = new WebLinksAddon();

    terminal.loadAddon(fitAddon);
    terminal.loadAddon(webLinksAddon);

    terminal.open(terminalRef.current);
    fitAddon.fit();

    isInitializedRef.current = true;

    // Set up input handling
    setupInputHandler(terminal);

    // Try to connect to real terminal first, fallback to virtual
    setupRealTerminal().catch(() => {
      console.log('🔄 Real terminal unavailable, falling back to virtual terminal');
      setupVirtualTerminal();
    });

    // Handle resize
    const handleResize = () => {
      if (fitAddon) {
        fitAddon.fit();
        const ws = wsRef.current;
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
            type: 'resize',
            data: { cols: terminal.cols, rows: terminal.rows }
          }));
        }
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      
      // Close WebSocket connection
      const ws = wsRef.current;
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'stop' }));
        ws.close();
      }
      
      // Dispose terminal
      if (terminal) {
        terminal.dispose();
      }
    };
  }, [setupRealTerminal, setupVirtualTerminal, setupInputHandler]);

  // Handle minimized state resize
  useEffect(() => {
    if (!isMinimized && fitAddon) {
      setTimeout(() => {
        fitAddon.fit();
      }, 100);
    }
  }, [isMinimized]);

  return (
    <div className={`flex flex-col h-full bg-background border border-border rounded-lg ${className}`}>
      {/* Terminal Header */}
      {showHeader && (
        <div className="flex items-center justify-between p-2 border-b border-border bg-muted/50">
          <div className="flex items-center gap-2">
            <TerminalIcon className="h-4 w-4" />
            <span className="text-sm font-medium">Terminal</span>
            {connectionState.connected ? (
              <div className="flex items-center gap-1 text-green-600">
                <Wifi className="h-3 w-3" />
                <span className="text-xs">Real Terminal</span>
              </div>
            ) : (
              <div className="flex items-center gap-1 text-yellow-600">
                <WifiOff className="h-3 w-3" />
                <span className="text-xs">Virtual</span>
              </div>
            )}
            {connectionState.error && (
              <span className="text-xs text-red-500">{connectionState.error}</span>
            )}
          </div>
          
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setIsMinimized(!isMinimized)}
              title={isMinimized ? "Restore" : "Minimize"}
            >
              {isMinimized ? <Maximize2 className="h-3 w-3" /> : <Minimize2 className="h-3 w-3" />}
            </Button>
            
            {onClose && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={onClose}
                title="Close Terminal"
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Terminal Content */}
      {!isMinimized && (
        <div 
          ref={terminalRef} 
          className="flex-1 p-2"
          style={{ minHeight: '200px' }}
        />
      )}
    </div>
  );
}