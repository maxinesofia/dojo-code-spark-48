import { useEffect, useRef, useState } from 'react';
import { Terminal as XTerm } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { WebLinksAddon } from 'xterm-addon-web-links';
import { TerminalWebSocketService } from '../services/TerminalWebSocketService';
import { WebTerminalService } from '../services/WebTerminalService';
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
  const terminalServiceRef = useRef<TerminalWebSocketService | WebTerminalService | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isVirtual, setIsVirtual] = useState(false);

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

    // Try to connect to real terminal first, fallback to virtual
    const tryRealTerminal = () => {
      const terminalService = new TerminalWebSocketService();
      terminalServiceRef.current = terminalService;

      // Setup event handlers for real terminal
      terminalService.onConnected((sessionId) => {
        setSessionId(sessionId);
        setIsConnected(true);
        setIsVirtual(false);
        setError(null);
        
        terminal.writeln('\x1b[32m🚀 Connected to Firecracker VM Terminal\x1b[0m');
        terminal.writeln('\x1b[90mReal shell execution enabled\x1b[0m');
        terminal.writeln('');
        
        // Start terminal with current project
        const projectId = 'current-project-id'; // Get from props or context
        const userId = 'current-user-id'; // Get from auth context
        
        terminalService.startTerminal(projectId, userId);
      });

      terminalService.onOutput((data) => {
        terminal.write(data);
      });

      terminalService.onError((error) => {
        setError(error);
        terminal.writeln(`\r\n\x1b[31m${error}\x1b[0m\r\n`);
      });

      terminalService.onDisconnected(() => {
        setIsConnected(false);
        setSessionId(null);
        terminal.writeln('\r\n\x1b[33mTerminal disconnected. Trying to reconnect...\x1b[0m\r\n');
      });

      terminalService.onConnectionFailed(() => {
        console.log('Real terminal connection failed, falling back to virtual terminal');
        setupVirtualTerminal();
      });

      // Try to connect
      terminalService.connect();

      // If connection doesn't happen in 3 seconds, fallback to virtual
      setTimeout(() => {
        if (!terminalService.isConnected()) {
          console.log('Real terminal connection timeout, falling back to virtual terminal');
          setupVirtualTerminal();
        }
      }, 3000);
    };

    const setupVirtualTerminal = () => {
      if (isVirtual) return; // Already using virtual terminal

      setIsVirtual(true);
      setIsConnected(true);
      setError(null);

      const virtualTerminalService = new WebTerminalService((newFiles: FileNode[]) => {
        onFileSystemChange?.(newFiles);
      });
      virtualTerminalService.setupVirtualFS(files);
      terminalServiceRef.current = virtualTerminalService;

      // Clear terminal and show virtual terminal message
      terminal.clear();
      terminal.writeln('\x1b[33m💻 Virtual Terminal Mode\x1b[0m');
      terminal.writeln('\x1b[90mSimulated shell environment - file operations are virtual\x1b[0m');
      terminal.writeln('\x1b[90mType "help" for available commands\x1b[0m');
      terminal.writeln('');
      
      const prompt = () => {
        const cwd = virtualTerminalService.getCurrentDirectory();
        const user = virtualTerminalService.getEnvironment('USER') || 'developer';
        terminal.write(`\x1b[32m${user}\x1b[0m:\x1b[34m${cwd}\x1b[0m$ `);
      };

      prompt();

      // Handle virtual terminal input
      let currentInput = '';
      let commandHistory: string[] = [];
      let historyIdx = -1;

      const dataHandler = async (data: string) => {
        const code = data.charCodeAt(0);

        if (code === 13) { // Enter
          terminal.writeln('');
          
          if (currentInput.trim()) {
            commandHistory.unshift(currentInput);
            if (commandHistory.length > 100) {
              commandHistory = commandHistory.slice(0, 100);
            }
            
            try {
              const output = await virtualTerminalService.executeCommand(currentInput);
              if (output) {
                if (currentInput.trim() === 'clear') {
                  terminal.clear();
                  terminal.writeln('\x1b[33m💻 Virtual Terminal Mode\x1b[0m');
                  terminal.writeln('\x1b[90mType "help" for available commands\x1b[0m');
                  terminal.writeln('');
                } else {
                  const lines = output.split('\n');
                  lines.forEach((line, index) => {
                    if (index === lines.length - 1 && line === '') return;
                    terminal.writeln(line);
                  });
                }
              }
              onCommandExecuted?.(currentInput, output);
            } catch (error) {
              terminal.writeln(`\x1b[31mError: ${error instanceof Error ? error.message : 'Unknown error'}\x1b[0m`);
            }
          }
          
          currentInput = '';
          historyIdx = -1;
          prompt();
        } else if (code === 127) { // Backspace
          if (currentInput.length > 0) {
            currentInput = currentInput.slice(0, -1);
            terminal.write('\b \b');
          }
        } else if (code === 3) { // Ctrl+C
          terminal.writeln('^C');
          currentInput = '';
          historyIdx = -1;
          prompt();
        } else if (code === 12) { // Ctrl+L
          terminal.clear();
          terminal.writeln('\x1b[33m💻 Virtual Terminal Mode\x1b[0m');
          terminal.writeln('\x1b[90mType "help" for available commands\x1b[0m');
          terminal.writeln('');
          prompt();
        } else if (code >= 32 && code <= 126) { // Printable characters
          currentInput += data;
          terminal.write(data);
        }
      };

      terminal.onData(dataHandler);
    };

    // Start with trying real terminal
    tryRealTerminal();

    // Handle terminal resize
    const handleResize = () => {
      if (fitAddon) {
        fitAddon.fit();
        if (terminalServiceRef.current && 'resizeTerminal' in terminalServiceRef.current && !isVirtual) {
          (terminalServiceRef.current as TerminalWebSocketService).resizeTerminal(terminal.cols, terminal.rows);
        }
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (terminalServiceRef.current && 'disconnect' in terminalServiceRef.current) {
        (terminalServiceRef.current as TerminalWebSocketService).disconnect();
      }
      terminal.dispose();
    };
  }, [files, onCommandExecuted, onFileSystemChange]);

  const handleClear = () => {
    if (xtermRef.current) {
      xtermRef.current.clear();
    }
  };

  const handleResize = () => {
    if (fitAddonRef.current) {
      setTimeout(() => {
        fitAddonRef.current?.fit();
        if (terminalServiceRef.current && 'resizeTerminal' in terminalServiceRef.current && !isVirtual) {
          const terminal = xtermRef.current;
          if (terminal) {
            (terminalServiceRef.current as TerminalWebSocketService).resizeTerminal(terminal.cols, terminal.rows);
          }
        }
      }, 100);
    }
  };

  return (
    <div className={`relative h-full bg-[#1e1e1e] ${className}`}>
      {error && !isVirtual && (
        <div className="absolute top-2 right-2 bg-red-600 text-white px-3 py-1 rounded text-sm z-10">
          {error}
        </div>
      )}
      {!isConnected && !isVirtual && (
        <div className="absolute top-2 left-2 bg-yellow-600 text-white px-3 py-1 rounded text-sm z-10 flex items-center gap-2">
          <div className="animate-spin h-3 w-3 border border-white border-t-transparent rounded-full"></div>
          Connecting to terminal...
        </div>
      )}
      {isConnected && !isVirtual && sessionId && (
        <div className="absolute top-2 left-2 bg-green-600 text-white px-3 py-1 rounded text-sm z-10">
          🚀 Real Terminal: {sessionId.slice(0, 8)}
        </div>
      )}
      {isVirtual && (
        <div className="absolute top-2 left-2 bg-blue-600 text-white px-3 py-1 rounded text-sm z-10">
          💻 Virtual Terminal
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