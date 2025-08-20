import { useEffect, useRef, useState } from 'react';
import { Terminal as XTerm } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { WebLinksAddon } from 'xterm-addon-web-links';
import { X, Maximize2, Minimize2, Plus, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FileNode } from '../types/FileTypes';
import { TerminalWebSocketService } from '../services/TerminalWebSocketService';
import 'xterm/css/xterm.css';

interface VSCodeTerminalProps {
  files: FileNode[];
  onClose: () => void;
}

export function VSCodeTerminal({ files, onClose }: VSCodeTerminalProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerm | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const wsServiceRef = useRef<TerminalWebSocketService | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [tabs, setTabs] = useState([{ id: 1, name: 'Terminal 1', active: true }]);

  useEffect(() => {
    if (!terminalRef.current) return;

    // Initialize xterm
    const terminal = new XTerm({
      theme: {
        background: '#1e1e1e',
        foreground: '#d4d4d4',
        cursor: '#d4d4d4',
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
        brightWhite: '#e5e5e5'
      },
      fontFamily: "'Fira Code', 'Monaco', 'Menlo', 'Ubuntu Mono', monospace",
      fontSize: 14,
      lineHeight: 1.2,
      letterSpacing: 0,
      cursorBlink: true,
      cursorStyle: 'block',
      scrollback: 1000,
      tabStopWidth: 4
    });

    const fitAddon = new FitAddon();
    const webLinksAddon = new WebLinksAddon();

    terminal.loadAddon(fitAddon);
    terminal.loadAddon(webLinksAddon);

    terminal.open(terminalRef.current);
    fitAddon.fit();

    xtermRef.current = terminal;
    fitAddonRef.current = fitAddon;

    // Initialize WebSocket service
    const wsService = new TerminalWebSocketService();
    wsServiceRef.current = wsService;

    // Setup WebSocket callbacks
    wsService.onConnected(() => {
      setIsConnected(true);
      terminal.writeln('\x1b[32m✓ Connected to Firecracker VM\x1b[0m');
      terminal.writeln('\x1b[36mWelcome to VS Code integrated terminal with Firecracker VM on GCP!\x1b[0m');
      terminal.writeln('');
      
      // Start terminal session  
      wsService.startTerminal('vscode-project', 'vscode-user');
    });

    wsService.onDisconnected(() => {
      setIsConnected(false);
      terminal.writeln('\x1b[31m✗ Disconnected from Firecracker VM\x1b[0m');
    });

    wsService.onOutput((data) => {
      terminal.write(data);
    });

    wsService.onError((error) => {
      terminal.writeln(`\x1b[31mError: ${error}\x1b[0m`);
    });

    // Handle terminal input
    terminal.onData(data => {
      if (wsService.isConnected()) {
        wsService.executeCommand(data);
      }
    });

    // Connect to WebSocket
    wsService.connect();

    // Handle window resize
    const handleResize = () => {
      setTimeout(() => {
        fitAddon.fit();
        if (wsService.isConnected()) {
          wsService.resizeTerminal(terminal.cols, terminal.rows);
        }
      }, 0);
    };

    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      wsService.disconnect();
      terminal.dispose();
    };
  }, [files]);

  const addNewTab = () => {
    const newId = Math.max(...tabs.map(t => t.id)) + 1;
    const newTab = { id: newId, name: `Terminal ${newId}`, active: false };
    setTabs([...tabs, newTab]);
  };

  const closeTab = (tabId: number) => {
    if (tabs.length === 1) return; // Don't close the last tab
    
    const newTabs = tabs.filter(t => t.id !== tabId);
    setTabs(newTabs);
    
    if (tabs[activeTab]?.id === tabId) {
      setActiveTab(0);
    }
  };

  return (
    <div className="h-full bg-terminal flex flex-col">
      {/* Terminal Header */}
      <div className="h-8 bg-sidebar border-b border-border flex items-center px-2">
        <div className="flex items-center gap-1 flex-1">
          <span className="text-sm font-medium text-foreground">TERMINAL</span>
          <div className="ml-2 flex items-center gap-1">
            {tabs.map((tab, index) => (
              <div
                key={tab.id}
                className={`flex items-center gap-1 px-2 py-1 text-xs rounded cursor-pointer ${
                  activeTab === index ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50'
                }`}
                onClick={() => setActiveTab(index)}
              >
                <span>{tab.name}</span>
                {tabs.length > 1 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-3 h-3 hover:bg-destructive hover:text-destructive-foreground"
                    onClick={(e) => {
                      e.stopPropagation();
                      closeTab(tab.id);
                    }}
                  >
                    <X className="w-2 h-2" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
        
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="w-6 h-6"
            onClick={addNewTab}
            title="New Terminal"
          >
            <Plus className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="w-6 h-6"
            title="Split Terminal"
          >
            <ChevronDown className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="w-6 h-6"
            onClick={onClose}
            title="Close Terminal"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Connection Status */}
      <div className="h-6 bg-sidebar-accent border-b border-border flex items-center px-2 text-xs">
        <div className={`w-2 h-2 rounded-full mr-2 ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
        <span className="text-muted-foreground">
          {isConnected ? 'Connected to Firecracker VM on GCP' : 'Connecting to Firecracker VM...'}
        </span>
      </div>

      {/* Terminal Content */}
      <div className="flex-1 p-2">
        <div
          ref={terminalRef}
          className="w-full h-full"
          style={{ background: '#1e1e1e' }}
        />
      </div>
    </div>
  );
}