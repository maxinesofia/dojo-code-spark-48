import { useEffect, useRef, useState } from 'react';
import { Terminal as XTerm } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { WebLinksAddon } from 'xterm-addon-web-links';
import { TerminalWebSocketService } from '../services/TerminalWebSocketService';
import { FileNode } from '../types/FileTypes';
import 'xterm/css/xterm.css';

interface TerminalProps {
  files: FileNode[];
  onCommandExecuted?: (command: string, output: string) => void;
  onFileSystemChange?: (newFiles: FileNode[]) => void;
  className?: string;
}

export function Terminal({ files, onCommandExecuted, onFileSystemChange, className = '' }: TerminalProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerm | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const terminalServiceRef = useRef<TerminalWebSocketService | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!terminalRef.current) return;

    // Initialize terminal
    const terminal = new XTerm({
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

    const fitAddon = new FitAddon();
    const webLinksAddon = new WebLinksAddon();
    
    terminal.loadAddon(fitAddon);
    terminal.loadAddon(webLinksAddon);
    
    terminal.open(terminalRef.current);
    fitAddon.fit();

    xtermRef.current = terminal;
    fitAddonRef.current = fitAddon;

    // Initialize real terminal service
    const terminalService = new TerminalWebSocketService();
    terminalServiceRef.current = terminalService;

    // Setup event handlers
    terminalService.onConnected((sessionId) => {
      setSessionId(sessionId);
      setIsConnected(true);
      setError(null);
      
      terminal.writeln('\x1b[32m🚀 Connecting to Firecracker VM...\x1b[0m');
      
      // Start terminal with current project (you'll need to pass projectId and userId)
      const projectId = 'current-project-id'; // Get from props or context
      const userId = 'current-user-id'; // Get from auth context
      
      terminalService.startTerminal(projectId, userId);
    });

    terminalService.onOutput((data) => {
      terminal.write(data);
    });

    terminalService.onError((error) => {
      setError(error);
      terminal.writeln(`\r\n\x1b[31mError: ${error}\x1b[0m\r\n`);
    });

    terminalService.onDisconnected(() => {
      setIsConnected(false);
      setSessionId(null);
      terminal.writeln('\r\n\x1b[33mTerminal disconnected. Trying to reconnect...\x1b[0m\r\n');
    });

    // Handle user input
    let currentCommand = '';

    terminal.onData((data) => {
      const code = data.charCodeAt(0);
      
      if (code === 13) { // Enter
        if (currentCommand.trim()) {
          // Send command to real terminal
          terminalService.executeCommand(currentCommand);
          onCommandExecuted?.(currentCommand, ''); // We'll get output via WebSocket
        } else {
          terminalService.executeCommand('');
        }
        currentCommand = '';
      } else if (code === 127) { // Backspace
        if (currentCommand.length > 0) {
          currentCommand = currentCommand.slice(0, -1);
          terminal.write('\b \b');
        }
      } else if (code === 3) { // Ctrl+C
        terminalService.executeCommand('\x03'); // Send Ctrl+C to terminal
        currentCommand = '';
      } else if (code === 12) { // Ctrl+L
        terminal.clear();
      } else if (code >= 32 && code <= 126) { // Printable characters
        currentCommand += data;
        terminal.write(data);
      }
    });

    // Handle terminal resize
    const handleResize = () => {
      if (fitAddon) {
        fitAddon.fit();
        if (terminalService.isConnected()) {
          terminalService.resizeTerminal(terminal.cols, terminal.rows);
        }
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      terminalService.disconnect();
      terminal.dispose();
    };
  }, [onCommandExecuted]);

  const handleClear = () => {
    if (xtermRef.current) {
      xtermRef.current.clear();
    }
  };

  const handleResize = () => {
    if (fitAddonRef.current) {
      setTimeout(() => {
        fitAddonRef.current?.fit();
        if (terminalServiceRef.current?.isConnected()) {
          const terminal = xtermRef.current;
          if (terminal) {
            terminalServiceRef.current.resizeTerminal(terminal.cols, terminal.rows);
          }
        }
      }, 100);
    }
  };

  return (
    <div className={`relative h-full bg-[#1e1e1e] ${className}`}>
      {error && (
        <div className="absolute top-2 right-2 bg-red-600 text-white px-3 py-1 rounded text-sm z-10">
          {error}
        </div>
      )}
      {!isConnected && (
        <div className="absolute top-2 left-2 bg-yellow-600 text-white px-3 py-1 rounded text-sm z-10 flex items-center gap-2">
          <div className="animate-spin h-3 w-3 border border-white border-t-transparent rounded-full"></div>
          Connecting to terminal...
        </div>
      )}
      {isConnected && sessionId && (
        <div className="absolute top-2 left-2 bg-green-600 text-white px-3 py-1 rounded text-sm z-10">
          Connected: {sessionId.slice(0, 8)}
        </div>
      )}
      <div 
        ref={terminalRef} 
        className="h-full p-2 overflow-hidden"
        style={{ 
          fontFamily: '"JetBrains Mono", "Fira Code", "Cascadia Code", "SF Mono", Monaco, Menlo, Consolas, "Ubuntu Mono", monospace' 
        }}
      />
    </div>
  );
}