import { useEffect, useRef, useState, useCallback } from 'react';
import { Terminal as XTerm } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { WebLinksAddon } from 'xterm-addon-web-links';
import { TerminalWebSocketService } from '../services/TerminalWebSocketService';
import { WebTerminalService } from '../services/WebTerminalService';
import { FileNode } from '../types/FileTypes';
import { Button } from './ui/button';
import { Minimize2, X } from 'lucide-react';
import 'xterm/css/xterm.css';

interface TerminalProps {
  files: FileNode[];
  onCommandExecuted?: (command: string, output: string) => void;
  onFileSystemChange?: (newFiles: FileNode[]) => void;
  onClose?: () => void;
  className?: string;
  sessionId?: string;
  showHeader?: boolean;
}

export function Terminal({ 
  files, 
  onCommandExecuted, 
  onFileSystemChange, 
  onClose, 
  className = '', 
  sessionId,
  showHeader = true 
}: TerminalProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerm | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const terminalServiceRef = useRef<TerminalWebSocketService | WebTerminalService | null>(null);
  const isInitializedRef = useRef(false);
  const dataHandlerRef = useRef<((data: string) => void) | null>(null);
  const dataHandlerDisposableRef = useRef<{ dispose: () => void } | null>(null); // track current onData subscription
  // Optional: enable simple line buffering for real backend shells to avoid per-char echo duplication when not using a PTY
  const useLineBufferingRef = useRef<boolean>(true);
  
  const [isConnected, setIsConnected] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isVirtual, setIsVirtual] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [hasPty, setHasPty] = useState(false);
  // Track last sent command to suppress echo duplication for non-pty mode
  const pendingEchoRef = useRef<string | null>(null);

  const setupRealTerminal = useCallback(() => {
    if (!xtermRef.current || isInitializedRef.current) return;
    
    const terminal = xtermRef.current;
    
    console.log('🔌 Attempting to connect to real terminal backend');
    setError(null);
    setIsVirtual(false);
    
  const wsService = new TerminalWebSocketService();
    terminalServiceRef.current = wsService;
    
    // Set up event handlers
    wsService.onConnected((receivedSessionId: string) => {
      console.log('✅ Connected to real terminal:', receivedSessionId);
      setIsConnected(true);
      setCurrentSessionId(receivedSessionId);
      setError(null);
      isInitializedRef.current = true;
      
      // Start terminal session with placeholder IDs or actual project data
      wsService.startTerminal('project-1', 'user-1');
      
      // Show welcome message
      terminal.writeln('\x1b[32m🚀 Real Terminal Connected!\x1b[0m');
      terminal.writeln('\x1b[36mType your commands below...\x1b[0m');
    });
    
    wsService.onOutput((data: string) => {
      if (!hasPty) {
        // Suppress immediate echo duplication in non-PTY mode
        if (pendingEchoRef.current) {
          // If output starts with the pending command, strip it once
          const cmd = pendingEchoRef.current;
            if (data.startsWith(cmd)) {
              data = data.slice(cmd.length); // remove echoed command
              pendingEchoRef.current = null;
            }
        }
      }
      terminal.write(data);
    });

    wsService.onCapabilities(caps => {
      setHasPty(!!caps?.pty);
      // If PTY available, disable line buffering for real-time interaction
      if (caps?.pty) {
        useLineBufferingRef.current = false;
      }
    });
    
    wsService.onError((error: string) => {
      console.error('❌ Terminal error:', error);
      setError(error);
<<<<<<< HEAD
      
      // Fall back to virtual terminal after a short delay
      if (!isInitializedRef.current) {
        setTimeout(() => {
          setupVirtualTerminal();
        }, 1000);
=======
      if (!isInitializedRef.current) {
        console.log('Failed to connect to real terminal, falling back to virtual');
        setupVirtualTerminal();
>>>>>>> 6b1f8314125260fd1e2ff82e289dbea265dd3fab
      }
    });
    
    wsService.onConnectionFailed(() => {
<<<<<<< HEAD
      console.log('❌ Failed to connect to real terminal, falling back to virtual');
      setError('Real terminal unavailable');
      
      // Immediate fallback to virtual terminal
      setTimeout(() => {
        setupVirtualTerminal();
      }, 500);
=======
      console.log('Failed to connect to real terminal, falling back to virtual');
      setError(null); // Clear error since we're falling back successfully
      if (!isInitializedRef.current) {
        setupVirtualTerminal();
      }
>>>>>>> 6b1f8314125260fd1e2ff82e289dbea265dd3fab
    });
    
    wsService.onDisconnected(() => {
      console.log('🔌 Disconnected from real terminal');
      setIsConnected(false);
      setCurrentSessionId(null);
      
      // Try to reconnect or fallback to virtual
      if (isInitializedRef.current) {
        setTimeout(() => {
          setupVirtualTerminal();
        }, 1000);
      }
    });
    
    // Handle user input - send raw input to terminal
    // Real terminal input handling (with optional line buffering)
    let lineBuffer = '';
    const dataHandler = (data: string) => {
      if (!wsService.isConnected()) return;
      if (hasPty) {
        // Raw passthrough to PTY
        wsService.executeCommand(data);
        return;
      }
      // Fallback non-PTY buffering
      const code = data.charCodeAt(0);
      if (useLineBufferingRef.current) {
        if (code === 13) { // Enter
          // Send full line with newline
          wsService.executeCommand(lineBuffer + '\n');
          pendingEchoRef.current = lineBuffer; // remember to suppress echo
          // Manually print newline (remote will also send one; okay)
          terminal.write('\r\n');
          lineBuffer = '';
        } else if (code === 127) { // Backspace
          if (lineBuffer.length > 0) {
            lineBuffer = lineBuffer.slice(0, -1);
            // Update display: move backspace visually
            terminal.write('\b \b');
          }
        } else if (code === 3) { // Ctrl+C
          wsService.executeCommand('\x03');
          lineBuffer = '';
          terminal.write('^C\r\n');
        } else {
          lineBuffer += data;
          // Echo locally so user sees typing
          terminal.write(data);
        }
      } else {
        wsService.executeCommand(data);
      }
    };

    // Dispose any previous handler to prevent duplicate echo
    if (dataHandlerDisposableRef.current) {
      dataHandlerDisposableRef.current.dispose();
    }
    dataHandlerRef.current = dataHandler;
    dataHandlerDisposableRef.current = terminal.onData(dataHandler);
    
    // Connect to WebSocket
    wsService.connect();
<<<<<<< HEAD
  }, []);  const setupVirtualTerminal = useCallback(() => {
    if (!xtermRef.current) return;
=======
  }, []);

  const setupVirtualTerminal = useCallback(() => {
    if (!xtermRef.current || isInitializedRef.current) return;
>>>>>>> 6b1f8314125260fd1e2ff82e289dbea265dd3fab
    
    // Clear any existing handlers
    if (terminalServiceRef.current && 'disconnect' in terminalServiceRef.current) {
      (terminalServiceRef.current as TerminalWebSocketService).disconnect();
    }
    
    const terminal = xtermRef.current;
    
    console.log('Setting up virtual terminal');
    setIsVirtual(true);
    setIsConnected(true);
    setError(null);
    isInitializedRef.current = true;

    const virtualTerminalService = new WebTerminalService((newFiles: FileNode[]) => {
      onFileSystemChange?.(newFiles);
    });
    virtualTerminalService.setupVirtualFS(files);
    terminalServiceRef.current = virtualTerminalService;

    // Show session boot message only once
    terminal.clear();
    const initMessage = virtualTerminalService.getSessionInitMessage();
    terminal.write(initMessage);
    
    const showPrompt = () => {
      const prompt = virtualTerminalService.getPrompt();
      terminal.write(`${prompt} `);
    };

    showPrompt();

    // Handle virtual terminal input - single event handler
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
                  // Clear command returns ANSI escape codes, write them directly
                  terminal.write(output);
                } else {
                  // Process output for ANSI escape codes and proper formatting
                  const lines = output.split('\n');
                  lines.forEach((line, index) => {
                    if (index === lines.length - 1 && line === '') return;
                    // Write line directly to preserve ANSI escape codes
                    terminal.write(line + '\r\n');
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
        showPrompt();
      } else if (code === 127) { // Backspace
        if (currentInput.length > 0) {
          currentInput = currentInput.slice(0, -1);
          terminal.write('\b \b');
        }
      } else if (code === 3) { // Ctrl+C
        terminal.writeln('^C');
        currentInput = '';
        historyIdx = -1;
        showPrompt();
      } else if (code === 12) { // Ctrl+L - Clear screen like real terminal
        const clearOutput = await virtualTerminalService.executeCommand('clear');
        terminal.write(clearOutput);
        showPrompt();
      } else if (code >= 32 && code <= 126) { // Printable characters
        currentInput += data;
        terminal.write(data);
      }
    };

    // Store the handler reference and attach it
    // Dispose any previous handler first to avoid duplicates when switching modes
    if (dataHandlerDisposableRef.current) {
      dataHandlerDisposableRef.current.dispose();
    }
    dataHandlerRef.current = dataHandler;
    dataHandlerDisposableRef.current = terminal.onData(dataHandler);
  }, [files, onCommandExecuted, onFileSystemChange]);

  useEffect(() => {
    if (!terminalRef.current || isInitializedRef.current) return;

    console.log('Initializing terminal');

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

    // Try to connect to real terminal first, fall back to virtual
    setTimeout(() => {
      setupRealTerminal();
    }, 100);

    // Set up a timeout for fallback to virtual terminal
    const fallbackTimer = setTimeout(() => {
      if (!isInitializedRef.current) {
        console.log('Falling back to virtual terminal after timeout');
        setupVirtualTerminal();
      }
    }, 2000);

    // Handle terminal resize when expanded/collapsed
    const handleResize = () => {
      if (fitAddon) {
        setTimeout(() => {
          fitAddon.fit();
        }, 100);
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      console.log('Cleaning up terminal');
      window.removeEventListener('resize', handleResize);
      
      // Clear fallback timer
      clearTimeout(fallbackTimer);
      
      if (dataHandlerRef.current && terminal) {
        // Dispose input handler explicitly
        if (dataHandlerDisposableRef.current) {
          dataHandlerDisposableRef.current.dispose();
          dataHandlerDisposableRef.current = null;
        }
        terminal.dispose();
      }
      
      if (terminalServiceRef.current && 'disconnect' in terminalServiceRef.current) {
        (terminalServiceRef.current as TerminalWebSocketService).disconnect();
      }
      
      isInitializedRef.current = false;
      dataHandlerRef.current = null;
    };
  }, [setupRealTerminal]);

  // Trigger resize when minimized state changes
  useEffect(() => {
    if (fitAddonRef.current) {
      setTimeout(() => {
        fitAddonRef.current?.fit();
      }, 300);
    }
  }, [isMinimized]);

  const toggleMinimized = () => {
    setIsMinimized(!isMinimized);
  };

  const handleClose = () => {
    onClose?.();
  };

  if (isMinimized) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Button
          onClick={toggleMinimized}
          variant="outline"
          size="sm"
          className="bg-background/95 backdrop-blur-sm border shadow-lg hover:scale-105 transition-transform"
        >
          <span className="mr-2">💻</span>
          Terminal
        </Button>
      </div>
    );
  }

  return (
    <div 
      className={`
        relative bg-[#1e1e1e] border border-border rounded-lg overflow-hidden
        transition-all duration-300 ease-out
        ${isMinimized ? 'h-10' : 'h-full'}
        ${className}
      `}
    >
      {/* Terminal Header - only show if showHeader is true */}
      {showHeader && (
        <div className="flex items-center justify-between px-3 py-2 bg-muted/30 border-b border-border">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-foreground">Terminal</span>
            {sessionId && (
              <span className="text-xs text-muted-foreground">#{sessionId.split('-')[1]}</span>
            )}
            
            {/* Status indicator */}
            {isVirtual && (
              <span className="bg-blue-600 text-white px-2 py-1 rounded text-xs">
                Virtual
              </span>
            )}
            {isConnected && !isVirtual && currentSessionId && (
              <span className="bg-green-600 text-white px-2 py-1 rounded text-xs">
                Connected
              </span>
            )}
            {!isConnected && !isVirtual && (
              <span className="bg-yellow-600 text-white px-2 py-1 rounded text-xs">
                Connecting...
              </span>
            )}
            {error && !isVirtual && (
              <span className="bg-red-600 text-white px-2 py-1 rounded text-xs">
                Error
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-1">
            <Button
              onClick={toggleMinimized}
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 hover:bg-muted"
            >
              <Minimize2 className="h-3 w-3" />
            </Button>
            <Button
              onClick={handleClose}
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 hover:bg-red-500/20"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>
      )}

      {/* Terminal Content */}
      {!isMinimized && (
        <div 
          ref={terminalRef} 
          className={`p-2 overflow-hidden ${showHeader ? 'h-[calc(100%-2.5rem)]' : 'h-full'}`}
          style={{ 
            fontFamily: '"JetBrains Mono", "Fira Code", "Cascadia Code", "SF Mono", Monaco, Menlo, Consolas, "Ubuntu Mono", monospace' 
          }}
        />
      )}
    </div>
  );
}