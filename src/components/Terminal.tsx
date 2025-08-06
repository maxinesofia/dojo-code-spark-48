import { useEffect, useRef, useState, useCallback } from 'react';
import { Terminal as XTerm } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { WebLinksAddon } from 'xterm-addon-web-links';
import { TerminalWebSocketService } from '../services/TerminalWebSocketService';
import { WebTerminalService } from '../services/WebTerminalService';
import { FileNode } from '../types/FileTypes';
import { Button } from './ui/button';
import { Maximize2, Minimize2, X } from 'lucide-react';
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
  const isInitializedRef = useRef(false);
  const dataHandlerRef = useRef<((data: string) => void) | null>(null);
  
  const [isConnected, setIsConnected] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isVirtual, setIsVirtual] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  const setupVirtualTerminal = useCallback(() => {
    if (!xtermRef.current || isInitializedRef.current) return;
    
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

    // Store the handler reference and attach it
    dataHandlerRef.current = dataHandler;
    terminal.onData(dataHandler);
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

    // Immediately setup virtual terminal (no real terminal attempt for now)
    setTimeout(() => {
      setupVirtualTerminal();
    }, 100);

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
      
      if (dataHandlerRef.current && terminal) {
        terminal.dispose();
      }
      
      if (terminalServiceRef.current && 'disconnect' in terminalServiceRef.current) {
        (terminalServiceRef.current as TerminalWebSocketService).disconnect();
      }
      
      isInitializedRef.current = false;
      dataHandlerRef.current = null;
    };
  }, [setupVirtualTerminal]);

  // Trigger resize when expansion state changes
  useEffect(() => {
    if (fitAddonRef.current) {
      setTimeout(() => {
        fitAddonRef.current?.fit();
      }, 300); // Wait for animation to complete
    }
  }, [isExpanded, isMinimized]);

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
    setIsMinimized(false);
  };

  const toggleMinimized = () => {
    setIsMinimized(!isMinimized);
    setIsExpanded(false);
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
        ${isExpanded 
          ? 'fixed inset-4 z-40 shadow-2xl' 
          : 'relative h-full'
        } 
        bg-[#1e1e1e] border border-border rounded-lg overflow-hidden
        transition-all duration-300 ease-out
        ${className}
      `}
    >
      {/* Terminal Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-muted/50 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
          </div>
          <span className="text-sm font-medium text-foreground">Terminal</span>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Status indicators */}
          {error && !isVirtual && (
            <div className="bg-red-600 text-white px-2 py-1 rounded text-xs">
              {error}
            </div>
          )}
          {!isConnected && !isVirtual && (
            <div className="bg-yellow-600 text-white px-2 py-1 rounded text-xs flex items-center gap-1">
              <div className="animate-spin h-2 w-2 border border-white border-t-transparent rounded-full"></div>
              Connecting...
            </div>
          )}
          {isConnected && !isVirtual && sessionId && (
            <div className="bg-green-600 text-white px-2 py-1 rounded text-xs">
              🚀 Real: {sessionId.slice(0, 8)}
            </div>
          )}
          {isVirtual && (
            <div className="bg-blue-600 text-white px-2 py-1 rounded text-xs">
              💻 Virtual
            </div>
          )}
          
          {/* Control buttons */}
          <Button
            onClick={toggleMinimized}
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 hover:bg-muted"
          >
            <Minimize2 className="h-3 w-3" />
          </Button>
          <Button
            onClick={toggleExpanded}
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 hover:bg-muted"
          >
            {isExpanded ? <Minimize2 className="h-3 w-3" /> : <Maximize2 className="h-3 w-3" />}
          </Button>
        </div>
      </div>

      {/* Terminal Content */}
      <div 
        ref={terminalRef} 
        className={`
          ${isExpanded ? 'h-[calc(100%-3rem)]' : 'h-[calc(100%-3rem)]'} 
          p-2 overflow-hidden
        `}
        style={{ 
          fontFamily: '"JetBrains Mono", "Fira Code", "Cascadia Code", "SF Mono", Monaco, Menlo, Consolas, "Ubuntu Mono", monospace' 
        }}
      />
    </div>
  );
}